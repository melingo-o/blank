import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { renderSidebar } from "/components/sidebar.js";
import { renderKanban } from "/components/kanban.js";
import { renderFeedbackPanel, renderContentDetail } from "/components/comments.js";
import { renderTimeline } from "/components/timeline.js";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "meetings", label: "Meetings" },
  { id: "pipeline", label: "Content Pipeline" },
  { id: "feedback", label: "Feedback" },
  { id: "timeline", label: "Timeline" }
];

const MEETING_TYPE_LABELS = {
  kickoff: "Kickoff",
  concept: "Concept",
  content: "Content",
  script_feedback: "Script feedback"
};

const ATTACHMENT_LABELS = {
  thumbnail: "Thumbnail uploaded",
  script: "Script file added",
  pdf_note: "PDF note added",
  reference: "Reference added"
};

const WORKSPACE_SESSION_HANDOFF_KEY = "workspaceSessionHandoff";

const state = {
  config: null,
  supabase: null,
  session: null,
  creatorId: null,
  creators: [],
  workspace: null,
  feedbackByContent: {},
  attachmentsByContent: {},
  activeTab: "overview"
};

const refs = {};
let toastTimer = null;

document.addEventListener("DOMContentLoaded", () => {
  collectRefs();
  bindGlobalUI();
  boot().catch((error) => {
    console.error(error);
    showAuthGate("Unable to initialize the workspace.");
    showToast(error.message || "Unable to initialize the workspace.", "error");
  });
});

function collectRefs() {
  refs.authGate = document.getElementById("auth-gate");
  refs.layout = document.getElementById("workspace-layout");
  refs.sidebar = document.getElementById("workspace-sidebar");
  refs.header = document.getElementById("workspace-header");
  refs.tabs = document.getElementById("workspace-tabs");
  refs.notice = document.getElementById("workspace-notice");
  refs.overview = document.getElementById("panel-overview");
  refs.meetings = document.getElementById("panel-meetings");
  refs.pipeline = document.getElementById("panel-pipeline");
  refs.feedback = document.getElementById("panel-feedback");
  refs.timeline = document.getElementById("panel-timeline");
  refs.modal = document.getElementById("workspace-modal");
  refs.toast = document.getElementById("workspace-toast");
  refs.authForm = document.querySelector("[data-workspace-auth-form]");
  refs.authLoginId = document.getElementById("workspace-login-id");
  refs.authPassword = document.getElementById("workspace-password");
  refs.authSubmit = document.querySelector("[data-workspace-auth-submit]");
}

function bindGlobalUI() {
  refs.authForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await handleWorkspaceLogin();
  });

  refs.modal?.addEventListener("click", (event) => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.matches("[data-close-modal]") || target.matches(".workspace-modal__backdrop")) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && refs.modal && !refs.modal.classList.contains("hidden")) {
      closeModal();
    }
  });
}

async function boot() {
  await loadConfig();
  await initSession();
}

async function loadConfig() {
  const response = await fetch("/.netlify/functions/workspace-config");
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "Workspace configuration is missing.");
  }

  state.config = payload;
  state.supabase = createClient(payload.supabaseUrl, payload.supabaseAnonKey);
}

async function initSession() {
  const {
    data: { session }
  } = await state.supabase.auth.getSession();

  if (session) {
    await handleAuthenticatedSession();
    return;
  }

  const handoffSession = await consumeSessionHandoff();

  if (handoffSession) {
    await handleAuthenticatedSession();
    return;
  }

  showAuthGate();
}

async function consumeSessionHandoff() {
  if (!window.sessionStorage) {
    return null;
  }

  const raw = window.sessionStorage.getItem(WORKSPACE_SESSION_HANDOFF_KEY);

  if (!raw) {
    return null;
  }

  window.sessionStorage.removeItem(WORKSPACE_SESSION_HANDOFF_KEY);

  try {
    const payload = JSON.parse(raw);

    if (!payload?.accessToken || !payload?.refreshToken) {
      return null;
    }

    const { data, error } = await state.supabase.auth.setSession({
      access_token: payload.accessToken,
      refresh_token: payload.refreshToken
    });

    if (error) {
      console.error(error);
      return null;
    }

    return data?.session || null;
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function handleWorkspaceLogin() {
  const loginId = refs.authLoginId?.value?.trim() || "";
  const password = refs.authPassword?.value || "";

  if (!loginId || !password) {
    showToast("Enter your assigned ID and password.", "error");
    return;
  }

  if (refs.authSubmit instanceof HTMLButtonElement) {
    refs.authSubmit.disabled = true;
    refs.authSubmit.textContent = "Signing in...";
  }

  try {
    const response = await fetch("/.netlify/functions/workspace-password-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        loginId,
        password,
        mode: "workspace"
      })
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.error || "Unable to sign in.");
    }

    const { error } = await state.supabase.auth.setSession({
      access_token: payload.accessToken,
      refresh_token: payload.refreshToken
    });

    if (error) {
      throw error;
    }

    refs.authForm?.reset();

    if (payload.redirectTo && payload.redirectTo !== window.location.pathname) {
      window.location.assign(payload.redirectTo);
      return;
    }

    await initSession();
    showToast("Signed in.", "success");
  } catch (error) {
    console.error(error);
    showToast(error.message || "Unable to sign in.", "error");
  } finally {
    if (refs.authSubmit instanceof HTMLButtonElement) {
      refs.authSubmit.disabled = false;
      refs.authSubmit.textContent = "Enter workspace";
    }
  }
}

async function handleAuthenticatedSession() {
  showLayout();
  renderLoadingShell();

  const requestedCreatorId = getRequestedCreatorId();
  const query = requestedCreatorId ? `?creatorId=${encodeURIComponent(requestedCreatorId)}` : "";
  const authz = await authorizedJson(`/.netlify/functions/workspace-authz${query}`);

  state.session = authz.user;
  state.creators = authz.creators || [];

  const resolvedCreatorId =
    requestedCreatorId ||
    authz.redirectCreatorId ||
    authz.creators?.[0]?.id ||
    authz.user?.creatorId ||
    null;

  if (resolvedCreatorId && resolvedCreatorId !== requestedCreatorId) {
    window.location.replace(`/workspace/${encodeURIComponent(resolvedCreatorId)}`);
    return;
  }

  state.creatorId = resolvedCreatorId;

  if (!state.creatorId) {
    renderNoAccess();
    return;
  }

  await loadWorkspace();
}

async function loadWorkspace() {
  renderLoadingShell();
  const payload = await authorizedJson(
    `/.netlify/functions/workspace-data?creatorId=${encodeURIComponent(state.creatorId)}`
  );

  state.workspace = payload;
  state.feedbackByContent = groupBy(payload.feedback || [], "content_id");
  state.attachmentsByContent = groupBy(
    (payload.attachments || []).filter((item) => item.content_id),
    "content_id"
  );
  renderWorkspace();
}

function renderWorkspace() {
  renderHeader();
  renderTabs();
  renderSidebar({
    root: refs.sidebar,
    creator: state.workspace.creator,
    stats: state.workspace.stats,
    user: state.session,
    activeTab: state.activeTab,
    creators: state.creators
  });

  bindSidebarEvents();
  renderOverview();
  renderMeetings();
  renderKanban({
    root: refs.pipeline,
    contents: state.workspace.contents || [],
    feedbackByContent: state.feedbackByContent,
    attachmentsByContent: state.attachmentsByContent,
    onStatusChange: handleStatusChange,
    onOpenContent: openContentDetail,
    onCreateContent: openCreateContentModal
  });
  renderFeedbackPanel({
    root: refs.feedback,
    contents: state.workspace.contents || [],
    feedbackByContent: state.feedbackByContent,
    onOpenContent: openContentDetail,
    onAddFeedback: handleAddFeedback
  });
  renderTimeline({
    root: refs.timeline,
    milestones: state.workspace.milestones || [],
    onCreateMilestone: openMilestoneModal
  });

  setActiveTab(state.activeTab);
  refs.notice.innerHTML = "";
}

function renderHeader() {
  const creator = state.workspace?.creator || {};
  const stats = state.workspace?.stats || {};

  refs.header.innerHTML = `
    <div class="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Private creator portal</p>
          <h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            ${escapeHtml(creator.name || "Creator")} <span class="text-slate-400">/ ${escapeHtml(creator.channel_name || creator.id || "")}</span>
          </h1>
          <p class="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
            Shared workspace for meeting history, script drafts, production status, and growth milestones.
          </p>
        </div>
        <div class="grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            data-header-action="meeting"
            class="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            New Meeting
          </button>
          <button
            type="button"
            data-header-action="content"
            class="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            New Content
          </button>
          <button
            type="button"
            data-header-action="milestone"
            class="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Add Milestone
          </button>
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-3">
        <div class="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-[0_12px_24px_rgba(15,23,42,0.05)]">
          <p class="text-xs text-slate-500">Videos published</p>
          <p class="mt-2 text-2xl font-semibold text-slate-900">${formatNumber(stats.videosPublished)}</p>
        </div>
        <div class="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-[0_12px_24px_rgba(15,23,42,0.05)]">
          <p class="text-xs text-slate-500">Total views</p>
          <p class="mt-2 text-2xl font-semibold text-slate-900">${formatNumber(stats.totalViews)}</p>
        </div>
        <div class="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-[0_12px_24px_rgba(15,23,42,0.05)]">
          <p class="text-xs text-slate-500">Subscribers gained</p>
          <p class="mt-2 text-2xl font-semibold text-slate-900">${formatNumber(stats.subscribersGained)}</p>
        </div>
      </div>
    </div>
  `;

  refs.header
    .querySelector('[data-header-action="meeting"]')
    ?.addEventListener("click", openMeetingModal);
  refs.header
    .querySelector('[data-header-action="content"]')
    ?.addEventListener("click", openCreateContentModal);
  refs.header
    .querySelector('[data-header-action="milestone"]')
    ?.addEventListener("click", openMilestoneModal);
}

function renderTabs() {
  refs.tabs.innerHTML = `
    ${TABS.map(
      (tab) => `
        <button
          type="button"
          data-tab="${escapeHtml(tab.id)}"
          aria-current="${state.activeTab === tab.id ? "page" : "false"}"
          class="workspace-tab rounded-full px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
        >
          ${escapeHtml(tab.label)}
        </button>
      `
    ).join("")}
  `;

  refs.tabs.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      setActiveTab(button.getAttribute("data-tab"));
    });
  });
}

function bindSidebarEvents() {
  refs.sidebar.querySelectorAll("[data-sidebar-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      setActiveTab(button.getAttribute("data-sidebar-tab"));
    });
  });

  refs.sidebar.querySelector("[data-sign-out]")?.addEventListener("click", async () => {
    await state.supabase.auth.signOut();
    clearWorkspace();
    showAuthGate("You have signed out.");
    showToast("Signed out.", "success");
  });

  refs.sidebar
    .querySelector("#workspace-creator-select")
    ?.addEventListener("change", (event) => {
      const nextId = event.target.value;

      if (nextId) {
        window.location.assign(`/workspace/${encodeURIComponent(nextId)}`);
      }
    });
}

function renderOverview() {
  const creator = state.workspace?.creator || {};
  const contents = state.workspace?.contents || [];
  const meetings = state.workspace?.meetings || [];
  const attachments = state.workspace?.attachments || [];
  const activities = buildRecentActivity().slice(0, 8);
  const pipelineSummary = ["idea", "script", "filming", "editing", "published"].map((status) => ({
    status,
    total: contents.filter((item) => item.status === status).length
  }));

  refs.overview.innerHTML = `
    <div class="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <section class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_34px_rgba(15,23,42,0.05)]">
        <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Overview</p>
        <h2 class="mt-2 text-2xl font-semibold text-slate-950">${escapeHtml(creator.name || "Creator workspace")}</h2>
        <div class="mt-6 grid gap-4 md:grid-cols-3">
          <div class="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
            <p class="text-xs text-slate-500">Channel concept</p>
            <p class="mt-3 text-sm leading-6 text-slate-700">${escapeHtml(creator.channel_concept || "Document the channel concept to keep decisions aligned.")}</p>
          </div>
          <div class="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
            <p class="text-xs text-slate-500">Join date</p>
            <p class="mt-3 text-sm font-semibold text-slate-900">${escapeHtml(formatDate(creator.join_date))}</p>
          </div>
          <div class="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
            <p class="text-xs text-slate-500">Latest sync</p>
            <p class="mt-3 text-sm font-semibold text-slate-900">${escapeHtml(formatDate(meetings[0]?.date || contents[0]?.updated_at || creator.updated_at || creator.created_at))}</p>
          </div>
        </div>

        <div class="mt-6">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Recent activity</p>
            </div>
          </div>
          <div class="mt-4 space-y-3">
            ${
              activities.length > 0
                ? activities
                    .map(
                      (activity) => `
                        <article class="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-4">
                          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p class="text-sm font-semibold text-slate-900">${escapeHtml(activity.title)}</p>
                              <p class="mt-1 text-sm text-slate-500">${escapeHtml(activity.description)}</p>
                            </div>
                            <span class="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500">${escapeHtml(formatDate(activity.date))}</span>
                          </div>
                        </article>
                      `
                    )
                    .join("")
                : `
                    <div class="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                      Add meetings, comments, and milestones to start building the activity history.
                    </div>
                  `
            }
          </div>
        </div>
      </section>

      <section class="space-y-6">
        <div class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_34px_rgba(15,23,42,0.05)]">
          <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Pipeline snapshot</p>
          <div class="mt-5 grid gap-3">
            ${pipelineSummary
              .map(
                (item) => `
                  <div class="flex items-center justify-between rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
                    <span class="text-sm font-medium text-slate-600">${escapeHtml(item.status)}</span>
                    <span class="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500">${item.total}</span>
                  </div>
                `
              )
              .join("")}
          </div>
        </div>

        <div class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_34px_rgba(15,23,42,0.05)]">
          <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Attachments</p>
          <div class="mt-5 space-y-3">
            ${
              attachments.length > 0
                ? attachments
                    .slice(0, 5)
                    .map(
                      (attachment) => `
                        <a
                          href="${escapeHtml(attachment.signed_url || "#")}"
                          target="_blank"
                          rel="noreferrer"
                          class="flex items-center justify-between gap-3 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-slate-300 hover:bg-slate-100"
                        >
                          <div class="min-w-0">
                            <p class="truncate text-sm font-medium text-slate-700">${escapeHtml(attachment.title || attachment.file_name)}</p>
                            <p class="mt-1 truncate text-xs text-slate-500">${escapeHtml(attachment.kind)} · ${escapeHtml(formatDate(attachment.created_at))}</p>
                          </div>
                          <span class="text-slate-400">↗</span>
                        </a>
                      `
                    )
                    .join("")
                : `
                    <div class="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                      Upload thumbnails, scripts, and PDF notes inside any content card.
                    </div>
                  `
            }
          </div>
        </div>
      </section>
    </div>
  `;
}

function renderMeetings() {
  const meetings = state.workspace?.meetings || [];

  refs.meetings.innerHTML = `
    <div class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_34px_rgba(15,23,42,0.05)]">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Meetings</p>
          <h2 class="mt-2 text-xl font-semibold text-slate-900">Notion-style meeting database</h2>
        </div>
        <button
          type="button"
          data-action="new-meeting"
          class="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          New Meeting
        </button>
      </div>

      <div class="workspace-scrollbar mt-6 overflow-x-auto rounded-[24px] border border-slate-200">
        <table class="workspace-meeting-table min-w-full bg-white text-left">
          <thead class="bg-slate-50">
            <tr class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <th class="px-4 py-4">Date</th>
              <th class="px-4 py-4">Meeting type</th>
              <th class="px-4 py-4">Summary</th>
              <th class="px-4 py-4">Notes</th>
            </tr>
          </thead>
          <tbody>
            ${
              meetings.length > 0
                ? meetings
                    .map(
                      (meeting) => `
                        <tr class="align-top text-sm text-slate-700">
                          <td class="px-4 py-4 font-medium text-slate-600">${escapeHtml(formatDate(meeting.date))}</td>
                          <td class="px-4 py-4">
                            <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                              ${escapeHtml(MEETING_TYPE_LABELS[meeting.meeting_type] || meeting.meeting_type)}
                            </span>
                          </td>
                          <td class="px-4 py-4 font-medium text-slate-900">${escapeHtml(meeting.summary || "-")}</td>
                          <td class="px-4 py-4">
                            <p class="workspace-note-clamp whitespace-pre-wrap leading-6 text-slate-600">${escapeHtml(meeting.notes || "No notes yet.")}</p>
                          </td>
                        </tr>
                      `
                    )
                    .join("")
                : `
                    <tr>
                      <td colspan="4" class="px-4 py-10 text-center text-sm text-slate-400">
                        Add kickoff notes, concept reviews, or script feedback sessions.
                      </td>
                    </tr>
                  `
            }
          </tbody>
        </table>
      </div>
    </div>
  `;

  refs.meetings
    .querySelector('[data-action="new-meeting"]')
    ?.addEventListener("click", openMeetingModal);
}

function renderLoadingShell() {
  refs.notice.innerHTML = `
    <div class="rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm text-slate-500 shadow-[0_12px_24px_rgba(15,23,42,0.05)]">
      Loading workspace...
    </div>
  `;
}

function renderNoAccess() {
  refs.header.innerHTML = `
    <div class="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div class="rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_18px_34px_rgba(15,23,42,0.05)]">
        <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">No workspace linked</p>
        <h1 class="mt-3 text-2xl font-semibold text-slate-950">Your account is signed in, but no creator workspace is assigned yet.</h1>
        <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
          Ask the company admin to connect your Supabase Auth email to a creator record using the
          <code class="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">login_email</code> field.
        </p>
      </div>
    </div>
  `;
  refs.tabs.innerHTML = "";
  refs.sidebar.innerHTML = "";
  refs.overview.innerHTML = "";
  refs.meetings.innerHTML = "";
  refs.pipeline.innerHTML = "";
  refs.feedback.innerHTML = "";
  refs.timeline.innerHTML = "";
}

function setActiveTab(tabId) {
  state.activeTab = tabId || "overview";

  TABS.forEach((tab) => {
    const panel = document.querySelector(`[data-panel="${tab.id}"]`);
    if (panel) {
      panel.hidden = tab.id !== state.activeTab;
    }
  });

  refs.tabs.querySelectorAll("[data-tab]").forEach((button) => {
    button.setAttribute(
      "aria-current",
      button.getAttribute("data-tab") === state.activeTab ? "page" : "false"
    );
  });

  refs.sidebar.querySelectorAll("[data-sidebar-tab]").forEach((button) => {
    const isActive = button.getAttribute("data-sidebar-tab") === state.activeTab;
    button.classList.toggle("bg-slate-900", isActive);
    button.classList.toggle("text-white", isActive);
    button.classList.toggle("shadow-[0_12px_24px_rgba(15,23,42,0.18)]", isActive);
    button.classList.toggle("text-slate-600", !isActive);
  });
}

async function handleStatusChange(contentId, nextStatus) {
  await mutateWorkspace("updateContent", {
    contentId,
    status: nextStatus
  });
  showToast("Pipeline updated.", "success");
}

async function handleAddFeedback({ contentId, comment }) {
  await mutateWorkspace("createFeedback", {
    contentId,
    comment
  });
  showToast("Feedback saved.", "success");
}

async function mutateWorkspace(action, payload, options = {}) {
  await authorizedJson("/.netlify/functions/workspace-save", {
    method: "POST",
    body: JSON.stringify({
      action,
      creatorId: state.creatorId,
      payload
    })
  });

  await loadWorkspace();

  if (options.reopenContentId) {
    openContentDetail(options.reopenContentId);
  }
}

function openMeetingModal() {
  openModal(`
    <div class="space-y-5">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">New meeting</p>
          <h2 class="mt-2 text-2xl font-semibold text-slate-950">Log the latest sync</h2>
        </div>
        <button type="button" data-close-modal class="rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 transition hover:border-slate-300 hover:bg-slate-50">Close</button>
      </div>
      <form class="space-y-4" data-meeting-form>
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-slate-700" for="meeting-date">Date</label>
            <input id="meeting-date" name="date" type="date" value="${todayValue()}" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white" required />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700" for="meeting-type">Meeting type</label>
            <select id="meeting-type" name="meetingType" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white" required>
              <option value="kickoff">Kickoff</option>
              <option value="concept">Concept</option>
              <option value="content">Content</option>
              <option value="script_feedback">Script feedback</option>
            </select>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700" for="meeting-summary">Summary</label>
          <input id="meeting-summary" name="summary" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white" placeholder="Main decision or outcome" required />
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700" for="meeting-notes">Notes</label>
          <textarea id="meeting-notes" name="notes" rows="7" class="mt-2 w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none transition focus:border-slate-400 focus:bg-white" placeholder="Capture detailed notes, open questions, and action items."></textarea>
        </div>
        <button type="submit" class="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">Save meeting</button>
      </form>
    </div>
  `);

  refs.modal
    .querySelector("[data-meeting-form]")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      await mutateWorkspace("createMeeting", {
        meetingType: String(form.get("meetingType")),
        date: String(form.get("date")),
        summary: String(form.get("summary")),
        notes: String(form.get("notes") || "")
      });
      closeModal();
      showToast("Meeting saved.", "success");
    });
}

function openCreateContentModal() {
  openModal(`
    <div class="space-y-5">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">New content card</p>
          <h2 class="mt-2 text-2xl font-semibold text-slate-950">Add a pipeline item</h2>
        </div>
        <button type="button" data-close-modal class="rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 transition hover:border-slate-300 hover:bg-slate-50">Close</button>
      </div>
      <form class="space-y-4" data-content-form>
        <div>
          <label class="block text-sm font-medium text-slate-700" for="content-title">Title</label>
          <input id="content-title" name="title" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white" placeholder="ADHD diagnosis story" required />
        </div>
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-slate-700" for="content-status">Stage</label>
            <select id="content-status" name="status" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white">
              <option value="idea">Idea</option>
              <option value="script">Script</option>
              <option value="filming">Filming</option>
              <option value="editing">Editing</option>
              <option value="published">Published</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700" for="content-publish-date">Publish date</label>
            <input id="content-publish-date" name="publishDate" type="date" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700" for="content-concept">Concept</label>
          <textarea id="content-concept" name="concept" rows="4" class="mt-2 w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none transition focus:border-slate-400 focus:bg-white" placeholder="Document the hook, audience tension, or angle."></textarea>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700" for="content-script">Script</label>
          <textarea id="content-script" name="script" rows="8" class="mt-2 w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none transition focus:border-slate-400 focus:bg-white" placeholder="Add a rough draft or beat outline."></textarea>
        </div>
        <button type="submit" class="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">Create card</button>
      </form>
    </div>
  `);

  refs.modal
    .querySelector("[data-content-form]")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      await mutateWorkspace("createContent", {
        title: String(form.get("title")),
        status: String(form.get("status")),
        concept: String(form.get("concept") || ""),
        script: String(form.get("script") || ""),
        publishDate: String(form.get("publishDate") || "")
      });
      closeModal();
      showToast("Content card created.", "success");
    });
}

function openMilestoneModal() {
  openModal(`
    <div class="space-y-5">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">New milestone</p>
          <h2 class="mt-2 text-2xl font-semibold text-slate-950">Capture a growth moment</h2>
        </div>
        <button type="button" data-close-modal class="rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 transition hover:border-slate-300 hover:bg-slate-50">Close</button>
      </div>
      <form class="space-y-4" data-milestone-form>
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-slate-700" for="milestone-title">Title</label>
            <input id="milestone-title" name="title" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white" placeholder="First 1,000 views" required />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700" for="milestone-date">Date</label>
            <input id="milestone-date" name="date" type="date" value="${todayValue()}" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white" required />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700" for="milestone-description">Description</label>
          <textarea id="milestone-description" name="description" rows="5" class="mt-2 w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none transition focus:border-slate-400 focus:bg-white" placeholder="Document why this milestone mattered and what changed next."></textarea>
        </div>
        <button type="submit" class="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">Save milestone</button>
      </form>
    </div>
  `);

  refs.modal
    .querySelector("[data-milestone-form]")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      await mutateWorkspace("createMilestone", {
        title: String(form.get("title")),
        date: String(form.get("date")),
        description: String(form.get("description") || "")
      });
      closeModal();
      showToast("Milestone saved.", "success");
    });
}

function openContentDetail(contentId) {
  const content = (state.workspace?.contents || []).find((item) => item.id === contentId);

  if (!content) {
    showToast("Content card not found.", "error");
    return;
  }

  const feedback = state.feedbackByContent[contentId] || [];
  const attachments = state.attachmentsByContent[contentId] || [];

  openModal(renderContentDetail(content, feedback, attachments), { wide: true });

  refs.modal
    .querySelector("[data-content-edit-form]")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      await mutateWorkspace(
        "updateContent",
        {
          contentId: String(form.get("contentId")),
          title: String(form.get("title")),
          status: String(form.get("status")),
          concept: String(form.get("concept") || ""),
          script: String(form.get("script") || ""),
          publishDate: String(form.get("publishDate") || "")
        },
        { reopenContentId: contentId }
      );
      showToast("Content updated.", "success");
    });

  refs.modal
    .querySelector("[data-inline-feedback-form]")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      await mutateWorkspace(
        "createFeedback",
        {
          contentId: String(form.get("contentId")),
          comment: String(form.get("comment"))
        },
        { reopenContentId: contentId }
      );
      showToast("Comment added.", "success");
    });

  refs.modal
    .querySelector("[data-attachment-form]")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const file = form.get("file");

      if (!(file instanceof File) || file.size === 0) {
        showToast("Choose a file to upload.", "error");
        return;
      }

      await uploadAttachment({
        contentId: String(form.get("contentId")),
        title: String(form.get("title") || ""),
        kind: String(form.get("kind") || "reference"),
        file
      });

      await loadWorkspace();
      openContentDetail(contentId);
      showToast("Attachment uploaded.", "success");
    });
}

async function uploadAttachment({ contentId, title, kind, file }) {
  const uploadMeta = await authorizedJson("/.netlify/functions/workspace-upload", {
    method: "POST",
    body: JSON.stringify({
      creatorId: state.creatorId,
      contentId,
      kind,
      fileName: file.name,
      fileType: file.type
    })
  });

  const { error } = await state.supabase.storage
    .from(uploadMeta.bucket)
    .uploadToSignedUrl(uploadMeta.path, uploadMeta.token, file, {
      cacheControl: "3600",
      contentType: file.type || "application/octet-stream",
      upsert: true
    });

  if (error) {
    throw new Error(error.message || "Upload failed.");
  }

  await authorizedJson("/.netlify/functions/workspace-save", {
    method: "POST",
    body: JSON.stringify({
      action: "registerAttachment",
      creatorId: state.creatorId,
      payload: {
        contentId,
        title,
        kind,
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        storageBucket: uploadMeta.bucket,
        storagePath: uploadMeta.path
      }
    })
  });
}

async function authorizedJson(url, options = {}) {
  const {
    data: { session }
  } = await state.supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Login required.");
  }

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${session.access_token}`);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      await state.supabase.auth.signOut();
      clearWorkspace();
      showAuthGate("Your session expired. Please sign in again.");
    }

    throw new Error(payload.error || payload.message || "Request failed.");
  }

  return payload;
}

function openModal(content, options = {}) {
  refs.modal.innerHTML = `
    <div class="workspace-modal__backdrop"></div>
    <div class="workspace-modal__panel ${options.wide ? "max-w-[1180px]" : "max-w-[780px]"} workspace-scrollbar">
      ${content}
    </div>
  `;
  refs.modal.classList.remove("hidden");
}

function closeModal() {
  refs.modal.classList.add("hidden");
  refs.modal.innerHTML = "";
}

function showAuthGate(message = "") {
  refs.authGate?.classList.remove("hidden");
  refs.layout?.classList.add("hidden");

  const note = refs.authGate?.querySelector("[data-auth-note]");
  if (note) {
    note.textContent =
      message ||
      "Sign in with the creator ID and password that the team assigned to you.";
  }

  refs.authLoginId?.focus();
}

function showLayout() {
  refs.authGate?.classList.add("hidden");
  refs.layout?.classList.remove("hidden");
}

function clearWorkspace() {
  state.session = null;
  state.creatorId = null;
  state.creators = [];
  state.workspace = null;
  state.feedbackByContent = {};
  state.attachmentsByContent = {};
  refs.sidebar.innerHTML = "";
  refs.header.innerHTML = "";
  refs.tabs.innerHTML = "";
  refs.notice.innerHTML = "";
  refs.overview.innerHTML = "";
  refs.meetings.innerHTML = "";
  refs.pipeline.innerHTML = "";
  refs.feedback.innerHTML = "";
  refs.timeline.innerHTML = "";
  closeModal();
  refs.authForm?.reset();
}

function showToast(message, tone = "success") {
  if (!refs.toast) {
    return;
  }

  refs.toast.innerHTML = `
    <div class="workspace-toast__pill" data-tone="${escapeHtml(tone)}">
      ${escapeHtml(message)}
    </div>
  `;
  refs.toast.classList.add("is-visible");

  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    refs.toast.classList.remove("is-visible");
  }, 3000);
}

function buildRecentActivity() {
  const meetings = (state.workspace?.meetings || []).map((meeting) => ({
    date: meeting.date || meeting.created_at,
    title: `${MEETING_TYPE_LABELS[meeting.meeting_type] || meeting.meeting_type} logged`,
    description: meeting.summary || "Meeting note added."
  }));

  const feedback = (state.workspace?.feedback || []).map((item) => {
    const content = (state.workspace?.contents || []).find((entry) => entry.id === item.content_id);
    return {
      date: item.created_at,
      title: `Feedback from ${item.author || "workspace user"}`,
      description: content
        ? `${content.title} · ${truncateText(item.comment, 80)}`
        : truncateText(item.comment, 80)
    };
  });

  const milestones = (state.workspace?.milestones || []).map((item) => ({
    date: item.date || item.created_at,
    title: item.title,
    description: item.description || "Milestone added."
  }));

  const attachments = (state.workspace?.attachments || []).map((item) => ({
    date: item.created_at,
    title: ATTACHMENT_LABELS[item.kind] || "Attachment uploaded",
    description: item.title || item.file_name || "New file added."
  }));

  return [...meetings, ...feedback, ...milestones, ...attachments].sort(
    (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()
  );
}

function groupBy(items, key) {
  return items.reduce((accumulator, item) => {
    const groupKey = item[key];
    const bucket = accumulator[groupKey] || [];
    bucket.push(item);
    accumulator[groupKey] = bucket;
    return accumulator;
  }, {});
}

function getRequestedCreatorId() {
  const segments = window.location.pathname.split("/").filter(Boolean);

  if (segments[0] !== "workspace") {
    return null;
  }

  const value = segments[1];

  if (!value || value === "workspace.html" || value.includes(".")) {
    return null;
  }

  return decodeURIComponent(value);
}

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(parsed);
}

function formatNumber(value) {
  return new Intl.NumberFormat("ko-KR").format(Number(value || 0));
}

function truncateText(value = "", limit = 100) {
  return value.length > limit ? `${value.slice(0, limit)}...` : value;
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

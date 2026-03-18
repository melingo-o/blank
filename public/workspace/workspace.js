import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { renderChannelPlanPanel } from "/components/channel-plan.js?v=20260311d";
import { renderSidebar } from "/components/sidebar.js?v=20260311d";
import { renderKanban } from "/components/kanban.js?v=20260311d";
import {
  renderFeedbackPanel,
  renderContentDetail,
  renderContentPartCard,
  renderContentPartEditor
} from "/components/comments.js?v=20260318b";
import {
  CONTENT_PLAN_STAGES,
  CONTENT_STATUS_OPTIONS,
  buildContentSavePayload,
  createDefaultPlanSections,
  createEmptyPart,
  hydrateContents
} from "/components/content-plan.js?v=20260311d";
import { renderTimeline } from "/components/timeline.js?v=20260311d";

const TABS = [
  { id: "overview", label: "개요" },
  { id: "strategy", label: "채널 기획" },
  { id: "meetings", label: "미팅" },
  { id: "pipeline", label: "콘텐츠기획" },
  { id: "feedback", label: "피드백" },
  { id: "timeline", label: "타임라인" }
];

const STATUS_LABELS = {
  idea: "아이디어",
  script: "대본",
  filming: "촬영",
  editing: "편집",
  published: "발행"
};

const MEETING_TYPE_LABELS = {
  kickoff: "킥오프",
  concept: "콘셉트",
  content: "콘텐츠",
  script_feedback: "대본 피드백"
};

const ATTACHMENT_LABELS = {
  thumbnail: "썸네일 업로드",
  script: "대본 파일 추가",
  pdf_note: "PDF 노트 추가",
  reference: "참고 자료 추가"
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
  activeTab: "overview",
  sidebarCollapsed: false
};

const refs = {};
let toastTimer = null;

function startWorkspaceApp() {
  collectRefs();
  state.sidebarCollapsed = readSidebarCollapsed();
  bindGlobalUI();
  boot().catch((error) => {
    console.error(error);
    showAuthGate("워크스페이스를 초기화하지 못했습니다.");
    showToast(error.message || "워크스페이스를 초기화하지 못했습니다.", "error");
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startWorkspaceApp, { once: true });
} else {
  startWorkspaceApp();
}

function collectRefs() {
  refs.boot = document.getElementById("workspace-boot");
  refs.authGate = document.getElementById("auth-gate");
  refs.layout = document.getElementById("workspace-layout");
  refs.sidebar = document.getElementById("workspace-sidebar");
  refs.header = document.getElementById("workspace-header");
  refs.tabs = document.getElementById("workspace-tabs");
  refs.notice = document.getElementById("workspace-notice");
  refs.overview = document.getElementById("panel-overview");
  refs.strategy = document.getElementById("panel-strategy");
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
      const noteViewerClose = refs.modal.querySelector("[data-close-note-viewer]");

      if (
        noteViewerClose instanceof HTMLButtonElement &&
        !noteViewerClose.closest("[data-note-viewer]")?.classList.contains("hidden")
      ) {
        event.preventDefault();
        noteViewerClose.click();
        return;
      }

      closeModal();
    }
  });
}

async function boot() {
  showBootShell();
  await loadConfig();
  await initSession();
}

async function loadConfig() {
  const response = await fetch("/.netlify/functions/workspace-config");
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "워크스페이스 설정 정보를 불러오지 못했습니다.");
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
    showToast("아이디와 비밀번호를 입력해 주세요.", "error");
    return;
  }

  if (refs.authSubmit instanceof HTMLButtonElement) {
    refs.authSubmit.disabled = true;
    refs.authSubmit.textContent = "로그인 중...";
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
      throw new Error(payload.error || "로그인에 실패했습니다.");
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
    showToast("워크스페이스에 접속했습니다.", "success");
  } catch (error) {
    console.error(error);
    showToast(error.message || "로그인에 실패했습니다.", "error");
  } finally {
    if (refs.authSubmit instanceof HTMLButtonElement) {
      refs.authSubmit.disabled = false;
      refs.authSubmit.textContent = "워크스페이스 열기";
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

  payload.contents = hydrateContents(payload.contents || []);
  state.workspace = payload;
  state.feedbackByContent = groupBy(payload.feedback || [], "content_id");
  state.attachmentsByContent = groupBy(
    (payload.attachments || []).filter((item) => item.content_id),
    "content_id"
  );
  renderWorkspace();
}

function renderWorkspace() {
  const dailyLogs = buildDailyLogs();
  const growthMetrics = buildGrowthMetrics(dailyLogs);

  renderHeader();
  renderTabs();
  renderSidebar({
    root: refs.sidebar,
    creator: state.workspace.creator,
    stats: state.workspace.stats,
    user: state.session,
    activeTab: state.activeTab,
    creators: state.creators,
    collapsed: state.sidebarCollapsed
  });

  bindSidebarEvents();
  applySidebarState();
  renderOverview();
  renderChannelPlanPanel({
    root: refs.strategy,
    creator: state.workspace.creator
  });
  renderMeetings();
  renderKanban({
    root: refs.pipeline,
    contents: state.workspace.contents || [],
    feedbackByContent: state.feedbackByContent,
    attachmentsByContent: state.attachmentsByContent,
    onOpenContent: openContentDetail,
    onCreateContent: openCreateContentModal,
    onDeleteContent: handleDeleteContent
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
    dailyLogs,
    growthMetrics,
    onCreateMilestone: openMilestoneModal
  });

  setActiveTab(state.activeTab);
  refs.notice.innerHTML = "";
}

function renderHeader() {
  const creator = state.workspace?.creator || {};

  refs.header.innerHTML = `
    <div class="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">크리에이터 전용 워크스페이스</p>
          <h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            ${escapeHtml(creator.name || "크리에이터")} <span class="text-slate-400">/ ${escapeHtml(creator.channel_name || creator.id || "")}</span>
          </h1>
        </div>
        <div class="grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            data-header-action="meeting"
            class="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            미팅 추가
          </button>
          <button
            type="button"
            data-header-action="content"
            class="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            콘텐츠 추가
          </button>
          <button
            type="button"
            data-header-action="milestone"
            class="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            마일스톤 추가
          </button>
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

  refs.sidebar.querySelector("[data-sidebar-toggle]")?.addEventListener("click", () => {
    toggleSidebarCollapsed();
  });

  refs.sidebar.querySelector("[data-sign-out]")?.addEventListener("click", async () => {
    await state.supabase.auth.signOut();
    clearWorkspace();
    showAuthGate("로그아웃되었습니다.");
    showToast("로그아웃되었습니다.", "success");
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

function readSidebarCollapsed() {
  if (!window.localStorage) {
    return false;
  }

  return window.localStorage.getItem("workspaceSidebarCollapsed") === "true";
}

function persistSidebarCollapsed() {
  if (!window.localStorage) {
    return;
  }

  window.localStorage.setItem(
    "workspaceSidebarCollapsed",
    state.sidebarCollapsed ? "true" : "false"
  );
}

function applySidebarState() {
  refs.layout?.classList.toggle(
    "workspace-layout--sidebar-collapsed",
    Boolean(state.sidebarCollapsed)
  );
}

function toggleSidebarCollapsed() {
  state.sidebarCollapsed = !state.sidebarCollapsed;
  persistSidebarCollapsed();
  renderWorkspace();
}

function renderOverview() {
  const creator = state.workspace?.creator || {};
  const contents = state.workspace?.contents || [];
  const meetings = state.workspace?.meetings || [];
  const attachments = state.workspace?.attachments || [];
  const activities = buildRecentActivity().slice(0, 8);
  const pipelineSummary = CONTENT_PLAN_STAGES.map((stage) => {
    let total = 0;

    if (stage.id === "idea") {
      total = contents.filter((item) => Boolean(item.planSections?.idea)).length;
    } else if (stage.id === "thumbnail") {
      total = contents.filter(
        (item) =>
          Boolean(item.planSections?.thumbnail) ||
          Boolean(item.thumbnail_signed_url || item.thumbnail_url)
      ).length;
    } else {
      total = contents.filter((item) => {
        const sectionFilled = Boolean(item.planSections?.[stage.id]);
        const partFilled = (item.parts || []).some((part) => Boolean(part?.[stage.id]));
        return sectionFilled || partFilled;
      }).length;
    }

    return {
      label: stage.label,
      total
    };
  });

  refs.overview.innerHTML = `
    <div class="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <section class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_34px_rgba(15,23,42,0.05)]">
        <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">개요</p>
        <h2 class="mt-2 text-2xl font-semibold text-slate-950">${escapeHtml(creator.name || "크리에이터 워크스페이스")}</h2>
        <div class="mt-6 grid gap-4 md:grid-cols-3">
          <div class="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
            <p class="text-xs text-slate-500">채널 콘셉트</p>
            <p class="mt-3 text-sm leading-6 text-slate-700">${escapeHtml(creator.channel_concept || "채널 콘셉트를 기록하면 모든 의사결정을 같은 방향으로 맞출 수 있습니다.")}</p>
          </div>
          <div class="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
            <p class="text-xs text-slate-500">합류일</p>
            <p class="mt-3 text-sm font-semibold text-slate-900">${escapeHtml(formatDate(creator.join_date))}</p>
          </div>
          <div class="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
            <p class="text-xs text-slate-500">최근 동기화</p>
            <p class="mt-3 text-sm font-semibold text-slate-900">${escapeHtml(formatDate(meetings[0]?.date || contents[0]?.updated_at || creator.updated_at || creator.created_at))}</p>
          </div>
        </div>

        <div class="mt-6">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">최근 활동</p>
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
                      미팅, 댓글, 마일스톤이 쌓이면 활동 기록이 이곳에 정리됩니다.
                    </div>
                  `
            }
          </div>
        </div>
      </section>

      <section class="space-y-6">
        <div class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_34px_rgba(15,23,42,0.05)]">
          <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">파이프라인 현황</p>
          <div class="mt-5 grid gap-3">
            ${pipelineSummary
              .map(
                (item) => `
                  <div class="flex items-center justify-between rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
                    <span class="text-sm font-medium text-slate-600">${escapeHtml(item.label)}</span>
                    <span class="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500">${item.total}</span>
                  </div>
                `
              )
              .join("")}
          </div>
        </div>

        <div class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_34px_rgba(15,23,42,0.05)]">
          <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">최근 첨부 파일</p>
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
                            <p class="mt-1 truncate text-xs text-slate-500">${escapeHtml(ATTACHMENT_LABELS[attachment.kind] || attachment.kind)} · ${escapeHtml(formatDate(attachment.created_at))}</p>
                          </div>
                          <span class="text-slate-400">&#8599;</span>
                        </a>
                      `
                    )
                    .join("")
                : `
                    <div class="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                      각 콘텐츠 기획안에서 썸네일, 대본, PDF 노트를 업로드할 수 있습니다.
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
          <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">미팅 기록</p>
          <h2 class="mt-2 text-xl font-semibold text-slate-900">노션 스타일 미팅 데이터베이스</h2>
        </div>
        <button
          type="button"
          data-action="new-meeting"
          class="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          미팅 추가
        </button>
      </div>

      <div class="workspace-scrollbar mt-6 overflow-x-auto rounded-[24px] border border-slate-200">
        <table class="workspace-meeting-table min-w-full bg-white text-left">
          <thead class="bg-slate-50">
            <tr class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <th class="px-4 py-4">날짜</th>
              <th class="px-4 py-4">미팅 유형</th>
              <th class="px-4 py-4">요약</th>
              <th class="px-4 py-4">노트</th>
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
                            <p class="workspace-note-clamp whitespace-pre-wrap leading-6 text-slate-600">${escapeHtml(meeting.notes || "아직 기록된 노트가 없습니다.")}</p>
                          </td>
                        </tr>
                      `
                    )
                    .join("")
                : `
                    <tr>
                      <td colspan="4" class="px-4 py-10 text-center text-sm text-slate-400">
                        킥오프, 콘셉트 리뷰, 대본 피드백 미팅을 추가해 주세요.
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
      워크스페이스를 불러오는 중입니다...
    </div>
  `;
}

function renderNoAccess() {
  refs.header.innerHTML = `
    <div class="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div class="rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_18px_34px_rgba(15,23,42,0.05)]">
        <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">연결된 워크스페이스 없음</p>
        <h1 class="mt-3 text-2xl font-semibold text-slate-950">로그인은 되었지만 연결된 크리에이터 워크스페이스가 없습니다.</h1>
        <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
          회사 관리자에게 <code class="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">login_email</code> 필드로 현재 Supabase Auth 이메일을 연결해 달라고 요청해 주세요.
        </p>
      </div>
    </div>
  `;
  refs.tabs.innerHTML = "";
  refs.sidebar.innerHTML = "";
  refs.overview.innerHTML = "";
  refs.strategy.innerHTML = "";
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

async function handleAddFeedback({ contentId, comment }) {
  await mutateWorkspace("createFeedback", {
    contentId,
    comment
  });
  showToast("피드백이 저장되었습니다.", "success");
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

async function handleDeleteContent(contentId) {
  if (!contentId) {
    return;
  }

  const shouldDelete = window.confirm(
    "이 콘텐츠 기획안을 삭제할까요?\n등록된 피드백과 첨부 파일도 함께 정리됩니다."
  );

  if (!shouldDelete) {
    return;
  }

  try {
    await mutateWorkspace("deleteContent", {
      contentId
    });
    showToast("콘텐츠 기획안이 삭제되었습니다.", "success");
  } catch (error) {
    console.error(error);
    showToast(error.message || "콘텐츠 기획안을 삭제하지 못했습니다.", "error");
  }
}

function openMeetingModal() {
  openModal(`
    <div class="space-y-5">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">새 미팅</p>
          <h2 class="mt-2 text-2xl font-semibold text-slate-950">최근 미팅 내용을 기록하세요</h2>
        </div>
        <button type="button" data-close-modal class="rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 transition hover:border-slate-300 hover:bg-slate-50">닫기</button>
      </div>
      <form class="space-y-4" data-meeting-form>
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-slate-700" for="meeting-date">날짜</label>
            <input id="meeting-date" name="date" type="date" value="${todayValue()}" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white" required />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700" for="meeting-type">미팅 유형</label>
            <select id="meeting-type" name="meetingType" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white" required>
              <option value="kickoff">킥오프</option>
              <option value="concept">콘셉트</option>
              <option value="content">콘텐츠</option>
              <option value="script_feedback">대본 피드백</option>
            </select>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700" for="meeting-summary">요약</label>
          <input id="meeting-summary" name="summary" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white" placeholder="핵심 결정이나 결과를 적어 주세요" required />
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700" for="meeting-notes">노트</label>
          <textarea id="meeting-notes" name="notes" rows="7" class="mt-2 w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none transition focus:border-slate-400 focus:bg-white" placeholder="상세 메모, 미해결 질문, 다음 액션을 적어 주세요."></textarea>
        </div>
        <button type="submit" class="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">미팅 저장</button>
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
      showToast("미팅이 저장되었습니다.", "success");
    });
}

function renderExpandableTextareaField({
  id,
  name,
  label,
  value,
  placeholder,
  viewerKey = "",
  viewerTitle = "",
  viewerCaption = "",
  rows = 6,
  wrapperClass = "",
  showViewerButton = Boolean(viewerKey)
}) {
  const viewerButton = showViewerButton && viewerKey
    ? `
        <button
          type="button"
          data-open-note-viewer
          data-viewer-target="${escapeHtml(viewerKey)}"
          class="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-100"
        >
          전체 보기
        </button>
      `
    : "";
  const viewerAttributes = viewerKey
    ? `
        data-viewer-source
        data-viewer-key="${escapeHtml(viewerKey)}"
        data-viewer-label="${escapeHtml(label)}"
        data-viewer-title="${escapeHtml(viewerTitle || label)}"
        data-viewer-caption="${escapeHtml(viewerCaption)}"
      `
    : "";

  return `
    <div${wrapperClass ? ` class="${wrapperClass}"` : ""}>
      <div class="flex items-center justify-between gap-3">
        <label class="block text-sm font-medium text-slate-700" for="${escapeHtml(id)}">${escapeHtml(label)}</label>
        ${viewerButton}
      </div>
      <textarea
        id="${escapeHtml(id)}"
        name="${escapeHtml(name)}"
        rows="${rows}"
        ${viewerAttributes}
        class="mt-2 min-h-[168px] w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none transition focus:border-slate-400 focus:bg-white"
        placeholder="${escapeHtml(placeholder)}"
      >${escapeHtml(value || "")}</textarea>
    </div>
  `;
}

function renderContentComposer({
  mode,
  title,
  status,
  publishDate,
  sections,
  parts
}) {
  const safeSections = createDefaultPlanSections(sections);
  const submitLabel = mode === "create" ? "기획안 생성" : "기획안 저장";
  const eyebrow = mode === "create" ? "새 콘텐츠 기획안" : "콘텐츠 기획안 수정";
  const heading =
    mode === "create"
      ? "영상 구조와 파트를 함께 설계하세요"
      : "영상 구조와 파트 메모를 업데이트하세요";

  return `
    <div class="space-y-5">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">${escapeHtml(eyebrow)}</p>
          <h2 class="mt-2 text-2xl font-semibold text-slate-950">${escapeHtml(heading)}</h2>
        </div>
        <button type="button" data-close-modal class="rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 transition hover:border-slate-300 hover:bg-slate-50">닫기</button>
      </div>

      <form class="space-y-5" data-content-form>
        <div class="rounded-[26px] border border-slate-200 bg-white p-4">
          <div>
            <label class="block text-sm font-medium text-slate-700" for="content-title">제목</label>
            <input
              id="content-title"
              name="title"
              value="${escapeHtml(title || "")}"
              class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              placeholder="ADHD 진단 스토리"
              required
            />
          </div>

          <div class="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label class="block text-sm font-medium text-slate-700" for="content-status">현재 단계</label>
              <select id="content-status" name="status" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white">
                ${CONTENT_STATUS_OPTIONS.map((option) => `<option value="${escapeHtml(option.id)}" ${option.id === status ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700" for="content-publish-date">발행일</label>
              <input
                id="content-publish-date"
                name="publishDate"
                type="date"
                value="${escapeHtml(publishDate || "")}"
                class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </div>
          </div>
        </div>

        <div class="rounded-[26px] border border-slate-200 bg-white p-4">
          <div class="grid gap-4 xl:grid-cols-2">
            ${renderExpandableTextareaField({
              id: "content-idea",
              name: "sectionIdea",
              label: "아이디어 메모",
              value: safeSections.idea,
              placeholder: "핵심 메시지, 감정선, 훅",
              viewerKey: "composer:section:idea",
              viewerTitle: "아이디어 메모",
              viewerCaption: "전체 메모"
            })}
            ${renderExpandableTextareaField({
              id: "content-thumbnail-note",
              name: "sectionThumbnail",
              label: "썸네일 메모",
              value: safeSections.thumbnail,
              placeholder: "카피, 표정, 색감, 참고 썸네일",
              viewerKey: "composer:section:thumbnail",
              viewerTitle: "썸네일 메모",
              viewerCaption: "전체 메모"
            })}
            ${renderExpandableTextareaField({
              id: "content-script-summary",
              name: "sectionScript",
              label: "대본 전체 메모",
              value: safeSections.script,
              placeholder: "영상 전체 흐름과 대본 방향",
              viewerKey: "composer:section:script",
              viewerTitle: "대본 전체 메모",
              viewerCaption: "전체 메모"
            })}
            ${renderExpandableTextareaField({
              id: "content-filming-summary",
              name: "sectionFilming",
              label: "촬영 전체 메모",
              value: safeSections.filming,
              placeholder: "촬영 장소, 구도, 필요한 소스",
              viewerKey: "composer:section:filming",
              viewerTitle: "촬영 전체 메모",
              viewerCaption: "전체 메모"
            })}
            ${renderExpandableTextareaField({
              id: "content-editing-summary",
              name: "sectionEditing",
              label: "편집 전체 메모",
              value: safeSections.editing,
              placeholder: "컷 편집, 자막, 사운드, 리듬",
              viewerKey: "composer:section:editing",
              viewerTitle: "편집 전체 메모",
              viewerCaption: "전체 메모",
              wrapperClass: "xl:col-span-2"
            })}
          </div>
        </div>

        ${renderContentPartEditor(parts || [])}

        <button type="submit" class="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">${escapeHtml(submitLabel)}</button>
      </form>
    </div>
  `;
}

function bindPartEditor(form) {
  if (!form) {
    return;
  }

  const container = form.querySelector("[data-parts-container]");

  if (!(container instanceof HTMLElement)) {
    return;
  }

  const renumber = () => {
    container.querySelectorAll("[data-part-card]").forEach((card, index) => {
      const order = card.querySelector("[data-part-order]");

      if (order) {
        order.textContent = `Part ${String(index + 1).padStart(2, "0")}`;
      }
    });
  };

  form.querySelector("[data-add-part]")?.addEventListener("click", () => {
    container.insertAdjacentHTML(
      "beforeend",
      renderContentPartCard(createEmptyPart(), container.querySelectorAll("[data-part-card]").length)
    );
    renumber();
  });

  container.addEventListener("click", (event) => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const removeButton = target.closest("[data-remove-part]");

    if (!removeButton) {
      return;
    }

    const card = removeButton.closest("[data-part-card]");
    card?.remove();

    if (container.querySelectorAll("[data-part-card]").length === 0) {
      container.insertAdjacentHTML("beforeend", renderContentPartCard(createEmptyPart(), 0));
    }

    renumber();
  });
}

function buildNoteViewerMarkup() {
  return `
    <div class="workspace-note-viewer hidden" data-note-viewer>
      <div class="workspace-note-viewer__backdrop" data-note-viewer-backdrop></div>
      <div class="workspace-note-viewer__panel workspace-scrollbar">
        <button
          type="button"
          data-note-viewer-prev
          class="workspace-note-viewer__nav workspace-note-viewer__nav--prev"
        >
          <span aria-hidden="true">&larr;</span>
          <span class="hidden sm:inline">이전 파트</span>
        </button>
        <button
          type="button"
          data-note-viewer-next
          class="workspace-note-viewer__nav workspace-note-viewer__nav--next"
        >
          <span class="hidden sm:inline">다음 파트</span>
          <span aria-hidden="true">&rarr;</span>
        </button>

        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500" data-note-viewer-caption>
              전체 메모
            </p>
            <h3 class="mt-2 text-2xl font-semibold text-slate-950" data-note-viewer-title>
              메모 전체 보기
            </h3>
          </div>
          <div class="flex items-center gap-2">
            <p class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-500" data-note-viewer-index>1 / 1</p>
            <button
              type="button"
              data-close-note-viewer
              class="rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
            >
              닫기
            </button>
          </div>
        </div>

        <div data-note-viewer-single>
          <textarea
            data-note-viewer-textarea
            rows="18"
            class="mt-6 min-h-[420px] w-full rounded-[28px] border border-slate-200 bg-slate-50 px-5 py-4 text-base leading-8 text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
          ></textarea>
        </div>

        <div class="mt-6 hidden gap-4 xl:grid-cols-2" data-note-viewer-part>
          <div class="workspace-note-viewer__field">
            <label class="text-sm font-medium text-slate-700" for="note-viewer-part-idea">아이디어</label>
            <textarea id="note-viewer-part-idea" data-part-viewer-field="idea" rows="8" class="mt-2 min-h-[220px] w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"></textarea>
          </div>
          <div class="workspace-note-viewer__field">
            <label class="text-sm font-medium text-slate-700" for="note-viewer-part-script">대본</label>
            <textarea id="note-viewer-part-script" data-part-viewer-field="script" rows="8" class="mt-2 min-h-[220px] w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"></textarea>
          </div>
          <div class="workspace-note-viewer__field">
            <label class="text-sm font-medium text-slate-700" for="note-viewer-part-filming">촬영 메모</label>
            <textarea id="note-viewer-part-filming" data-part-viewer-field="filming" rows="8" class="mt-2 min-h-[220px] w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"></textarea>
          </div>
          <div class="workspace-note-viewer__field">
            <label class="text-sm font-medium text-slate-700" for="note-viewer-part-editing">편집 메모</label>
            <textarea id="note-viewer-part-editing" data-part-viewer-field="editing" rows="8" class="mt-2 min-h-[220px] w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"></textarea>
          </div>
        </div>
      </div>
    </div>
  `;
}

function bindExpandedNoteViewer(modalRoot) {
  if (!(modalRoot instanceof HTMLElement)) {
    return;
  }

  const panel = modalRoot.querySelector(".workspace-modal__panel");

  if (!(panel instanceof HTMLElement)) {
    return;
  }

  if (!panel.querySelector("[data-note-viewer]")) {
    panel.insertAdjacentHTML("beforeend", buildNoteViewerMarkup());
  }

  const viewer = panel.querySelector("[data-note-viewer]");
  const viewerSingle = panel.querySelector("[data-note-viewer-single]");
  const viewerPart = panel.querySelector("[data-note-viewer-part]");
  const viewerTextarea = panel.querySelector("[data-note-viewer-textarea]");
  const viewerTitle = panel.querySelector("[data-note-viewer-title]");
  const viewerCaption = panel.querySelector("[data-note-viewer-caption]");
  const viewerIndex = panel.querySelector("[data-note-viewer-index]");
  const prevButton = panel.querySelector("[data-note-viewer-prev]");
  const nextButton = panel.querySelector("[data-note-viewer-next]");
  const partViewerFields = Object.fromEntries(
    Array.from(panel.querySelectorAll("[data-part-viewer-field]")).map((field) => [
      field.getAttribute("data-part-viewer-field"),
      field
    ])
  );

  if (
    !(viewer instanceof HTMLElement) ||
    !(viewerSingle instanceof HTMLElement) ||
    !(viewerPart instanceof HTMLElement) ||
    !(viewerTextarea instanceof HTMLTextAreaElement) ||
    !(viewerTitle instanceof HTMLElement) ||
    !(viewerCaption instanceof HTMLElement) ||
    !(viewerIndex instanceof HTMLElement) ||
    !(prevButton instanceof HTMLButtonElement) ||
    !(nextButton instanceof HTMLButtonElement)
  ) {
    return;
  }

  const partFieldConfig = [
    { key: "idea", name: "partIdea", label: "아이디어" },
    { key: "script", name: "partScript", label: "대본" },
    { key: "filming", name: "partFilming", label: "촬영 메모" },
    { key: "editing", name: "partEditing", label: "편집 메모" }
  ];
  const getSources = () =>
    Array.from(panel.querySelectorAll("[data-viewer-source]")).filter(
      (node) => node instanceof HTMLTextAreaElement
    );
  const getPartCards = () =>
    Array.from(panel.querySelectorAll("[data-part-card]")).filter(
      (node) => node instanceof HTMLElement
    );
  const getPartField = (card, name) =>
    card.querySelector(`textarea[name="${name}"]`);

  let viewerMode = "single";
  let currentIndex = -1;

  const syncCurrentSource = () => {
    if (viewerMode !== "single" || currentIndex < 0) {
      return;
    }

    const currentSource = getSources()[currentIndex];

    if (currentSource instanceof HTMLTextAreaElement) {
      currentSource.value = viewerTextarea.value;
    }
  };

  const syncCurrentPart = () => {
    if (viewerMode !== "part" || currentIndex < 0) {
      return;
    }

    const currentCard = getPartCards()[currentIndex];

    if (!(currentCard instanceof HTMLElement)) {
      return;
    }

    partFieldConfig.forEach(({ key, name }) => {
      const source = getPartField(currentCard, name);
      const editor = partViewerFields[key];

      if (
        source instanceof HTMLTextAreaElement &&
        editor instanceof HTMLTextAreaElement
      ) {
        source.value = editor.value;
      }
    });
  };

  const getSourceTitle = (source) => {
    const fallbackTitle = source.dataset.viewerTitle || source.dataset.viewerLabel || "메모";
    const partCard = source.closest("[data-part-card]");

    if (!(partCard instanceof HTMLElement)) {
      return fallbackTitle;
    }

    const partTitleInput = partCard.querySelector('input[name="partTitle"]');
    const partOrder = partCard.querySelector("[data-part-order]")?.textContent?.trim();
    const partTitle =
      partTitleInput instanceof HTMLInputElement
        ? partTitleInput.value.trim()
        : "";

    return `${partTitle || partOrder || "파트"} · ${source.dataset.viewerLabel || fallbackTitle}`;
  };

  const getSourceCaption = (source) => {
    if (source.closest("[data-part-card]")) {
      return source.dataset.viewerCaption || "파트 메모";
    }

    return source.dataset.viewerCaption || "전체 메모";
  };

  const getPartTitle = (card) => {
    const partTitleInput = card.querySelector('input[name="partTitle"]');
    const partOrder = card.querySelector("[data-part-order]")?.textContent?.trim();
    const partTitle =
      partTitleInput instanceof HTMLInputElement
        ? partTitleInput.value.trim()
        : "";

    return partTitle || partOrder || "파트";
  };

  const updateNavState = (total) => {
    const hidden = total <= 1;

    prevButton.disabled = currentIndex <= 0;
    nextButton.disabled = currentIndex >= total - 1;
    prevButton.classList.toggle("hidden", hidden);
    nextButton.classList.toggle("hidden", hidden);

    [prevButton, nextButton].forEach((button) => {
      button.classList.toggle("opacity-40", button.disabled);
      button.classList.toggle("cursor-not-allowed", button.disabled);
    });
  };

  const renderSingleViewerState = () => {
    const sources = getSources();

    if (currentIndex < 0) {
      return;
    }

    if (!sources.length) {
      viewer.classList.add("hidden");
      currentIndex = -1;
      return;
    }

    viewerMode = "single";
    viewerSingle.classList.remove("hidden");
    viewerPart.classList.add("hidden");

    currentIndex = Math.max(0, Math.min(currentIndex, sources.length - 1));
    const source = sources[currentIndex];

    viewerTitle.textContent = getSourceTitle(source);
    viewerCaption.textContent = getSourceCaption(source);
    viewerTextarea.value = source.value;
    viewerIndex.textContent = `${currentIndex + 1} / ${sources.length}`;
    updateNavState(sources.length);
  };

  const renderPartViewerState = () => {
    const cards = getPartCards();

    if (!cards.length) {
      viewer.classList.add("hidden");
      currentIndex = -1;
      return;
    }

    viewerMode = "part";
    viewerSingle.classList.add("hidden");
    viewerPart.classList.remove("hidden");

    currentIndex = Math.max(0, Math.min(currentIndex, cards.length - 1));
    const card = cards[currentIndex];

    viewerTitle.textContent = `${getPartTitle(card)} 전체 메모`;
    viewerCaption.textContent = "파트 메모";
    viewerIndex.textContent = `${currentIndex + 1} / ${cards.length}`;
    updateNavState(cards.length);

    partFieldConfig.forEach(({ key, name }) => {
      const source = getPartField(card, name);
      const editor = partViewerFields[key];

      if (editor instanceof HTMLTextAreaElement) {
        editor.value = source instanceof HTMLTextAreaElement ? source.value : "";
      }
    });
  };

  const openSingleViewerAt = (index) => {
    const sources = getSources();

    if (!sources.length) {
      return;
    }

    currentIndex = Math.max(0, Math.min(index, sources.length - 1));
    viewer.classList.remove("hidden");
    renderSingleViewerState();
    viewerTextarea.focus();
    viewerTextarea.setSelectionRange(
      viewerTextarea.value.length,
      viewerTextarea.value.length
    );
  };

  const openPartViewerAt = (index) => {
    const cards = getPartCards();

    if (!cards.length) {
      return;
    }

    currentIndex = Math.max(0, Math.min(index, cards.length - 1));
    viewer.classList.remove("hidden");
    renderPartViewerState();

    const firstField = partViewerFields.idea;
    if (firstField instanceof HTMLTextAreaElement) {
      firstField.focus();
      firstField.setSelectionRange(firstField.value.length, firstField.value.length);
    }
  };

  const closeViewer = () => {
    syncCurrentSource();
    syncCurrentPart();
    viewer.classList.add("hidden");
    currentIndex = -1;
  };

  viewerTextarea.addEventListener("input", () => {
    syncCurrentSource();
  });
  Object.values(partViewerFields).forEach((field) => {
    if (field instanceof HTMLTextAreaElement) {
      field.addEventListener("input", () => {
        syncCurrentPart();
      });
    }
  });

  panel.addEventListener("click", (event) => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const openButton = target.closest("[data-open-note-viewer]");

    if (openButton instanceof HTMLElement) {
      const viewerTarget = openButton.getAttribute("data-viewer-target");
      const sources = getSources();
      const nextIndex = sources.findIndex(
        (source) => source.dataset.viewerKey === viewerTarget
      );

      if (nextIndex >= 0) {
        openSingleViewerAt(nextIndex);
      }

      return;
    }

    const partOpenButton = target.closest("[data-open-part-note-viewer]");

    if (partOpenButton instanceof HTMLElement) {
      const partCard = partOpenButton.closest("[data-part-card]");
      const cards = getPartCards();
      const nextIndex = cards.indexOf(partCard);

      if (nextIndex >= 0) {
        openPartViewerAt(nextIndex);
      }

      return;
    }

    if (
      target.closest("[data-close-note-viewer]") ||
      target.matches("[data-note-viewer-backdrop]")
    ) {
      closeViewer();
      return;
    }

    if (target.closest("[data-note-viewer-prev]")) {
      syncCurrentSource();
      syncCurrentPart();

      if (viewerMode === "part") {
        openPartViewerAt(currentIndex - 1);
      } else {
        openSingleViewerAt(currentIndex - 1);
      }

      return;
    }

    if (target.closest("[data-note-viewer-next]")) {
      syncCurrentSource();
      syncCurrentPart();

      if (viewerMode === "part") {
        openPartViewerAt(currentIndex + 1);
      } else {
        openSingleViewerAt(currentIndex + 1);
      }
    }
  });
}

function bindAttachmentForm(form, contentId) {
  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  const fileInput = form.querySelector("[data-attachment-file-input]");
  const fileLabel = form.querySelector("[data-attachment-file-label]");
  const fileName = form.querySelector("[data-attachment-file-name]");
  const submitButton = form.querySelector("[data-attachment-submit]");
  const kindSelect = form.querySelector('select[name="kind"]');

  const syncAccept = () => {
    if (!(fileInput instanceof HTMLInputElement)) {
      return;
    }

    fileInput.accept =
      kindSelect instanceof HTMLSelectElement && kindSelect.value === "thumbnail"
        ? "image/*"
        : "";
  };

  const syncFileState = () => {
    const selectedFile =
      fileInput instanceof HTMLInputElement ? fileInput.files?.[0] : null;

    if (fileLabel instanceof HTMLElement) {
      fileLabel.textContent = selectedFile ? "파일 변경" : "파일 선택";
    }

    if (fileName instanceof HTMLElement) {
      fileName.textContent = selectedFile
        ? `선택된 파일: ${selectedFile.name}`
        : "선택된 파일이 없습니다.";
    }
  };

  syncAccept();
  syncFileState();

  kindSelect?.addEventListener("change", syncAccept);
  fileInput?.addEventListener("change", syncFileState);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const file = formData.get("file");
    const kind = String(formData.get("kind") || "reference");

    if (!(file instanceof File) || file.size === 0) {
      showToast("업로드할 파일을 선택해 주세요.", "error");
      return;
    }

    if (kind === "thumbnail" && !file.type.startsWith("image/")) {
      showToast("썸네일은 이미지 파일만 업로드할 수 있습니다.", "error");
      return;
    }

    const originalLabel =
      submitButton instanceof HTMLButtonElement
        ? submitButton.textContent
        : null;

    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = true;
      submitButton.textContent = "업로드 중...";
    }

    try {
      await uploadAttachment({
        contentId: String(formData.get("contentId")),
        title: String(formData.get("title") || ""),
        kind,
        file
      });

      await loadWorkspace();
      openContentDetail(contentId);
      showToast("첨부 파일이 업로드되었습니다.", "success");
    } catch (error) {
      console.error(error);
      showToast(error.message || "첨부 파일 업로드에 실패했습니다.", "error");
    } finally {
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = false;
        submitButton.textContent = originalLabel || "첨부 업로드";
      }
    }
  });
}

function collectContentFormPayload(formElement) {
  const form = new FormData(formElement);
  const partIds = form.getAll("partId");
  const partTitles = form.getAll("partTitle");
  const partIdeas = form.getAll("partIdea");
  const partScripts = form.getAll("partScript");
  const partFilmings = form.getAll("partFilming");
  const partEditings = form.getAll("partEditing");
  const parts = partIds.map((value, index) =>
    createEmptyPart({
      id: String(value || ""),
      title: String(partTitles[index] || ""),
      idea: String(partIdeas[index] || ""),
      script: String(partScripts[index] || ""),
      filming: String(partFilmings[index] || ""),
      editing: String(partEditings[index] || "")
    })
  );

  return buildContentSavePayload({
    contentId: String(form.get("contentId") || ""),
    title: String(form.get("title") || ""),
    status: String(form.get("status") || "idea"),
    publishDate: String(form.get("publishDate") || ""),
    sections: {
      idea: String(form.get("sectionIdea") || ""),
      thumbnail: String(form.get("sectionThumbnail") || ""),
      script: String(form.get("sectionScript") || ""),
      filming: String(form.get("sectionFilming") || ""),
      editing: String(form.get("sectionEditing") || "")
    },
    parts
  });
}

function openCreateContentModal() {
  openModal(
    renderContentComposer({
      mode: "create",
      title: "",
      status: "idea",
      publishDate: "",
      sections: createDefaultPlanSections(),
      parts: [createEmptyPart()]
    }),
    { wide: true }
  );

  const form = refs.modal?.querySelector("[data-content-form]");
  bindPartEditor(form);
  bindExpandedNoteViewer(refs.modal);

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = collectContentFormPayload(event.currentTarget);
    await mutateWorkspace("createContent", payload);
    closeModal();
    showToast("콘텐츠 기획안이 생성되었습니다.", "success");
  });
}

function openMilestoneModal() {
  openModal(`
    <div class="space-y-5">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">새 마일스톤</p>
          <h2 class="mt-2 text-2xl font-semibold text-slate-950">성장 순간을 기록하세요</h2>
        </div>
        <button type="button" data-close-modal class="rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 transition hover:border-slate-300 hover:bg-slate-50">닫기</button>
      </div>
      <form class="space-y-4" data-milestone-form>
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-slate-700" for="milestone-title">제목</label>
            <input id="milestone-title" name="title" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white" placeholder="첫 1,000뷰 달성" required />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700" for="milestone-date">날짜</label>
            <input id="milestone-date" name="date" type="date" value="${todayValue()}" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white" required />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700" for="milestone-description">설명</label>
          <textarea id="milestone-description" name="description" rows="5" class="mt-2 w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none transition focus:border-slate-400 focus:bg-white" placeholder="이 마일스톤이 왜 중요했고 이후 무엇이 달라졌는지 적어 주세요."></textarea>
        </div>
        <button type="submit" class="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">마일스톤 저장</button>
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
      showToast("마일스톤이 저장되었습니다.", "success");
    });
}

function openContentDetail(contentId) {
  const content = (state.workspace?.contents || []).find((item) => item.id === contentId);

  if (!content) {
    showToast("콘텐츠 기획안을 찾을 수 없습니다.", "error");
    return;
  }

  const feedback = state.feedbackByContent[contentId] || [];
  const attachments = state.attachmentsByContent[contentId] || [];

  openModal(renderContentDetail(content, feedback, attachments), { wide: true });
  bindPartEditor(refs.modal?.querySelector("[data-content-edit-form]"));
  bindExpandedNoteViewer(refs.modal);

  refs.modal
    .querySelector("[data-content-edit-form]")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = collectContentFormPayload(event.currentTarget);
      await mutateWorkspace(
        "updateContent",
        payload,
        { reopenContentId: contentId }
      );
      showToast("콘텐츠 기획안이 업데이트되었습니다.", "success");
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
      showToast("댓글이 추가되었습니다.", "success");
    });

  bindAttachmentForm(refs.modal?.querySelector("[data-attachment-form]"), contentId);
}

async function uploadAttachment({ contentId, title, kind, file }) {
  if (kind === "thumbnail" && !file.type.startsWith("image/")) {
    throw new Error("썸네일은 이미지 파일만 업로드할 수 있습니다.");
  }

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

  const uploadResponse = await fetch(uploadMeta.signedUrl, {
    method: "PUT",
    headers: {
      "content-type": file.type || "application/octet-stream",
      "x-upsert": "true"
    },
    body: file
  });

  if (!uploadResponse.ok) {
    const uploadErrorText = await uploadResponse.text().catch(() => "");
    throw new Error(uploadErrorText || "업로드에 실패했습니다.");
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
    throw new Error("로그인이 필요합니다.");
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
      showAuthGate("세션이 만료되었습니다. 다시 로그인해 주세요.");
    }

    throw new Error(payload.error || payload.message || "요청 처리에 실패했습니다.");
  }

  return payload;
}

function openModal(content, options = {}) {
  refs.modal.innerHTML = `
    <div class="workspace-modal__backdrop"></div>
    <div class="workspace-modal__panel ${options.wide ? "workspace-modal__panel--wide" : "workspace-modal__panel--narrow"} workspace-scrollbar">
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
  refs.boot?.classList.add("hidden");
  refs.authGate?.classList.remove("hidden");
  refs.layout?.classList.add("hidden");

  const note = refs.authGate?.querySelector("[data-auth-note]");
  if (note) {
    note.textContent =
      message ||
      "발급받은 아이디와 비밀번호를 입력해 주세요.";
  }

  refs.authLoginId?.focus();
}

function showLayout() {
  refs.boot?.classList.add("hidden");
  refs.authGate?.classList.add("hidden");
  refs.layout?.classList.remove("hidden");
}

function showBootShell() {
  refs.boot?.classList.remove("hidden");
  refs.authGate?.classList.add("hidden");
  refs.layout?.classList.add("hidden");
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
  refs.strategy.innerHTML = "";
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
  return buildActivityEntries();
}

function buildActivityEntries() {
  const contents = state.workspace?.contents || [];
  const meetings = state.workspace?.meetings || [];
  const feedback = state.workspace?.feedback || [];
  const milestones = state.workspace?.milestones || [];
  const attachments = state.workspace?.attachments || [];
  const contentById = new Map(contents.map((item) => [item.id, item]));

  const contentEntries = contents.flatMap((content) => {
    const entries = [];
    const preview = truncateText(
      content.planSections?.idea ||
        content.planSections?.script ||
        content.parts?.find((part) => part.title)?.title ||
        "새 기획안이 추가되었습니다.",
      80
    );

    if (content.created_at) {
      entries.push({
        date: content.created_at,
        category: "기획안",
        title: "새 콘텐츠 기획안 생성",
        description: `${content.title} · ${preview}`
      });
    }

    const createdDateKey = toDateKey(content.created_at);
    const updatedDateKey = toDateKey(content.updated_at);

    if (content.updated_at && updatedDateKey && updatedDateKey !== createdDateKey) {
      const statusLabel = STATUS_LABELS[content.status] || content.status;
      entries.push({
        date: content.updated_at,
        category: "기획안",
        title: `${statusLabel} 단계 업데이트`,
        description: `${content.title} · 현재 ${statusLabel} 단계`
      });
    }

    if (content.publish_date || content.status === "published") {
      entries.push({
        date: content.publish_date || content.updated_at || content.created_at,
        category: "발행",
        title: "영상 발행",
        description: `${content.title} 업로드`
      });
    }

    return entries;
  });

  const meetingEntries = meetings.map((meeting) => ({
    date: meeting.date || meeting.created_at,
    category: "미팅",
    title: `${MEETING_TYPE_LABELS[meeting.meeting_type] || meeting.meeting_type} 미팅`,
    description: meeting.summary || "미팅 노트가 추가되었습니다."
  }));

  const feedbackEntries = feedback.map((item) => {
    const content = contentById.get(item.content_id);

    return {
      date: item.created_at,
      category: "피드백",
      title: `${item.author || "워크스페이스 사용자"}님의 피드백`,
      description: content
        ? `${content.title} · ${truncateText(item.comment, 80)}`
        : truncateText(item.comment, 80)
    };
  });

  const milestoneEntries = milestones.map((item) => ({
    date: item.date || item.created_at,
    category: "마일스톤",
    title: item.title,
    description: item.description || "마일스톤이 추가되었습니다."
  }));

  const attachmentEntries = attachments.map((item) => ({
    date: item.created_at,
    category: "파일",
    title: ATTACHMENT_LABELS[item.kind] || "첨부 파일 업로드",
    description: item.title || item.file_name || "새 파일이 추가되었습니다."
  }));

  return [
    ...contentEntries,
    ...meetingEntries,
    ...feedbackEntries,
    ...milestoneEntries,
    ...attachmentEntries
  ]
    .filter((item) => toDateKey(item.date))
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
}

function buildDailyLogs() {
  const grouped = buildActivityEntries().reduce((accumulator, item) => {
    const dateKey = toDateKey(item.date);

    if (!dateKey) {
      return accumulator;
    }

    if (!accumulator.has(dateKey)) {
      accumulator.set(dateKey, {
        date: dateKey,
        items: []
      });
    }

    accumulator.get(dateKey).items.push(item);
    return accumulator;
  }, new Map());

  return Array.from(grouped.values())
    .map((entry) => ({
      ...entry,
      items: entry.items.sort(
        (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()
      )
    }))
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
}

function buildGrowthMetrics(dailyLogs = buildDailyLogs()) {
  const creator = state.workspace?.creator || {};
  const contents = state.workspace?.contents || [];
  const stats = state.workspace?.stats || {};
  const todayKey = toDateKey(new Date());
  const candidateKeys = [
    todayKey,
    toDateKey(creator.join_date),
    ...dailyLogs.map((item) => item.date),
    ...contents.map((item) => toDateKey(item.publish_date || item.updated_at || item.created_at))
  ].filter(Boolean);
  const startKey = candidateKeys.reduce(
    (current, key) => (!current || key < current ? key : current),
    null
  ) || todayKey;
  const endKey = candidateKeys.reduce(
    (current, key) => (!current || key > current ? key : current),
    null
  ) || todayKey;
  const dateKeys = buildDateKeys(startKey, endKey);
  const weightsByDay = Object.fromEntries(dateKeys.map((key) => [key, 0]));
  const publishedByDay = contents.reduce((accumulator, item) => {
    if (item.status !== "published" && !item.publish_date) {
      return accumulator;
    }

    const dateKey = toDateKey(item.publish_date || item.updated_at || item.created_at);

    if (!dateKey) {
      return accumulator;
    }

    accumulator[dateKey] = (accumulator[dateKey] || 0) + 1;
    return accumulator;
  }, {});

  dailyLogs.forEach((log) => {
    weightsByDay[log.date] =
      (weightsByDay[log.date] || 0) +
      log.items.reduce((sum, item) => sum + getActivityWeight(item.category), 0);
  });

  if (dateKeys.length > 0 && dateKeys.every((key) => Number(weightsByDay[key] || 0) === 0)) {
    weightsByDay[dateKeys[dateKeys.length - 1]] = 1;
  }

  const videosPublishedDaily = dateKeys.map((key) => Number(publishedByDay[key] || 0));
  const totalViewsDaily = distributeMetricByWeights(
    Number(stats.totalViews || 0),
    dateKeys,
    weightsByDay
  );
  const subscribersDaily = distributeMetricByWeights(
    Number(stats.subscribersGained || 0),
    dateKeys,
    weightsByDay
  );

  return [
    {
      id: "videosPublished",
      label: "Video Published",
      unit: "편",
      currentLabel: "누적 발행 영상",
      deltaLabel: "당일 발행",
      description:
        "발행일이 있으면 해당 날짜를, 없으면 마지막 수정일을 기준으로 실제 발행 수를 계산합니다.",
      points: buildMetricPoints(dateKeys, videosPublishedDaily)
    },
    {
      id: "totalViews",
      label: "Total View",
      unit: "뷰",
      currentLabel: "누적 조회수",
      deltaLabel: "당일 증가",
      description:
        "날짜별 조회수 이력이 없어 현재 총 조회수를 워크스페이스 활동량 기준으로 날짜별 배분한 추정치입니다.",
      points: buildMetricPoints(dateKeys, totalViewsDaily)
    },
    {
      id: "subscribersGained",
      label: "Subscribers Gained",
      unit: "명",
      currentLabel: "누적 구독자 증가",
      deltaLabel: "당일 증가",
      description:
        "날짜별 구독자 이력이 없어 현재 누적 증가 수를 워크스페이스 활동량 기준으로 날짜별 배분한 추정치입니다.",
      points: buildMetricPoints(dateKeys, subscribersDaily)
    }
  ];
}

function getActivityWeight(category) {
  switch (category) {
    case "발행":
      return 6;
    case "마일스톤":
      return 4;
    case "미팅":
      return 3;
    case "기획안":
      return 2;
    case "피드백":
      return 1;
    case "파일":
      return 1;
    default:
      return 1;
  }
}

function buildMetricPoints(dateKeys, dailyValues) {
  let cumulative = 0;

  return dateKeys.map((dateKey, index) => {
    const delta = Number(dailyValues[index] || 0);
    cumulative += delta;

    return {
      date: dateKey,
      delta,
      cumulative
    };
  });
}

function distributeMetricByWeights(total, dateKeys, weightsByDay) {
  const normalizedTotal = Math.max(0, Math.round(Number(total || 0)));

  if (dateKeys.length === 0) {
    return [];
  }

  const weights = dateKeys.map((key) => Math.max(0, Number(weightsByDay[key] || 0)));
  let totalWeight = weights.reduce((sum, value) => sum + value, 0);

  if (totalWeight <= 0) {
    weights[weights.length - 1] = 1;
    totalWeight = 1;
  }

  const rawShares = weights.map((weight) => (normalizedTotal * weight) / totalWeight);
  const baseShares = rawShares.map((value) => Math.floor(value));
  let remaining = normalizedTotal - baseShares.reduce((sum, value) => sum + value, 0);

  rawShares
    .map((value, index) => ({
      index,
      fraction: value - baseShares[index],
      weight: weights[index]
    }))
    .sort(
      (left, right) =>
        right.fraction - left.fraction ||
        right.weight - left.weight ||
        right.index - left.index
    )
    .forEach((item) => {
      if (remaining > 0) {
        baseShares[item.index] += 1;
        remaining -= 1;
      }
    });

  return baseShares;
}

function buildDateKeys(startKey, endKey) {
  if (!startKey || !endKey) {
    return [];
  }

  const keys = [];
  const cursor = new Date(`${startKey}T12:00:00`);
  const end = new Date(`${endKey}T12:00:00`);

  while (cursor.getTime() <= end.getTime()) {
    keys.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return keys;
}

function toDateKey(value) {
  if (!value) {
    return "";
  }

  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const raw = String(value);
  const directMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);

  if (directMatch) {
    return directMatch[1];
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return toDateKey(parsed);
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

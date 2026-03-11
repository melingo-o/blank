const TAB_LABELS = {
  overview: "Overview",
  strategy: "Channel Plan",
  meetings: "Meetings",
  pipeline: "콘텐츠기획",
  feedback: "Feedback",
  timeline: "Timeline"
};

const numberFormatter = new Intl.NumberFormat("ko-KR");

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMetric(value) {
  return numberFormatter.format(Number(value || 0));
}

function formatJoinDate(value) {
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

function initialsFromName(name = "") {
  const cleaned = name.trim();

  if (!cleaned) {
    return "CW";
  }

  const parts = cleaned.split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function renderSidebar({
  root,
  creator,
  stats,
  user,
  activeTab,
  creators = [],
  collapsed = false
}) {
  const creatorName = creator?.name || "Creator";
  const channelName = creator?.channel_name || "Workspace";
  const channelUrl = creator?.channel_url || "";
  const isAdmin = Boolean(user?.isCompanyAdmin);
  const availableCreators = Array.isArray(creators) ? creators : [];

  root.innerHTML = `
    <div class="workspace-sidebar__chrome relative h-full">
      <button
        type="button"
        data-sidebar-toggle
        aria-label="${collapsed ? "사이드바 펼치기" : "사이드바 접기"}"
        class="workspace-sidebar__toggle"
      >
        ${collapsed ? "›" : "‹"}
      </button>

      <div class="workspace-sidebar__content flex h-full flex-col">
        <div class="border-b border-slate-200/80 px-5 py-6">
          <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Creator Incubation Workspace
          </p>
          <div class="mt-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_16px_32px_rgba(15,23,42,0.08)]">
            <div class="flex items-center gap-3">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
                ${escapeHtml(initialsFromName(creatorName))}
              </div>
              <div class="min-w-0">
                <p class="truncate text-base font-semibold text-slate-900">${escapeHtml(creatorName)}</p>
                <p class="truncate text-sm text-slate-500">${escapeHtml(channelName)}</p>
              </div>
            </div>
            <dl class="mt-4 space-y-2 text-sm">
              <div class="flex items-start justify-between gap-3">
                <dt class="text-slate-500">Join date</dt>
                <dd class="text-right font-medium text-slate-700">${escapeHtml(formatJoinDate(creator?.join_date))}</dd>
              </div>
              <div class="flex items-start justify-between gap-3">
                <dt class="text-slate-500">Workspace ID</dt>
                <dd class="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                  ${escapeHtml(creator?.id || "-")}
                </dd>
              </div>
            </dl>
            <div class="mt-4 rounded-2xl bg-slate-50 px-3 py-3">
              <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Channel concept</p>
              <p class="mt-2 text-sm leading-6 text-slate-700">${escapeHtml(creator?.channel_concept || "No channel concept added yet.")}</p>
            </div>
            ${
              channelUrl
                ? `
                  <a
                    class="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    href="${escapeHtml(channelUrl)}"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Visit channel
                    <span aria-hidden="true">&#8599;</span>
                  </a>
                `
                : ""
            }
          </div>
        </div>

        <div class="space-y-5 px-4 py-5">
          ${
            isAdmin && availableCreators.length > 0
              ? `
                <div class="rounded-[22px] border border-slate-200 bg-white p-4">
                  <div class="mb-3 flex items-center justify-between gap-3">
                    <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Creator switcher</p>
                    <span class="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white">Admin</span>
                  </div>
                  <label class="block text-xs font-medium text-slate-500" for="workspace-creator-select">Open workspace</label>
                  <select
                    id="workspace-creator-select"
                    class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
                  >
                    ${availableCreators
                      .map(
                        (item) => `
                          <option value="${escapeHtml(item.id)}" ${item.id === creator?.id ? "selected" : ""}>
                            ${escapeHtml(item.name)} / ${escapeHtml(item.channel_name || item.id)}
                          </option>
                        `
                      )
                      .join("")}
                  </select>
                </div>
              `
              : ""
          }

          <div class="rounded-[22px] border border-slate-200 bg-white p-3">
            <p class="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Navigation</p>
            <nav class="space-y-1" aria-label="Workspace navigation">
              ${Object.entries(TAB_LABELS)
                .map(
                  ([value, label]) => `
                    <button
                      type="button"
                      data-sidebar-tab="${escapeHtml(value)}"
                      class="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm font-medium transition ${
                        activeTab === value
                          ? "bg-slate-900 text-white shadow-[0_12px_24px_rgba(15,23,42,0.18)]"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }"
                    >
                      <span>${escapeHtml(label)}</span>
                      <span class="${activeTab === value ? "text-white/70" : "text-slate-400"}">&#8594;</span>
                    </button>
                  `
                )
                .join("")}
            </nav>
          </div>

          <div class="rounded-[22px] border border-slate-200 bg-white p-4">
            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Growth stats</p>
            <div class="mt-3 grid gap-2">
              <div class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p class="text-[11px] text-slate-500">Videos published</p>
                <p class="mt-1 text-base font-semibold leading-none text-slate-900">${escapeHtml(formatMetric(stats?.videosPublished))}</p>
              </div>
              <div class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p class="text-[11px] text-slate-500">Total views</p>
                <p class="mt-1 text-base font-semibold leading-none text-slate-900">${escapeHtml(formatMetric(stats?.totalViews))}</p>
              </div>
              <div class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p class="text-[11px] text-slate-500">Subscribers gained</p>
                <p class="mt-1 text-base font-semibold leading-none text-slate-900">${escapeHtml(formatMetric(stats?.subscribersGained))}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-auto border-t border-slate-200/80 px-4 py-5">
          <div class="rounded-[22px] border border-slate-200 bg-white px-4 py-4">
            <p class="text-xs font-medium text-slate-500">Logged in as</p>
            <div class="mt-2">
              <p class="truncate text-sm font-semibold text-slate-900">${escapeHtml(user?.displayName || user?.email || "Workspace user")}</p>
              <p class="truncate text-xs text-slate-500">${escapeHtml(user?.email || "")}</p>
            </div>
            <div class="mt-4 flex items-center justify-between gap-3">
              <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                ${escapeHtml(isAdmin ? "Company admin" : "Assigned creator")}
              </span>
              <button
                type="button"
                data-sign-out
                class="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

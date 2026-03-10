const CHANNEL_PLAN_PATHS = {
  chaehee: "/workspace/channel-plans/chaehee-channel-strategy.html"
};

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderChannelPlanPanel({ root, creator }) {
  const creatorId = creator?.id || "";
  const planUrl = CHANNEL_PLAN_PATHS[creatorId] || "";

  root.innerHTML = `
    <div class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_34px_rgba(15,23,42,0.05)]">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">채널 기획</p>
          <h2 class="mt-2 text-xl font-semibold text-slate-900">채널 전략 문서</h2>
          <p class="mt-2 text-sm leading-6 text-slate-500">
            채널 콘셉트, 챕터 구조, 운영 방향이 정리된 기획서를 바로 확인할 수 있습니다.
          </p>
        </div>
        ${
          planUrl
            ? `
              <a
                href="${escapeHtml(planUrl)}"
                target="_blank"
                rel="noreferrer"
                class="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                새 탭에서 열기
              </a>
            `
            : ""
        }
      </div>

      ${
        planUrl
          ? `
            <div class="mt-6 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
              <iframe
                src="${escapeHtml(planUrl)}"
                title="${escapeHtml(creator?.name || "크리에이터")} 채널 전략 문서"
                class="h-[82vh] min-h-[760px] w-full bg-white"
                loading="lazy"
              ></iframe>
            </div>
          `
          : `
            <div class="mt-6 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm text-slate-400">
              아직 연결된 채널 기획 문서가 없습니다.
            </div>
          `
      }
    </div>
  `;
}

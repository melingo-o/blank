function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

export function renderTimeline({ root, milestones, onCreateMilestone }) {
  root.innerHTML = `
    <div class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_34px_rgba(15,23,42,0.05)]">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">성장 타임라인</p>
          <h2 class="mt-2 text-xl font-semibold text-slate-900">크리에이터 성장 히스토리</h2>
          <p class="mt-2 text-sm leading-6 text-slate-500">
            킥오프부터 성과 지점까지 의미 있는 성장 순간을 시간순으로 정리합니다.
          </p>
        </div>
        <button
          type="button"
          data-action="create-milestone"
          class="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          마일스톤 추가
        </button>
      </div>

      <div class="mt-8 space-y-4">
        ${
          milestones.length > 0
            ? milestones
                .map(
                  (milestone, index) => `
                    <article class="timeline-item relative rounded-[24px] border border-slate-200 bg-slate-50/80 p-5 ${index === milestones.length - 1 ? "timeline-item--last" : ""}">
                      <div class="timeline-item__dot absolute left-5 top-6 h-3 w-3 rounded-full bg-slate-900"></div>
                      <div class="pl-8">
                        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <h3 class="text-base font-semibold text-slate-900">${escapeHtml(milestone.title)}</h3>
                          <span class="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-500">
                            ${escapeHtml(formatDate(milestone.date))}
                          </span>
                        </div>
                        <p class="mt-3 text-sm leading-6 text-slate-600">${escapeHtml(milestone.description || "설명이 아직 입력되지 않았습니다.")}</p>
                      </div>
                    </article>
                  `
                )
                .join("")
            : `
                <div class="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
                  킥오프, 첫 업로드, 첫 1,000뷰, 수익화 같은 성장 이벤트를 추가해 주세요.
                </div>
              `
        }
      </div>
    </div>
  `;

  root.querySelector('[data-action="create-milestone"]')?.addEventListener("click", () => {
    onCreateMilestone();
  });
}

import {
  CONTENT_PLAN_STAGES,
  CONTENT_STATUS_OPTIONS,
  collectPartTitles,
  countFilledParts
} from "/components/content-plan.js";

const STATUS_LABELS = Object.fromEntries(
  CONTENT_STATUS_OPTIONS.map((item) => [item.id, item.label])
);

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function truncateText(value = "", limit = 72) {
  return value.length > limit ? `${value.slice(0, limit)}...` : value;
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric"
  }).format(parsed);
}

function buildStageSnapshot(content, stageId, attachmentCount) {
  const sections = content.planSections || {};
  const parts = content.parts || [];
  const partTitles = collectPartTitles(parts, 3);

  switch (stageId) {
    case "idea":
      return {
        summary:
          sections.idea ||
          (partTitles.length > 0
            ? `${partTitles.join(", ")} 중심으로 구성 중`
            : "핵심 아이디어와 메시지를 적어 주세요."),
        meta:
          partTitles.length > 0
            ? `파트 ${parts.length}개 구조`
            : "파트 구조 미정"
      };
    case "thumbnail":
      return {
        summary:
          sections.thumbnail ||
          (content.thumbnail_signed_url || content.thumbnail_url
            ? "썸네일 이미지가 업로드되어 있습니다."
            : "카피와 비주얼 방향을 적어 주세요."),
        meta:
          content.thumbnail_signed_url || content.thumbnail_url
            ? "이미지 업로드됨"
            : attachmentCount > 0
              ? `첨부 ${attachmentCount}개`
              : "썸네일 메모 없음"
      };
    case "script": {
      const filled = countFilledParts(parts, "script");
      return {
        summary:
          sections.script ||
          (partTitles.length > 0
            ? `${partTitles.join(", ")} 대본을 이어서 작성하세요.`
            : "파트별 대본 메모를 추가해 주세요."),
        meta: parts.length > 0 ? `${filled}/${parts.length} 파트 기록` : "파트 없음"
      };
    }
    case "filming": {
      const filled = countFilledParts(parts, "filming");
      return {
        summary:
          sections.filming ||
          (partTitles.length > 0
            ? `${partTitles.join(", ")} 촬영 메모를 정리하세요.`
            : "컷 구성과 촬영 준비를 적어 주세요."),
        meta: parts.length > 0 ? `${filled}/${parts.length} 파트 기록` : "파트 없음"
      };
    }
    case "editing": {
      const filled = countFilledParts(parts, "editing");
      return {
        summary:
          sections.editing ||
          (partTitles.length > 0
            ? `${partTitles.join(", ")} 편집 포인트를 적어 주세요.`
            : "자막, 컷 편집, 리듬 메모를 적어 주세요."),
        meta: parts.length > 0 ? `${filled}/${parts.length} 파트 기록` : "파트 없음"
      };
    }
    default:
      return {
        summary: "아직 내용이 없습니다.",
        meta: ""
      };
  }
}

function renderStageCard(content, stage, attachmentCount) {
  const snapshot = buildStageSnapshot(content, stage.id, attachmentCount);

  return `
    <button
      type="button"
      data-open-content="${escapeHtml(content.id)}"
      class="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-4 text-left transition hover:border-slate-300 hover:bg-white"
    >
      <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">${escapeHtml(stage.label)}</p>
      <p class="mt-3 text-sm font-medium leading-6 text-slate-700">${escapeHtml(truncateText(snapshot.summary, 88))}</p>
      <p class="mt-3 text-xs font-medium text-slate-500">${escapeHtml(snapshot.meta)}</p>
    </button>
  `;
}

function renderPlanningRow(content, feedbackCount, attachmentCount) {
  const statusLabel = STATUS_LABELS[content.status] || content.status;
  const publishLabel = formatDate(content.publish_date);
  const partCount = content.parts?.length || 0;

  return `
    <article class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              현재 단계 · ${escapeHtml(statusLabel)}
            </span>
            <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              파트 ${partCount}개
            </span>
            <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              피드백 ${feedbackCount}개
            </span>
            ${
              publishLabel
                ? `
                  <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                    발행일 ${escapeHtml(publishLabel)}
                  </span>
                `
                : ""
            }
          </div>
          <h3 class="mt-3 text-lg font-semibold tracking-tight text-slate-950">${escapeHtml(content.title)}</h3>
        </div>

        <button
          type="button"
          data-open-content="${escapeHtml(content.id)}"
          class="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          파트/세부 관리
        </button>
      </div>

      <div class="mt-5 grid gap-3 xl:grid-cols-5">
        ${CONTENT_PLAN_STAGES.map((stage) =>
          renderStageCard(content, stage, attachmentCount)
        ).join("")}
      </div>
    </article>
  `;
}

export function renderKanban({
  root,
  contents,
  feedbackByContent,
  attachmentsByContent,
  onOpenContent,
  onCreateContent
}) {
  const summary = CONTENT_PLAN_STAGES.map((stage) => {
    if (stage.id === "thumbnail") {
      const total = contents.filter(
        (content) =>
          content.planSections?.thumbnail ||
          content.thumbnail_signed_url ||
          content.thumbnail_url
      ).length;

      return { ...stage, total };
    }

    const total = contents.filter((content) => {
      if (stage.id === "idea") {
        return Boolean(content.planSections?.idea);
      }

      return (
        Boolean(content.planSections?.[stage.id]) ||
        countFilledParts(content.parts || [], stage.id) > 0
      );
    }).length;

    return { ...stage, total };
  });

  root.innerHTML = `
    <div class="space-y-6">
      <section class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_34px_rgba(15,23,42,0.05)]">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">콘텐츠 기획</p>
            <h2 class="mt-2 text-xl font-semibold text-slate-900">기획안별 제작 구조 보드</h2>
            <p class="mt-2 text-sm leading-6 text-slate-500">
              아이디어, 썸네일, 대본, 촬영, 편집을 한 줄에서 보고 각 영상의 파트 구조까지 함께 관리하세요.
            </p>
          </div>
          <button
            type="button"
            data-action="create-content"
            class="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            새 콘텐츠
          </button>
        </div>

        <div class="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          ${summary
            .map(
              (item) => `
                <div class="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                  <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">${escapeHtml(item.label)}</p>
                  <div class="mt-2 flex items-end justify-between gap-3">
                    <p class="text-base font-semibold text-slate-900">${escapeHtml(item.description)}</p>
                    <span class="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500">${item.total}</span>
                  </div>
                </div>
              `
            )
            .join("")}
        </div>
      </section>

      <section class="space-y-4">
        ${
          contents.length > 0
            ? contents
                .map((content) =>
                  renderPlanningRow(
                    content,
                    (feedbackByContent[content.id] || []).length,
                    (attachmentsByContent[content.id] || []).length
                  )
                )
                .join("")
            : `
                <div class="rounded-[28px] border border-dashed border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-400">
                  아직 등록된 기획안이 없습니다. 새 콘텐츠를 눌러 첫 기획안을 만들어 주세요.
                </div>
              `
        }
      </section>
    </div>
  `;

  root.querySelector('[data-action="create-content"]')?.addEventListener("click", () => {
    onCreateContent();
  });

  root.querySelectorAll("[data-open-content]").forEach((button) => {
    button.addEventListener("click", () => {
      onOpenContent(button.getAttribute("data-open-content"));
    });
  });
}

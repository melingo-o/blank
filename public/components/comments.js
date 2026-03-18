import {
  CONTENT_STATUS_OPTIONS,
  createEmptyPart
} from "/components/content-plan.js";

const STATUS_LABELS = Object.fromEntries(
  CONTENT_STATUS_OPTIONS.map((item) => [item.id, item.label])
);

const ATTACHMENT_KIND_LABELS = {
  thumbnail: "썸네일 이미지",
  script: "대본 파일",
  pdf_note: "PDF 노트",
  reference: "참고 자료"
};

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value, options = {}) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "ko-KR",
    Object.keys(options).length > 0
      ? options
      : {
          year: "numeric",
          month: "short",
          day: "numeric"
        }
  ).format(parsed);
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
        class="mt-2 min-h-[168px] w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
        placeholder="${escapeHtml(placeholder)}"
      >${escapeHtml(value || "")}</textarea>
    </div>
  `;
}

function renderComment(comment) {
  return `
    <article class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div class="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span class="font-semibold text-slate-700">${escapeHtml(comment.author || "워크스페이스")}</span>
        ${comment.author_role ? `<span class="rounded-full bg-white px-2 py-1">${escapeHtml(comment.author_role)}</span>` : ""}
        <span>${escapeHtml(formatDate(comment.created_at, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }))}</span>
      </div>
      <p class="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">${escapeHtml(comment.comment || "")}</p>
    </article>
  `;
}

export function renderContentPartCard(part, index) {
  const safePart = createEmptyPart(part);
  const partOrderLabel = `Part ${String(index + 1).padStart(2, "0")}`;

  return `
    <article class="rounded-[24px] border border-slate-200 bg-white p-5" data-part-card>
      <input type="hidden" name="partId" value="${escapeHtml(safePart.id)}" />
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p data-part-order class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">${escapeHtml(partOrderLabel)}</p>
          <input
            name="partTitle"
            value="${escapeHtml(safePart.title)}"
            placeholder="오프닝 / 본문 1 / 엔딩"
            class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white sm:min-w-[240px]"
          />
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-open-part-note-viewer
            class="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-100"
          >
            전체 보기
          </button>
          <button
            type="button"
            data-remove-part
            class="inline-flex items-center justify-center rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
          >
            파트 삭제
          </button>
        </div>
      </div>

      <div class="mt-4 grid gap-3 xl:grid-cols-2">
        ${renderExpandableTextareaField({
          name: "partIdea",
          id: `part-idea-${safePart.id}`,
          label: "아이디어",
          value: safePart.idea,
          placeholder: "이 파트에서 전달할 메시지, 감정, 훅",
          rows: 5,
          showViewerButton: false
        })}
        ${renderExpandableTextareaField({
          name: "partScript",
          id: `part-script-${safePart.id}`,
          label: "대본",
          value: safePart.script,
          placeholder: "이 파트의 대사, 장면 전개, 나레이션",
          rows: 5,
          showViewerButton: false
        })}
        ${renderExpandableTextareaField({
          name: "partFilming",
          id: `part-filming-${safePart.id}`,
          label: "촬영 메모",
          value: safePart.filming,
          placeholder: "카메라 구도, B-roll, 필요한 소스",
          rows: 5,
          showViewerButton: false
        })}
        ${renderExpandableTextareaField({
          name: "partEditing",
          id: `part-editing-${safePart.id}`,
          label: "편집 메모",
          value: safePart.editing,
          placeholder: "컷 편집, 자막, 효과음, 강조 포인트",
          rows: 5,
          showViewerButton: false
        })}
      </div>
    </article>
  `;
}

export function renderContentPartEditor(parts = []) {
  const safeParts = parts.length > 0 ? parts : [createEmptyPart()];

  return `
    <div class="rounded-[26px] border border-slate-200 bg-slate-50/80 p-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">파트 구성</p>
          <p class="mt-1 text-sm text-slate-500">오프닝, 본문, 엔딩처럼 영상 흐름을 나눠 각 파트별 메모를 기록합니다.</p>
        </div>
        <button
          type="button"
          data-add-part
          class="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
        >
          파트 추가
        </button>
      </div>

      <div class="mt-4 space-y-3" data-parts-container>
        ${safeParts.map((part, index) => renderContentPartCard(part, index)).join("")}
      </div>
    </div>
  `;
}

export function renderFeedbackPanel({
  root,
  contents,
  feedbackByContent,
  onOpenContent,
  onAddFeedback
}) {
  const groups = contents
    .map((content) => ({
      content,
      feedback: feedbackByContent[content.id] || []
    }))
    .sort((left, right) => {
      const leftDate = left.feedback[0]?.created_at || left.content.updated_at || left.content.created_at || "";
      const rightDate = right.feedback[0]?.created_at || right.content.updated_at || right.content.created_at || "";
      return new Date(rightDate).getTime() - new Date(leftDate).getTime();
    });

  root.innerHTML = `
    <div class="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <section class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_34px_rgba(15,23,42,0.05)]">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">피드백 작성</p>
          <h2 class="mt-2 text-xl font-semibold text-slate-900">다음 수정 방향을 바로 남기세요</h2>
        </div>

        <form class="mt-6 space-y-4" data-feedback-form>
          <div>
            <label class="block text-sm font-medium text-slate-700" for="feedback-content-id">콘텐츠 기획안</label>
            <select
              id="feedback-content-id"
              name="contentId"
              class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
              required
            >
              <option value="">기획안을 선택해 주세요</option>
              ${contents
                .map(
                  (content) => `
                    <option value="${escapeHtml(content.id)}">${escapeHtml(content.title)} · ${escapeHtml(STATUS_LABELS[content.status] || content.status)}</option>
                  `
                )
                .join("")}
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700" for="feedback-comment">피드백</label>
            <textarea
              id="feedback-comment"
              name="comment"
              rows="5"
              placeholder="대본, 후킹, 전달력, 썸네일 방향, 다음 액션을 구체적으로 적어 주세요."
              class="mt-2 w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
              required
            ></textarea>
          </div>
          <button
            type="submit"
            class="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            피드백 저장
          </button>
        </form>
      </section>

      <section class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_34px_rgba(15,23,42,0.05)]">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">대화 기록</p>
            <h2 class="mt-2 text-xl font-semibold text-slate-900">콘텐츠 기획안별 피드백 로그</h2>
          </div>
        </div>

        <div class="mt-6 space-y-4">
          ${
            groups.length > 0
              ? groups
                  .map(
                    ({ content, feedback }) => `
                      <article class="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">${escapeHtml(STATUS_LABELS[content.status] || content.status)}</p>
                            <h3 class="mt-2 text-base font-semibold text-slate-900">${escapeHtml(content.title)}</h3>
                            <p class="mt-2 text-sm leading-6 text-slate-500">
                              ${feedback.length > 0 ? `댓글 ${feedback.length}개` : "아직 댓글이 없습니다"}
                            </p>
                          </div>
                          <button
                            type="button"
                            data-open-content="${escapeHtml(content.id)}"
                            class="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-100"
                          >
                            기획안 열기
                          </button>
                        </div>
                        <div class="mt-4 space-y-3">
                          ${
                            feedback.length > 0
                              ? feedback.slice(0, 3).map(renderComment).join("")
                              : `
                                  <div class="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-400">
                                    왼쪽 입력창에서 첫 피드백을 남겨 주세요.
                                  </div>
                                `
                          }
                        </div>
                      </article>
                    `
                  )
                  .join("")
              : `
                  <div class="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
                    먼저 콘텐츠 기획안을 추가한 뒤 피드백을 남겨 주세요.
                  </div>
                `
          }
        </div>
      </section>
    </div>
  `;

  root.querySelector("[data-feedback-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const contentId = form.get("contentId");
    const comment = form.get("comment");

    if (!contentId || !comment) {
      return;
    }

    await onAddFeedback({
      contentId: String(contentId),
      comment: String(comment)
    });
  });

  root.querySelectorAll("[data-open-content]").forEach((button) => {
    button.addEventListener("click", () => {
      onOpenContent(button.getAttribute("data-open-content"));
    });
  });
}

export function renderContentDetail(content, feedback = [], attachments = []) {
  const latestThumbnailAttachment = [...attachments]
    .filter((item) => item.kind === "thumbnail" && item.signed_url)
    .sort(
      (left, right) =>
        new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime()
    )[0];
  const thumbnail =
    content.thumbnail_signed_url ||
    latestThumbnailAttachment?.signed_url ||
    (/^https?:\/\//.test(content.thumbnail_url || "") ? content.thumbnail_url : "") ||
    "";
  const sections = content.planSections || {};

  return `
    <div class="workspace-detail grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <section class="space-y-5">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">콘텐츠 기획안 상세</p>
            <h2 class="mt-2 text-2xl font-semibold text-slate-950">${escapeHtml(content.title || "제목 없는 기획안")}</h2>
            <p class="mt-2 text-sm text-slate-500">
              최근 수정 ${escapeHtml(formatDate(content.updated_at || content.created_at))}
            </p>
          </div>
          <button
            type="button"
            data-close-modal
            class="rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
          >
            닫기
          </button>
        </div>

        <form class="space-y-5" data-content-edit-form>
          <input type="hidden" name="contentId" value="${escapeHtml(content.id)}" />
          <div class="rounded-[26px] border border-slate-200 bg-white p-4">
            <div>
              <label class="block text-sm font-medium text-slate-700" for="detail-title">제목</label>
              <input
                id="detail-title"
                name="title"
                value="${escapeHtml(content.title || "")}"
                class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
                required
              />
            </div>

            <div class="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label class="block text-sm font-medium text-slate-700" for="detail-status">현재 단계</label>
                <select
                  id="detail-status"
                  name="status"
                  class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
                >
                  ${CONTENT_STATUS_OPTIONS.map((option) => `<option value="${escapeHtml(option.id)}" ${option.id === content.status ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700" for="detail-publish-date">발행일</label>
                <input
                  id="detail-publish-date"
                  name="publishDate"
                  type="date"
                  value="${escapeHtml(content.publish_date || "")}"
                  class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
                />
              </div>
            </div>
          </div>

          <div class="rounded-[26px] border border-slate-200 bg-white p-4">
            <div class="grid gap-4 xl:grid-cols-2">
              ${renderExpandableTextareaField({
                id: "detail-idea",
                name: "sectionIdea",
                label: "아이디어 메모",
                value: sections.idea || "",
                placeholder: "이 영상의 핵심 메시지, 감정선, 훅을 적어 주세요.",
                viewerKey: "detail:section:idea",
                viewerTitle: "아이디어 메모",
                viewerCaption: "전체 메모"
              })}
              ${renderExpandableTextareaField({
                id: "detail-thumbnail-note",
                name: "sectionThumbnail",
                label: "썸네일 메모",
                value: sections.thumbnail || "",
                placeholder: "썸네일 카피, 표정, 색감, 참고 레퍼런스",
                viewerKey: "detail:section:thumbnail",
                viewerTitle: "썸네일 메모",
                viewerCaption: "전체 메모"
              })}
              ${renderExpandableTextareaField({
                id: "detail-script-summary",
                name: "sectionScript",
                label: "대본 전체 메모",
                value: sections.script || "",
                placeholder: "영상 전체 흐름이나 대본 방향을 적어 주세요.",
                viewerKey: "detail:section:script",
                viewerTitle: "대본 전체 메모",
                viewerCaption: "전체 메모"
              })}
              ${renderExpandableTextareaField({
                id: "detail-filming-summary",
                name: "sectionFilming",
                label: "촬영 전체 메모",
                value: sections.filming || "",
                placeholder: "촬영 일정, 준비물, 장소, 필요한 소스를 적어 주세요.",
                viewerKey: "detail:section:filming",
                viewerTitle: "촬영 전체 메모",
                viewerCaption: "전체 메모"
              })}
              ${renderExpandableTextareaField({
                id: "detail-editing-summary",
                name: "sectionEditing",
                label: "편집 전체 메모",
                value: sections.editing || "",
                placeholder: "리듬, 자막, 사운드, 컷 편집 가이드를 적어 주세요.",
                viewerKey: "detail:section:editing",
                viewerTitle: "편집 전체 메모",
                viewerCaption: "전체 메모",
                wrapperClass: "xl:col-span-2"
              })}
            </div>
          </div>

          ${renderContentPartEditor(content.parts || [])}

          <button
            type="submit"
            class="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            기획안 저장
          </button>
        </form>
      </section>

      <section class="space-y-5">
        <div class="rounded-[26px] border border-slate-200 bg-slate-50/80 p-4">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">첨부 파일</p>
              <p class="mt-1 text-sm text-slate-500">썸네일, 대본 파일, PDF 노트를 한 카드 안에서 함께 관리할 수 있습니다.</p>
            </div>
          </div>
          ${
            thumbnail
              ? `
                <div class="mt-4 overflow-hidden rounded-[22px] border border-slate-200 bg-white">
                  <a href="${escapeHtml(thumbnail)}" target="_blank" rel="noreferrer" class="block">
                    <img src="${escapeHtml(thumbnail)}" alt="${escapeHtml(content.title || "콘텐츠")} 썸네일" class="h-52 w-full object-cover" />
                  </a>
                </div>
              `
              : `
                <div class="mt-4 flex h-52 items-center justify-center rounded-[22px] border border-dashed border-slate-200 bg-white text-sm text-slate-400">
                  아직 업로드된 썸네일이 없습니다.
                </div>
              `
          }

          <form class="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]" data-attachment-form>
            <input type="hidden" name="contentId" value="${escapeHtml(content.id)}" />
            <input
              name="title"
              placeholder="첨부 파일 제목"
              class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            />
            <select
              name="kind"
              class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            >
              <option value="thumbnail">썸네일 이미지</option>
              <option value="script">대본 파일</option>
              <option value="pdf_note">PDF 노트</option>
              <option value="reference">참고 자료</option>
            </select>
            <label class="inline-flex cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-100">
              <input type="file" name="file" class="hidden" data-attachment-file-input required />
              <span data-attachment-file-label>파일 선택</span>
            </label>
            <p class="md:col-span-3 text-xs text-slate-500" data-attachment-file-name>
              선택된 파일이 없습니다.
            </p>
            <button
              type="submit"
              data-attachment-submit
              class="md:col-span-3 inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              첨부 업로드
            </button>
          </form>

          <div class="mt-4 space-y-3">
            ${
              attachments.length > 0
                ? attachments
                    .map(
                      (attachment) => `
                        <a
                          href="${escapeHtml(attachment.signed_url || "#")}"
                          target="_blank"
                          rel="noreferrer"
                          class="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          <div class="min-w-0">
                            <p class="truncate text-sm font-medium text-slate-700">${escapeHtml(attachment.title || attachment.file_name)}</p>
                            <p class="mt-1 truncate text-xs text-slate-500">
                              ${escapeHtml(ATTACHMENT_KIND_LABELS[attachment.kind] || attachment.kind)} · ${escapeHtml(formatDate(attachment.created_at))}
                            </p>
                          </div>
                          <span class="text-slate-400">&#8599;</span>
                        </a>
                      `
                    )
                    .join("")
                : `
                    <div class="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-400">
                      이 카드에는 아직 첨부 파일이 없습니다.
                    </div>
                  `
            }
          </div>
        </div>

        <div class="rounded-[26px] border border-slate-200 bg-slate-50/80 p-4">
          <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">댓글</p>
          <div class="mt-4 space-y-3">
            ${
              feedback.length > 0
                ? feedback.map(renderComment).join("")
                : `
                    <div class="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-400">
                      아직 피드백이 없습니다. 아래에서 첫 댓글을 남겨 주세요.
                    </div>
                  `
            }
          </div>
          <form class="mt-4 space-y-3" data-inline-feedback-form>
            <input type="hidden" name="contentId" value="${escapeHtml(content.id)}" />
            <textarea
              name="comment"
              rows="4"
              class="w-full rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-slate-400"
              placeholder="대본 메모, 퍼포먼스 코멘트, 썸네일 수정 방향, 의사결정 내용을 남겨 주세요."
              required
            ></textarea>
            <button
              type="submit"
              class="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              댓글 추가
            </button>
          </form>
        </div>
      </section>
    </div>
  `;
}

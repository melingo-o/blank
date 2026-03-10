const KANBAN_COLUMNS = [
  { id: "idea", label: "Idea" },
  { id: "script", label: "Script" },
  { id: "filming", label: "Filming" },
  { id: "editing", label: "Editing" },
  { id: "published", label: "Published" }
];

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function previewText(content) {
  const source = content.script || content.concept || "";

  if (!source) {
    return "No draft added yet.";
  }

  return source.length > 110 ? `${source.slice(0, 110)}...` : source;
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

function renderCard(content, feedbackCount, attachmentCount) {
  const thumbnail = content.thumbnail_signed_url || content.thumbnail_url || "";

  return `
    <article
      draggable="true"
      data-content-card="${escapeHtml(content.id)}"
      data-current-status="${escapeHtml(content.status)}"
      class="workspace-card group cursor-grab rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_12px_24px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_34px_rgba(15,23,42,0.1)] active:cursor-grabbing"
    >
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">${escapeHtml(content.status)}</p>
          <h3 class="mt-2 text-sm font-semibold leading-6 text-slate-900">${escapeHtml(content.title)}</h3>
        </div>
        ${
          content.publish_date
            ? `
              <span class="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500">
                ${escapeHtml(formatDate(content.publish_date))}
              </span>
            `
            : ""
        }
      </div>

      ${
        thumbnail
          ? `
            <div class="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
              <img
                src="${escapeHtml(thumbnail)}"
                alt="${escapeHtml(content.title)} thumbnail"
                class="h-32 w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                loading="lazy"
              />
            </div>
          `
          : `
            <div class="mt-4 flex h-32 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-xs font-medium text-slate-400">
              Thumbnail pending
            </div>
          `
      }

      <p class="mt-4 text-sm leading-6 text-slate-600">${escapeHtml(previewText(content))}</p>

      <div class="mt-4 flex flex-wrap gap-2">
        <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
          ${feedbackCount} comments
        </span>
        <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
          ${attachmentCount} files
        </span>
      </div>

      <button
        type="button"
        data-open-content="${escapeHtml(content.id)}"
        class="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
      >
        Open details
        <span aria-hidden="true">›</span>
      </button>
    </article>
  `;
}

export function renderKanban({
  root,
  contents,
  feedbackByContent,
  attachmentsByContent,
  onStatusChange,
  onOpenContent,
  onCreateContent
}) {
  const grouped = contents.reduce((accumulator, item) => {
    const bucket = accumulator[item.status] || [];
    bucket.push(item);
    accumulator[item.status] = bucket;
    return accumulator;
  }, {});

  root.innerHTML = `
    <div class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_36px_rgba(15,23,42,0.05)]">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Content pipeline</p>
          <h2 class="mt-2 text-xl font-semibold text-slate-900">Notion-style production board</h2>
          <p class="mt-2 text-sm leading-6 text-slate-500">
            Drag a card across stages to keep planning, production, and publishing history in sync.
          </p>
        </div>
        <button
          type="button"
          data-action="create-content"
          class="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          New content
        </button>
      </div>

      <div class="mt-6 grid gap-4 xl:grid-cols-5">
        ${KANBAN_COLUMNS.map((column) => {
          const cards = grouped[column.id] || [];
          return `
            <section
              data-status-column="${escapeHtml(column.id)}"
              class="workspace-column min-h-[440px] rounded-[24px] border border-slate-200 bg-slate-50/80 p-3"
            >
              <header class="mb-3 flex items-center justify-between gap-2 px-2">
                <div>
                  <p class="text-sm font-semibold text-slate-900">${escapeHtml(column.label)}</p>
                  <p class="text-xs text-slate-500">${cards.length} item${cards.length === 1 ? "" : "s"}</p>
                </div>
                <span class="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                  ${escapeHtml(column.id)}
                </span>
              </header>
              <div class="space-y-3" data-status-cards="${escapeHtml(column.id)}">
                ${
                  cards.length > 0
                    ? cards
                        .map((content) =>
                          renderCard(
                            content,
                            (feedbackByContent[content.id] || []).length,
                            (attachmentsByContent[content.id] || []).length
                          )
                        )
                        .join("")
                    : `
                        <div class="rounded-[22px] border border-dashed border-slate-200 bg-white/80 px-4 py-8 text-center text-sm text-slate-400">
                          No cards in ${escapeHtml(column.label.toLowerCase())}.
                        </div>
                      `
                }
              </div>
            </section>
          `;
        }).join("")}
      </div>
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

  root.querySelectorAll("[data-content-card]").forEach((card) => {
    card.addEventListener("dragstart", (event) => {
      event.dataTransfer?.setData("text/plain", card.getAttribute("data-content-card") || "");
      card.classList.add("workspace-card--dragging");
    });

    card.addEventListener("dragend", () => {
      card.classList.remove("workspace-card--dragging");
    });
  });

  root.querySelectorAll("[data-status-column]").forEach((column) => {
    column.addEventListener("dragover", (event) => {
      event.preventDefault();
      column.classList.add("workspace-column--active");
    });

    column.addEventListener("dragleave", () => {
      column.classList.remove("workspace-column--active");
    });

    column.addEventListener("drop", async (event) => {
      event.preventDefault();
      column.classList.remove("workspace-column--active");

      const contentId = event.dataTransfer?.getData("text/plain");
      const targetStatus = column.getAttribute("data-status-column");

      if (!contentId || !targetStatus) {
        return;
      }

      await onStatusChange(contentId, targetStatus);
    });
  });
}

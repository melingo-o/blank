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

function formatShortDate(value) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric"
  }).format(parsed);
}

function formatTime(value) {
  if (!value) {
    return "하루 기록";
  }

  const raw = String(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return "하루 기록";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "하루 기록";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(parsed);
}

function formatNumber(value) {
  return new Intl.NumberFormat("ko-KR").format(Number(value || 0));
}

function formatSignedDelta(value, unit) {
  const numeric = Number(value || 0);
  const prefix = numeric > 0 ? "+" : "";
  return `${prefix}${formatNumber(numeric)}${unit ? ` ${unit}` : ""}`;
}

function buildChart(points) {
  if (!points.length) {
    return null;
  }

  const width = 720;
  const height = 260;
  const insetX = 24;
  const insetY = 22;
  const maxValue = Math.max(...points.map((point) => Number(point.cumulative || 0)), 1);
  const stepX =
    points.length > 1 ? (width - insetX * 2) / (points.length - 1) : 0;

  const mappedPoints = points.map((point, index) => {
    const x = insetX + stepX * index;
    const y =
      height -
      insetY -
      (Number(point.cumulative || 0) / maxValue) * (height - insetY * 2);

    return {
      ...point,
      x,
      y
    };
  });

  const linePath = mappedPoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const areaPath = `${linePath} L ${mappedPoints[mappedPoints.length - 1].x} ${height - insetY} L ${mappedPoints[0].x} ${height - insetY} Z`;
  const guideValues = [maxValue, Math.round(maxValue / 2), 0];

  return {
    width,
    height,
    insetX,
    insetY,
    maxValue,
    mappedPoints,
    linePath,
    areaPath,
    guideValues
  };
}

function renderMetricPanel(metric) {
  const currentValue = metric.points[metric.points.length - 1]?.cumulative || 0;
  const latestDelta = metric.points[metric.points.length - 1]?.delta || 0;
  const activeDays = metric.points.filter((point) => Number(point.delta || 0) > 0).length;
  const chart = buildChart(metric.points);

  return `
    <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div class="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
        <div class="grid gap-3 sm:grid-cols-3">
          <div class="rounded-[20px] border border-slate-200 bg-white px-4 py-4">
            <p class="text-xs text-slate-500">${escapeHtml(metric.currentLabel)}</p>
            <p class="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              ${escapeHtml(formatNumber(currentValue))}<span class="ml-1 text-base text-slate-400">${escapeHtml(metric.unit)}</span>
            </p>
          </div>
          <div class="rounded-[20px] border border-slate-200 bg-white px-4 py-4">
            <p class="text-xs text-slate-500">${escapeHtml(metric.deltaLabel)}</p>
            <p class="mt-2 text-2xl font-semibold text-slate-950">${escapeHtml(formatSignedDelta(latestDelta, metric.unit))}</p>
          </div>
          <div class="rounded-[20px] border border-slate-200 bg-white px-4 py-4">
            <p class="text-xs text-slate-500">증감 발생일</p>
            <p class="mt-2 text-2xl font-semibold text-slate-950">${escapeHtml(formatNumber(activeDays))}</p>
          </div>
        </div>

        <div class="mt-5 overflow-hidden rounded-[24px] border border-slate-200 bg-white">
          ${
            chart
              ? `
                <svg viewBox="0 0 ${chart.width} ${chart.height}" class="h-auto w-full">
                  ${chart.guideValues
                    .map((value) => {
                      const y =
                        chart.height -
                        chart.insetY -
                        (Number(value || 0) / chart.maxValue) * (chart.height - chart.insetY * 2);

                      return `
                        <line
                          x1="${chart.insetX}"
                          y1="${y}"
                          x2="${chart.width - chart.insetX}"
                          y2="${y}"
                          stroke="rgba(203, 213, 225, 0.9)"
                          stroke-dasharray="4 6"
                        />
                        <text
                          x="${chart.width - chart.insetX}"
                          y="${Math.max(y - 8, 12)}"
                          text-anchor="end"
                          font-size="11"
                          fill="rgba(100, 116, 139, 0.9)"
                        >
                          ${escapeHtml(formatNumber(value))}
                        </text>
                      `;
                    })
                    .join("")}

                  <path d="${chart.areaPath}" fill="rgba(15, 23, 42, 0.08)"></path>
                  <path
                    d="${chart.linePath}"
                    fill="none"
                    stroke="rgba(15, 23, 42, 0.94)"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  ></path>

                  ${chart.mappedPoints
                    .filter((_, index, array) =>
                      index === 0 || index === array.length - 1 || Number(array[index].delta || 0) > 0
                    )
                    .map(
                      (point) => `
                        <circle
                          cx="${point.x}"
                          cy="${point.y}"
                          r="4.5"
                          fill="#0f172a"
                          stroke="white"
                          stroke-width="2"
                        ></circle>
                      `
                    )
                    .join("")}
                </svg>
              `
              : `
                <div class="px-4 py-16 text-center text-sm text-slate-400">
                  아직 시각화할 성장 기록이 없습니다.
                </div>
              `
          }
        </div>

        <div class="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <span>${escapeHtml(metric.description)}</span>
          ${
            metric.points.length > 0
              ? `
                <span>
                  ${escapeHtml(formatShortDate(metric.points[0].date))}
                  -
                  ${escapeHtml(formatShortDate(metric.points[metric.points.length - 1].date))}
                </span>
              `
              : ""
          }
        </div>
      </div>

      <div class="rounded-[24px] border border-slate-200 bg-white p-4">
        <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">${escapeHtml(metric.label)}</p>
        <h3 class="mt-2 text-base font-semibold text-slate-900">일별 증감 로그</h3>
        <div class="workspace-scrollbar mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
          ${
            metric.points.length > 0
              ? metric.points
                  .slice()
                  .reverse()
                  .map(
                    (point) => `
                      <div class="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                        <div class="flex items-center justify-between gap-3">
                          <p class="text-sm font-semibold text-slate-900">${escapeHtml(formatDate(point.date))}</p>
                          <span class="text-sm font-semibold ${Number(point.delta || 0) > 0 ? "text-slate-900" : "text-slate-400"}">
                            ${escapeHtml(formatSignedDelta(point.delta, metric.unit))}
                          </span>
                        </div>
                        <p class="mt-1 text-xs text-slate-500">
                          누적 ${escapeHtml(formatNumber(point.cumulative))} ${escapeHtml(metric.unit)}
                        </p>
                      </div>
                    `
                  )
                  .join("")
              : `
                  <div class="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                    아직 변화 로그가 없습니다.
                  </div>
                `
          }
        </div>
      </div>
    </div>
  `;
}

function renderDailyLog(log) {
  return `
    <article class="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h3 class="text-base font-semibold text-slate-900">${escapeHtml(formatDate(log.date))}</h3>
          <p class="mt-1 text-xs text-slate-500">${escapeHtml(String(log.items.length))}개의 기록</p>
        </div>
      </div>

      <div class="mt-4 space-y-3">
        ${log.items
          .map(
            (item) => `
              <div class="rounded-[18px] border border-slate-200 bg-white px-4 py-4">
                <div class="flex flex-wrap items-center gap-2 text-xs">
                  <span class="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">${escapeHtml(item.category || "로그")}</span>
                  <span class="text-slate-400">${escapeHtml(formatTime(item.date))}</span>
                </div>
                <p class="mt-3 text-sm font-semibold text-slate-900">${escapeHtml(item.title)}</p>
                <p class="mt-1 text-sm leading-6 text-slate-600">${escapeHtml(item.description || "기록이 추가되었습니다.")}</p>
              </div>
            `
          )
          .join("")}
      </div>
    </article>
  `;
}

export function renderTimeline({
  root,
  dailyLogs,
  growthMetrics,
  onCreateMilestone,
  activeMetricId
}) {
  const availableMetrics = Array.isArray(growthMetrics) ? growthMetrics : [];
  const fallbackMetricId = availableMetrics[0]?.id || null;
  const selectedMetricId =
    activeMetricId && availableMetrics.some((metric) => metric.id === activeMetricId)
      ? activeMetricId
      : fallbackMetricId;
  const selectedMetric =
    availableMetrics.find((metric) => metric.id === selectedMetricId) || availableMetrics[0];

  root.innerHTML = `
    <div class="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
      <section class="space-y-6">
        <div class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_34px_rgba(15,23,42,0.05)]">
          <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">성장 시각화</p>
              <h2 class="mt-2 text-xl font-semibold text-slate-900">지표별 증감 확인 그래프</h2>
              <p class="mt-2 text-sm leading-6 text-slate-500">
                Video Published, Total View, Subscribers Gained 버튼을 눌러 각 지표의 일별 변화를 따로 확인하세요.
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

          <div class="mt-6 flex flex-wrap gap-2">
            ${availableMetrics
              .map(
                (metric) => `
                  <button
                    type="button"
                    data-growth-metric="${escapeHtml(metric.id)}"
                    class="rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      metric.id === selectedMetricId
                        ? "border-slate-900 bg-slate-900 text-white shadow-[0_14px_28px_rgba(15,23,42,0.16)]"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }"
                  >
                    ${escapeHtml(metric.label)}
                  </button>
                `
              )
              .join("")}
          </div>

          <div class="mt-6">
            ${
              selectedMetric
                ? renderMetricPanel(selectedMetric)
                : `
                    <div class="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm text-slate-400">
                      아직 표시할 성장 데이터가 없습니다.
                    </div>
                  `
            }
          </div>
        </div>
      </section>

      <section class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_34px_rgba(15,23,42,0.05)]">
        <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">일일 로그</p>
        <h2 class="mt-2 text-xl font-semibold text-slate-900">하루 단위 작업 기록</h2>
        <p class="mt-2 text-sm leading-6 text-slate-500">
          PDF를 따로 발행하지 않아도, 그날 워크스페이스에서 남긴 기획안 수정, 미팅, 피드백, 발행 기록을 날짜별로 모아 보여줍니다.
        </p>

        <div class="workspace-scrollbar mt-6 max-h-[980px] space-y-4 overflow-y-auto pr-1">
          ${
            dailyLogs.length > 0
              ? dailyLogs.map(renderDailyLog).join("")
              : `
                  <div class="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm text-slate-400">
                    아직 남겨진 작업 로그가 없습니다.
                  </div>
                `
          }
        </div>
      </section>
    </div>
  `;

  root.querySelector('[data-action="create-milestone"]')?.addEventListener("click", () => {
    onCreateMilestone();
  });

  root.querySelectorAll("[data-growth-metric]").forEach((button) => {
    button.addEventListener("click", () => {
      renderTimeline({
        root,
        dailyLogs,
        growthMetrics: availableMetrics,
        onCreateMilestone,
        activeMetricId: button.getAttribute("data-growth-metric")
      });
    });
  });
}

export const CONTENT_PLAN_STAGES = [
  {
    id: "idea",
    label: "아이디어",
    description: "핵심 메시지와 훅"
  },
  {
    id: "thumbnail",
    label: "썸네일",
    description: "카피와 비주얼 방향"
  },
  {
    id: "script",
    label: "대본",
    description: "파트별 대사와 흐름"
  },
  {
    id: "filming",
    label: "촬영",
    description: "장면, 소스, 촬영 메모"
  },
  {
    id: "editing",
    label: "편집",
    description: "컷 편집, 자막, 후반 작업"
  }
];

export const CONTENT_STATUS_OPTIONS = [
  { id: "idea", label: "아이디어" },
  { id: "script", label: "대본" },
  { id: "filming", label: "촬영" },
  { id: "editing", label: "편집" },
  { id: "published", label: "발행" }
];

const STRUCTURED_SCRIPT_MARKER = "__CONTENT_PLAN_V2__";

function normalizeText(value) {
  return String(value || "").trim();
}

export function createDefaultPlanSections(overrides = {}) {
  return {
    idea: "",
    thumbnail: "",
    script: "",
    filming: "",
    editing: "",
    ...overrides
  };
}

export function createEmptyPart(overrides = {}) {
  return {
    id: overrides.id || createPartId(),
    title: normalizeText(overrides.title),
    idea: normalizeText(overrides.idea),
    script: normalizeText(overrides.script),
    filming: normalizeText(overrides.filming),
    editing: normalizeText(overrides.editing)
  };
}

export function createPartId() {
  return `part_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

function parseStructuredScript(value) {
  const raw = String(value || "");

  if (!raw.startsWith(`${STRUCTURED_SCRIPT_MARKER}\n`)) {
    return null;
  }

  try {
    const payload = JSON.parse(raw.slice(STRUCTURED_SCRIPT_MARKER.length + 1));
    return payload && typeof payload === "object" ? payload : null;
  } catch {
    return null;
  }
}

export function hydrateContentItem(content = {}) {
  const structured = parseStructuredScript(content.script);
  const sections = createDefaultPlanSections({
    idea: normalizeText(content.concept)
  });

  if (structured?.sections && typeof structured.sections === "object") {
    sections.thumbnail = normalizeText(structured.sections.thumbnail);
    sections.script = normalizeText(structured.sections.script);
    sections.filming = normalizeText(structured.sections.filming);
    sections.editing = normalizeText(structured.sections.editing);
  } else {
    sections.script = normalizeText(content.script);
  }

  const parts = Array.isArray(structured?.parts)
    ? structured.parts.map((part) => createEmptyPart(part))
    : [];

  return {
    ...content,
    planSections: sections,
    parts
  };
}

export function hydrateContents(contents = []) {
  return contents.map((content) => hydrateContentItem(content));
}

export function buildContentSavePayload({
  contentId,
  title,
  status,
  publishDate,
  sections,
  parts
}) {
  const normalizedSections = createDefaultPlanSections(sections);
  const normalizedParts = (Array.isArray(parts) ? parts : [])
    .map((part) => createEmptyPart(part))
    .filter(
      (part) =>
        part.title || part.idea || part.script || part.filming || part.editing
    );

  const structuredScript = {
    version: 2,
    sections: {
      thumbnail: normalizedSections.thumbnail,
      script: normalizedSections.script,
      filming: normalizedSections.filming,
      editing: normalizedSections.editing
    },
    parts: normalizedParts
  };

  return {
    ...(contentId ? { contentId } : {}),
    title: normalizeText(title),
    status: normalizeText(status) || "idea",
    publishDate: normalizeText(publishDate),
    concept: normalizedSections.idea,
    script: `${STRUCTURED_SCRIPT_MARKER}\n${JSON.stringify(structuredScript)}`
  };
}

export function countFilledParts(parts = [], field) {
  return parts.filter((part) => normalizeText(part?.[field])).length;
}

export function collectPartTitles(parts = [], limit = 3) {
  return parts
    .map((part) => normalizeText(part?.title))
    .filter(Boolean)
    .slice(0, limit);
}

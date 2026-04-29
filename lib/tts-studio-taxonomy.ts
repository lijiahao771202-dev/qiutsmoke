export type TTSStudioSubcategory = {
  id: string;
  label: string;
  icon?: string;
};

export type TTSStudioCategory = {
  id: string;
  label: string;
  icon?: string;
  tone: "neutral" | "amber" | "rose" | "purple" | "teal" | "indigo" | "cyan";
  builtIn?: boolean;
  children?: TTSStudioSubcategory[];
};

export type TTSStudioCategoryConfig = {
  customCategories?: unknown[];
  customChildrenByParentId?: Record<string, unknown[]>;
};

export type NormalizedTTSStudioCategoryConfig = {
  customCategories: TTSStudioCategory[];
  customChildrenByParentId: Record<string, TTSStudioSubcategory[]>;
};

export type TTSStudioCategorySelection = {
  categoryId: string;
  subcategoryId?: string;
};

export type TTSStudioCardCategoryFields = {
  category_id?: string | null;
  subcategory_id?: string | null;
};

export const TTS_STUDIO_ALL_CATEGORY_ID = "all";

export const BUILT_IN_TTS_STUDIO_CATEGORIES: TTSStudioCategory[] = [
  {
    id: "desire-game",
    label: "欲望的博弈",
    icon: "🪞",
    tone: "amber",
    builtIn: true,
  },
  {
    id: "rain",
    label: "RAIN 简易版",
    icon: "🌊",
    tone: "rose",
    builtIn: true,
  },
  {
    id: "rain-advanced",
    label: "RAIN 进阶版",
    icon: "🔥",
    tone: "purple",
    builtIn: true,
  },
  {
    id: "emotion-anxiety",
    label: "情绪：焦虑",
    icon: "🌧️",
    tone: "teal",
    builtIn: true,
  },
  {
    id: "emotion-body-scan",
    label: "身体扫描",
    icon: "🧘‍♀️",
    tone: "indigo",
    builtIn: true,
    children: [
      { id: "quick", label: "急救重置", icon: "⚡" },
      { id: "basic", label: "基础练习", icon: "⚖️" },
      { id: "deep", label: "深度疗愈", icon: "🌌" },
      { id: "sleep", label: "助眠冬眠", icon: "💤" },
      { id: "visual", label: "高级意象", icon: "🌿" },
      { id: "active", label: "特殊情境", icon: "🏃" },
    ],
  },
];

function normalizeLabel(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeSubcategory(value: unknown): TTSStudioSubcategory | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as TTSStudioSubcategory;
  const id = normalizeLabel(candidate.id);
  const label = normalizeLabel(candidate.label);
  if (!id || !label) return null;

  return {
    id,
    label,
    icon: normalizeLabel(candidate.icon) || "•",
  };
}

function normalizeCategory(value: unknown): TTSStudioCategory | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as TTSStudioCategory;
  const id = normalizeLabel(candidate.id);
  const label = normalizeLabel(candidate.label);
  if (!id || !label) return null;

  const children = Array.isArray(candidate.children)
    ? candidate.children.map(normalizeSubcategory).filter((child): child is TTSStudioSubcategory => Boolean(child))
    : [];

  return {
    id,
    label,
    icon: normalizeLabel(candidate.icon) || "🏷️",
    tone: candidate.tone || "cyan",
    children,
  };
}

export function normalizeTTSStudioCategoryConfig(
  config: TTSStudioCategoryConfig | null | undefined
): NormalizedTTSStudioCategoryConfig {
  const customCategories = Array.isArray(config?.customCategories)
    ? config.customCategories
        .map(normalizeCategory)
        .filter((category): category is TTSStudioCategory => Boolean(category))
    : [];

  const customChildrenByParentId: Record<string, TTSStudioSubcategory[]> = {};
  if (config?.customChildrenByParentId && typeof config.customChildrenByParentId === "object") {
    for (const [parentId, children] of Object.entries(config.customChildrenByParentId)) {
      const normalizedParentId = normalizeLabel(parentId);
      if (!normalizedParentId || !Array.isArray(children)) continue;
      const normalizedChildren = children
        .map(normalizeSubcategory)
        .filter((child): child is TTSStudioSubcategory => Boolean(child));
      if (normalizedChildren.length > 0) {
        customChildrenByParentId[normalizedParentId] = normalizedChildren;
      }
    }
  }

  return { customCategories, customChildrenByParentId };
}

export function getTTSStudioCategories(config?: TTSStudioCategoryConfig | null): TTSStudioCategory[] {
  const normalized = normalizeTTSStudioCategoryConfig(config);
  const customChildrenByParentId = normalized.customChildrenByParentId;

  return [
    ...BUILT_IN_TTS_STUDIO_CATEGORIES.map((category) => ({
      ...category,
      children: [
        ...(category.children ?? []),
        ...(customChildrenByParentId[category.id] ?? []),
      ],
    })),
    ...normalized.customCategories.map((category) => ({
      ...category,
      children: [
        ...(category.children ?? []),
        ...(customChildrenByParentId[category.id] ?? []),
      ],
    })),
  ];
}

export function addTTSStudioCategory(
  config: TTSStudioCategoryConfig | null | undefined,
  label: string,
  createId: () => string
): NormalizedTTSStudioCategoryConfig {
  const normalized = normalizeTTSStudioCategoryConfig(config);
  const cleanLabel = normalizeLabel(label);
  if (!cleanLabel) return normalized;

  return {
    ...normalized,
    customCategories: [
      ...normalized.customCategories,
      {
        id: createId(),
        label: cleanLabel,
        icon: "🏷️",
        tone: "cyan",
        children: [],
      },
    ],
  };
}

export function addTTSStudioSubcategory(
  config: TTSStudioCategoryConfig | null | undefined,
  parentId: string,
  label: string,
  createId: () => string
): NormalizedTTSStudioCategoryConfig {
  const normalized = normalizeTTSStudioCategoryConfig(config);
  const cleanParentId = normalizeLabel(parentId);
  const cleanLabel = normalizeLabel(label);
  if (!cleanParentId || !cleanLabel || cleanParentId === TTS_STUDIO_ALL_CATEGORY_ID) {
    return normalized;
  }

  const child = { id: createId(), label: cleanLabel, icon: "•" };
  const customCategoryIndex = normalized.customCategories.findIndex(
    (category) => category.id === cleanParentId
  );

  if (customCategoryIndex >= 0) {
    const customCategories = normalized.customCategories.map((category, index) =>
      index === customCategoryIndex
        ? { ...category, children: [...(category.children ?? []), child] }
        : category
    );
    return { ...normalized, customCategories };
  }

  return {
    ...normalized,
    customChildrenByParentId: {
      ...normalized.customChildrenByParentId,
      [cleanParentId]: [
        ...(normalized.customChildrenByParentId[cleanParentId] ?? []),
        child,
      ],
    },
  };
}

export function buildCreateCardCategoryAssignment(
  selection: TTSStudioCategorySelection
): TTSStudioCardCategoryFields {
  if (!selection.categoryId || selection.categoryId === TTS_STUDIO_ALL_CATEGORY_ID) {
    return {};
  }

  const subcategoryId =
    selection.subcategoryId && selection.subcategoryId !== TTS_STUDIO_ALL_CATEGORY_ID
      ? selection.subcategoryId
      : null;

  return {
    category_id: selection.categoryId,
    subcategory_id: subcategoryId,
  };
}

export function filterTTSStudioCardsBySelection<T extends TTSStudioCardCategoryFields>(
  cards: T[],
  selection: TTSStudioCategorySelection
) {
  if (!selection.categoryId || selection.categoryId === TTS_STUDIO_ALL_CATEGORY_ID) {
    return cards;
  }

  return cards.filter((card) => {
    if (card.category_id !== selection.categoryId) return false;
    if (!selection.subcategoryId || selection.subcategoryId === TTS_STUDIO_ALL_CATEGORY_ID) {
      return true;
    }
    return card.subcategory_id === selection.subcategoryId;
  });
}

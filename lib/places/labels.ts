import type { SpotCategory } from "./types";

/** 景点分类双语 label 映射（集中维护，卡片与筛选条共用）。 */
export const SPOT_CATEGORY_LABELS: Record<SpotCategory, { en: string; zh: string }> = {
  nature: { en: "Nature", zh: "自然" },
  culture: { en: "Culture", zh: "人文" },
  history: { en: "History", zh: "历史" },
  food: { en: "Food", zh: "美食" },
  district: { en: "District", zh: "街区" },
  leisure: { en: "Leisure", zh: "休闲" },
};

export const SPOT_CATEGORIES: SpotCategory[] = [
  "nature",
  "culture",
  "history",
  "food",
  "district",
  "leisure",
];

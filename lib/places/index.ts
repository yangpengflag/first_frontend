/**
 * 景点模块数据访问层（P4 起接入真实后端 api-spots）。
 *
 * <p>列表 / 详情 / 排序 / 相关项均经 {@link ./client} 的 fetch 调用 `/api/cities`、
 * `/api/spots`，由 client 完成 snake_case→camelCase 适配；本层保留本地筛选/排序/分页逻辑
 * （在已拉取的数据集上运行），以保证列表页筛选/分页行为与测试确定性，且服务端若已做同语义
 * 过滤时本地再过滤为幂等。
 *
 * <p>城市名反范式地附着于 Spot（client 内部按 citySlug 关联 City 列表），故 SpotCard /
 * SpotDetail 无需再查城市。选项列表与"相关攻略"占位仍取自 mock，待 P6
 * post-location-tagging 接入真实聚合后替换。
 */
import { CITIES_MOCK, SPOTS_MOCK, RELATED_POSTS_MOCK } from "./mocks";
import type { City, Spot, RelatedPost, SpotCategory, PageResult } from "./types";
import { SPOT_CATEGORIES } from "./labels";
import { fetchCities, fetchSpots, fetchCityBySlug, fetchSpotBySlug } from "./client";

/** 一次拉全量用于本地筛选/排序/分页（数据集小，演示阶段可接受）。 */
const ALL = 1000;

/** 城市榜：按 name 升序取 Top N（city-module 精简后无 featured/viewCount 信号）。 */
export async function getTopCities(limit = 6): Promise<City[]> {
  const { items } = await fetchCities({ size: ALL });
  return [...items]
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, limit);
}

/** 小众精选：hiddenGem 优先，其次 featured，再次 viewCount 降序（契合 Hidden Spot 语义）。 */
export async function getTopSpots(limit = 6): Promise<Spot[]> {
  const { items } = await fetchSpots({ size: ALL });
  return [...items]
    .sort(
      (a, b) =>
        Number(b.hiddenGem) - Number(a.hiddenGem) ||
        Number(b.featured) - Number(a.featured) ||
        b.viewCount - a.viewCount
    )
    .slice(0, limit);
}

export async function getCityBySlug(slug: string): Promise<City | null> {
  return fetchCityBySlug(slug);
}

export async function getSpotBySlug(slug: string): Promise<Spot | null> {
  return fetchSpotBySlug(slug);
}

export async function getSpotsByCity(citySlug: string): Promise<Spot[]> {
  const { items } = await fetchSpots({ size: ALL });
  return items
    .filter((s) => s.citySlug === citySlug)
    .sort((a, b) => b.viewCount - a.viewCount);
}

/** 详情页"相关攻略"占位（P6 post-location-tagging 后切换为真实聚合，按 spot slug 查询）。 */
export function getRelatedPostsForSpot(_slug: string): RelatedPost[] {
  void _slug; // 占位期未使用；P6 接入真实聚合时按 slug 查询
  return RELATED_POSTS_MOCK;
}

/** 城市详情页"相关攻略"占位（同上）。 */
export function getRelatedPostsForCity(_slug: string): RelatedPost[] {
  void _slug; // 占位期未使用；P6 接入真实聚合时按 slug 查询
  return RELATED_POSTS_MOCK;
}

// ---------------------------------------------------------------------------
// P2 列表页选择器：筛选 / 搜索 / 排序 / 分页（在已拉取的数据集上运行）
// ---------------------------------------------------------------------------

export interface CityQuery {
  page?: number;
  size?: number;
}

export interface SpotQuery {
  city?: string;
  category?: SpotCategory | string;
  tag?: string;
  q?: string;
  sort?: "popular" | "hidden";
  page?: number;
  size?: number;
}

export type { PageResult } from "./types";

function paginate<T>(items: T[], page = 1, size = 6): PageResult<T> {
  const total = items.length;
  const safePage = Math.max(1, page || 1);
  const safeSize = Math.max(1, size || 6);
  const start = (safePage - 1) * safeSize;
  return {
    items: items.slice(start, start + safeSize),
    total,
    page: safePage,
    size: safeSize,
    totalPages: Math.max(1, Math.ceil(total / safeSize)),
  };
}

export async function filterCities(query: CityQuery = {}): Promise<PageResult<City>> {
  const { items } = await fetchCities({ size: ALL });
  // 后端列表已按 name 升序返回；本地再排一次为幂等兜底（mock/离线数据不保证有序）
  const result = [...items].sort((a, b) => a.name.localeCompare(b.name));
  return paginate(result, query.page, query.size);
}

export async function filterSpots(query: SpotQuery = {}): Promise<PageResult<Spot>> {
  const { items } = await fetchSpots({ size: ALL });
  let result = [...items];
  if (query.city) {
    result = result.filter((s) => s.citySlug === query.city);
  }
  if (query.category) {
    result = result.filter((s) => s.category === query.category);
  }
  if (query.tag) {
    result = result.filter((s) => s.tags.includes(query.tag as string));
  }
  if (query.q) {
    const q = query.q.trim().toLowerCase();
    result = result.filter((s) =>
      [s.nameEn, s.nameZh, s.summaryEn, s.summaryZh, ...s.tags]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }
  if (query.sort === "hidden") {
    result.sort(
      (a, b) =>
        Number(b.hiddenGem) - Number(a.hiddenGem) || b.viewCount - a.viewCount
    );
  } else {
    result.sort((a, b) => b.viewCount - a.viewCount);
  }
  return paginate(result, query.page, query.size);
}

/** 同城市内的其他 POI（详情页"周边 POI"占位）。 */
export async function getSpotNeighbors(slug: string): Promise<Spot[]> {
  const spot = await getSpotBySlug(slug);
  if (!spot) return [];
  const { items } = await fetchSpots({ size: ALL });
  return items
    .filter((s) => s.citySlug === spot.citySlug && s.slug !== slug)
    .sort((a, b) => b.viewCount - a.viewCount);
}

// ---------------------------------------------------------------------------
// 选项列表（驱动筛选条下拉）—— 暂取自 mock，P6 后切换真实聚合
// ---------------------------------------------------------------------------

export function listCityOptions(): { slug: string; name: string; nameZh: string }[] {
  return CITIES_MOCK.map((c) => ({ slug: c.slug, name: c.name, nameZh: c.nameZh })).sort(
    (a, b) => a.name.localeCompare(b.name)
  );
}

export function listCategories(): SpotCategory[] {
  return SPOT_CATEGORIES;
}

export function listSpotTags(): string[] {
  return Array.from(new Set(SPOTS_MOCK.flatMap((s) => s.tags))).sort();
}

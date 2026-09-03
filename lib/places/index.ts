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
import type { City, Spot, RelatedPost, SpotCategory, PageResult } from "./types";
import { SPOT_CATEGORIES } from "./labels";
import { fetchCities, fetchSpots, fetchCityBySlug, fetchSpotBySlug, fetchRelatedPosts } from "./client";

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

/** 详情页"相关攻略"：按 spot slug 聚合（POST /api/posts?spotId=）。失败则降级为空（不影响详情页）。 */
export async function getRelatedPostsForSpot(slug: string): Promise<RelatedPost[]> {
  try {
    return await fetchRelatedPosts({ spotId: slug });
  } catch {
    return [];
  }
}

/** 城市详情页"相关攻略"：按 city slug 聚合（GET /api/posts?cityId=）。失败则降级为空。 */
export async function getRelatedPostsForCity(slug: string): Promise<RelatedPost[]> {
  try {
    return await fetchRelatedPosts({ cityId: slug });
  } catch {
    return [];
  }
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
  // 真分页（P4 api-spots）：city/category/tag/q/sort/page/size 全下推后端，
  // 由 client.fetchSpots 完成 snake_case 适配与分页信封映射；本地不再二次过滤/排序/切片。
  return fetchSpots(query);
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

// 选项列表（驱动筛选条下拉）改为聚合真实后端 /api/cities、/api/spots，
// 与运行时形状一致（设计 D6）。msw 在测试环境返回对齐后的 MOCK 数据。
export async function listCityOptions(): Promise<{ slug: string; name: string; nameZh: string }[]> {
  const { items } = await fetchCities({ size: ALL });
  return items
    .map((c) => ({ slug: c.slug, name: c.name, nameZh: c.nameZh }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function listCategories(): SpotCategory[] {
  return SPOT_CATEGORIES;
}

export async function listSpotTags(): Promise<string[]> {
  const { items } = await fetchSpots({ size: ALL });
  return Array.from(new Set(items.flatMap((s) => s.tags))).sort();
}

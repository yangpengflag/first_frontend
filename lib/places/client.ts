/**
 * 真实后端接入层（P4 / api-spots）。
 *
 * <p>前端契约类型（{@link ./types}）保持不变；此层把后端 snake_case 出网 JSON 适配成
 * 前端 camelCase 形状（{@link mapCity} / {@link mapSpot}），组件层无需改动。
 * 后端枚举 `category` 为全大写出网（如 `NATURE`），此处统一转小写以对齐前端联合类型。
 *
 * <p>城市展示名反范式地附着于 Spot：{@link ensureCityIndex} 拉取一次城市列表并建立
 * `citySlug → 城市名` 索引，{@link fetchSpots} 映射时为每个 Spot 补上 `cityName`，
 * 避免卡片/详情页为城市名做 N+1 查询（无需改动后端）。
 *
 * <p>所有函数经 {@link fetchFromBackend}（已注入 request_id 回调、统一错误处理）访问
 * `/api/cities`、`/api/spots`。详情接口对 404 返回 `null`（软删行语义：404 而非 500）。
 */
import { fetchFromBackend } from "@/lib/backend";

import type { City, PageResult, Spot, SpotCategory } from "./types";

/** 后端城市出网形状（snake_case + 顶层 request_id）。仅声明用到的字段。 */
interface RawCity {
  slug: string;
  name: string;
  name_zh: string;
  cover_image?: string | null;
  description?: string | null;
  best_season?: string | null;
  spot_count?: number | null;
  top_spots?: RawSpot[] | null;
  related_posts?: unknown[] | null;
}

/** 后端景点出网形状。 */
interface RawSpot {
  slug: string;
  name_zh: string;
  name_en: string;
  city_slug: string;
  category?: string | null;
  tags?: string[] | null;
  level?: string | null;
  address_en?: string | null;
  address_zh?: string | null;
  lat?: number | null;
  lng?: number | null;
  cover_image_url?: string | null;
  gallery_urls?: string[] | null;
  summary_en?: string | null;
  summary_zh?: string | null;
  description_en?: string | null;
  description_zh?: string | null;
  opening_hours?: string | null;
  ticket_info?: string | null;
  visit_duration?: string | null;
  view_count?: number | null;
  post_count?: number | null;
  rating?: number | null;
  featured?: boolean | null;
  hidden_gem?: boolean | null;
  nearby_spots?: RawSpot[] | null;
  related_posts?: unknown[] | null;
}

interface RawList<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
  has_more: boolean;
}

function mapCity(raw: RawCity): City {
  return {
    slug: raw.slug,
    nameZh: raw.name_zh,
    name: raw.name,
    coverImage: raw.cover_image ?? "",
    description: raw.description ?? "",
    bestSeason: raw.best_season ?? undefined,
    spotCount: raw.spot_count ?? 0,
  };
}

function mapSpot(raw: RawSpot): Spot {
  return {
    slug: raw.slug,
    nameZh: raw.name_zh,
    nameEn: raw.name_en,
    citySlug: raw.city_slug,
    category: (raw.category ?? "nature").toLowerCase() as SpotCategory,
    tags: raw.tags ?? [],
    level: (raw.level as Spot["level"]) ?? null,
    addressEn: raw.address_en ?? "",
    addressZh: raw.address_zh ?? "",
    lat: raw.lat ?? 0,
    lng: raw.lng ?? 0,
    coverImage: raw.cover_image_url ?? "",
    gallery: raw.gallery_urls ?? [],
    summaryEn: raw.summary_en ?? "",
    summaryZh: raw.summary_zh ?? "",
    descriptionEn: raw.description_en ?? "",
    descriptionZh: raw.description_zh ?? "",
    openingHours: raw.opening_hours ?? undefined,
    ticketInfo: raw.ticket_info ?? undefined,
    visitDuration: raw.visit_duration ?? undefined,
    viewCount: raw.view_count ?? 0,
    postCount: raw.post_count ?? 0,
    rating: raw.rating ?? null,
    featured: raw.featured ?? false,
    hiddenGem: raw.hidden_gem ?? false,
  };
}

export interface CityQuery {
  page?: number;
  size?: number;
}

export interface SpotQuery {
  city?: string;
  category?: string;
  tag?: string;
  q?: string;
  sort?: "popular" | "hidden";
  page?: number;
  size?: number;
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "" && value !== null) {
      sp.set(key, String(value));
    }
  }
  const query = sp.toString();
  return query ? `?${query}` : "";
}

function toPageResult<T>(items: T[], data: RawList<unknown>): PageResult<T> {
  const total = data.total ?? items.length;
  const size = data.size ?? items.length;
  return {
    items,
    total,
    page: data.page ?? 1,
    size,
    totalPages: size > 0 ? Math.ceil(total / size) : 1,
  };
}

// ===== 城市名反范式索引（供 Spot 关联） =====
let cityIndex: Map<string, { name: string; nameZh: string }> | null = null;

async function ensureCityIndex(): Promise<Map<string, { name: string; nameZh: string }>> {
  if (cityIndex) return cityIndex;
  try {
    const data = await fetchFromBackend<RawList<RawCity>>(`/api/cities${buildQuery({ size: 1000 })}`);
    cityIndex = new Map(
      data.items.map((c) => [c.slug, { name: c.name, nameZh: c.name_zh }])
    );
  } catch {
    cityIndex = new Map();
  }
  return cityIndex;
}

export async function fetchCities(query: CityQuery = {}): Promise<PageResult<City>> {
  const data = await fetchFromBackend<RawList<RawCity>>(`/api/cities${buildQuery({
    page: query.page,
    size: query.size,
  })}`);
  return toPageResult(data.items.map(mapCity), data);
}

export async function fetchSpots(query: SpotQuery = {}): Promise<PageResult<Spot>> {
  const data = await fetchFromBackend<RawList<RawSpot>>(`/api/spots${buildQuery({
    city: query.city,
    category: query.category,
    tag: query.tag,
    q: query.q,
    sort: query.sort,
    page: query.page,
    size: query.size,
  })}`);
  const index = await ensureCityIndex();
  const items = data.items.map((raw) => {
    const spot = mapSpot(raw);
    const city = index.get(spot.citySlug);
    if (city) {
      spot.cityName = city.name;
    }
    return spot;
  });
  return toPageResult(items, data);
}

async function nullOn404<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    const status = (error as { status?: number })?.status;
    const code = (error as { code?: string })?.code;
    if (status === 404 || code === "CITY_NOT_FOUND" || code === "SPOT_NOT_FOUND") {
      return null;
    }
    throw error;
  }
}

export function fetchCityBySlug(slug: string): Promise<City | null> {
  return nullOn404(() =>
    fetchFromBackend<RawCity>(`/api/cities/${encodeURIComponent(slug)}`).then(mapCity)
  );
}

export function fetchSpotBySlug(slug: string): Promise<Spot | null> {
  return nullOn404(() =>
    fetchFromBackend<RawSpot>(`/api/spots/${encodeURIComponent(slug)}`).then(mapSpot)
  );
}

/**
 * 景点模块类型——前期（P0–P3）以手写契约类型驱动前端 mock。
 *
 * <p>与 posts 模块"由 openapi.json 生成物派生"的约定不同：本 capability 的后端
 * api-spots 尚不存在（P4 才落地），故此处先手写契约；P4 接入后须对齐 openapi
 * 生成的 camelCase 形状，并改为 `Omit<components["schemas"]["..."], ...>` 派生，
 * 删除本文件中的重复定义。
 */
export type SpotCategory =
  | "nature"
  | "culture"
  | "history"
  | "food"
  | "district"
  | "leisure";

export interface City {
  /** 唯一，由 name 自动 kebab 化（如 "hangzhou"），仅作不透明路由键与归属锚点。 */
  slug: string;
  nameZh: string;
  /** 英文名，必填，主显（slug 的唯一生成源）。 */
  name: string;
  coverImage: string;
  /** 单字段描述，不区分语言——用户/数据源输入什么即展示什么。 */
  description: string;
  bestSeason?: string;
  spotCount: number;
}

export interface Spot {
  /** 复合 citySlug-spotSlug，全局唯一（仅作不透明路由键，不分割解析）。 */
  slug: string;
  nameZh: string;
  /** 主显。 */
  nameEn: string;
  /** 归属 + 消歧。 */
  citySlug: string;
  /**
   * 城市展示名（反范式附着于 Spot，由 client 按 citySlug 关联 City 列表填充）。
   * 避免卡片/详情页为取城市名而 N+1 查询；缺失时 UI 回退到 citySlug。
   */
  cityName?: string;
  category: SpotCategory;
  tags: string[];
  level?: "5A" | "4A" | null;
  addressEn: string;
  addressZh: string;
  lat: number;
  lng: number;
  coverImage: string;
  gallery: string[];
  /** 英主中副。 */
  summaryEn: string;
  summaryZh: string;
  descriptionEn: string;
  descriptionZh: string;
  openingHours?: string;
  ticketInfo?: string;
  visitDuration?: string;
  viewCount: number;
  postCount: number;
  /** 可选 0–5，由 AI 爬虫估算；可空，缺失时 UI 不展示。 */
  rating?: number | null;
  /** 编辑/ crawler 精选，驱动首页 hot-spots Top N。 */
  featured: boolean;
  /** 小众/非旅游团（project.md 的 Hidden Spot 语义）。 */
  hiddenGem: boolean;
}

/** 详情页"相关攻略"占位类型（P6 后切换为真实 PostSummary）。 */
export interface RelatedPost {
  id: string;
  title: string;
  slug: string;
}

/** 分页结果信封（与后端 offset 模式对齐：items / page / size / total / totalPages）。 */
export interface PageResult<T> {
  items: T[];
  /** 当前页（从 1 开始）。 */
  page: number;
  /** 每页大小。 */
  size: number;
  /** 总条数。 */
  total: number;
  /** 总页数。 */
  totalPages: number;
}

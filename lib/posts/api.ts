import { fetchFromBackend } from "../backend";
import type {
  CreatePostRequest,
  PostListParams,
  PostListResponse,
  PostResponse,
} from "./types";

/**
 * 帖子 API 的具体调用入口。
 *
 * <p>只描述「调哪个端点、传什么、返回什么」，不含状态判断等业务逻辑。
 * 传输与错误解析统一委托给 {@link fetchFromBackend}（BFF 薄层，已实现
 * Bearer 注入、401 静默续期重放、统一错误信封解析与空响应体处理）。
 * 本模块的价值在于用 openapi 生成类型约束每个端点的入参与返回，
 * 使后端契约变更在编译期暴露。
 */

function get<T>(
    path: string,
    params?: Record<string, string | number | undefined>
): Promise<T> {
  const entries = params
    ? Object.entries(params).filter(([, value]) => value !== undefined)
    : [];
  const query = entries.length
    ? "?" +
      new URLSearchParams(entries.map(([key, value]) => [key, String(value)])).toString()
    : "";
  return fetchFromBackend<T>(path + query);
}

function post<T>(path: string, body: unknown): Promise<T> {
  return fetchFromBackend<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export const postsApi = {
  /** 公开列表：仅 PUBLISHED；sort=latest（cursor 翻页）/ top / most_commented（offset 翻页），无需鉴权。 */
  list(params: PostListParams = {}) {
    return get<PostListResponse>("/api/posts", {
      sort: params.sort,
      cursor: params.cursor,
      page: params.page,
      size: params.size,
    });
  },

  /** 我的帖子：当前用户全部状态（含 DRAFT），并带互动统计与排序 / 分页；需鉴权。 */
  me(params: PostListParams = {}) {
    return get<PostListResponse>("/api/posts/me", {
      sort: params.sort,
      cursor: params.cursor,
      page: params.page,
      size: params.size,
    });
  },

  /** 创建帖子：authorId 由后端 JWT 主体推导，前端不传；需鉴权。 */
  create(input: CreatePostRequest) {
    return post<PostResponse>("/api/posts", input);
  },

  /** 公开详情：仅已发布；草稿 / 已软删 / 不存在返回 404 POST_NOT_FOUND。 */
  getById(id: string) {
    return get<PostResponse>(`/api/posts/${encodeURIComponent(id)}`);
  },
};

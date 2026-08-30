import { fetchFromBackend } from "../backend";
import type { BookmarkResponse, BookmarkStatusResponse, PageBookmarkSummary } from "./types";

/**
 * 收藏 API 的具体调用入口（薄封装）。
 * 传输与错误解析统一委托给 {@link fetchFromBackend}。
 */
function get<T>(
    path: string,
    params?: Record<string, string | number | undefined>,
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

export const bookmarksApi = {
  /** 我的收藏列表：需鉴权，全量分页，失效帖子以 available=false 占位。 */
  list(page = 0, size = 20) {
    return get<PageBookmarkSummary>("/api/bookmarks", { page, size });
  },

  /** 收藏状态查询：需鉴权，精确返回当前用户是否已收藏该帖。 */
  status(postId: string) {
    return fetchFromBackend<BookmarkStatusResponse>(
        `/api/posts/${encodeURIComponent(postId)}/bookmark`,
    );
  },

  /** 切换收藏：需鉴权。已收藏则取消，未收藏则收藏。 */
  toggle(postId: string) {
    return fetchFromBackend<BookmarkResponse>(
        `/api/posts/${encodeURIComponent(postId)}/bookmark`,
        { method: "POST" },
    );
  },
};

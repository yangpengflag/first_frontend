import { fetchFromBackend } from "../backend";

/**
 * 景点收藏状态响应（手写，镜像后端 SpotBookmarkStatusResponse：以 spot_slug 替代 post_id）。
 * 与帖子收藏 BookmarkStatusResponse 形状一致，仅键名不同。
 */
export interface SpotBookmarkStatusResponse {
  spot_slug: string;
  bookmarked: boolean;
}

/**
 * 景点收藏 API 薄封装（独立于帖子收藏 bookmarksApi，端点路径不同）。
 * 状态查询与切换均走 {@code /api/spots/{slug}/bookmark}，需鉴权。
 */
export const spotBookmarksApi = {
  /** 景点收藏状态查询：需鉴权，精确返回当前用户是否已收藏。 */
  status(slug: string) {
    return fetchFromBackend<SpotBookmarkStatusResponse>(
      `/api/spots/${encodeURIComponent(slug)}/bookmark`,
    );
  },

  /** 切换景点收藏：需鉴权。已收藏则取消，未收藏则收藏。 */
  toggle(slug: string) {
    return fetchFromBackend<SpotBookmarkStatusResponse>(
      `/api/spots/${encodeURIComponent(slug)}/bookmark`,
      { method: "POST" },
    );
  },
};

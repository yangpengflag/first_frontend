import { fetchFromBackend } from "../backend";
import type {
  CommentThreadApi,
  CommentThreadItem,
  PageCommentThread,
  CreateCommentRequest,
} from "@/lib/comments/types";
import type { SpotCommentView, PageSpotCommentResponse } from "./types";

/**
 * 景点评论 API 薄封装（独立于帖子评论 commentsApi，端点路径不同）。
 *
 * <p>顶层列表/创建走 {@code /api/spots/{slug}/comments}；回复走独立的
 * {@code /api/spot-comments/{id}/replies}，因为景点评论存于独立 {@code spot_comments}
 * 表，复用帖子评论的回复端点会 404。所有端点需鉴权。请求体复用帖子评论的
 * {@link CreateCommentRequest}（content + parent_comment_id 形状相同）。
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

function post<T>(path: string, body: unknown): Promise<T> {
  return fetchFromBackend<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export const spotCommentsApi = {
  /** 顶层评论列表：需鉴权，倒序分页，含 reply_count。 */
  list(slug: string, page = 0, size = 20) {
    return get<PageSpotCommentResponse>(`/api/spots/${encodeURIComponent(slug)}/comments`, {
      page,
      size,
    });
  },

  /** 回复列表：需鉴权，升序分页，独立端点。 */
  replies(commentId: string, page = 0, size = 20) {
    return get<PageSpotCommentResponse>(
      `/api/spot-comments/${encodeURIComponent(commentId)}/replies`,
      { page, size },
    );
  },

  /** 发布评论：parent_comment_id 留空为顶层。 */
  create(slug: string, input: CreateCommentRequest) {
    return post<SpotCommentView>(`/api/spots/${encodeURIComponent(slug)}/comments`, input);
  },

  /** 删除评论（软删）：需鉴权且为作者本人。 */
  remove(commentId: string) {
    return fetchFromBackend<void>(`/api/spot-comments/${encodeURIComponent(commentId)}`, {
      method: "DELETE",
    });
  },
};

/**
 * 将景点评论 API 适配为 {@link CommentThreadApi}。闭包捕获 slug，使上层无需感知目标类型。
 * 回复端点差异在 {@link spotCommentsApi} 内部消化，上层只调用统一的 replies()。
 */
export function makeSpotCommentApi(slug: string): CommentThreadApi {
  return {
    list: (page, size) =>
      spotCommentsApi.list(slug, page, size) as Promise<PageCommentThread>,
    replies: (id, page, size) =>
      spotCommentsApi.replies(id, page, size) as Promise<PageCommentThread>,
    create: (content, parentId) =>
      spotCommentsApi.create(slug, {
        content,
        parent_comment_id: parentId ?? undefined,
      }) as Promise<CommentThreadItem>,
    remove: (id) => spotCommentsApi.remove(id),
  };
}

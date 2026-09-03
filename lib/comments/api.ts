import { fetchFromBackend } from "../backend";
import type { CommentResponse, CreateCommentRequest, PageCommentResponse } from "./types";

/**
 * 评论 API 的具体调用入口（薄封装，只描述「调哪个端点、传什么、返回什么」）。
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

function post<T>(path: string, body: unknown): Promise<T> {
  return fetchFromBackend<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export const commentsApi = {
  /** 顶层评论列表：需鉴权，按创建时间倒序分页，含 reply_count。 */
  list(postId: string, page = 0, size = 20) {
    return get<PageCommentResponse>(`/api/posts/${encodeURIComponent(postId)}/comments`, {
      page,
      size,
    });
  },

  /** 某评论的回复列表：需鉴权，按创建时间升序分页。 */
  replies(commentId: string, page = 0, size = 20) {
    return get<PageCommentResponse>(`/api/comments/${encodeURIComponent(commentId)}/replies`, {
      page,
      size,
    });
  },

  /** 发布评论：parent_comment_id 留空为顶层，否则为对该顶层评论的回复。 */
  create(postId: string, input: CreateCommentRequest) {
    return post<CommentResponse>(`/api/posts/${encodeURIComponent(postId)}/comments`, input);
  },

  /** 删除评论（软删）：需鉴权且为作者本人。 */
  remove(commentId: string) {
    return fetchFromBackend<void>(`/api/comments/${encodeURIComponent(commentId)}`, {
      method: "DELETE",
    });
  },
};

import type { CommentThreadApi, CommentThreadItem, PageCommentThread } from "./types";

/**
 * 将帖子评论 API 适配为 {@link CommentThreadApi}（注入式抽象）。
 * 闭包捕获 postId，使上层 {@link CommentThread} / {@link CommentItem} 无需感知目标类型。
 */
export function makePostCommentApi(postId: string): CommentThreadApi {
  return {
    list: (page, size) =>
      commentsApi.list(postId, page, size) as Promise<PageCommentThread>,
    replies: (id, page, size) =>
      commentsApi.replies(id, page, size) as Promise<PageCommentThread>,
    create: (content, parentId) =>
      commentsApi.create(postId, { content, parent_comment_id: parentId ?? undefined }) as Promise<CommentThreadItem>,
    remove: (id) => commentsApi.remove(id),
  };
}

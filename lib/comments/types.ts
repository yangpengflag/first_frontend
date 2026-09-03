import type { components } from "../api.generated";
import type { AuthApiError, NetworkError } from "../auth/types";

/**
 * 评论模块类型——一律由 openapi.json 生成物派生，禁止手写重复定义。
 *
 * <p>`replies` 端点与顶层列表共用 {@link PageCommentResponse}（回复项同为
 * {@link CommentResponse}），故不单独定义 PageReplyResponse。错误类型为
 * auth `ErrorCode` 的子集，便于做文案映射而不污染 auth 模块。
 */
export type CommentResponse = components["schemas"]["CommentResponse"];
export type CreateCommentRequest = components["schemas"]["CreateCommentRequest"];
export type PageCommentResponse = components["schemas"]["PageCommentResponse"];

/**
 * 评论前端视图态：在 {@link CommentResponse} 基础上叠加乐观插入所需的 UI 标记。
 * 仅前端使用，不进入 API 层。
 */
export type CommentView = CommentResponse & { pending?: boolean };

/**
 * 评论线程通用展示项（帖子评论 {@link CommentView} 与景点评论 {@link SpotCommentView}
 * 共用）。刻意不含 {@code post_id}/{@code spot_slug} 这类「目标标识」字段——
 * 该字段仅后端需要，前端展示层（作者、时间、内容、回复数）从不使用，且
 * {@link CommentItem} 乐观插入也不再写入它（原 post_id 纯属摆设）。
 */
export interface CommentThreadItem {
  id: string;
  user_id?: string;
  author_name?: string;
  author_avatar_url?: string;
  content: string;
  parent_comment_id?: string;
  created_at: string;
  updated_at?: string;
  reply_count?: number;
  pending?: boolean;
}

/** 顶层/回复分页的通用形态（Spring Page 的子集），用于屏蔽帖子/景点响应差异。 */
export interface PageCommentThread {
  content: CommentThreadItem[];
  last?: boolean;
  total?: number;
  page?: number;
  size?: number;
  totalPages?: number;
  hasMore?: boolean;
}

/**
 * 评论线程 API 抽象（注入式）：屏蔽帖子评论 / 景点评论的端点差异。
 * 列表与回复经此统一为 {@link PageCommentThread}，创建/删除统一为
 * {@link CommentThreadItem} / void，使 {@link CommentThread} 与 {@link CommentItem}
 * 可同时服务帖子与景点详情页。
 */
export interface CommentThreadApi {
  list(page?: number, size?: number): Promise<PageCommentThread>;
  replies(commentId: string, page?: number, size?: number): Promise<PageCommentThread>;
  create(content: string, parentCommentId?: string): Promise<CommentThreadItem>;
  remove(commentId: string): Promise<void>;
}

export type CommentErrorCode =
  | "COMMENT_NOT_FOUND"
  | "INVALID_PARENT_COMMENT"
  | "VALIDATION_FAILED"
  | "UNAUTHENTICATED"
  | "POST_NOT_FOUND"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export type { AuthApiError, NetworkError };

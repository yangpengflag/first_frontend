import type { CommentThreadItem, PageCommentThread } from "@/lib/comments/types";

/**
 * 景点评论响应类型——手写（places 模块约定手写契约，不依赖 openapi 生成）。
 *
 * <p>与帖子评论 {@link CommentResponse} 同构，仅以 {@code spot_slug}（String）替代
 * {@code post_id}（UUID），与后端 {@code SpotCommentResponse} 一致。结构满足
 * {@link CommentThreadItem}，故可与帖子评论共用 {@link CommentThread} / {@link CommentItem}。
 */
export interface SpotCommentResponse {
  id: string;
  spot_slug: string;
  user_id?: string;
  parent_comment_id?: string;
  content: string;
  author_name?: string;
  author_avatar_url?: string;
  created_at: string;
  updated_at?: string;
  reply_count?: number;
}

/** 景点评论前端视图态（叠加乐观标记）。 */
export type SpotCommentView = SpotCommentResponse & { pending?: boolean };

/** 景点评论分页（Spring Page 子集），映射到通用 {@link PageCommentThread}。 */
export interface PageSpotCommentResponse {
  content: SpotCommentView[];
  last?: boolean;
  total?: number;
  page?: number;
  size?: number;
  totalPages?: number;
}

export type SpotCommentErrorCode =
  | "SPOT_NOT_FOUND"
  | "COMMENT_NOT_FOUND"
  | "INVALID_PARENT_COMMENT"
  | "VALIDATION_FAILED"
  | "UNAUTHENTICATED"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export type { CommentThreadItem, PageCommentThread };

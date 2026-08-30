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

export type CommentErrorCode =
  | "COMMENT_NOT_FOUND"
  | "INVALID_PARENT_COMMENT"
  | "VALIDATION_FAILED"
  | "UNAUTHENTICATED"
  | "POST_NOT_FOUND"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export type { AuthApiError, NetworkError };

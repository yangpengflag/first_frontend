import type { components } from "../api.generated";
import type { AuthApiError, NetworkError } from "../auth/types";

/**
 * 收藏模块类型——由 openapi.json 生成物派生。
 * {@link BookmarkStatusResponse} 为后端 post-bookmark-status change 新增的状态查询响应。
 */
export type BookmarkResponse = components["schemas"]["BookmarkResponse"];
export type BookmarkStatusResponse = components["schemas"]["BookmarkStatusResponse"];
export type BookmarkSummary = components["schemas"]["BookmarkSummary"];
export type PageBookmarkSummary = components["schemas"]["PageBookmarkSummary"];

export type BookmarkErrorCode =
  | "POST_NOT_FOUND"
  | "UNAUTHENTICATED"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export type { AuthApiError, NetworkError };

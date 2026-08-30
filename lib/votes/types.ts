import type { components } from "../api.generated";
import type { AuthApiError, NetworkError } from "../auth/types";

/**
 * 投票模块类型——由 openapi.json 生成物派生。
 * {@link VoteType} 收紧为受枚举约束的语义（与后端 VoteType 对齐）。
 */
export type VoteResponse = components["schemas"]["VoteResponse"];
export type VoteStatsResponse = components["schemas"]["VoteStatsResponse"];

/** 投票类型（受枚举约束，与后端 VoteType 对齐）。 */
export type VoteType = "UP" | "DOWN";

export type VoteErrorCode =
  | "POST_NOT_FOUND"
  | "UNAUTHENTICATED"
  | "RATE_LIMITED"
  | "VALIDATION_FAILED"
  | "INTERNAL_ERROR";

export type { AuthApiError, NetworkError };

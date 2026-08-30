import { AuthApiError, NetworkError } from "../auth/types";
import type { VoteErrorCode } from "./types";

/**
 * 投票模块错误码 → 面向用户的文案。前端按 {@code error.code} 分支。
 */
const MESSAGES: Record<VoteErrorCode, string> = {
  POST_NOT_FOUND: "攻略不存在或已下架",
  UNAUTHENTICATED: "请先登录",
  RATE_LIMITED: "操作过于频繁，请稍后再试",
  VALIDATION_FAILED: "提交有误，请检查后重试",
  INTERNAL_ERROR: "服务异常，请稍后重试",
};

export function describeVoteError(error: unknown): string {
  if (error instanceof NetworkError) {
    return "网络异常，请稍后重试";
  }
  if (error instanceof AuthApiError) {
    return MESSAGES[(error.code as VoteErrorCode)] ?? MESSAGES.INTERNAL_ERROR;
  }
  return MESSAGES.INTERNAL_ERROR;
}

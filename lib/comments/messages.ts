import { AuthApiError, NetworkError } from "../auth/types";
import type { CommentErrorCode } from "./types";

/**
 * 评论模块错误码 → 面向用户的文案。
 *
 * <p>前端按 {@code error.code} 分支，而非依赖后端 message 文案——
 * 机器码稳定，文案可随时调整而不影响逻辑。
 */
const MESSAGES: Record<CommentErrorCode, string> = {
  COMMENT_NOT_FOUND: "评论不存在或已删除，请刷新",
  INVALID_PARENT_COMMENT: "回复对象无效",
  VALIDATION_FAILED: "评论内容有误，请检查后重试",
  UNAUTHENTICATED: "请先登录",
  POST_NOT_FOUND: "攻略不存在或已下架",
  RATE_LIMITED: "操作过于频繁，请稍后再试",
  INTERNAL_ERROR: "服务异常，请稍后重试",
};

/** 把任意异常转为可展示的文案（网络异常单独处理，不得误判为登录失效）。 */
export function describeCommentError(error: unknown): string {
  if (error instanceof NetworkError) {
    return "网络异常，请稍后重试";
  }
  if (error instanceof AuthApiError) {
    return MESSAGES[(error.code as CommentErrorCode)] ?? MESSAGES.INTERNAL_ERROR;
  }
  return MESSAGES.INTERNAL_ERROR;
}

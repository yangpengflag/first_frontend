import { AuthApiError, NetworkError } from "../auth/types";
import type { SpotCommentErrorCode } from "./types";

/**
 * 景点评论模块错误码 → 面向用户的文案（镜像 comments/messages，POST_NOT_FOUND 改为 SPOT_NOT_FOUND）。
 * 前端按 {@code error.code} 分支，而非依赖后端 message 文案。
 */
const MESSAGES: Record<SpotCommentErrorCode, string> = {
  SPOT_NOT_FOUND: "景点不存在或已下架",
  COMMENT_NOT_FOUND: "评论不存在或已删除，请刷新",
  INVALID_PARENT_COMMENT: "回复对象无效",
  VALIDATION_FAILED: "评论内容有误，请检查后重试",
  UNAUTHENTICATED: "请先登录",
  RATE_LIMITED: "操作过于频繁，请稍后再试",
  INTERNAL_ERROR: "服务异常，请稍后重试",
};

/** 把任意异常转为可展示的文案（网络异常单独处理，不得误判为登录失效）。 */
export function describeSpotCommentError(error: unknown): string {
  if (error instanceof NetworkError) {
    return "网络异常，请稍后重试";
  }
  if (error instanceof AuthApiError) {
    return MESSAGES[(error.code as SpotCommentErrorCode)] ?? MESSAGES.INTERNAL_ERROR;
  }
  return MESSAGES.INTERNAL_ERROR;
}

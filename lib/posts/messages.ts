import { AuthApiError, NetworkError } from "../auth/types";
import type { PostErrorCode } from "./types";

/**
 * 帖子模块错误码 → 面向用户的文案。
 *
 * <p>前端按 {@code error.code} 分支，而非依赖后端 message 文案——
 * 机器码稳定，文案可随时调整而不影响逻辑。
 */
const MESSAGES: Record<PostErrorCode, string> = {
  POST_NOT_FOUND: "攻略不存在或已下架",
  NOT_POST_AUTHOR: "你没有权限编辑这篇攻略",
  VALIDATION_FAILED: "提交的信息有误，请检查后重试",
  UNAUTHENTICATED: "请先登录",
  TOKEN_INVALIDATED: "登录状态已失效，请重新登录",
  INTERNAL_ERROR: "服务异常，请稍后重试",
};

/**
 * 把任意异常转为可展示的文案。
 *
 * <p>网络异常必须单独处理——它不代表「登录失效」，混为一谈会误导用户。
 */
export function describePostError(error: unknown): string {
  if (error instanceof NetworkError) {
    return "网络异常，请稍后重试";
  }
  if (error instanceof AuthApiError) {
    return MESSAGES[(error.code as PostErrorCode)] ?? MESSAGES.INTERNAL_ERROR;
  }
  return MESSAGES.INTERNAL_ERROR;
}

/**
 * 从 `VALIDATION_FAILED` 的 `details` 中提取字段级错误。
 *
 * <p>后端约定 `details` 为字符串数组，形如 `"title: 长度不能超过 200"`；
 * 解析为 `{ 字段名: 文案 }` 供表单按字段回填。无法解析时返回 null，
 * 由调用方回退到 {@link describePostError} 的通用文案。
 */
export function validationFieldErrorsOf(error: unknown): Record<string, string> | null {
  if (!(error instanceof AuthApiError) || error.code !== "VALIDATION_FAILED") {
    return null;
  }
  const details = error.details;
  if (!Array.isArray(details)) {
    return null;
  }
  const result: Record<string, string> = {};
  for (const entry of details) {
    if (typeof entry !== "string") continue;
    const sep = entry.indexOf(":");
    if (sep <= 0) continue;
    const field = entry.slice(0, sep).trim();
    const message = entry.slice(sep + 1).trim();
    if (field) result[field] = message;
  }
  return Object.keys(result).length > 0 ? result : null;
}

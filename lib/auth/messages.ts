import { AuthApiError, NetworkError, type ErrorCode } from "./types";

/**
 * 错误码 → 面向用户的文案。
 *
 * <p>前端按 {@code error.code} 分支，而非依赖后端 message 文案——
 * 机器码稳定，文案可随时调整而不影响逻辑。
 */
const MESSAGES: Record<ErrorCode, string> = {
  VALIDATION_FAILED: "提交的信息有误，请检查后重试",
  INVALID_VERIFICATION_CODE: "验证链接无效或已过期",
  INVALID_RESET_CODE: "重置链接无效或已过期",
  INVALID_CREDENTIALS: "邮箱或密码错误",
  ACCOUNT_DELETED: "该账号已注销",
  UNAUTHENTICATED: "请先登录",
  TOKEN_INVALIDATED: "登录状态已失效，请重新登录",
  EMAIL_NOT_VERIFIED: "请先验证邮箱",
  ACCOUNT_LOCKED: "账号已被锁定，请稍后再试",
  EMAIL_ALREADY_REGISTERED: "该邮箱已注册，请直接登录",
  RATE_LIMITED: "操作过于频繁，请稍后再试",
  POST_NOT_FOUND: "内容不存在或已下架",
  NOT_POST_AUTHOR: "你没有权限操作该内容",
  INTERNAL_ERROR: "服务异常，请稍后重试",
};

/**
 * 把任意异常转为可展示的文案。
 *
 * <p>网络异常必须单独处理——它不代表「邮箱或密码错误」，
 * 混为一谈会让用户在网络故障时以为自己记错了密码。
 */
export function describeAuthError(error: unknown): string {
  if (error instanceof NetworkError) {
    return "网络异常，请稍后重试";
  }
  if (error instanceof AuthApiError) {
    return MESSAGES[error.code] ?? MESSAGES.INTERNAL_ERROR;
  }
  return MESSAGES.INTERNAL_ERROR;
}

export function messageFor(code: ErrorCode): string {
  return MESSAGES[code] ?? MESSAGES.INTERNAL_ERROR;
}

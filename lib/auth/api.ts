import {
  fetchFromBackend,
  type ForgotPasswordRequest,
  type LoginRequest,
  type RegisterRequest,
  type ResendVerificationRequest,
  type ResetPasswordRequest,
} from "../backend";
import { tokenStore } from "./tokens";
import type { AuthTokenResponse, UserResponse } from "./types";

/**
 * 认证 API 的具体调用入口。
 *
 * <p>只描述「调哪个端点、传什么、返回什么」，不含状态判断等业务逻辑。
 *
 * <p>传输与错误解析统一委托给 {@link fetchFromBackend}（BFF 薄层）：
 * 那里已实现 Bearer 注入、401 静默续期重放、统一错误信封解析与空响应体处理。
 * 本模块的价值在于用 openapi 生成类型约束每个端点的入参与返回，
 * 使后端契约变更在编译期暴露。
 */

function post<T>(path: string, body: unknown): Promise<T> {
  return fetchFromBackend<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export const authApi = {
  /** 注册 → 201；不签发令牌，需先完成邮箱验证。 */
  register(input: RegisterRequest) {
    return post<UserResponse>("/api/auth/register", input);
  },

  /** 登录 → 200 + 令牌；非 ACTIVE 状态按状态机返回 401 / 403 / 423。 */
  async login(input: LoginRequest) {
    const result = await post<AuthTokenResponse>("/api/auth/login", input);
    tokenStore.set(result.access_token, result.refresh_token);
    return result;
  },

  /** 邮箱验证（免鉴权）。 */
  verifyEmail(code: string) {
    return fetchFromBackend<UserResponse>(
        `/api/auth/verify?code=${encodeURIComponent(code)}`
    );
  },

  /** 重发验证邮件（免鉴权，恒定 202）。 */
  resendVerification(email: string) {
    const body: ResendVerificationRequest = { email };
    return post<void>("/api/auth/resend-verification", body);
  },

  /** 申请密码重置（免鉴权，恒定 202）。 */
  forgotPassword(email: string) {
    const body: ForgotPasswordRequest = { email };
    return post<void>("/api/auth/forgot-password", body);
  },

  /** 凭一次性码设置新密码（免鉴权）。 */
  resetPassword(code: string, newPassword: string) {
    const body: ResetPasswordRequest = { code, newPassword };
    return post<void>("/api/auth/reset-password", body);
  },

  /** 当前用户；令牌无效或状态非 ACTIVE 时抛出对应错误。 */
  me() {
    return fetchFromBackend<UserResponse>("/api/auth/me");
  },

  /** 登出；无论结果如何调用方都应清除本地令牌。 */
  logout() {
    return post<void>("/api/auth/logout", {});
  },
};

export { tokenStore };

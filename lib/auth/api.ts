import { createAuthClient } from "./client";
import { tokenStore } from "./tokens";
import type { AuthTokenResponse, UserResponse } from "./types";

/**
 * 认证 API 的具体调用入口。
 *
 * <p>只描述「调哪个端点、传什么、返回什么」，不含状态判断等业务逻辑。
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

/**
 * 会话终结时<b>只清除令牌，不做页面跳转</b>。
 *
 * <p>原因：登录失败同样返回 401，若在此处跳转登录页，会把「邮箱或密码错误」
 * 的提示冲掉——用户本来就已在登录页，这一跳转毫无意义。
 * 跳转到登录页的职责交给 {@link AuthGuard}：它会在下次访问受保护页面时生效。
 */
export const authClient = createAuthClient({
  baseUrl: BASE_URL,
  tokenStore,
  onSessionEnded: () => {
    // 令牌已由客户端清除；跳转由路由守卫负责
  },
});

function post<T>(path: string, body: unknown): Promise<T> {
  return authClient.request<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export const authApi = {
  /** 注册 → 201；不签发令牌，需先完成邮箱验证。 */
  register(input: { email: string; password: string; displayName: string }) {
    return post<UserResponse>("/api/auth/register", input);
  },

  /** 登录 → 200 + 令牌；非 ACTIVE 状态按状态机返回 401 / 403 / 423。 */
  async login(input: { email: string; password: string }) {
    const result = await post<AuthTokenResponse>("/api/auth/login", input);
    tokenStore.set(result.accessToken, result.refreshToken);
    return result;
  },

  /** 邮箱验证（免鉴权）。 */
  verifyEmail(code: string) {
    return authClient.request<UserResponse>(
        `/api/auth/verify?code=${encodeURIComponent(code)}`
    );
  },

  /** 重发验证邮件（免鉴权，恒定 202）。 */
  resendVerification(email: string) {
    return post<void>("/api/auth/resend-verification", { email });
  },

  /** 申请密码重置（免鉴权，恒定 202）。 */
  forgotPassword(email: string) {
    return post<void>("/api/auth/forgot-password", { email });
  },

  /** 凭一次性码设置新密码（免鉴权）。 */
  resetPassword(code: string, newPassword: string) {
    return post<void>("/api/auth/reset-password", { code, newPassword });
  },

  /** 当前用户；令牌无效或状态非 ACTIVE 时抛出对应错误。 */
  me() {
    return authClient.request<UserResponse>("/api/auth/me");
  },

  /** 登出；无论结果如何调用方都应清除本地令牌。 */
  logout() {
    return post<void>("/api/auth/logout", {});
  },
};

export { tokenStore };

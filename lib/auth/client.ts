import { AuthApiError, NetworkError, type ErrorCode, type ErrorEnvelope } from "./types";
import type { TokenStore } from "./tokens";

/**
 * 认证 API 客户端——BFF 薄层。
 *
 * <p><b>只负责传输与解析，不含业务逻辑</b>：状态判断、密码校验等一律在后端。
 * 职责限于：拼装请求、注入 Bearer、遇 401 静默续期并重放、解析统一错误信封。
 */

const REFRESH_PATH = "/api/auth/refresh";

/** 这些错误意味着本地会话已不可用，必须清除令牌。 */
const SESSION_ENDING_CODES: ReadonlySet<ErrorCode> = new Set<ErrorCode>([
  "TOKEN_INVALIDATED",
  "ACCOUNT_DELETED",
  "ACCOUNT_LOCKED",
]);

export interface AuthClientConfig {
  baseUrl: string;
  tokenStore: TokenStore;
  /** 便于测试注入；默认使用全局 fetch。 */
  fetchImpl?: typeof fetch;
  /** 会话失效时回调（用于跳转登录页）。 */
  onSessionEnded?: () => void;
  /** 每次响应携带的 request_id（链路追踪 / 可观测上下文）。 */
  onRequestId?: (requestId: string) => void;
}

export interface AuthClient {
  request<T>(path: string, init?: RequestInit): Promise<T>;
}

export function createAuthClient(config: AuthClientConfig): AuthClient {
  const doFetch: typeof fetch = config.fetchImpl ?? ((...args) => fetch(...args));

  function url(path: string): string {
    return config.baseUrl.replace(/\/$/, "") + path;
  }

  async function parseError(response: Response): Promise<AuthApiError> {
    let body: ErrorEnvelope | undefined;
    try {
      body = (await response.json()) as ErrorEnvelope;
    } catch {
      // 响应体非 JSON：退化为通用错误，不泄露任何细节
    }
    return new AuthApiError(
        response.status,
        body?.error?.code ?? "INTERNAL_ERROR",
        body?.error?.details
    );
  }

  function endSession() {
    config.tokenStore.clear();
    config.onSessionEnded?.();
  }

  /** 用 refresh token 换新 access token；失败返回 false。 */
  async function tryRefresh(): Promise<boolean> {
    const refreshToken = config.tokenStore.getRefreshToken();
    if (!refreshToken) {
      return false;
    }
    try {
      const response = await doFetch(url(REFRESH_PATH), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) {
        return false;
      }
      const data = (await response.json()) as { access_token: string; refresh_token: string };
      config.tokenStore.set(data.access_token, data.refresh_token);
      return true;
    } catch {
      return false;
    }
  }

  async function request<T>(path: string, init: RequestInit = {}, retried = false): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");

    const accessToken = config.tokenStore.getAccessToken();
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    let response: Response;
    try {
      response = await doFetch(url(path), { ...init, headers });
    } catch {
      // 请求根本没到达后端——不能当作「邮箱或密码错误」呈现给用户
      throw new NetworkError();
    }

    // access token 过期：静默续期后重放原请求
    if (response.status === 401 && !retried) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        return request<T>(path, init, true);
      }
      endSession();
      throw await parseError(response);
    }

    if (!response.ok) {
      const error = await parseError(response);
      if (SESSION_ENDING_CODES.has(error.code)) {
        endSession();
      }
      throw error;
    }

    /*
     * 空响应体处理：202 Accepted（重发验证邮件 / 申请密码重置）与
     * 204 No Content（登出）都没有响应体，直接 json() 会抛 SyntaxError，
     * 被误判为请求失败——成功态因此永远不显示。
     */
    const text = await response.text();
    if (!text) {
      return undefined as T;
    }
    const parsed: unknown = JSON.parse(text);
    // 统一响应信封携带 request_id（顶层），取出供可观测 / 链路追踪使用
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const requestId = (parsed as Record<string, unknown>)["request_id"];
      if (typeof requestId === "string") {
        config.onRequestId?.(requestId);
      }
    }
    return parsed as T;
  }

  return { request };
}

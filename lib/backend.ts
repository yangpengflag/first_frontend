import type { components } from "./api.generated";
import { createAuthClient } from "./auth/client";
import { tokenStore } from "./auth/tokens";

/**
 * 后端调用的薄类型层（BFF）。
 *
 * <p>职责边界：<b>只负责传输与解析</b>——拼装请求、注入 Bearer、解析统一错误信封、
 * 遇 401 静默续期并重放。状态判断、密码校验等业务逻辑一律在后端。
 *
 * <p><b>传输逻辑不在此重写</b>，而是委托给既有的 {@link createAuthClient}：
 * 那里已实现续期重放、空响应体（202/204）处理、以及「网络层失败」与
 * 「业务错误」的区分——重复实现只会制造第二套 HTTP 栈（DRY）。
 * 本层新增的价值是<b>类型</b>：所有 DTO 均派生自 openapi.json 生成物，
 * 使后端的破坏性接口变更在编译期即暴露，而非等到运行时。
 *
 * <p>`api.generated.ts` 由 `npm run openapi:gen` 产出，<b>禁止手改</b>；
 * 后端接口变更后执行 `npm run openapi:sync` 重新同步快照。
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

/**
 * 会话终结时<b>只清除令牌，不做页面跳转</b>。
 *
 * <p>原因：登录失败同样返回 401，若在此处跳转登录页，会把「邮箱或密码错误」
 * 的提示冲掉——用户本来就已在登录页，这一跳转毫无意义。
 * 跳转到登录页的职责交给 {@code AuthGuard}：它会在下次访问受保护页面时生效。
 */
const client = createAuthClient({
  baseUrl: BASE_URL,
  tokenStore,
  onSessionEnded: () => {
    // 令牌已由客户端清除；跳转由路由守卫负责
  },
  onRequestId: (requestId) => {
    if (requestId) console.debug("[backend] request_id:", requestId);
  },
});

/**
 * 类型安全的后端请求。
 *
 * <p>调用方以泛型参数声明期望的响应类型，该类型应当来自 {@link BackendSchemas}
 * （openapi.json 生成物），从而让后端契约变更在编译期暴露。
 */
export function fetchFromBackend<T>(path: string, init: RequestInit = {}): Promise<T> {
  return client.request<T>(path, init);
}

/** openapi.json 生成的契约 DTO。新增模块的请求 / 响应类型请一律由此派生。 */
export type BackendSchemas = components["schemas"];

export type UserResponse = BackendSchemas["UserResponse"];
export type AuthTokenResponse = BackendSchemas["AuthTokenResponse"];
export type LoginRequest = BackendSchemas["LoginRequest"];
export type RegisterRequest = BackendSchemas["RegisterRequest"];
export type RefreshRequest = BackendSchemas["RefreshRequest"];
export type ForgotPasswordRequest = BackendSchemas["ForgotPasswordRequest"];
export type ResendVerificationRequest = BackendSchemas["ResendVerificationRequest"];
export type ResetPasswordRequest = BackendSchemas["ResetPasswordRequest"];

/** 供需要直接访问传输层的场景使用（如测试注入、自定义并发控制）。 */
export { client as backendClient };

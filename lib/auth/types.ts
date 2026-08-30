/**
 * 认证相关类型与错误定义。
 *
 * 与后端 `auth-module` 契约一一对应：
 * - 用户状态四态与响应码映射见 openspec/specs/auth-module/spec.md
 * - 错误信封形如 { error: { code, message, details } }
 *
 * <p>DTO 一律由 openapi.json 生成物派生，不再手写重复定义
 * （生成物由 `npm run openapi:gen` 产出，禁止手改）——
 * 后端契约的破坏性变更会在编译期暴露，而非等到运行时。
 */

import type { components } from "../api.generated";

type GeneratedUser = components["schemas"]["UserResponse"];
type GeneratedTokens = components["schemas"]["AuthTokenResponse"];

export type UserStatus = "ACTIVE" | "LOCKED" | "DELETED" | "EMAIL_UNVERIFIED";

/**
 * 生成类型把全部字段标为可选（后端 DTO 未标注 required）。
 * 此处仅对「成功响应必然包含」的关键字段做收紧；
 * 字段集合本身仍由契约派生——后端增删或改名字段，
 * 会在此处与下游同时编译报错，不会静默漂移。
 */
export type UserResponse = Omit<GeneratedUser, "status" | "avatar_url"> & {
  status: UserStatus;
  /** 后端未设置头像时返回 null（生成类型仅标为 string，此处还原可空语义）。 */
  avatar_url: string | null;
};

export type AuthTokenResponse = Omit<
    GeneratedTokens,
    "user" | "access_token" | "refresh_token"
> & {
  access_token: string;
  refresh_token: string;
  user: UserResponse;
};

export type ErrorCode =
  | "VALIDATION_FAILED"
  | "INVALID_VERIFICATION_CODE"
  | "INVALID_RESET_CODE"
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_DELETED"
  | "UNAUTHENTICATED"
  | "TOKEN_INVALIDATED"
  | "EMAIL_NOT_VERIFIED"
  | "ACCOUNT_LOCKED"
  | "EMAIL_ALREADY_REGISTERED"
  | "RATE_LIMITED"
  | "POST_NOT_FOUND"
  | "NOT_POST_AUTHOR"
  | "INTERNAL_ERROR";

/** 统一错误信封。details 仅在参数校验失败等场景出现。 */
export interface ErrorEnvelope {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

/**
 * 业务错误：携带 HTTP 状态码与机器可读的 error.code，
 * 前端据此分支（详见 spec 的错误码 → 前端动作映射表）。
 */
export class AuthApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(status: number, code: ErrorCode, details?: unknown) {
    super(code);
    this.name = "AuthApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * 网络层失败（请求未到达后端或后端无响应）。
 *
 * 必须与业务错误区分：这类失败<b>不得</b>被误判为「邮箱或密码错误」。
 */
export class NetworkError extends Error {
  constructor() {
    super("NETWORK_ERROR");
    this.name = "NetworkError";
  }
}

/** 锁定响应中附带的重试等待秒数。 */
export function retryAfterSecondsOf(error: AuthApiError): number | null {
  const details = error.details;
  if (details && typeof details === "object" && "retryAfterSeconds" in details) {
    const value = (details as { retryAfterSeconds?: unknown }).retryAfterSeconds;
    return typeof value === "number" ? value : null;
  }
  return null;
}

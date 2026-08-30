/**
 * 帖子模块类型——一律由 openapi.json 生成物派生，禁止手写重复定义。
 *
 * <p>生成类型把全部字段标为可选（后端 DTO 未标注 required）。
 * 此处仅对「成功响应必然包含」的关键字段 `status` 做收紧为枚举，
 * 其余字段集合仍由契约派生——后端增删或改名字段会在此处与下游同时编译报错，
 * 不会静默漂移。错误类型直接复用 auth 模块的 {@link AuthApiError} / {@link NetworkError}。
 */

import type { components } from "../api.generated";
import type { AuthApiError, NetworkError } from "../auth/types";

export type PostStatus = "DRAFT" | "PUBLISHED";

export type PostResponse = Omit<components["schemas"]["PostResponse"], "status"> & {
  /** 生成类型仅标为 string，此处还原为受枚举约束的语义。 */
  status: PostStatus;
};

export type PostSummary = Omit<components["schemas"]["PostSummary"], "status"> & {
  status: PostStatus;
};

export type CreatePostRequest = components["schemas"]["CreatePostRequest"];

/** 分页列表：把 `content` 项收紧为受约束的 {@link PostSummary}（status 枚举化）。 */
export type PagePostSummary = Omit<components["schemas"]["PagePostSummary"], "content"> & {
  content: PostSummary[];
};

/** 列表分页参数（缺省由后端取默认值 page=0 / size=20）。 */
export interface PostListParams {
  page?: number;
  size?: number;
}

/**
 * 帖子相关的业务错误码（机器码，文案见 {@link describePostError}）。
 * 是 auth `ErrorCode` 的子集，单独收窄以便做文案映射而不污染 auth 模块。
 */
export type PostErrorCode =
  | "POST_NOT_FOUND"
  | "NOT_POST_AUTHOR"
  | "VALIDATION_FAILED"
  | "UNAUTHENTICATED"
  | "TOKEN_INVALIDATED"
  | "INTERNAL_ERROR";

export type { AuthApiError, NetworkError };

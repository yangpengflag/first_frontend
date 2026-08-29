import { describe, expect, it } from "vitest";

import { MOCK_USERS } from "@/test/mocks/handlers";

import { AuthApiError } from "./auth/types";
import { fetchFromBackend } from "./backend";
import type { AuthTokenResponse, UserResponse } from "./backend";

/**
 * BFF 薄层（task 10，TDD）。
 *
 * <p>只验证「传输与解析」这层职责：成功响应解析、四态错误按 error.code 抛出、
 * 空响应体（204）不被误判为失败。**不**涉及任何业务判断。
 */
describe("fetchFromBackend", () => {
  it("解析 200 成功响应", async () => {
    const result = await fetchFromBackend<AuthTokenResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: MOCK_USERS.active, password: "Str0ng!Pass" }),
    });

    expect(result.accessToken).toBe("mock-access-token");
    expect(result.user?.status).toBe("ACTIVE");
  });

  it("邮箱或密码错误抛出 401 INVALID_CREDENTIALS", async () => {
    await expect(
        fetchFromBackend("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: "nobody@example.com", password: "wrong" }),
        })
    ).rejects.toMatchObject({ status: 401, code: "INVALID_CREDENTIALS" });
  });

  it("已注销账号抛出 401 ACCOUNT_DELETED", async () => {
    await expect(
        fetchFromBackend("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: MOCK_USERS.deleted, password: "Str0ng!Pass" }),
        })
    ).rejects.toMatchObject({ status: 401, code: "ACCOUNT_DELETED" });
  });

  it("未验证邮箱抛出 403 EMAIL_NOT_VERIFIED", async () => {
    await expect(
        fetchFromBackend("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: MOCK_USERS.unverified, password: "Str0ng!Pass" }),
        })
    ).rejects.toMatchObject({ status: 403, code: "EMAIL_NOT_VERIFIED" });
  });

  it("锁定账号抛出 423 ACCOUNT_LOCKED 并保留 retryAfterSeconds", async () => {
    const error = await fetchFromBackend("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: MOCK_USERS.locked, password: "Str0ng!Pass" }),
    }).catch((err: unknown) => err);

    expect(error).toBeInstanceOf(AuthApiError);
    expect(error).toMatchObject({ status: 423, code: "ACCOUNT_LOCKED" });
    expect((error as AuthApiError).details).toEqual({ retryAfterSeconds: 900 });
  });

  it("限流抛出 429 RATE_LIMITED", async () => {
    await expect(
        fetchFromBackend("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: MOCK_USERS.rateLimited, password: "Str0ng!Pass" }),
        })
    ).rejects.toMatchObject({ status: 429, code: "RATE_LIMITED" });
  });

  it("204 空响应体返回 undefined 而非抛错", async () => {
    await expect(fetchFromBackend<void>("/api/auth/logout", { method: "POST" }))
        .resolves.toBeUndefined();
  });

  it("免鉴权端点可正常读取", async () => {
    await expect(fetchFromBackend<UserResponse>("/api/auth/me"))
        .resolves.toMatchObject({ email: MOCK_USERS.active });
  });
});

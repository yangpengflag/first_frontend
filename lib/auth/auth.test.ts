import { describe, expect, it, vi } from "vitest";

import { createAuthClient } from "./client";
import { createMemoryTokenStore } from "./tokens";
import { AuthApiError, NetworkError, retryAfterSecondsOf } from "./types";

/** 构造最小可用的 Response 替身，避免依赖运行时的 Response 实现。 */
function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => (body === undefined ? "" : JSON.stringify(body)),
  } as unknown as Response;
}

function errorResponse(status: number, code: string, details?: unknown): Response {
  return jsonResponse(status, { error: { code, message: code, details } });
}

function setup(fetchImpl: typeof fetch) {
  const tokenStore = createMemoryTokenStore();
  const onSessionEnded = vi.fn();
  const client = createAuthClient({
    baseUrl: "http://api.test",
    tokenStore,
    fetchImpl,
    onSessionEnded,
  });
  return { client, tokenStore, onSessionEnded };
}

// ---------- 7.3 / 7.4：Token 存储 ----------

describe("tokenStore", () => {
  it("starts empty", () => {
    const store = createMemoryTokenStore();

    expect(store.getAccessToken()).toBeNull();
    expect(store.getRefreshToken()).toBeNull();
  });

  it("stores both tokens and clears them together", () => {
    const store = createMemoryTokenStore();

    store.set("access-1", "refresh-1");
    expect(store.getAccessToken()).toBe("access-1");
    expect(store.getRefreshToken()).toBe("refresh-1");

    store.clear();
    expect(store.getAccessToken()).toBeNull();
    expect(store.getRefreshToken()).toBeNull();
  });
});

// ---------- 7.1 / 7.2：请求拼装与错误解析 ----------

describe("authClient request", () => {
  it("joins base URL and path", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    const { client } = setup(fetchImpl);

    await client.request("/api/auth/me");

    expect(fetchImpl.mock.calls[0][0]).toBe("http://api.test/api/auth/me");
  });

  it("injects bearer token when present", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    const { client, tokenStore } = setup(fetchImpl);
    tokenStore.set("access-1", "refresh-1");

    await client.request("/api/auth/me");

    const headers = fetchImpl.mock.calls[0][1].headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer access-1");
  });

  it("omits authorization header when no token", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    const { client } = setup(fetchImpl);

    await client.request("/api/auth/login", { method: "POST" });

    const headers = fetchImpl.mock.calls[0][1].headers as Headers;
    expect(headers.get("Authorization")).toBeNull();
  });

  // 7.8：令牌绝不出现在 URL 中
  it("never places the token in the request URL", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    const { client, tokenStore } = setup(fetchImpl);
    tokenStore.set("super-secret-token", "refresh-1");

    await client.request("/api/auth/me");

    expect(fetchImpl.mock.calls[0][0]).not.toContain("super-secret-token");
  });

  it("parses the unified error envelope", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(errorResponse(403, "EMAIL_NOT_VERIFIED"));
    const { client } = setup(fetchImpl);

    await expect(client.request("/api/auth/me")).rejects.toMatchObject({
      status: 403,
      code: "EMAIL_NOT_VERIFIED",
    });
  });

  it("parses validation details", async () => {
    const details = ["password: must be between 8 and 72 characters"];
    const fetchImpl = vi.fn().mockResolvedValue(errorResponse(400, "VALIDATION_FAILED", details));
    const { client } = setup(fetchImpl);

    const error = (await client.request("/api/auth/register").catch((e) => e)) as AuthApiError;

    expect(error.details).toEqual(details);
    expect(error.status).toBe(400);
  });

  it("falls back to INTERNAL_ERROR for non-JSON error bodies", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("not json");
      },
      text: async () => "",
    } as unknown as Response);
    const { client } = setup(fetchImpl);

    await expect(client.request("/api/auth/me")).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
  });

  // 网络异常不得被误判为「邮箱或密码错误」
  it("throws NetworkError when the request never reaches the backend", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    const { client } = setup(fetchImpl);

    await expect(client.request("/api/auth/login")).rejects.toBeInstanceOf(NetworkError);
  });

  it("returns undefined for 204 responses", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 204, text: async () => "" } as unknown as Response);
    const { client } = setup(fetchImpl);

    await expect(client.request("/api/auth/logout", { method: "POST" })).resolves.toBeUndefined();
  });
});

// ---------- 7.5 / 7.6：静默续期 ----------

describe("authClient session refresh", () => {
  it("refreshes and replays the original request on 401", async () => {
    const fetchImpl = vi
        .fn()
        .mockResolvedValueOnce(errorResponse(401, "UNAUTHENTICATED"))
        .mockResolvedValueOnce(jsonResponse(200, { accessToken: "access-2", refreshToken: "refresh-2" }))
        .mockResolvedValueOnce(jsonResponse(200, { status: "ACTIVE" }));
    const { client, tokenStore } = setup(fetchImpl);
    tokenStore.set("access-1", "refresh-1");

    const result = await client.request<{ status: string }>("/api/auth/me");

    expect(result.status).toBe("ACTIVE");
    expect(tokenStore.getAccessToken()).toBe("access-2");
    // 重放的请求使用新令牌
    const replayHeaders = fetchImpl.mock.calls[2][1].headers as Headers;
    expect(replayHeaders.get("Authorization")).toBe("Bearer access-2");
  });

  it("replays with the original method and body", async () => {
    const fetchImpl = vi
        .fn()
        .mockResolvedValueOnce(errorResponse(401, "UNAUTHENTICATED"))
        .mockResolvedValueOnce(jsonResponse(200, { accessToken: "a2", refreshToken: "r2" }))
        .mockResolvedValueOnce(jsonResponse(200, {}));
    const { client, tokenStore } = setup(fetchImpl);
    tokenStore.set("a1", "r1");

    await client.request("/api/thing", { method: "POST", body: JSON.stringify({ x: 1 }) });

    const replay = fetchImpl.mock.calls[2][1];
    expect(replay.method).toBe("POST");
    expect(replay.body).toBe(JSON.stringify({ x: 1 }));
  });

  it("ends the session when refresh fails", async () => {
    const fetchImpl = vi
        .fn()
        .mockResolvedValueOnce(errorResponse(401, "UNAUTHENTICATED"))
        .mockResolvedValueOnce(errorResponse(401, "UNAUTHENTICATED"));
    const { client, tokenStore, onSessionEnded } = setup(fetchImpl);
    tokenStore.set("a1", "r1");

    await expect(client.request("/api/auth/me")).rejects.toBeInstanceOf(AuthApiError);

    expect(tokenStore.getAccessToken()).toBeNull();
    expect(onSessionEnded).toHaveBeenCalled();
  });

  it("does not attempt refresh when there is no refresh token", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(errorResponse(401, "UNAUTHENTICATED"));
    const { client, onSessionEnded } = setup(fetchImpl);

    await expect(client.request("/api/auth/me")).rejects.toBeInstanceOf(AuthApiError);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(onSessionEnded).toHaveBeenCalled();
  });

  it("does not retry more than once", async () => {
    const fetchImpl = vi
        .fn()
        .mockResolvedValueOnce(errorResponse(401, "UNAUTHENTICATED"))
        .mockResolvedValueOnce(jsonResponse(200, { accessToken: "a2", refreshToken: "r2" }))
        .mockResolvedValue(errorResponse(401, "UNAUTHENTICATED"));
    const { client, tokenStore } = setup(fetchImpl);
    tokenStore.set("a1", "r1");

    await expect(client.request("/api/auth/me")).rejects.toBeInstanceOf(AuthApiError);

    // 首次 + refresh + 重放 = 3 次，不应无限重试
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});

// ---------- 7.7：会话终结错误均清除令牌 ----------

describe("authClient session-ending errors", () => {
  const cases: Array<[number, string]> = [
    [401, "TOKEN_INVALIDATED"],
    [401, "ACCOUNT_DELETED"],
    [423, "ACCOUNT_LOCKED"],
  ];

  it.each(cases)("clears tokens on %i %s", async (status, code) => {
    const fetchImpl = vi.fn().mockResolvedValue(errorResponse(status, code));
    const { client, tokenStore, onSessionEnded } = setup(fetchImpl);
    tokenStore.set("a1", "r1");

    await expect(client.request("/api/auth/me")).rejects.toMatchObject({ code });

    expect(tokenStore.getAccessToken()).toBeNull();
    expect(tokenStore.getRefreshToken()).toBeNull();
    expect(onSessionEnded).toHaveBeenCalled();
  });

  /** 非会话终结类错误（如未验证邮箱）应保留令牌，让用户仍有操作余地。 */
  it("keeps tokens for errors that do not end the session", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(errorResponse(403, "EMAIL_NOT_VERIFIED"));
    const { client, tokenStore, onSessionEnded } = setup(fetchImpl);
    tokenStore.set("access-1", "refresh-1");

    await expect(client.request("/api/auth/login")).rejects.toMatchObject({
      code: "EMAIL_NOT_VERIFIED",
    });

    expect(tokenStore.getAccessToken()).toBe("access-1");
    expect(tokenStore.getRefreshToken()).toBe("refresh-1");
    expect(onSessionEnded).not.toHaveBeenCalled();
  });
});

// ---------- 锁定倒计时辅助 ----------

describe("retryAfterSecondsOf", () => {
  it("extracts the countdown from error details", () => {
    const error = new AuthApiError(423, "ACCOUNT_LOCKED", { retryAfterSeconds: 900 });
    expect(retryAfterSecondsOf(error)).toBe(900);
  });

  it("returns null when absent so the UI can degrade gracefully", () => {
    expect(retryAfterSecondsOf(new AuthApiError(423, "ACCOUNT_LOCKED"))).toBeNull();
    expect(retryAfterSecondsOf(new AuthApiError(423, "ACCOUNT_LOCKED", {}))).toBeNull();
  });
});

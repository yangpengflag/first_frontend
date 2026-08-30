import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthApiError } from "../auth/types";
import { postsApi } from "./api";

/** 最小可用的 Response 替身，避免依赖运行时的 Response 实现。 */
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

afterEach(() => {
  vi.restoreAllMocks();
});

describe("postsApi", () => {
  it("list() 拉取公开列表并透传分页参数", async () => {
    const page = {
      content: [{ id: "p1", title: "Chengdu hikes", status: "PUBLISHED" }],
      totalElements: 1,
      number: 0,
      first: true,
      last: true,
    };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(200, page));

    const result = await postsApi.list({ page: 0, size: 20 });

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/api/posts?");
    expect(calledUrl).toContain("page=0");
    expect(calledUrl).toContain("size=20");
    expect(result.content?.[0]?.id).toBe("p1");
  });

  it("list() 缺省参数不加查询串", async () => {
    const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(jsonResponse(200, { content: [], first: true, last: true }));

    await postsApi.list();

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toBe("http://localhost:8080/api/posts");
  });

  it("create() 提交 CreatePostRequest 并返回 PostResponse", async () => {
    const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(jsonResponse(200, { id: "p2", title: "Title", status: "DRAFT" }));

    const result = await postsApi.create({
      title: "Title",
      content: "# hi",
      tags: ["hiking"],
      status: "DRAFT",
    });

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toMatchObject({ title: "Title", content: "# hi", tags: ["hiking"], status: "DRAFT" });
    expect(result.id).toBe("p2");
    expect(result.status).toBe("DRAFT");
  });

  it("getById() 成功解析详情", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
        jsonResponse(200, { id: "p3", title: "Detail", status: "PUBLISHED" })
    );

    const result = await postsApi.getById("p3");

    expect(result.title).toBe("Detail");
  });

  it("getById() 对不存在的帖子抛出 POST_NOT_FOUND", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(errorResponse(404, "POST_NOT_FOUND"));

    const error = await postsApi.getById("missing").catch((e) => e);

    expect(error).toBeInstanceOf(AuthApiError);
    expect(error).toMatchObject({ status: 404, code: "POST_NOT_FOUND" });
  });

  it("create() 未登录抛出 UNAUTHENTICATED", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(errorResponse(401, "UNAUTHENTICATED"));

    const error = await postsApi.create({ title: "T", content: "C" }).catch((e) => e);

    expect(error).toBeInstanceOf(AuthApiError);
    expect(error).toMatchObject({ status: 401, code: "UNAUTHENTICATED" });
  });

  it("create() 校验失败携带 details", async () => {
    const details = ["title: 长度不能超过 200"];
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
        errorResponse(400, "VALIDATION_FAILED", details)
    );

    const error = await postsApi.create({ title: "x".repeat(300), content: "c" }).catch((e) => e);

    expect(error).toMatchObject({ status: 400, code: "VALIDATION_FAILED" });
    expect((error as AuthApiError).details).toEqual(details);
  });
});

import { test, expect, type Page, type Route } from "@playwright/test";

/**
 * 帖子三页端到端走查。
 *
 * <p>在浏览器网络层拦截 `/api/posts/**`（以及创建页守卫所需的 `/api/auth/me`），
 * 无需启动真实后端即可对三页的<b>真实组件与真实导航</b>做端到端验证。
 * 响应体形状对齐 BFF（`lib/auth/client.ts`）：成功时直接返回资源对象（顶层附带
 * `request_id`），失败时返回 `{ error: { code, ... } }` 并配合非 2xx 状态码。
 *
 * <p>成功发布的完整链路（填写 → 提交 → 跳转详情）由单元测试
 * `PostEditor.test.tsx` 覆盖；此处额外以真实浏览器走通一次以确保组件在浏览器中可用。
 */

const POSTS = /\/api\/posts/;
const ME = /\/api\/auth\/me/;

function apiPath(route: Route): string {
  return new URL(route.request().url()).pathname;
}

interface MockOpts {
  list?: Record<string, unknown>[];
  detail?: Record<string, unknown>;
  listStatus?: number;
  detailStatus?: number;
}

async function mockPostsApi(page: Page, opts: MockOpts = {}): Promise<void> {
  await page.route(POSTS, (route) => {
    const req = route.request();
    const method = req.method();
    const path = apiPath(route);
    const idMatch = path.match(/^\/api\/posts\/([^/]+)$/);

    if (method === "GET" && path === "/api/posts") {
      if (opts.listStatus && opts.listStatus !== 200) {
        return route.fulfill({
          status: opts.listStatus,
          contentType: "application/json",
          body: JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "x", details: null } }),
        });
      }
      const content = opts.list ?? [];
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          content,
          totalElements: content.length,
          number: 0,
          first: true,
          last: true,
          request_id: "mock",
        }),
      });
    }

    if (method === "GET" && idMatch) {
      if (opts.detailStatus && opts.detailStatus !== 200) {
        return route.fulfill({
          status: opts.detailStatus,
          contentType: "application/json",
          body: JSON.stringify({
            error: {
              code: opts.detailStatus === 404 ? "POST_NOT_FOUND" : "INTERNAL_ERROR",
              message: "x",
              details: null,
            },
          }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...(opts.detail ?? {}), request_id: "mock" }),
      });
    }

    if (method === "POST" && path === "/api/posts") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "new1", title: "My trip", status: "PUBLISHED", request_id: "mock" }),
      });
    }

    return route.continue();
  });
}

async function mockMe(page: Page): Promise<void> {
  await page.route(ME, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "u1",
          email: "alice@example.com",
          displayName: "Alice",
          status: "ACTIVE",
          roles: ["USER"],
        }),
      })
  );
}

const SAMPLE_POSTS = [
  {
    id: "p1",
    title: "成都徒步路线",
    status: "PUBLISHED",
    author_name: "Alice",
    created_at: "2026-08-30T10:00:00Z",
    tags: ["hiking"],
    cover_image_url: null,
  },
  {
    id: "p2",
    title: "云南美食地图",
    status: "PUBLISHED",
    author_name: "Bob",
    created_at: "2026-08-29T10:00:00Z",
    tags: ["food"],
    cover_image_url: null,
  },
];

test.describe("帖子列表页 /posts", () => {
  test("渲染卡片并点击进入详情", async ({ page }) => {
    await mockPostsApi(page, { list: SAMPLE_POSTS, detail: { ...SAMPLE_POSTS[0] } });

    await page.goto("/posts");
    await expect(page.getByRole("heading", { name: "旅行攻略" })).toBeVisible();
    await expect(page.getByText("成都徒步路线")).toBeVisible();
    await expect(page.getByText("云南美食地图")).toBeVisible();

    await page.locator('a[href="/posts/p1"]').first().click();
    await expect(page).toHaveURL(/\/posts\/p1/);
    await expect(page.getByRole("heading", { name: "成都徒步路线" })).toBeVisible();
  });

  test("空态展示引导", async ({ page }) => {
    await mockPostsApi(page, { list: [] });

    await page.goto("/posts");
    await expect(page.getByText("还没有攻略")).toBeVisible();
    await expect(page.getByRole("link", { name: "发布第一篇" })).toBeVisible();
  });

  test("错误态展示重试", async ({ page }) => {
    await mockPostsApi(page, { listStatus: 500 });

    await page.goto("/posts");
    await expect(page.getByText("服务异常，请稍后重试")).toBeVisible();
    await expect(page.getByRole("button", { name: "重试" })).toBeVisible();
  });
});

test.describe("帖子详情页 /posts/[id]", () => {
  test("渲染净化后的正文（剥离 script）", async ({ page }) => {
    await mockPostsApi(page, {
      detail: {
        id: "p1",
        title: "成都徒步路线",
        status: "PUBLISHED",
        author_name: "Alice",
        created_at: "2026-08-30T10:00:00Z",
        tags: ["hiking"],
        cover_image_url: null,
        content: "<script>alert('xss')</script>\n# 标题\n正文内容",
      },
    });

    await page.goto("/posts/p1");
    await expect(page.getByRole("heading", { name: "成都徒步路线" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "标题" })).toBeVisible();
    // 仅校验正文容器内无 script：页面框架脚本（Next.js 注入）不计
    await expect(page.locator(".post-content script")).toHaveCount(0);
  });

  test("404 展示 Not Found 态", async ({ page }) => {
    await mockPostsApi(page, { detailStatus: 404 });

    await page.goto("/posts/missing");
    await expect(page.getByText("攻略不存在或已下架")).toBeVisible();
    await expect(page.getByRole("link", { name: "返回列表" }).first()).toBeVisible();
  });
});

test.describe("发布页 /posts/create（需登录）", () => {
  test("未登录被 AuthGuard 重定向到登录页", async ({ page }) => {
    await mockPostsApi(page, { detail: {} });
    await page.goto("/posts/create");
    await expect(page).toHaveURL(/\/login/);
  });

  test("已登录渲染编辑器，空提交触发校验", async ({ page }) => {
    test.slow();
    await page.addInitScript(() =>
        localStorage.setItem("wanderchina.accessToken", "fake-token")
    );
    await mockMe(page);
    await mockPostsApi(page, { detail: {} });

    await page.goto("/posts/create");
    await expect(page.getByRole("heading", { name: "发布攻略" })).toBeVisible();

    // 标题、正文留空 → 点击发布触发客户端校验
    await page.getByRole("button", { name: "发布" }).click();
    await expect(page.getByText("标题不能为空")).toBeVisible();
    await expect(page.getByText("正文不能为空")).toBeVisible();
    await expect(page).toHaveURL(/\/posts\/create/);
  });

  test("已登录可填写并发布成功跳转详情", async ({ page }) => {
    test.slow();
    await page.addInitScript(() =>
        localStorage.setItem("wanderchina.accessToken", "fake-token")
    );
    await mockMe(page);
    await mockPostsApi(page, { detail: {} });

    await page.goto("/posts/create");
    await expect(page.getByRole("heading", { name: "发布攻略" })).toBeVisible();

    await page.getByPlaceholder(/给你的攻略起个名字/).fill("成都三日游");
    const editor = page.locator(".w-md-editor").getByRole("textbox");
    await expect(editor).toBeVisible();
    await editor.fill("# 成都三日游\n\n第一天去宽窄巷子。");

    await page.getByRole("button", { name: "发布" }).click();
    await expect(page).toHaveURL(/\/posts\/new1/);
  });
});

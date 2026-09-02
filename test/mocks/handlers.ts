import { HttpResponse, http } from "msw";

import { CITIES_MOCK, SPOTS_MOCK } from "@/lib/places/mocks";
import type { City, Spot } from "@/lib/places/types";
import type { components } from "@/lib/api.generated";

type UserResponse = components["schemas"]["UserResponse"];
type AuthTokenResponse = components["schemas"]["AuthTokenResponse"];

/**
 * 由 `openapi.json` 派生的 mock 数据 + 显式边界 handler。
 *
 * <p>为什么手写而非完全自动生成：自动生成的 mock 只会返回 happy path 样例，
 * 而本项目前端的分支逻辑恰恰集中在**四态与限流**这些边界上
 * （见 openspec/specs/auth-module 的状态机）。这些边界必须显式可控。
 *
 * <p>响应形状仍由 {@link components}（openapi 生成物）约束：
 * 契约一改，mock 的数据类型失配即编译报错，不会静默漂移。
 */

/** 触达各认证分支的哨兵邮箱。改动需同步 `lib/backend.test.ts`。 */
export const MOCK_USERS = {
  active: "active@example.com",
  locked: "locked@example.com",
  deleted: "deleted@example.com",
  unverified: "unverified@example.com",
  rateLimited: "limited@example.com",
} as const;

/** 统一错误信封：前端一律基于 error.code 分支。 */
function errorEnvelope(code: string, details?: unknown) {
  return { error: { code, message: code, details } };
}

function mockUser(status: string): UserResponse {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    email: MOCK_USERS.active,
    display_name: "Mock User",
    status,
    created_at: "2026-01-01T00:00:00Z",
  };
}

export const handlers = [
  /**
   * 登录：按哨兵邮箱分派到用户状态机四态 + 限流分支。
   * ACTIVE→200、LOCKED→423、DELETED→401、EMAIL_UNVERIFIED→403、限流→429。
   */
  http.post("*/api/auth/login", async ({ request }) => {
    const { email } = (await request.json()) as { email?: string };

    if (email === MOCK_USERS.rateLimited) {
      return HttpResponse.json(errorEnvelope("RATE_LIMITED"), { status: 429 });
    }
    if (email === MOCK_USERS.locked) {
      return HttpResponse.json(
          errorEnvelope("ACCOUNT_LOCKED", { retryAfterSeconds: 900 }),
          { status: 423 }
      );
    }
    if (email === MOCK_USERS.deleted) {
      return HttpResponse.json(errorEnvelope("ACCOUNT_DELETED"), { status: 401 });
    }
    if (email === MOCK_USERS.unverified) {
      return HttpResponse.json(errorEnvelope("EMAIL_NOT_VERIFIED"), { status: 403 });
    }
    if (email === MOCK_USERS.active) {
      const body: AuthTokenResponse = {
        request_id: "mock-request-id",
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
        user: mockUser("ACTIVE"),
      };
      return HttpResponse.json(body, { status: 200 });
    }
    // 邮箱不存在与密码错误共用 401，收窄账号枚举面
    return HttpResponse.json(errorEnvelope("INVALID_CREDENTIALS"), { status: 401 });
  }),

  /**
   * 续期：默认失败，使「401 → 静默续期 → 失败 → 结束会话」这条链路可被完整测试。
   * 需要成功续期的用例可用 server.use() 覆盖。
   */
  http.post("*/api/auth/refresh", () =>
      HttpResponse.json(errorEnvelope("UNAUTHENTICATED"), { status: 401 })
  ),

  http.get("*/api/auth/me", () =>
      HttpResponse.json({ request_id: "mock-request-id", ...mockUser("ACTIVE") }, { status: 200 })),

  /** 登出：204，无响应体（空响应体必须被正确处理，不能被当成失败）。 */
  http.post("*/api/auth/logout", () => new HttpResponse(null, { status: 204 })),

  http.get("*/api/hello", () =>
      HttpResponse.json({ message: "Hello from Spring Boot!", status: "ok" })
  ),

  // ===== 景点模块（api-spots）mock 后端 =====
  // 形状由后端出网契约约束（snake_case），前端 client.ts 负责适配为 camelCase。
  http.get("*/api/cities", () => {
    const items = CITIES_MOCK.map(cityToRaw);
    return HttpResponse.json({
      request_id: "mock-request-id",
      items,
      page: 1,
      size: items.length,
      total: items.length,
      has_more: false,
    });
  }),

  http.get("*/api/cities/:slug", ({ params }) => {
    const city = CITIES_MOCK.find((c) => c.slug === params.slug);
    if (!city) {
      return HttpResponse.json(
          { error: { code: "CITY_NOT_FOUND", message: "City not found." } },
          { status: 404 }
      );
    }
    return HttpResponse.json(cityToRaw(city));
  }),

  http.get("*/api/spots", () => {
    const items = SPOTS_MOCK.map(spotToRaw);
    return HttpResponse.json({
      request_id: "mock-request-id",
      items,
      page: 1,
      size: items.length,
      total: items.length,
      has_more: false,
    });
  }),

  http.get("*/api/spots/:slug", ({ params }) => {
    const spot = SPOTS_MOCK.find((s) => s.slug === params.slug);
    if (!spot) {
      return HttpResponse.json(
          { error: { code: "SPOT_NOT_FOUND", message: "Spot not found." } },
          { status: 404 }
      );
    }
    return HttpResponse.json(spotToRaw(spot));
  }),
];

function cityToRaw(c: City) {
  return {
    request_id: "mock-request-id",
    slug: c.slug,
    name: c.name,
    name_zh: c.nameZh,
    cover_image: c.coverImage,
    description: c.description,
    best_season: c.bestSeason ?? null,
    spot_count: c.spotCount,
  };
}

function spotToRaw(s: Spot) {
  return {
    request_id: "mock-request-id",
    slug: s.slug,
    name_zh: s.nameZh,
    name_en: s.nameEn,
    city_slug: s.citySlug,
    category: s.category.toUpperCase(),
    tags: s.tags,
    level: s.level ?? null,
    address_en: s.addressEn,
    address_zh: s.addressZh,
    lat: s.lat,
    lng: s.lng,
    cover_image_url: s.coverImage,
    gallery_urls: s.gallery,
    summary_en: s.summaryEn,
    summary_zh: s.summaryZh,
    description_en: s.descriptionEn,
    description_zh: s.descriptionZh,
    opening_hours: s.openingHours ?? null,
    ticket_info: s.ticketInfo ?? null,
    visit_duration: s.visitDuration ?? null,
    view_count: s.viewCount,
    post_count: s.postCount,
    rating: s.rating ?? null,
    featured: s.featured,
    hidden_gem: s.hiddenGem,
  };
}

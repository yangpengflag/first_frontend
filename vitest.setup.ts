import "@testing-library/jest-dom/vitest";

import { afterAll, afterEach, beforeAll } from "vitest";

import { server } from "./test/mocks/server";

// MSW 拦截 Node 层的 fetch：单测与组件测无需真实后端起服。
// onUnhandledRequest: "error" —— 命中未 mock 的端点即失败，
// 避免请求悄悄打到真实网络造成测试结果不确定。
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

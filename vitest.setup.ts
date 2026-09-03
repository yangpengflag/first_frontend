import "@testing-library/jest-dom/vitest";

import { afterAll, afterEach, beforeAll } from "vitest";

import { server } from "./test/mocks/server";

// MSW 拦截 Node 层的 fetch：单测与组件测无需真实后端起服。
// onUnhandledRequest: "error" —— 命中未 mock 的端点即失败，
// 避免请求悄悄打到真实网络造成测试结果不确定。
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// jsdom 不实现 IntersectionObserver。提供空桩，避免渲染无限滚动组件
// （SpotInfiniteList / PostList）时因 `IntersectionObserver is not defined` 崩溃。
// 需要触发「哨兵触底续拉」行为的测试会在各自文件内用 vi.stubGlobal 覆盖为自动 fire 的桩。
class NoopIntersectionObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}
globalThis.IntersectionObserver =
  NoopIntersectionObserver as unknown as typeof IntersectionObserver;

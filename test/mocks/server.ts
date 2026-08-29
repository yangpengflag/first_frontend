import { setupServer } from "msw/node";

import { handlers } from "./handlers";

/**
 * MSW 服务端拦截器。
 *
 * <p>让单测与组件测**无需真实后端起服**即可覆盖全部分支：请求在 Node 层被拦截，
 * 由 `handlers.ts` 按 openapi.json 派生的形状返回响应。
 *
 * <p>生命周期由 `vitest.setup.ts` 统一托管（listen / resetHandlers / close）。
 */
export const server = setupServer(...handlers);

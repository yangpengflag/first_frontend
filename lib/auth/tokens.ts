/**
 * 令牌存储。
 *
 * <p>采用 localStorage + Bearer：后端为 Bearer 设计，前端必须能取到令牌，
 * 故无法使用 httpOnly Cookie。已知代价见 design.md：
 * - XSS 场景下令牌可被窃取
 * - Next.js middleware（Edge Runtime）读不到 localStorage，路由保护只能在客户端组件内实现
 *
 * SSR 安全：所有访问都先判断 window 是否存在。
 */

const ACCESS_TOKEN_KEY = "wanderchina.accessToken";
const REFRESH_TOKEN_KEY = "wanderchina.refreshToken";

export interface TokenStore {
  getAccessToken(): string | null;
  getRefreshToken(): string | null;
  set(accessToken: string, refreshToken: string): void;
  clear(): void;
}

function storage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage;
}

export const tokenStore: TokenStore = {
  getAccessToken() {
    return storage()?.getItem(ACCESS_TOKEN_KEY) ?? null;
  },

  getRefreshToken() {
    return storage()?.getItem(REFRESH_TOKEN_KEY) ?? null;
  },

  set(accessToken, refreshToken) {
    const store = storage();
    if (!store) {
      return;
    }
    store.setItem(ACCESS_TOKEN_KEY, accessToken);
    store.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  clear() {
    const store = storage();
    if (!store) {
      return;
    }
    store.removeItem(ACCESS_TOKEN_KEY);
    store.removeItem(REFRESH_TOKEN_KEY);
  },
};

/** 测试用：注入内存实现，避免依赖真实 localStorage。 */
export function createMemoryTokenStore(): TokenStore {
  let access: string | null = null;
  let refresh: string | null = null;
  return {
    getAccessToken: () => access,
    getRefreshToken: () => refresh,
    set(a, r) {
      access = a;
      refresh = r;
    },
    clear() {
      access = null;
      refresh = null;
    },
  };
}

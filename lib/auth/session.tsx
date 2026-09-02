"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { authApi } from "@/lib/auth/api";
import { tokenStore } from "@/lib/auth/tokens";
import { NetworkError, type UserResponse } from "@/lib/auth/types";

export type SessionStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthSession {
  user: UserResponse | null;
  status: SessionStatus;
  /** 登出：调用后端后清除本地令牌并跳转登录页。 */
  logout: () => Promise<void>;
  /**
   * 把当前会话标记为已认证。
   *
   * <p>仅更新内存态——令牌已由 {@link authApi.login} 写入 localStorage，
   * 此处不重复写。存在的目的：登录页完成 {@code authApi.login} 后
   * {@code router.push} 是 App Router 软跳转，{@link AuthSessionProvider}
   * 不会重挂载，{@code bootstrap}（{@code useEffect([])}）也不会重跑；
   * 调用本方法让 NavBar 立即反映已登录态，避免「刷新一下才显示头像」。
   */
  setAuthenticated: (user: UserResponse) => void;
}

const AuthSessionContext = createContext<AuthSession | null>(null);

/**
 * 会话引导。
 *
 * <p>应用加载时若本地有 access token，则调 {@link authApi.me} 校验并填充用户信息；
 * 否则直接进入未登录态。令牌失效 / 账号锁定 / 注销 / 未验证等情形由
 * {@link authApi.me} 抛出的业务错误驱动，统一清除本地令牌。
 *
 * <p>初始态为 `loading`（中性态），避免 SSR/CSR 首帧不一致与受保护内容一闪而过。
 */
export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserResponse | null>(null);
  const [status, setStatus] = useState<SessionStatus>("loading");

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!tokenStore.getAccessToken()) {
        setStatus("unauthenticated");
        return;
      }
      try {
        const current = await authApi.me();
        if (cancelled) return;
        setUser(current);
        setStatus("authenticated");
      } catch (err) {
        if (cancelled) return;
        // 网络层失败：请求根本没到后端。保留令牌，进入可重试态，
        // 不得误判为「未登录」而清除会话（刷新后网络恢复可自愈）。
        if (err instanceof NetworkError) {
          setStatus("unauthenticated");
          return;
        }
        // 业务错误（含令牌失效 / 锁定 / 注销 / 未验证）：会话已不可用，清除令牌。
        tokenStore.clear();
        setStatus("unauthenticated");
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // 即便登出请求失败，本地令牌也必须清除
    }
    tokenStore.clear();
    setUser(null);
    setStatus("unauthenticated");
    router.replace("/login");
  }, [router]);

  const setAuthenticated = useCallback((next: UserResponse) => {
    setUser(next);
    setStatus("authenticated");
  }, []);

  const value = useMemo<AuthSession>(
    () => ({ user, status, logout, setAuthenticated }),
    [user, status, logout, setAuthenticated]
  );

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}

/** 读取当前会话。必须在 {@link AuthSessionProvider} 内使用。 */
export function useAuthSession(): AuthSession {
  const ctx = useContext(AuthSessionContext);
  if (!ctx) {
    throw new Error("useAuthSession must be used within an AuthSessionProvider");
  }
  return ctx;
}

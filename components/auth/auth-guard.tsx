"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuthSession } from "@/lib/auth/session";

/**
 * 路由保护（由会话态驱动）。
 *
 * <p>令牌存于 localStorage，Next.js middleware（Edge Runtime）读不到，
 * 故只能在客户端组件内守卫。以 {@link useAuthSession} 的 `status` 为准：
 * 仅 `authenticated` 才渲染受保护内容，避免一闪而过。
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useAuthSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [status, pathname, router]);

  if (status !== "authenticated") {
    return null;
  }
  return <>{children}</>;
}

/**
 * 已登录用户不应再看到登录 / 注册 / 忘记密码页，直接送回首页。
 *
 * <p>`loading` 与 `unauthenticated` 都渲染子内容（避免首屏空白与 hydration 不一致），
 * 仅当确证已登录才重定向。
 */
export function RedirectIfAuthenticated({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { status } = useAuthSession();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [status, router]);

  if (status === "authenticated") {
    return null;
  }
  return <>{children}</>;
}

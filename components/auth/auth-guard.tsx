"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { tokenStore } from "@/lib/auth/tokens";

/**
 * 路由保护。
 *
 * <p>令牌存于 localStorage，Next.js middleware（Edge Runtime）读不到，
 * 故只能在客户端组件内守卫。校验完成前不渲染内容，避免受保护内容一闪而过。
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (!tokenStore.getAccessToken()) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      setAuthorized(false);
      return;
    }
    setAuthorized(true);
  }, [pathname, router]);

  if (authorized !== true) {
    return null;
  }
  return <>{children}</>;
}

/** 已登录用户不应再看到登录 / 注册 / 忘记密码页，直接送回首页。 */
export function RedirectIfAuthenticated({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (tokenStore.getAccessToken()) {
      router.replace("/");
      setAllowed(false);
      return;
    }
    setAllowed(true);
  }, [router]);

  if (allowed !== true) {
    return null;
  }
  return <>{children}</>;
}

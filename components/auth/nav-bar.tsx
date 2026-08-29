"use client";

import Link from "next/link";

import { useAuthSession } from "@/lib/auth/session";
import { LogoutButton } from "@/components/auth/logout-button";

/**
 * 顶部导航栏——消费会话态。
 *
 * <p>`loading`（首屏中性态，SSR 与首帧客户端一致）→ 仅展示品牌，不渲染任何
 * 登录态控件，避免 hydration 不一致与一闪而过。
 */
export function NavBar() {
  const { status, user } = useAuthSession();

  return (
    <nav className="flex items-center justify-between border-b px-4 py-3">
      <Link href="/" className="text-lg font-semibold tracking-tight">
        WanderChina
      </Link>
      <div className="flex items-center gap-3">
        {status === "authenticated" ? (
          <>
            <span className="text-sm">{user?.displayName}</span>
            <LogoutButton />
          </>
        ) : status === "unauthenticated" ? (
          <>
            <Link href="/login" className="text-sm">
              登录
            </Link>
            <Link href="/register" className="text-sm">
              注册
            </Link>
          </>
        ) : null}
      </div>
    </nav>
  );
}

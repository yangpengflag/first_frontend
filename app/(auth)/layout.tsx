import Link from "next/link";

import { RedirectIfAuthenticated } from "@/components/auth/auth-guard";

/**
 * 认证相关页面（登录 / 注册 / 忘记密码）的共用布局。
 *
 * 保持为 Server Component，仅提供外壳与品牌头；
 * 表单本身是 Client Component。已登录用户经 {@link RedirectIfAuthenticated}
 * 直接送回首页，不再看到登录 / 注册页。
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8 text-2xl font-semibold tracking-tight">
        WanderChina
      </Link>
      <div className="w-full max-w-md">
        <RedirectIfAuthenticated>{children}</RedirectIfAuthenticated>
      </div>
    </main>
  );
}

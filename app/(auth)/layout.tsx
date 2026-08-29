import Link from "next/link";

/**
 * 认证相关页面（登录 / 注册 / 忘记密码）的共用布局。
 *
 * 保持为 Server Component，仅提供外壳与品牌头；
 * 表单本身是 Client Component。
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8 text-2xl font-semibold tracking-tight">
        WanderChina
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}

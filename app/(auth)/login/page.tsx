import { Suspense } from "react";

import { RedirectIfAuthenticated } from "@/components/auth/auth-guard";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "登录 · WanderChina" };

/**
 * 表单内部使用 useSearchParams 读取 redirect 参数，
 * 在 App Router 下必须以 Suspense 包裹。
 */
export default function LoginPage() {
  return (
    <RedirectIfAuthenticated>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </RedirectIfAuthenticated>
  );
}

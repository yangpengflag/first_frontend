import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata = { title: "重置密码 · WanderChina" };

/** 邮件链接形如 /auth/reset-password?code=xxx。 */
export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { code?: string };
}) {
  return <ResetPasswordForm code={searchParams.code ?? ""} />;
}

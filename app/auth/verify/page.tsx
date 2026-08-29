import { VerifyStatus } from "@/components/auth/verify-status";

export const metadata = { title: "邮箱验证 · WanderChina" };

/** 邮件链接形如 /auth/verify?code=xxx，验证接口本身免鉴权。 */
export default function VerifyPage({
  searchParams,
}: {
  searchParams: { code?: string };
}) {
  return <VerifyStatus code={searchParams.code ?? null} />;
}

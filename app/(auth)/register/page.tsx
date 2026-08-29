import { RedirectIfAuthenticated } from "@/components/auth/auth-guard";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata = { title: "注册 · WanderChina" };

export default function RegisterPage() {
  return (
    <RedirectIfAuthenticated>
      <RegisterForm />
    </RedirectIfAuthenticated>
  );
}

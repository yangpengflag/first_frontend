"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { LogoutButton } from "@/components/auth/logout-button";
import { useAuthSession } from "@/lib/auth/session";

export default function AccountPage() {
  return (
    <AuthGuard>
      <AccountContent />
    </AuthGuard>
  );
}

function AccountContent() {
  const { user } = useAuthSession();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">
        欢迎，{user?.displayName}
      </h1>
      {user?.email && (
        <p className="mt-2 text-sm text-muted-foreground">{user.email}</p>
      )}
      <LogoutButton className="mt-6" />
    </main>
  );
}

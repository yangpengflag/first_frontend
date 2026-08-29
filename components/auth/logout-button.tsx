"use client";

import { Button } from "@/components/ui/button";

import { useAuthSession } from "@/lib/auth/session";

/** 登出按钮：调用会话登出（清令牌 + 跳登录）。 */
export function LogoutButton({ className }: { className?: string }) {
  const { logout } = useAuthSession();
  return (
    <Button variant="outline" onClick={() => void logout()} className={className}>
      登出
    </Button>
  );
}

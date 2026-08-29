"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authApi } from "@/lib/auth/api";

type Phase = "verifying" | "success" | "failed";

interface VerifyStatusProps {
  /** 邮件链接中的一次性验证码。 */
  code: string | null;
}

/**
 * 邮箱验证结果页。
 *
 * <p>验证接口是<b>免鉴权</b>的——用户拿不到令牌，只能经此链路激活账号。
 * 这是破解「未验证用户被 403 挡住、却又无法登录去触发验证」死锁的关键。
 */
export function VerifyStatus({ code }: VerifyStatusProps) {
  const [phase, setPhase] = useState<Phase>("verifying");

  useEffect(() => {
    if (!code) {
      setPhase("failed");
      return;
    }
    let cancelled = false;
    authApi
      .verifyEmail(code)
      .then(() => {
        if (!cancelled) {
          setPhase("success");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPhase("failed");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (phase === "verifying") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>正在验证邮箱…</CardTitle>
          <CardDescription>请稍候</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (phase === "success") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>邮箱验证成功</CardTitle>
          <CardDescription>你的账号已激活，现在可以登录了。</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/login">前往登录</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>验证失败</CardTitle>
        <CardDescription>该验证链接无效或已过期。请重新申请一封验证邮件。</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild className="w-full">
          <Link href="/register">返回注册</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

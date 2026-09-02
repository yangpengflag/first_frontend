"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/auth/api";
import { AuthApiError } from "@/lib/auth/types";

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
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");

  // Strict Mode 下 effect 会被双调用。验证码是一次性的（用后即焚），
  // 第二次请求必然命中已消费的码而误报「失效」，且原代码的 cancelled 标志
  // 会把第一次的成功结果吞掉、只显示第二次的失败——这就是「链接没用」的假象。
  // 用 ref 保证整个组件生命周期只发一次验证请求。
  const startedRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    // 无码可验证：直接失败，避免永久停留在「请稍候」。
    if (!code) {
      setErrorCode(null);
      setPhase("failed");
      return;
    }
    if (startedRef.current) {
      return;
    }
    startedRef.current = true;
    authApi
      .verifyEmail(code)
      .then(() => {
        if (mountedRef.current) {
          setPhase("success");
        }
      })
      .catch((err) => {
        if (mountedRef.current) {
          // 区分「码无效/过期」与「网络层失败」，给出不同文案
          setErrorCode(err instanceof AuthApiError ? err.code : null);
          setPhase("failed");
        }
      });
    return () => {
      mountedRef.current = false;
    };
  }, [code]);

  async function handleResend() {
    setResendState("sending");
    try {
      await authApi.resendVerification(email);
      setResendState("sent");
    } catch {
      setResendState("idle");
    }
  }

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
        <CardDescription>
          {errorCode === "INVALID_VERIFICATION_CODE"
            ? "该验证链接无效或已过期。请重新申请一封验证邮件。"
            : "验证失败，请检查网络后重试。"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Input
            type="email"
            placeholder="输入你的邮箱以重新发送"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleResend}
            disabled={resendState !== "idle" || !email}
          >
            {resendState === "sent"
              ? "已重新发送"
              : resendState === "sending"
                ? "发送中…"
                : "重新发送验证邮件"}
          </Button>
        </div>
        <Button asChild className="w-full">
          <Link href="/register">返回注册</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

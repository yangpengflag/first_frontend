"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/auth/api";
import { describeAuthError } from "@/lib/auth/messages";
import { useAuthSession } from "@/lib/auth/session";
import { loginSchema, type LoginInput } from "@/lib/auth/schemas";
import { AuthApiError, retryAfterSecondsOf } from "@/lib/auth/types";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/";
  const { setAuthenticated } = useAuthSession();

  const [phase, setPhase] = useState<"editing" | "submitting">("editing");
  const [formError, setFormError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setFormError(null);
    setNeedsVerification(false);
    setPhase("submitting");
    try {
      const result = await authApi.login(values);
      // 把内存会话态切到 authenticated，避免 router.push 软跳转导致
      // AuthSessionProvider 不重挂载、bootstrap 不重跑，NavBar 永远卡在「登录/注册」
      setAuthenticated(result.user);
      router.push(redirectTo);
    } catch (error) {
      if (error instanceof AuthApiError) {
        // 未验证邮箱：给出免鉴权的重发出口，这是破解死锁的关键路径
        if (error.code === "EMAIL_NOT_VERIFIED") {
          setNeedsVerification(true);
        }
        if (error.code === "ACCOUNT_LOCKED") {
          const seconds = retryAfterSecondsOf(error);
          setFormError(
            seconds
              ? `账号已被锁定，请 ${Math.ceil(seconds / 60)} 分钟后重试`
              : describeAuthError(error)
          );
        } else {
          setFormError(describeAuthError(error));
        }
      } else {
        setFormError(describeAuthError(error));
      }
      setPhase("editing");
    }
  }

  async function handleResend() {
    setResendState("sending");
    try {
      await authApi.resendVerification(form.getValues("email"));
      setResendState("sent");
    } catch {
      setResendState("idle");
    }
  }

  const submitting = phase === "submitting";

  return (
    <Card>
      <CardHeader>
        <CardTitle>登录</CardTitle>
        <CardDescription>使用注册邮箱登录 WanderChina</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            {needsVerification && (
              <Alert>
                <AlertDescription className="space-y-2">
                  <p>该邮箱尚未完成验证，请查收验证邮件后再登录。</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResend}
                    disabled={resendState !== "idle"}
                  >
                    {resendState === "sent"
                      ? "已重新发送"
                      : resendState === "sending"
                        ? "发送中…"
                        : "重发验证邮件"}
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>邮箱</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>密码</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-sm text-muted-foreground underline underline-offset-4"
              >
                忘记密码？
              </Link>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "登录中…" : "登录"}
            </Button>
          </form>
        </Form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          还没有账号？
          <Link href="/register" className="underline underline-offset-4">
            注册
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

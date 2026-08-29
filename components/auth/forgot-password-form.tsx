"use client";

import Link from "next/link";
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
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/auth/schemas";

export function ForgotPasswordForm() {
  const [phase, setPhase] = useState<"editing" | "submitting" | "sent">("editing");
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordInput) {
    setFormError(null);
    setPhase("submitting");
    try {
      await authApi.forgotPassword(values.email);
      setPhase("sent");
    } catch (error) {
      setFormError(describeAuthError(error));
      setPhase("editing");
    }
  }

  /**
   * 成功态与实际是否发信无关——后端恒定返回 202，
   * 前端也必须恒定展示同一结果，否则等于泄露「该邮箱是否已注册」。
   */
  if (phase === "sent") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>请查收邮件</CardTitle>
          <CardDescription>
            如果该邮箱已注册，我们已向其发送密码重置链接。请点击链接设置新密码。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/login">返回登录</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>忘记密码</CardTitle>
        <CardDescription>输入注册邮箱，我们会发送重置链接给你</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
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

            <Button type="submit" className="w-full" disabled={phase === "submitting"}>
              {phase === "submitting" ? "发送中…" : "发送重置链接"}
            </Button>
          </form>
        </Form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/login" className="underline underline-offset-4">
            返回登录
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

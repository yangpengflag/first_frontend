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
import { registerSchema, type RegisterInput } from "@/lib/auth/schemas";
import { AuthApiError } from "@/lib/auth/types";

export function RegisterForm() {
  const [phase, setPhase] = useState<"editing" | "submitting" | "sent">("editing");
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", displayName: "" },
  });

  async function onSubmit(values: RegisterInput) {
    setFormError(null);
    setPhase("submitting");
    try {
      await authApi.register(values);
      setPhase("sent");
    } catch (error) {
      // 邮箱重复属字段级问题，直接标在输入框上比整表单报错更好定位
      if (error instanceof AuthApiError && error.code === "EMAIL_ALREADY_REGISTERED") {
        form.setError("email", { message: "该邮箱已注册，请直接登录" });
      } else {
        setFormError(describeAuthError(error));
      }
      setPhase("editing");
    }
  }

  if (phase === "sent") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>请查收验证邮件</CardTitle>
          <CardDescription>
            我们已向 <span className="font-medium">{form.getValues("email")}</span>{" "}
            发送验证邮件。请点击邮件中的链接完成验证后再登录。
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

  const submitting = phase === "submitting";

  return (
    <Card>
      <CardHeader>
        <CardTitle>创建账号</CardTitle>
        <CardDescription>注册后需完成邮箱验证方可登录</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          {/* noValidate：交由 zod 统一给出中文提示，避免浏览器原生气泡文案不一致 */}
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
                    <Input type="email" autoComplete="email" placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>昵称</FormLabel>
                  <FormControl>
                    <Input autoComplete="nickname" {...field} />
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
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "提交中…" : "注册"}
            </Button>
          </form>
        </Form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          已有账号？
          <Link href="/login" className="underline underline-offset-4">
            登录
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

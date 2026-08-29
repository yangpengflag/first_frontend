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
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/auth/schemas";

interface ResetPasswordFormProps {
  /** 邮件链接中的一次性重置码。 */
  code: string;
}

export function ResetPasswordForm({ code }: ResetPasswordFormProps) {
  const [phase, setPhase] = useState<"editing" | "submitting" | "done">("editing");
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: ResetPasswordInput) {
    setFormError(null);
    setPhase("submitting");
    try {
      await authApi.resetPassword(code, values.newPassword);
      setPhase("done");
    } catch (error) {
      setFormError(describeAuthError(error));
      setPhase("editing");
    }
  }

  if (phase === "done") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>密码已更新</CardTitle>
          <CardDescription>请使用新密码登录。此前签发的登录凭证已全部失效。</CardDescription>
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
        <CardTitle>设置新密码</CardTitle>
        <CardDescription>新密码需为 8–72 个字符</CardDescription>
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
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>新密码</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>确认新密码</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={phase === "submitting"}>
              {phase === "submitting" ? "提交中…" : "更新密码"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

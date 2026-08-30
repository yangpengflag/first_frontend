"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { postsApi } from "@/lib/posts/api";
import { describePostError, validationFieldErrorsOf } from "@/lib/posts/messages";
import type { CreatePostRequest, PostStatus } from "@/lib/posts/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TagInput } from "./TagInput";

/** 编辑器依赖浏览器 API，禁用 SSR；样式由包自带，无需手动引入 CSS。 */
const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

const FIELD_NAMES = ["title", "content", "tags", "coverImageUrl"] as const;

const schema = z.object({
  title: z.string().trim().min(1, "标题不能为空").max(200, "标题不能超过 200 字符"),
  content: z.string().min(1, "正文不能为空"),
  coverImageUrl: z
      .string()
      .optional()
      .refine((v) => !v || /^https?:\/\/.+/.test(v), "封面图 URL 不合法"),
  tags: z
      .array(z.string().max(30, "单个标签不能超过 30 字符"))
      .max(10, "标签最多 10 个"),
});

type FormValues = z.infer<typeof schema>;

/**
 * 发布表单（需登录，由页面层 {@link AuthGuard} 包裹）。
 *
 * <p>两个提交动作对应 `status`：保存草稿 → DRAFT，发布 → PUBLISHED；
 * 避免引入 Select 组件。后端 `VALIDATION_FAILED.details` 映射回字段错误。
 */
export function PostEditor() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<PostStatus>("DRAFT");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", content: "", coverImageUrl: "", tags: [] },
  });
  const { register, handleSubmit, setValue, setError, watch, formState } = form;
  const content = watch("content");
  const tags = watch("tags");

  async function onValid(values: FormValues, status: PostStatus) {
    setSubmitting(true);
    setFormError(null);
    const payload: CreatePostRequest = {
      title: values.title,
      content: values.content,
      coverImageUrl: values.coverImageUrl ? values.coverImageUrl : undefined,
      tags: values.tags,
      status,
    };
    try {
      const created = await postsApi.create(payload);
      router.push(`/posts/${created.id}`);
    } catch (error) {
      const fieldErrors = validationFieldErrorsOf(error);
      if (fieldErrors) {
        for (const [field, message] of Object.entries(fieldErrors)) {
          if ((FIELD_NAMES as readonly string[]).includes(field)) {
            setError(field as keyof FormValues, { message });
          }
        }
      }
      setFormError(describePostError(error));
      setSubmitting(false);
    }
  }

  function submitAs(status: PostStatus) {
    setPendingStatus(status);
    void handleSubmit((values) => onValid(values, status))();
  }

  const tagsError = formState.errors.tags?.message ?? formState.errors.tags?.root?.message;

  return (
    <form className="space-y-6" onSubmit={(e) => e.preventDefault()} noValidate>
      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">
          标题 <span className="text-red-500">*</span>
        </Label>
        <Input id="title" placeholder="给你的攻略起个名字" {...register("title")} />
        {formState.errors.title && (
          <p className="text-sm text-red-500">{formState.errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>
          正文（Markdown）<span className="text-red-500">*</span>
        </Label>
        <div data-color-mode="light">
          <MDEditor
            value={content}
            onChange={(value) => setValue("content", value ?? "", { shouldValidate: true })}
            height={400}
            preview="live"
          />
        </div>
        {formState.errors.content && (
          <p className="text-sm text-red-500">{formState.errors.content.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="coverImageUrl">封面图 URL</Label>
        <Input id="coverImageUrl" placeholder="https://…（可选）" {...register("coverImageUrl")} />
        {formState.errors.coverImageUrl && (
          <p className="text-sm text-red-500">{formState.errors.coverImageUrl.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>标签</Label>
        <TagInput
          value={tags}
          onChange={(next) => setValue("tags", next, { shouldValidate: true })}
        />
        {tagsError && <p className="text-sm text-red-500">{tagsError}</p>}
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" disabled={submitting} onClick={() => submitAs("DRAFT")}>
          {submitting && pendingStatus === "DRAFT" && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          保存草稿
        </Button>
        <Button
          type="button"
          className="bg-blue-700 hover:bg-blue-800"
          disabled={submitting}
          onClick={() => submitAs("PUBLISHED")}
        >
          {submitting && pendingStatus === "PUBLISHED" && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          发布
        </Button>
      </div>
    </form>
  );
}

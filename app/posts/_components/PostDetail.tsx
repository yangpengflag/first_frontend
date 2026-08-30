"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import { FileQuestion, ImageIcon } from "lucide-react";

import { postsApi } from "@/lib/posts/api";
import { describePostError } from "@/lib/posts/messages";
import { formatPostDate } from "@/lib/posts/format";
import { AuthApiError } from "@/lib/auth/types";
import type { PostResponse } from "@/lib/posts/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

type State =
  | { kind: "loading" }
  | { kind: "content"; post: PostResponse }
  | { kind: "notfound" }
  | { kind: "error"; message: string };

/**
 * 帖子详情（公开，需为 PUBLISHED）。
 *
 * <p>`content` 为原始 Markdown，渲染前经 `rehype-sanitize` 白名单净化，
 * 剥离 `<script>` / `onerror` 等危险内容（防 XSS）。404 渲染为 Not Found 态，
 * 其余错误提供重试。作者信息复用白名单（`author_name` / `author_avatar_url`）。
 */
export function PostDetail({ id }: { id: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  const load = useCallback(() => {
    setState((prev) => (prev.kind === "loading" ? prev : { kind: "loading" }));
    postsApi
        .getById(id)
        .then((post) => setState({ kind: "content", post }))
        .catch((error: unknown) => {
          if (error instanceof AuthApiError && error.code === "POST_NOT_FOUND") {
            setState({ kind: "notfound" });
          } else {
            setState({ kind: "error", message: describePostError(error) });
          }
        });
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (state.kind === "loading") {
    return (
      <div className="space-y-6">
        <Skeleton className="aspect-[16/9] w-full rounded-xl" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    );
  }

  if (state.kind === "notfound") {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/60 py-20 text-center">
        <FileQuestion className="h-12 w-12 text-slate-300" aria-hidden="true" />
        <p className="mt-4 text-lg font-medium text-slate-700">攻略不存在或已下架</p>
        <Button asChild className="mt-6 bg-blue-700 hover:bg-blue-800">
          <Link href="/posts">返回列表</Link>
        </Button>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <Alert variant="destructive" className="max-w-xl">
        <AlertDescription className="flex items-center justify-between gap-4">
          <span>{state.message}</span>
          <Button variant="outline" size="sm" onClick={load}>
            重试
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const post = state.post;
  const authorName = post.author_name ?? "[unknown user]";
  const initial = authorName.trim().charAt(0).toUpperCase() || "?";

  return (
    <article>
      <div
        className="aspect-[16/9] w-full rounded-xl bg-slate-100 bg-cover bg-center"
        style={post.cover_image_url ? { backgroundImage: `url(${post.cover_image_url})` } : undefined}
      >
        {!post.cover_image_url && (
          <div
            aria-hidden="true"
            className="flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 via-slate-50 to-blue-100 text-slate-300"
          >
            <ImageIcon className="h-12 w-12" />
          </div>
        )}
      </div>

      <h1 className="mt-8 text-3xl font-bold text-slate-900 lg:text-4xl">{post.title}</h1>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-cover bg-center text-sm font-semibold text-white"
          style={
            post.author_avatar_url
              ? { backgroundImage: `url(${post.author_avatar_url})` }
              : undefined
          }
        >
          {!post.author_avatar_url && initial}
        </span>
        <span className="font-medium text-slate-700">{authorName}</span>
        {post.created_at && (
          <>
            <span aria-hidden="true">·</span>
            <time dateTime={post.created_at}>{formatPostDate(post.created_at)}</time>
          </>
        )}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="post-content mt-8">
        <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{post.content ?? ""}</ReactMarkdown>
      </div>
    </article>
  );
}

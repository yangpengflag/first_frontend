"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, FileQuestion } from "lucide-react";

import { postsApi } from "@/lib/posts/api";
import { describePostError } from "@/lib/posts/messages";
import type { PagePostSummary } from "@/lib/posts/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PostCard } from "./PostCard";

const PAGE_SIZE = 20;

type State =
  | { kind: "loading" }
  | { kind: "content"; data: PagePostSummary }
  | { kind: "empty" }
  | { kind: "error"; message: string };

/**
 * 公开帖子列表（四态覆盖）。
 *
 * <p>数据在客户端拉取：`fetchFromBackend` 依赖 localStorage 的令牌，
 * 无法在 SSR 阶段执行。状态机统一处理 加载中 / 内容 / 空 / 错误 四态，
 * 错误态提供重试；分页基于 `PagePostSummary` 的 `first` / `last` 元信息。
 */
export function PostList() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [page, setPage] = useState(0);

  const load = useCallback((target: number) => {
    setState((prev) => (prev.kind === "loading" ? prev : { kind: "loading" }));
    postsApi
        .list({ page: target, size: PAGE_SIZE })
        .then((data) => {
          const items = data.content ?? [];
          if (items.length === 0 && target === 0) {
            setState({ kind: "empty" });
          } else {
            setState({ kind: "content", data });
          }
        })
        .catch((error: unknown) => {
          setState({ kind: "error", message: describePostError(error) });
        });
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  if (state.kind === "loading") {
    return (
      <div
        data-testid="post-list-loading"
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <Skeleton className="aspect-[16/9] w-full rounded-none" />
            <div className="space-y-3 p-5">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <Alert variant="destructive" className="max-w-xl">
        <AlertDescription className="flex items-center justify-between gap-4">
          <span>{state.message}</span>
          <Button variant="outline" size="sm" onClick={() => load(page)}>
            重试
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (state.kind === "empty") {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/60 py-20 text-center">
        <FileQuestion className="h-12 w-12 text-slate-300" aria-hidden="true" />
        <p className="mt-4 text-lg font-medium text-slate-700">还没有攻略</p>
        <p className="mt-1 text-sm text-slate-500">成为第一个分享旅行故事的人吧。</p>
        <Button asChild className="mt-6 bg-blue-700 hover:bg-blue-800">
          <Link href="/posts/create">发布第一篇</Link>
        </Button>
      </div>
    );
  }

  const { data } = state;
  const items = data.content ?? [];
  const isFirst = data.first ?? page === 0;
  const isLast = data.last ?? items.length < PAGE_SIZE;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {(!isFirst || !isLast) && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={isFirst}
          >
            <ChevronLeft className="h-4 w-4" />
            上一页
          </Button>
          <span className="text-sm text-slate-500">第 {(data.number ?? page) + 1} 页</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={isLast}
          >
            下一页
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

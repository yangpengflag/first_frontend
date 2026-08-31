"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, FileQuestion } from "lucide-react";

import { postsApi } from "@/lib/posts/api";
import { describePostError } from "@/lib/posts/messages";
import type { PostListParams, PostListResponse } from "@/lib/posts/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PostCard } from "./PostCard";

const PAGE_SIZE = 20;
type Sort = NonNullable<PostListParams["sort"]>;

type State =
  | { kind: "loading" }
  | { kind: "content"; data: PostListResponse }
  | { kind: "empty" }
  | { kind: "error"; message: string };

const SORTS: { value: Sort; label: string }[] = [
  { value: "latest", label: "最新" },
  { value: "top", label: "最多点赞" },
  { value: "most_commented", label: "最多评论" },
];

/**
 * 公开帖子列表（四态覆盖）。
 *
 * <p>数据在客户端拉取：`fetchFromBackend` 依赖 localStorage 的令牌，无法在 SSR 阶段执行。
 * 状态机统一处理 加载中 / 内容 / 空 / 错误 四态，错误态提供重试。
 * 排序：`latest` 走 cursor 翻页（游标栈支持回退），`top` / `most_commented` 走 offset 页码翻页。
 */
export function PostList() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [sort, setSort] = useState<Sort>("latest");
  // cursor 模式（latest）的游标栈，用于「上一页」回退
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  // offset 模式（top / most_commented）的页码
  const [page, setPage] = useState(1);

  const load = useCallback((targetSort: Sort, cursor: string | null, targetPage: number) => {
    setState((prev) => (prev.kind === "loading" ? prev : { kind: "loading" }));
    const params: PostListParams = { sort: targetSort, size: PAGE_SIZE };
    if (targetSort === "latest") {
      if (cursor) params.cursor = cursor;
    } else {
      params.page = targetPage;
    }
    postsApi
      .list(params)
      .then((data) => {
        const items = data.items ?? [];
        if (items.length === 0 && cursor === null && targetPage === 1) {
          setState({ kind: "empty" });
        } else {
          setNextCursor(data.next_cursor ?? null);
          setState({ kind: "content", data });
        }
      })
      .catch((error: unknown) => {
        setState({ kind: "error", message: describePostError(error) });
      });
  }, []);

  // 排序变化时回到首页 / 首游标
  useEffect(() => {
    setCursorStack([]);
    setNextCursor(null);
    setPage(1);
    load(sort, null, 1);
  }, [sort, load]);

  const changeSort = (next: Sort) => {
    if (next === sort) return;
    setSort(next);
  };

  const goNext = () => {
    if (sort === "latest") {
      if (!nextCursor) return;
      setCursorStack((s) => [...s, nextCursor]);
      load(sort, nextCursor, 1);
    } else {
      const next = page + 1;
      setPage(next);
      load(sort, null, next);
    }
  };

  const goPrev = () => {
    if (sort === "latest") {
      setCursorStack((s) => {
        if (s.length === 0) return s;
        const stack = s.slice(0, -1);
        const prevCursor = stack.length > 0 ? stack[stack.length - 1] : null;
        load(sort, prevCursor, 1);
        return stack;
      });
    } else {
      const prev = Math.max(1, page - 1);
      setPage(prev);
      load(sort, null, prev);
    }
  };

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
          <Button variant="outline" size="sm" onClick={() => load(sort, nextCursor, page)}>
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
  const items = data.items ?? [];
  const isCursor = sort === "latest";
  const hasPrev = isCursor ? cursorStack.length > 0 : page > 1;
  const hasNext = data.has_more ?? false;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2">
        {SORTS.map((s) => (
          <Button
            key={s.value}
            variant={s.value === sort ? "default" : "outline"}
            size="sm"
            onClick={() => changeSort(s.value)}
          >
            {s.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {(hasPrev || hasNext) && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={goPrev} disabled={!hasPrev}>
            <ChevronLeft className="h-4 w-4" />
            上一页
          </Button>
          {!isCursor && <span className="text-sm text-slate-500">第 {page} 页</span>}
          <Button variant="outline" size="sm" onClick={goNext} disabled={!hasNext}>
            下一页
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { postsApi } from "@/lib/posts/api";
import { describePostError } from "@/lib/posts/messages";
import type { PostListParams, PostListResponse, PostSummary } from "@/lib/posts/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PostCard } from "./PostCard";

const PAGE_SIZE = 20;
type Sort = NonNullable<PostListParams["sort"]>;

const SORTS: { value: Sort; label: string }[] = [
  { value: "latest", label: "最新" },
  { value: "top", label: "最热" },
  { value: "most_commented", label: "最多讨论" },
];

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <Skeleton className="aspect-[16/9] w-full rounded-none" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

/**
 * 公开帖子列表（无限滚动 + 四态）。
 *
 * <p>数据在客户端拉取：`fetchFromBackend` 依赖 localStorage 的令牌，无法在 SSR 阶段执行。
 * 排序：`latest` 走 cursor 翻页（next_cursor），`top` / `most_commented` 走 offset 翻页（page+1）。
 * 底部 sentinel 用 IntersectionObserver 触底续拉；`loadingRef` / `hasMoreRef` 镜像 state 以杜绝
 * 闭包陈旧，且每次加载完成后若仍 `hasMore` 则 unobserve→observe 同节点强制重判
 * （解决 sentinel 持续在视口内不再回调、导致只翻一页的问题）。
 */
export function PostList() {
  const [items, setItems] = useState<PostSummary[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("latest");

  const loadingRef = useRef(false);
  const hasMoreRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const ioRef = useRef<IntersectionObserver | null>(null);
  const sortRef = useRef<Sort>(sort);
  const nextCursorRef = useRef<string | null>(null);
  const pageRef = useRef(1);
  const loadMoreRef = useRef<() => void>(() => {});

  const loadFirst = useCallback((targetSort: Sort) => {
    setLoadingInitial(true);
    setInitialError(null);
    setItems([]);
    setHasMore(false);
    setLoadMoreError(null);

    const params: PostListParams = { sort: targetSort, size: PAGE_SIZE };
    if (targetSort !== "latest") params.page = 1;
    postsApi
      .list(params)
      .then((data: PostListResponse) => {
        const list = data.items ?? [];
        setItems(list);
        // 空页防御：即便后端误报 has_more=true，空列表也强制停止，避免死循环
        const more = list.length > 0 && (data.has_more ?? false);
        setHasMore(more);
        hasMoreRef.current = more;
        if (targetSort === "latest") {
          nextCursorRef.current = data.next_cursor ?? null;
        } else {
          pageRef.current = 1;
        }
        setLoadingInitial(false);
        // 短列表：sentinel 仍在视口内则借助 IO 重判继续续拉
        if (more && ioRef.current && sentinelRef.current) {
          ioRef.current.unobserve(sentinelRef.current);
          ioRef.current.observe(sentinelRef.current);
        }
      })
      .catch((error: unknown) => {
        setInitialError(describePostError(error));
        setLoadingInitial(false);
      });
  }, []);

  const loadMore = useCallback(() => {
    if (loadingRef.current || !hasMoreRef.current) return;
    loadingRef.current = true;
    setLoadingMore(true);
    setLoadMoreError(null);

    const targetSort = sortRef.current;
    const params: PostListParams = { sort: targetSort, size: PAGE_SIZE };
    if (targetSort === "latest") {
      params.cursor = nextCursorRef.current ?? undefined;
    } else {
      params.page = pageRef.current + 1;
    }

    postsApi
      .list(params)
      .then((data: PostListResponse) => {
        const list = data.items ?? [];
        setItems((prev) => [...prev, ...list]);
        // 空页防御：即便后端误报 has_more=true，空列表也强制停止，避免死循环
        const more = list.length > 0 && (data.has_more ?? false);
        setHasMore(more);
        hasMoreRef.current = more;
        if (targetSort === "latest") {
          nextCursorRef.current = data.next_cursor ?? null;
        } else {
          pageRef.current += 1;
        }
        loadingRef.current = false;
        setLoadingMore(false);
        if (more && ioRef.current && sentinelRef.current) {
          ioRef.current.unobserve(sentinelRef.current);
          ioRef.current.observe(sentinelRef.current);
        }
      })
      .catch((error: unknown) => {
        loadingRef.current = false;
        setLoadingMore(false);
        setLoadMoreError(describePostError(error));
      });
  }, []);
  loadMoreRef.current = loadMore;

  // 排序变化：清空并重新首屏加载
  useEffect(() => {
    sortRef.current = sort;
    loadFirst(sort);
  }, [sort, loadFirst]);

  // 内容可见且仍有更多时建立 / 重建 IntersectionObserver（sentinel 始终在 DOM 中）
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry.isIntersecting) return;
        if (loadingRef.current || !hasMoreRef.current) return;
        loadMoreRef.current();
      },
      { rootMargin: "300px" }
    );
    io.observe(el);
    ioRef.current = io;
    return () => {
      io.disconnect();
      if (ioRef.current === io) ioRef.current = null;
    };
  }, [hasMore, loadingInitial]);

  const changeSort = (next: Sort) => {
    if (next === sort) return;
    setSort(next);
  };

  if (loadingInitial) {
    return (
      <div
        data-testid="post-list-loading"
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (initialError) {
    return (
      <Alert variant="destructive" className="max-w-xl">
        <AlertDescription className="flex items-center justify-between gap-4">
          <span>{initialError}</span>
          <Button variant="outline" size="sm" onClick={() => loadFirst(sort)}>
            重试
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (items.length === 0) {
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

      {loadingMore && (
        <div
          data-testid="post-list-loading-more"
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {loadMoreError && (
        <Alert
          variant="destructive"
          data-testid="post-list-loadmore-error"
          className="max-w-xl"
        >
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{loadMoreError}</span>
            <Button variant="outline" size="sm" onClick={() => loadMore()}>
              重试
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!hasMore && (
        <div
          data-testid="post-list-end"
          role="status"
          aria-live="polite"
          className="py-8 text-center text-sm text-slate-400"
        >
          已经到底啦
        </div>
      )}

      <div ref={sentinelRef} aria-hidden data-testid="post-list-sentinel" className="h-1 w-full" />
    </div>
  );
}

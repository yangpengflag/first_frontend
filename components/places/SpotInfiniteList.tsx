"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SearchX } from "lucide-react";

import { fetchSpots } from "@/lib/places/client";
import type { Spot } from "@/lib/places/types";
import type { SpotQuery } from "@/lib/places/client";
import { buildQuery } from "@/lib/places/url";
import { SpotCard } from "@/components/places/SpotCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 6;

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

interface Props {
  initialItems: Spot[];
  initialHasMore: boolean;
  initialPage: number;
  initialQuery: SpotQuery;
}

/**
 * 景点列表（无限滚动 + 四态）。
 *
 * <p>首屏直接采用 SSR 直出的 `initialItems`，不在挂载时重新 fetch（避免 hydration 不一致，
 * 见 design R1）。筛选变化由父级 `<SpotFilters>` 改写 URL query → Server Component 重渲染
 * 并传入新 `initialItems`，`key={queryKey}` 强制本组件 remount，状态天然重置。
 *
 * <p>续拉经 `fetchSpots` 下推 `page+1`；`loadingRef` / `hasMoreRef` 镜像 state 杜绝闭包陈旧，
 * 每次加载完成后若仍 `hasMore` 则 `unobserve → observe` 同节点强制重判（解决哨兵常驻视口
 * 只翻一页的问题）。`hasMore` 由后端 `total` 推导（不依赖被 client 丢弃的 `has_more` 字段）。
 */
export function SpotInfiniteList({ initialItems, initialHasMore, initialPage, initialQuery }: Props) {
  const [items, setItems] = useState<Spot[]>(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  const loadingRef = useRef(false);
  const hasMoreRef = useRef(initialHasMore);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const ioRef = useRef<IntersectionObserver | null>(null);
  const pageRef = useRef(initialPage);
  const loadMoreRef = useRef<() => void>(() => {});
  const queryRef = useRef(initialQuery);

  const loadMore = useCallback(() => {
    if (loadingRef.current || !hasMoreRef.current) return;
    loadingRef.current = true;
    setLoadingMore(true);
    setLoadMoreError(null);

    const nextPage = pageRef.current + 1;
    fetchSpots({ ...queryRef.current, page: nextPage, size: PAGE_SIZE })
      .then((data) => {
        const list = data.items ?? [];
        setItems((prev) => [...prev, ...list]);
        // 由后端 total 推导是否还有更多（不依赖被 client 丢弃的 has_more）
        const more = list.length > 0 && nextPage * PAGE_SIZE < (data.total ?? Infinity);
        setHasMore(more);
        hasMoreRef.current = more;
        if (more) pageRef.current = nextPage;
        loadingRef.current = false;
        setLoadingMore(false);
        if (more && ioRef.current && sentinelRef.current) {
          ioRef.current.unobserve(sentinelRef.current);
          ioRef.current.observe(sentinelRef.current);
        }
      })
      .catch(() => {
        loadingRef.current = false;
        setLoadingMore(false);
        setLoadMoreError("加载失败，请稍后重试");
      });
  }, []);
  loadMoreRef.current = loadMore;

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
  }, [hasMore]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/60 py-20 text-center">
        <SearchX className="h-12 w-12 text-slate-300" aria-hidden="true" />
        <p className="mt-4 text-lg font-medium text-slate-700">没有符合条件的景点</p>
        <p className="mt-1 text-sm text-slate-500">试着放宽筛选条件或更换关键词</p>
        <Button asChild className="mt-6 bg-blue-700 hover:bg-blue-800">
          <Link href="/spots">查看全部景点</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((spot) => (
          <SpotCard key={spot.slug} spot={spot} />
        ))}
      </div>

      {loadingMore && (
        <div
          data-testid="spot-list-loading-more"
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {loadMoreError && (
        <Alert variant="destructive" data-testid="spot-list-loadmore-error" className="max-w-xl">
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
          data-testid="spot-list-end"
          role="status"
          aria-live="polite"
          className="py-8 text-center text-sm text-slate-400"
        >
          已经到底啦
        </div>
      )}

      {/* SEO：爬虫可达后续页（design D5）。视觉隐藏但对爬虫可见。 */}
      {hasMore && (
        <Link
          href={`/spots${buildQuery(initialQuery as unknown as Record<string, string>, { page: String(initialPage + 1) })}`}
          rel="next"
          className="sr-only"
        >
          下一页
        </Link>
      )}

      <div ref={sentinelRef} aria-hidden data-testid="spot-list-sentinel" className="h-1 w-full" />
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { bookmarksApi } from "@/lib/bookmarks/api";
import { describeBookmarkError } from "@/lib/bookmarks/messages";
import { spotBookmarksApi } from "@/lib/spot-bookmarks/api";
import { useAuthSession } from "@/lib/auth/session";
import { useOptimisticAction } from "@/lib/engagement/useOptimisticAction";

/** 收藏目标：帖子（UUID）或景点（slug）。 */
export type BookmarkTarget =
  | { type: "post"; id: string }
  | { type: "spot"; id: string };

type StatusResponse = { bookmarked: boolean };

/**
 * 通用收藏 hook（乐观更新），按 {@link BookmarkTarget} 注入对应的收藏 API。
 *
 * <p>挂载时精确获取初始态；点击先乐观翻转图标态再异步 toggle，仅采纳最新响应，
 * 失败回滚 + 瞬时提示；未登录点击跳转登录（回跳路径按目标类型区分）。
 * 帖子走 {@code bookmarksApi}，景点走 {@code spotBookmarksApi}。
 */
export function useBookmark(target: BookmarkTarget) {
  const { type, id } = target;
  const { status } = useAuthSession();
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { run, alert, dismissAlert } = useOptimisticAction();

  const statusFn = type === "post" ? bookmarksApi.status : spotBookmarksApi.status;
  const toggleFn = type === "post" ? bookmarksApi.toggle : spotBookmarksApi.toggle;
  const redirectPath =
    type === "post" ? `/posts/${encodeURIComponent(id)}` : `/spots/${encodeURIComponent(id)}`;

  const load = useCallback(() => {
    setBookmarked(null);
    setError(null);
    (statusFn(id) as Promise<StatusResponse>)
      .then((res) => setBookmarked(res.bookmarked ?? false))
      .catch((e: unknown) => setError(describeBookmarkError(e)));
  }, [statusFn, id]);

  useEffect(() => {
    if (status === "authenticated") {
      load();
    } else if (status === "unauthenticated") {
      setBookmarked(false);
    }
  }, [status, load]);

  const requireAuth = useCallback((): boolean => {
    if (status !== "authenticated") {
      router.push(`/login?redirect=${redirectPath}`);
      return false;
    }
    return true;
  }, [status, router, redirectPath]);

  const toggle = useCallback(() => {
    if (!requireAuth()) return;
    if (bookmarked === null) return;
    const snapshot = bookmarked;
    setPending(true);
    run(
      () => toggleFn(id) as Promise<StatusResponse>,
      {
        optimistic: () => setBookmarked((b) => (b === null ? b : !b)),
        rollback: () => setBookmarked(snapshot),
        onOk: (res) => {
          setPending(false);
          // 仅当后端明确回传 bookmarked 时才覆盖，否则保留乐观态（避免漏返字段导致误显示）。
          if (res.bookmarked === undefined) return;
          setBookmarked(res.bookmarked);
        },
        onError: (err) => {
          setPending(false);
          return describeBookmarkError(err);
        },
      },
    );
  }, [requireAuth, bookmarked, toggleFn, id, run]);

  return { bookmarked, error, pending, toggle, alert, dismissAlert, reload: load };
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck, Loader2, X } from "lucide-react";

import { bookmarksApi } from "@/lib/bookmarks/api";
import { describeBookmarkError } from "@/lib/bookmarks/messages";
import { useAuthSession } from "@/lib/auth/session";
import { useOptimisticAction } from "@/lib/engagement/useOptimisticAction";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

type State =
  | { kind: "loading" }
  | { kind: "ready"; bookmarked: boolean }
  | { kind: "error"; message: string };

/**
 * 帖子收藏按钮（乐观更新）。
 *
 * <p>挂载时通过 {@code GET /api/posts/{id}/bookmark} 精确获取初始态；点击先乐观翻转图标态，
 * 再异步 toggle，仅采纳最新响应，失败回滚 + 瞬时提示。未登录点击跳转登录。
 */
export function BookmarkButton({ postId }: { postId: string }) {
  const { status } = useAuthSession();
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [pending, setPending] = useState(false);
  const { run, alert, dismissAlert } = useOptimisticAction();

  const load = useCallback(() => {
    setState({ kind: "loading" });
    bookmarksApi
      .status(postId)
      .then((res) => setState({ kind: "ready", bookmarked: res.bookmarked ?? false }))
      .catch((error: unknown) =>
        setState({ kind: "error", message: describeBookmarkError(error) }),
      );
  }, [postId]);

  useEffect(() => {
    if (status === "authenticated") {
      load();
    } else if (status === "unauthenticated") {
      setState({ kind: "ready", bookmarked: false });
    }
  }, [status, load]);

  const requireAuth = useCallback((): boolean => {
    if (status !== "authenticated") {
      router.push(`/login?redirect=/posts/${encodeURIComponent(postId)}`);
      return false;
    }
    return true;
  }, [status, router, postId]);

  const toggle = useCallback(() => {
    if (!requireAuth()) return;
    if (state.kind !== "ready") return;
    const snapshot = state;
    setPending(true);
    run(
      () => bookmarksApi.toggle(postId),
      {
        optimistic: () =>
          setState((s) => (s.kind === "ready" ? { kind: "ready", bookmarked: !s.bookmarked } : s)),
        rollback: () => setState(snapshot),
        onOk: (res) => {
          setPending(false);
          // 仅当后端明确回传 bookmarked 时才覆盖，否则保留乐观态（避免漏返字段导致误显示未收藏）。
          if (res.bookmarked === undefined) return;
          const bookmarked = res.bookmarked;
          setState((s) => (s.kind === "ready" ? { kind: "ready", bookmarked } : s));
        },
        onError: (err) => {
          setPending(false);
          return describeBookmarkError(err);
        },
      },
    );
  }, [postId, requireAuth, state, run]);

  if (state.kind === "loading") {
    return <Skeleton className="h-9 w-28 rounded-md" aria-busy="true" />;
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

  const active = state.bookmarked;
  return (
    <div className="flex flex-col gap-2">
      {alert && (
        <Alert variant="destructive" aria-live="polite" className="max-w-xl">
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{alert}</span>
            <Button variant="ghost" size="sm" onClick={dismissAlert} aria-label="关闭提示">
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <Button
        type="button"
        variant={active ? "default" : "outline"}
        className={active ? "bg-blue-700 hover:bg-blue-800" : ""}
        aria-pressed={active}
        onClick={toggle}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : active ? (
          <BookmarkCheck className="h-4 w-4" />
        ) : (
          <Bookmark className="h-4 w-4" />
        )}
        <span>{active ? "已收藏" : "收藏"}</span>
      </Button>
    </div>
  );
}

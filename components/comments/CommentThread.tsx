"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, MessageSquare, Send, X } from "lucide-react";

import type { CommentThreadApi, CommentThreadItem } from "@/lib/comments/types";
import { useAuthSession } from "@/lib/auth/session";
import { useOptimisticAction } from "@/lib/engagement/useOptimisticAction";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CommentItem } from "./CommentItem";

const PAGE_SIZE = 20;

type Phase = "loading" | "content" | "empty" | "error";

function makeTempId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 评论区通用容器（两层模型，乐观发布），帖子与景点详情页共用。
 *
 * <p>「调哪个端点、回跳哪个路径、错误怎么文案」全部由注入的 {@link CommentThreadApi} /
 * {@code redirectPath} / {@code describeError} 决定，故本组件不感知目标类型。
 * 未登录展示 gate；登录后拉顶层评论（倒序分页，含 reply_count），支持乐观发布、
 * 展开回复列表与回复表单、作者删除（软删占位）。写操作先乐观插入本地再异步请求，
 * 失败回滚 + 瞬时提示。
 */
export function CommentThread({
  api,
  redirectPath,
  describeError,
}: {
  api: CommentThreadApi;
  redirectPath: string;
  describeError: (error: unknown) => string;
}) {
  const { status, user } = useAuthSession();
  const router = useRouter();
  const [comments, setComments] = useState<CommentThreadItem[]>([]);
  const [page, setPage] = useState(0);
  const [last, setLast] = useState(false);
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const { run, alert, dismissAlert } = useOptimisticAction();

  const loadPage = useCallback(
    (pageToLoad: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setPhase("loading");
      api
        .list(pageToLoad, PAGE_SIZE)
        .then((res) => {
          const items = (res.content ?? []) as CommentThreadItem[];
          setComments((prev) => (append ? [...prev, ...items] : items));
          setPage(pageToLoad);
          setLast(res.last ?? false);
          setPhase(items.length === 0 && !append ? "empty" : "content");
          setError(null);
        })
        .catch((e: unknown) => {
          setError(describeError(e));
          setPhase("error");
        })
        .finally(() => {
          if (append) setLoadingMore(false);
        });
    },
    [api, describeError],
  );

  useEffect(() => {
    if (status === "authenticated") {
      loadPage(0, false);
    } else if (status === "unauthenticated") {
      setPhase("empty");
    }
  }, [status, loadPage]);

  const requireAuth = useCallback((): boolean => {
    if (status !== "authenticated") {
      router.push(`/login?redirect=${redirectPath}`);
      return false;
    }
    return true;
  }, [status, router, redirectPath]);

  const submit = useCallback(() => {
    if (!requireAuth()) return;
    const content = draft.trim();
    if (!content) return;
    const tempId = makeTempId();
    const optimistic: CommentThreadItem = {
      id: tempId,
      user_id: user?.id,
      author_name: user?.display_name ?? "我",
      content,
      created_at: new Date().toISOString(),
      reply_count: 0,
      pending: true,
    };
    const phaseSnapshot = phase;
    setPosting(true);
    run(
      () => api.create(content),
      {
        optimistic: () => {
          setComments((prev) => [optimistic, ...prev]);
          setPhase("content");
        },
        rollback: () => {
          setComments((prev) => prev.filter((c) => c.id !== tempId));
          setPhase(phaseSnapshot);
        },
        onOk: (created) => {
          setPosting(false);
          setComments((prev) => prev.map((c) => (c.id === tempId ? (created as CommentThreadItem) : c)));
        },
        onError: (err) => {
          setPosting(false);
          return describeError(err);
        },
      },
      { mode: "list" },
    );
    setDraft("");
  }, [api, requireAuth, draft, phase, user, run, describeError]);

  if (status === "unauthenticated") {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 p-10 text-center">
        <MessageSquare className="mx-auto h-10 w-10 text-slate-300" aria-hidden="true" />
        <p className="mt-3 text-sm text-slate-500">登录后参与讨论</p>
        <Button asChild className="mt-4 bg-blue-700 hover:bg-blue-800">
          <Link href={`/login?redirect=${redirectPath}`}>去登录</Link>
        </Button>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="space-y-4" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (phase === "error") {
    return (
      <Alert variant="destructive" className="max-w-xl">
        <AlertDescription className="flex items-center justify-between gap-4">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => loadPage(0, false)}>
            重试
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <section aria-label="评论区" className="space-y-6">
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
      <div className="flex flex-col gap-3">
        <label htmlFor="comment-draft" className="text-sm font-medium text-slate-700">
          发表评论<span className="text-red-500"> *</span>
        </label>
        <textarea
          id="comment-draft"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          placeholder="分享你的经验……"
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
        />
        <div className="flex justify-end">
          <Button
            type="button"
            className="bg-blue-700 hover:bg-blue-800"
            disabled={posting || draft.trim().length === 0}
            onClick={submit}
          >
            {posting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            发布
          </Button>
        </div>
      </div>

      {phase === "empty" ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 p-10 text-center">
          <MessageSquare className="mx-auto h-10 w-10 text-slate-300" aria-hidden="true" />
          <p className="mt-3 text-sm text-slate-500">还没有评论，来抢沙发吧</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {comments.map((c, i) => (
            <CommentItem
              key={c.id ?? i}
              comment={c}
              api={api}
              currentUserId={user?.id}
              currentUserName={user?.display_name}
              currentUserRole={user?.role}
              describeError={describeError}
            />
          ))}
        </ul>
      )}

      {phase === "content" && !last && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            disabled={loadingMore}
            onClick={() => loadPage(page + 1, true)}
          >
            {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : "加载更多"}
          </Button>
        </div>
      )}
    </section>
  );
}

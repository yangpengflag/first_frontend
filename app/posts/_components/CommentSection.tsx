"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, MessageSquare, Send } from "lucide-react";

import { commentsApi } from "@/lib/comments/api";
import { describeCommentError } from "@/lib/comments/messages";
import type { CommentResponse } from "@/lib/comments/types";
import { useAuthSession } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CommentItem } from "./CommentItem";

const PAGE_SIZE = 20;

type Phase = "loading" | "content" | "empty" | "error";

/**
 * 帖子评论区（两层模型）。
 *
 * <p>未登录展示 gate；登录后拉顶层评论（倒序分页，含 reply_count），支持发布顶层评论、
 * 展开回复列表与回复表单、作者删除（软删占位）。统计与写操作均需鉴权。
 */
export function CommentSection({ postId }: { postId: string }) {
  const { status, user } = useAuthSession();
  const router = useRouter();
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [page, setPage] = useState(0);
  const [last, setLast] = useState(false);
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);

  const loadPage = useCallback(
      (pageToLoad: number, append: boolean) => {
        if (append) setLoadingMore(true);
        else setPhase("loading");
        commentsApi
            .list(postId, pageToLoad, PAGE_SIZE)
            .then((res) => {
              const items = res.content ?? [];
              setComments((prev) => (append ? [...prev, ...items] : items));
              setPage(pageToLoad);
              setLast(res.last ?? false);
              setPhase(items.length === 0 && !append ? "empty" : "content");
              setError(null);
            })
            .catch((e: unknown) => {
              setError(describeCommentError(e));
              setPhase("error");
            })
            .finally(() => {
              if (append) setLoadingMore(false);
            });
      },
      [postId],
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
      router.push(`/login?redirect=/posts/${encodeURIComponent(postId)}`);
      return false;
    }
    return true;
  }, [status, router, postId]);

  const submit = useCallback(() => {
    if (!requireAuth()) return;
    const content = draft.trim();
    if (!content) return;
    setPosting(true);
    commentsApi
        .create(postId, { content })
        .then((created) => {
          setComments((prev) => [created, ...prev]);
          setDraft("");
          setPhase("content");
        })
        .catch((e: unknown) => setError(describeCommentError(e)))
        .finally(() => setPosting(false));
  }, [postId, draft, requireAuth]);

  if (status === "unauthenticated") {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 p-10 text-center">
        <MessageSquare className="mx-auto h-10 w-10 text-slate-300" aria-hidden="true" />
        <p className="mt-3 text-sm text-slate-500">登录后参与讨论</p>
        <Button asChild className="mt-4 bg-blue-700 hover:bg-blue-800">
          <Link href={`/login?redirect=/posts/${encodeURIComponent(postId)}`}>去登录</Link>
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
            <CommentItem key={c.id ?? i} comment={c} postId={postId} currentUserId={user?.id} />
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

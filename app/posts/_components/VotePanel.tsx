"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ThumbsDown, ThumbsUp, X } from "lucide-react";

import { votesApi } from "@/lib/votes/api";
import { describeVoteError } from "@/lib/votes/messages";
import type { VoteStatsResponse, VoteType } from "@/lib/votes/types";
import { useAuthSession } from "@/lib/auth/session";
import { useOptimisticAction } from "@/lib/engagement/useOptimisticAction";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

type State =
  | { kind: "loading" }
  | { kind: "ready"; stats: VoteStatsResponse }
  | { kind: "error"; message: string };

/** 基于当前本地统计，计算乐观投票后的下一态（取消 / 切换 / 新投）。 */
function applyVote(stats: VoteStatsResponse, voteType: VoteType): VoteStatsResponse {
  const current = stats.user_vote ?? "";
  const up = stats.up_count ?? 0;
  const down = stats.down_count ?? 0;
  if (current === voteType) {
    // 取消当前票
    return {
      ...stats,
      user_vote: "",
      up_count: voteType === "UP" ? Math.max(0, up - 1) : up,
      down_count: voteType === "DOWN" ? Math.max(0, down - 1) : down,
    };
  }
  const next: VoteStatsResponse = { ...stats, user_vote: voteType };
  if (current === "UP") next.up_count = Math.max(0, up - 1);
  else if (current === "DOWN") next.down_count = Math.max(0, down - 1);
  if (voteType === "UP") next.up_count = (next.up_count ?? 0) + 1;
  else next.down_count = (next.down_count ?? 0) + 1;
  return next;
}

/**
 * 帖子投票面板（UP / DOWN 三态，乐观更新）。
 *
 * <p>统计端点需鉴权：未登录以中性态呈现，点击触发登录跳转；登录后挂载即取统计，
 * 点击投票先乐观翻转 UI 再异步请求，仅采纳最新一次响应（latest-wins），失败回滚 + 瞬时提示。
 */
export function VotePanel({ postId }: { postId: string }) {
  const { status } = useAuthSession();
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [pending, setPending] = useState<VoteType | null>(null);
  const { run, alert, dismissAlert } = useOptimisticAction();

  const load = useCallback(() => {
    setState({ kind: "loading" });
    votesApi
      .stats(postId)
      .then((stats) => setState({ kind: "ready", stats }))
      .catch((error: unknown) => setState({ kind: "error", message: describeVoteError(error) }));
  }, [postId]);

  useEffect(() => {
    if (status === "authenticated") {
      load();
    } else if (status === "unauthenticated") {
      setState({ kind: "ready", stats: {} });
    }
  }, [status, load]);

  const requireAuth = useCallback((): boolean => {
    if (status !== "authenticated") {
      router.push(`/login?redirect=/posts/${encodeURIComponent(postId)}`);
      return false;
    }
    return true;
  }, [status, router, postId]);

  const cast = useCallback(
    (voteType: VoteType) => {
      if (!requireAuth()) return;
      if (state.kind !== "ready") return;
      const snapshot = state;
      setPending(voteType);
      run(
        () => votesApi.vote(postId, voteType),
        {
          // 乐观：立即基于当前本地态翻转，不等待网络
          optimistic: () =>
            setState((s) =>
              s.kind === "ready" ? { kind: "ready", stats: applyVote(s.stats, voteType) } : s,
            ),
          // 失败回滚到点击前快照
          rollback: () => setState(snapshot),
          onOk: (res) => {
            setPending(null);
            // 投票响应仅回传 user_vote；counts 以乐观态为准（服务端不返回计数）。
            // 仅当后端明确回传时才覆盖，否则保留乐观态（避免漏返字段导致误失活）。
            if (res.user_vote === undefined) return;
            const userVote = res.user_vote;
            setState((s) =>
              s.kind === "ready"
                ? { kind: "ready", stats: { ...s.stats, user_vote: userVote } }
                : s,
            );
          },
          onError: (err) => {
            setPending(null);
            return describeVoteError(err);
          },
        },
      );
    },
    [postId, requireAuth, state, run],
  );

  if (state.kind === "loading") {
    return (
      <div className="flex items-center gap-4" aria-busy="true">
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
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

  const stats = state.stats;
  const userVote = stats.user_vote ?? "";
  const upCount = stats.up_count ?? 0;
  const downCount = stats.down_count ?? 0;
  const upActive = userVote === "UP";
  const downActive = userVote === "DOWN";

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
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant={upActive ? "default" : "outline"}
          size="sm"
          className={upActive ? "bg-blue-700 hover:bg-blue-800" : ""}
          aria-pressed={upActive}
          aria-label="赞同"
          onClick={() => cast("UP")}
        >
          {pending === "UP" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ThumbsUp className="h-4 w-4" />
          )}
          <span>{upCount}</span>
        </Button>
        <Button
          type="button"
          variant={downActive ? "default" : "outline"}
          size="sm"
          className={downActive ? "bg-blue-700 hover:bg-blue-800" : ""}
          aria-pressed={downActive}
          aria-label="反对"
          onClick={() => cast("DOWN")}
        >
          {pending === "DOWN" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ThumbsDown className="h-4 w-4" />
          )}
          <span>{downCount}</span>
        </Button>
      </div>
    </div>
  );
}

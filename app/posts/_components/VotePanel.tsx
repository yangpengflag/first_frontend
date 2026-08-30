"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ThumbsDown, ThumbsUp } from "lucide-react";

import { votesApi } from "@/lib/votes/api";
import { describeVoteError } from "@/lib/votes/messages";
import type { VoteStatsResponse, VoteType } from "@/lib/votes/types";
import { useAuthSession } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

type State =
  | { kind: "loading" }
  | { kind: "ready"; stats: VoteStatsResponse }
  | { kind: "error"; message: string };

/**
 * 帖子投票面板（UP / DOWN 三态）。
 *
 * <p>统计端点需鉴权：未登录时不拉取（以中性态呈现，点击触发登录跳转）；
 * 登录后挂载即取统计，投票后用响应刷新 counts 与 user_vote（非乐观更新）。
 */
export function VotePanel({ postId }: { postId: string }) {
  const { status } = useAuthSession();
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [pending, setPending] = useState<VoteType | null>(null);

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
      // 端点需鉴权；未登录以中性态呈现，点击跳转登录
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
        setPending(voteType);
        votesApi
            .vote(postId, voteType)
            .then((res) => {
              const base = state.kind === "ready" ? state.stats : {};
              setState({
                kind: "ready",
                stats: {
                  ...base,
                  user_vote: res.user_vote,
                  up_count: res.up_count ?? base.up_count ?? 0,
                  down_count: res.down_count ?? base.down_count ?? 0,
                },
              });
            })
            .catch((error: unknown) =>
                setState({ kind: "error", message: describeVoteError(error) }),
            )
            .finally(() => setPending(null));
      },
      [postId, requireAuth, state],
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
    <div className="flex items-center gap-3">
      <Button
        type="button"
        variant={upActive ? "default" : "outline"}
        size="sm"
        className={upActive ? "bg-blue-700 hover:bg-blue-800" : ""}
        aria-pressed={upActive}
        aria-label="赞同"
        disabled={pending !== null}
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
        disabled={pending !== null}
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
  );
}

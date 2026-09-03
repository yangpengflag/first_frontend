"use client";

import { useCallback, useState } from "react";
import { Loader2, MessageSquare, Send, Trash2, X } from "lucide-react";

import type { CommentThreadApi, CommentThreadItem } from "@/lib/comments/types";
import { useOptimisticAction } from "@/lib/engagement/useOptimisticAction";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

const REPLY_PAGE_SIZE = 20;

function formatTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
}

function makeTempId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 单条评论（含两层回复与作者删除，乐观回复）。
 *
 * <p>数据访问完全通过注入的 {@link CommentThreadApi} 完成（帖子/景点评论共用同一组件），
 * 因此本组件不再耦合 postId 或 commentsApi。错误处理文案由 {@link describeError} 注入，
 * 使景点评论可映射 SPOT_NOT_FOUND 而非 POST_NOT_FOUND。软删（content 为 null）显示占位。
 */
export function CommentItem({
  comment,
  api,
  currentUserId,
  currentUserName,
  currentUserRole,
  describeError,
}: {
  comment: CommentThreadItem;
  api: CommentThreadApi;
  currentUserId?: string | null;
  currentUserName?: string | null;
  currentUserRole?: string | null;
  describeError: (error: unknown) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [replies, setReplies] = useState<CommentThreadItem[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [replyDraft, setReplyDraft] = useState("");
  const [postingReply, setPostingReply] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);
  const [replyCount, setReplyCount] = useState(comment.reply_count ?? 0);
  const [deletingReplyId, setDeletingReplyId] = useState<string | null>(null);
  const { run, alert, dismissAlert } = useOptimisticAction();

  const isDeleted = deleted || comment.content == null;

  const loadReplies = useCallback(() => {
    if (!comment.id) return;
    setLoadingReplies(true);
    setReplyError(null);
    api
      .replies(comment.id, 0, REPLY_PAGE_SIZE)
      .then((res) => setReplies((res.content ?? []) as CommentThreadItem[]))
      .catch((e: unknown) => setReplyError(describeError(e)))
      .finally(() => setLoadingReplies(false));
  }, [api, comment.id, describeError]);

  const toggleExpand = useCallback(() => {
    const next = !expanded;
    setExpanded(next);
    if (next && replies.length === 0 && !loadingReplies) {
      loadReplies();
    }
  }, [expanded, replies.length, loadingReplies, loadReplies]);

  const submitReply = useCallback(() => {
    const content = replyDraft.trim();
    if (!content || !comment.id) return;
    const tempId = makeTempId();
    const optimistic: CommentThreadItem = {
      id: tempId,
      parent_comment_id: comment.id,
      user_id: currentUserId ?? undefined,
      author_name: currentUserName ?? "我",
      content,
      created_at: new Date().toISOString(),
      reply_count: 0,
      pending: true,
    };
    setPostingReply(true);
    run(
      () => api.create(content, comment.id),
      {
        optimistic: () => setReplies((prev) => [...prev, optimistic]),
        // 列表语义回滚：仅移除本条临时回复，不影响其它回复
        rollback: () => setReplies((prev) => prev.filter((r) => r.id !== tempId)),
        onOk: (created) => {
          setPostingReply(false);
          setReplyCount((n) => n + 1);
          setReplies((prev) => prev.map((r) => (r.id === tempId ? (created as CommentThreadItem) : r)));
        },
        onError: (err) => {
          setPostingReply(false);
          return describeError(err);
        },
      },
      { mode: "list" },
    );
    setReplyDraft("");
    setFormOpen(false);
  }, [api, replyDraft, comment.id, currentUserId, currentUserName, run, describeError]);

  const remove = useCallback(() => {
    if (!comment.id) return;
    setDeleting(true);
    api
      .remove(comment.id)
      .then(() => setDeleted(true))
      .catch((e: unknown) => setItemError(describeError(e)))
      .finally(() => setDeleting(false));
  }, [api, comment.id, describeError]);

  // 删除单条回复：从列表移除并维护父级回复计数，避免计数滞留。
  const removeReply = useCallback(
    (reply: CommentThreadItem) => {
      if (!reply.id) return;
      setDeletingReplyId(reply.id);
      api
        .remove(reply.id)
        .then(() => {
          setReplies((prev) => prev.filter((r) => r.id !== reply.id));
          setReplyCount((n) => Math.max(0, n - 1));
        })
        .catch((e: unknown) => setItemError(describeError(e)))
        .finally(() => setDeletingReplyId((id) => (id === reply.id ? null : id)));
    },
    [api, describeError],
  );

  if (isDeleted) {
    return (
      <li className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-400">
        评论已删除
      </li>
    );
  }

  const isAdmin = currentUserRole === "ADMIN";
  const canDelete = !!currentUserId && (currentUserId === comment.user_id || isAdmin);

  return (
    <li
      className={`rounded-lg border border-slate-100 bg-white px-4 py-3${
        comment.pending ? " opacity-60" : ""
      }`}
    >
      {alert && (
        <Alert variant="destructive" aria-live="polite" className="mb-2">
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{alert}</span>
            <Button variant="ghost" size="sm" onClick={dismissAlert} aria-label="关闭提示">
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <div className="flex items-start gap-3">
        <div
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500"
        >
          {(comment.author_name ?? "?").trim().charAt(0).toUpperCase() || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-slate-700">
              {comment.author_name ?? "[unknown user]"}
            </span>
            <time className="text-slate-400" dateTime={comment.created_at}>
              {formatTime(comment.created_at)}
            </time>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{comment.content}</p>

          <div className="mt-2 flex items-center gap-3 text-sm">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-slate-500 hover:text-blue-700"
              aria-expanded={expanded}
              onClick={toggleExpand}
            >
              <MessageSquare className="h-4 w-4" />
              {replyCount > 0 ? `${replyCount} 条回复` : "回复"}
            </button>
            {canDelete && (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-slate-400 hover:text-red-500"
                disabled={deleting}
                onClick={remove}
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                删除
              </button>
            )}
          </div>

          {itemError && (
            <Alert variant="destructive" className="mt-2">
              <AlertDescription>{itemError}</AlertDescription>
            </Alert>
          )}

          {expanded && (
            <div className="mt-3 space-y-3 border-l-2 border-slate-100 pl-3">
              {loadingReplies ? (
                <p className="text-sm text-slate-400">加载回复中……</p>
              ) : replyError ? (
                <Alert variant="destructive">
                  <AlertDescription>{replyError}</AlertDescription>
                </Alert>
              ) : replies.length === 0 ? (
                <p className="text-sm text-slate-400">暂无回复</p>
              ) : (
                <ul className="space-y-2">
                  {replies.map((r) => {
                    const replyCanDelete = !!currentUserId && (currentUserId === r.user_id || isAdmin);
                    const replyDeleting = deletingReplyId === r.id;
                    return (
                      <li
                        key={r.id}
                        className="flex items-start justify-between gap-2 text-sm"
                      >
                        <span className="min-w-0 break-words">
                          <span className="font-medium text-slate-700">
                            {r.author_name ?? "[unknown user]"}
                          </span>
                          <span className="text-slate-600">：{r.content}</span>
                        </span>
                        {replyCanDelete && (
                          <button
                            type="button"
                            className="inline-flex shrink-0 items-center gap-1 text-slate-400 hover:text-red-500"
                            disabled={replyDeleting}
                            onClick={() => removeReply(r)}
                            aria-label="删除回复"
                          >
                            {replyDeleting ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {formOpen ? (
                <div className="space-y-2">
                  <textarea
                    value={replyDraft}
                    onChange={(e) => setReplyDraft(e.target.value)}
                    rows={2}
                    placeholder="写下你的回复……"
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setFormOpen(false)}>
                      取消
                    </Button>
                    <Button
                      size="sm"
                      className="bg-blue-700 hover:bg-blue-800"
                      disabled={postingReply || replyDraft.trim().length === 0}
                      onClick={submitReply}
                    >
                      {postingReply ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      回复
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setFormOpen(true)}>
                  写回复
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

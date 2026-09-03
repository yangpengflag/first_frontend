"use client";

import { makePostCommentApi } from "@/lib/comments/api";
import { describeCommentError } from "@/lib/comments/messages";
import { CommentThread } from "@/components/comments/CommentThread";

/**
 * 帖子评论区（薄封装）。
 *
 * <p>真正的列表/回复/创建/删除逻辑与乐观更新已下沉到通用 {@link CommentThread}；
 * 本组件仅把帖子维度（postId）适配为注入式 {@link CommentThreadApi} 与回跳路径，
 * 以便复用同一套评论 UI 于帖子与景点详情页。
 */
export function CommentSection({ postId }: { postId: string }) {
  return (
    <CommentThread
      api={makePostCommentApi(postId)}
      redirectPath={`/posts/${encodeURIComponent(postId)}`}
      describeError={describeCommentError}
    />
  );
}

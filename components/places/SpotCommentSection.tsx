"use client";

import { makeSpotCommentApi } from "@/lib/spot-comments/api";
import { describeSpotCommentError } from "@/lib/spot-comments/messages";
import { CommentThread } from "@/components/comments/CommentThread";

/**
 * 景点评论区（复用通用 {@link CommentThread}）。
 *
 * <p>把景点维度（slug）适配为注入式 {@link CommentThreadApi}（走独立的
 * {@code /api/spots/{slug}/comments} 与 {@code /api/spot-comments/{id}/replies} 端点），
 * 回跳路径为景点详情页。展示逻辑与帖子评论完全一致，仅数据访问与错误文案不同。
 */
export function SpotCommentSection({ slug }: { slug: string }) {
  return (
    <CommentThread
      api={makeSpotCommentApi(slug)}
      redirectPath={`/spots/${encodeURIComponent(slug)}`}
      describeError={describeSpotCommentError}
    />
  );
}

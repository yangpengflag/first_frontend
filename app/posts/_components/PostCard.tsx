import Link from "next/link";
import { ImageIcon } from "lucide-react";

import type { PostSummary } from "@/lib/posts/types";
import { formatPostDate } from "@/lib/posts/format";

/**
 * 列表卡片（公开帖子）。
 *
 * <p>封面用 `aspect-[16/9]` + `bg-cover`；无封面时退化为渐变占位，
 * 不出现白块。作者头像用圆形 `bg-cover`（避免引入 next/image 的远程域名配置）；
 * 无头像时显示首字母占位。
 */
export function PostCard({ post }: { post: PostSummary }) {
  const href = `/posts/${post.id}`;
  const authorName = post.author_name ?? "[unknown user]";
  const initial = authorName.trim().charAt(0).toUpperCase() || "?";

  return (
    <Link href={href} className="group block focus-visible:outline-none">
      <article className="h-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-lg group-focus-visible:ring-2 group-focus-visible:ring-blue-600">
        <div
          className="aspect-[16/9] bg-slate-100 bg-cover bg-center"
          style={post.cover_image_url ? { backgroundImage: `url(${post.cover_image_url})` } : undefined}
        >
          {!post.cover_image_url && (
            <div
              data-testid="cover-placeholder"
              aria-hidden="true"
              className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-50 via-slate-50 to-blue-100 text-slate-300"
            >
              <ImageIcon className="h-10 w-10" />
            </div>
          )}
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-semibold text-slate-900 transition-colors group-hover:text-blue-700">
              {post.title}
            </h3>
            {post.status === "DRAFT" && (
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                草稿
              </span>
            )}
          </div>

          {post.summary && (
            <p className="mt-2 line-clamp-2 text-sm text-slate-600">{post.summary}</p>
          )}

          {post.tags && post.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cover bg-center text-xs font-semibold text-white"
              style={
                post.author_avatar_url
                  ? { backgroundImage: `url(${post.author_avatar_url})` }
                  : undefined
              }
            >
              {!post.author_avatar_url && initial}
            </span>
            <span className="truncate">{authorName}</span>
            {post.created_at && (
              <>
                <span aria-hidden="true">·</span>
                <time dateTime={post.created_at}>{formatPostDate(post.created_at)}</time>
              </>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}

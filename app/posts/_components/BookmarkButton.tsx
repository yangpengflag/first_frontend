"use client";

import { Bookmark, BookmarkCheck, Loader2, X } from "lucide-react";

import { useBookmark } from "@/lib/engagement/useBookmark";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * 通用收藏按钮（乐观更新），帖子与景点复用同一展示层。
 *
 * <p>数据获取 / 切换 / 初始态 / 回跳路径统一委托给 {@link useBookmark}（按
 * `postId` 或 `targetType`+`targetId` 注入对应收藏 API）。未登录以中性态呈现，
 * 点击跳转登录；切换先乐观翻转图标态再异步请求，失败回滚 + 瞬时提示。
 */
export function BookmarkButton(props: { postId: string } | { targetType: "post" | "spot"; targetId: string }) {
  const target = "postId" in props
    ? { type: "post" as const, id: props.postId }
    : { type: props.targetType, id: props.targetId };

  const { bookmarked, error, pending, toggle, alert, dismissAlert, reload } = useBookmark(target);

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-xl">
        <AlertDescription className="flex items-center justify-between gap-4">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={reload}>
            重试
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (bookmarked === null) {
    return <Skeleton className="h-9 w-28 rounded-md" aria-busy="true" />;
  }

  const active = bookmarked;
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

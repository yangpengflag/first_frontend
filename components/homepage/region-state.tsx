import type { ReactNode } from "react";
import { SearchX, AlertCircle, Loader2 } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export type RegionStatus = "loading" | "content" | "empty" | "error";

export interface RegionStateProps {
  status: RegionStatus;
  /** content 态渲染的内容 */
  children?: ReactNode;
  /** empty 态标题 */
  emptyTitle?: string;
  /** empty 态引导文案 */
  emptyDescription?: string;
  /** empty 态可选 CTA */
  emptyAction?: ReactNode;
  /** error 态描述 */
  errorDescription?: string;
  /** error 态重试回调 */
  onRetry?: () => void;
  /** loading 态骨架屏数量（默认 3） */
  skeletonCount?: number;
  className?: string;
}

export function RegionState({
  status,
  children,
  emptyTitle = "Nothing here yet",
  emptyDescription = "We couldn't find any content to show.",
  emptyAction,
  errorDescription = "Something went wrong while loading this section.",
  onRetry,
  skeletonCount = 3,
  className,
}: RegionStateProps) {
  if (status === "loading") {
    return (
      <div className={className} data-testid="region-loading" aria-busy="true">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-lg border border-slate-200 shadow-sm"
            >
              <Skeleton className="aspect-[4/3] w-full rounded-none" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (status === "empty") {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-3 py-16 text-center ${className ?? ""}`}
        data-testid="region-empty"
      >
        <SearchX className="h-10 w-10 text-slate-400" aria-hidden="true" />
        <div>
          <p className="text-lg font-semibold text-slate-900">{emptyTitle}</p>
          <p className="mt-1 text-sm text-slate-500">{emptyDescription}</p>
        </div>
        {emptyAction}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-3 py-16 text-center ${className ?? ""}`}
        data-testid="region-error"
        role="alert"
      >
        <AlertCircle className="h-10 w-10 text-red-500" aria-hidden="true" />
        <div>
          <p className="text-lg font-semibold text-slate-900">Failed to load</p>
          <p className="mt-1 text-sm text-slate-500">{errorDescription}</p>
        </div>
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            <Loader2 aria-hidden="true" />
            <span>Try again</span>
          </Button>
        )}
      </div>
    );
  }

  // content
  return <div className={className}>{children}</div>;
}

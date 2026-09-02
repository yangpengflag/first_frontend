import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { buildQuery } from "@/lib/places/url";

interface Props {
  basePath: string;
  baseQuery: Record<string, string | undefined>;
  page: number;
  totalPages: number;
}

/** 服务端友好的分页：纯 `<Link>` 拼接 query，无需客户端 JS。 */
export function Pagination({ basePath, baseQuery, page, totalPages }: Props) {
  if (totalPages <= 1) return null;

  const hrefFor = (p: number) =>
    `${basePath}${buildQuery(baseQuery, { page: p <= 1 ? undefined : String(p) })}`;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav
      aria-label="Pagination"
      className="mt-10 flex items-center justify-center gap-2"
    >
      <PageLink href={hrefFor(page - 1)} disabled={page <= 1} aria-label="上一页">
        <ChevronLeft className="h-4 w-4" />
      </PageLink>
      {pages.map((p) => (
        <PageLink key={p} href={hrefFor(p)} active={p === page} aria-label={`第 ${p} 页`}>
          {p}
        </PageLink>
      ))}
      <PageLink href={hrefFor(page + 1)} disabled={page >= totalPages} aria-label="下一页">
        <ChevronRight className="h-4 w-4" />
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  active,
  disabled,
  children,
  ...rest
}: {
  href: string;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  "aria-label"?: string;
}) {
  const className = cn(
    "inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-3 text-sm transition-colors",
    active
      ? "border-blue-700 bg-blue-700 text-white"
      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    disabled && "pointer-events-none opacity-40"
  );

  if (disabled) {
    return (
      <span className={className} aria-disabled="true">
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={className} {...rest}>
      {children}
    </Link>
  );
}

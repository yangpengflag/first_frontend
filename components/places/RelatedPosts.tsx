import Link from "next/link";
import { ExternalLink } from "lucide-react";

import type { RelatedPost } from "@/lib/places/types";

/** 详情页"相关攻略"占位区（真实聚合待 post-location-tagging）。 */
export function RelatedPosts({
  related,
  title = "相关攻略 / Related Posts",
}: {
  related: RelatedPost[];
  title?: string;
}) {
  if (related.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      <ul className="mt-4 space-y-2">
        {related.map((p) => (
          <li key={p.id}>
            <Link
              href="/posts"
              className="group flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 transition-colors hover:bg-slate-50"
            >
              <span className="font-medium text-blue-700 group-hover:text-blue-800">{p.title}</span>
              <ExternalLink className="h-4 w-4 text-slate-400" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

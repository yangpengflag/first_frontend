import Link from "next/link";
import { MapPin } from "lucide-react";

/** 列表/详情的空结果态：图标 + 引导文案 + 清除筛选 CTA（满足四态覆盖）。 */
export function EmptyState({
  title,
  description,
  href,
  cta = "清除筛选",
}: {
  title: string;
  description?: string;
  href: string;
  cta?: string;
}) {
  return (
    <div className="mt-16 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/50 px-6 py-20 text-center">
      <MapPin className="h-10 w-10 text-slate-300" aria-hidden="true" />
      <p className="mt-4 text-lg font-medium text-slate-700">{title}</p>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      <Link
        href={href}
        className="mt-6 inline-flex items-center gap-1 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800"
      >
        {cta}
      </Link>
    </div>
  );
}

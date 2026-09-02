import Link from "next/link";
import { Eye, ImageIcon, MapPin, Star } from "lucide-react";

import type { Spot } from "@/lib/places/types";
import { SPOT_CATEGORY_LABELS } from "@/lib/places/labels";

export function SpotCard({ spot }: { spot: Spot }) {
  const href = `/spots/${spot.slug}`;
  const cityName = spot.cityName ?? spot.citySlug;
  const category = SPOT_CATEGORY_LABELS[spot.category];
  const ariaLabel = `${spot.nameEn} ${spot.nameZh}, ${cityName}`;

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className="group block focus-visible:outline-none"
    >
      <article className="h-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-lg group-focus-visible:ring-2 group-focus-visible:ring-blue-600">
        <div
          className="relative aspect-[4/3] bg-slate-100 bg-cover bg-center"
          style={spot.coverImage ? { backgroundImage: `url(${spot.coverImage})` } : undefined}
        >
          {!spot.coverImage && (
            <div
              aria-hidden="true"
              className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-50 via-slate-50 to-blue-100 text-slate-300"
            >
              <ImageIcon className="h-10 w-10" />
            </div>
          )}
          {spot.hiddenGem && (
            <span className="absolute left-3 top-3 rounded-full bg-emerald-600/90 px-2 py-0.5 text-xs font-medium text-white">
              Hidden Gem
            </span>
          )}
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-semibold text-slate-900 transition-colors group-hover:text-blue-700">
              {spot.nameEn}
            </h3>
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
              {category.en}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-slate-500">
            {spot.nameZh} <span aria-hidden="true">·</span> {cityName}
          </p>

          {spot.summaryEn && (
            <p className="mt-2 line-clamp-2 text-sm text-slate-600">{spot.summaryEn}</p>
          )}

          <div className="mt-3 flex items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              {cityName}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" aria-hidden="true" />
              {spot.viewCount.toLocaleString()}
            </span>
            {spot.rating != null && (
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4" aria-hidden="true" />
                {spot.rating.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}

export default SpotCard;

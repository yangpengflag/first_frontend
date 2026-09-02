import Link from "next/link";
import { ImageIcon, MapPin } from "lucide-react";

import type { City } from "@/lib/places/types";

export function CityCard({ city }: { city: City }) {
  const href = `/cities/${city.slug}`;
  const ariaLabel = `${city.name} ${city.nameZh}`;

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className="group block focus-visible:outline-none"
    >
      <article className="h-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-lg group-focus-visible:ring-2 group-focus-visible:ring-blue-600">
        <div
          className="aspect-[4/3] bg-slate-100 bg-cover bg-center"
          style={city.coverImage ? { backgroundImage: `url(${city.coverImage})` } : undefined}
        >
          {!city.coverImage && (
            <div
              aria-hidden="true"
              className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-50 via-slate-50 to-blue-100 text-slate-300"
            >
              <ImageIcon className="h-10 w-10" />
            </div>
          )}
        </div>

        <div className="p-5">
          <h3 className="text-lg font-semibold text-slate-900 transition-colors group-hover:text-blue-700">
            {city.name}
          </h3>
          <p className="mt-0.5 text-sm text-slate-500">{city.nameZh}</p>

          {city.description && (
            <p className="mt-2 line-clamp-2 text-sm text-slate-600">{city.description}</p>
          )}

          <div className="mt-3 flex items-center gap-1 text-sm text-slate-500">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            <span>
              {city.spotCount} {city.spotCount === 1 ? "spot" : "spots"}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

export default CityCard;

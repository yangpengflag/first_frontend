import Link from "next/link";
import { ArrowLeft, CalendarDays } from "lucide-react";

import type { City, Spot, RelatedPost } from "@/lib/places/types";
import { SpotCard } from "@/components/places/SpotCard";
import { RelatedPosts } from "@/components/places/RelatedPosts";

export function CityDetail({
  city,
  spots,
  related,
}: {
  city: City;
  spots: Spot[];
  related: RelatedPost[];
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-3xl px-8 py-16 sm:px-12 lg:px-16">
        <Link
          href="/cities"
          className="mb-6 inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-800"
        >
          <ArrowLeft className="h-4 w-4" />
          返回城市列表
        </Link>

        <h1 className="text-3xl font-bold text-slate-900 lg:text-4xl">{city.name}</h1>
        <p className="mt-1 text-lg text-slate-500">{city.nameZh}</p>

        <div
          className="mt-6 aspect-[16/9] w-full rounded-xl border border-slate-200 bg-slate-100 bg-cover bg-center"
          style={city.coverImage ? { backgroundImage: `url(${city.coverImage})` } : undefined}
        />

        <section className="mt-8">
          <p className="whitespace-pre-line text-slate-700">{city.description}</p>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          {city.bestSeason && (
            <div>
              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <CalendarDays className="h-4 w-4 text-slate-400" aria-hidden="true" />
                最佳季节 / Best season
              </div>
              <div className="mt-1 text-slate-600">{city.bestSeason}</div>
            </div>
          )}
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-bold text-slate-900">
            下属景点 / Spots in {city.name}
          </h2>
          {spots.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">该城市暂无收录景点。</p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {spots.map((s) => (
                <SpotCard key={s.slug} spot={s} />
              ))}
            </div>
          )}
        </section>

        <RelatedPosts related={related} />
      </div>
    </div>
  );
}

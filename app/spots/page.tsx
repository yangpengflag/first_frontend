import { filterSpots, listCityOptions, listSpotTags } from "@/lib/places";

// 数据来自真实后端 api-spots，按请求动态渲染。
export const dynamic = "force-dynamic";
import { SpotCard } from "@/components/places/SpotCard";
import { SpotFilters } from "@/components/places/SpotFilters";
import { Pagination } from "@/components/places/Pagination";
import { EmptyState } from "@/components/places/EmptyState";

export const metadata = { title: "景点探索 · WanderChina" };

const SIZE = 6;

type SearchParams = Record<string, string | string[] | undefined>;

export default async function SpotsPage({ searchParams }: { searchParams: SearchParams }) {
  const get = (k: string) =>
    typeof searchParams[k] === "string" ? (searchParams[k] as string) : undefined;

  const city = get("city");
  const category = get("category");
  const tag = get("tag");
  const q = get("q");
  const sort = get("sort") === "hidden" ? "hidden" : "popular";
  const page = Math.max(1, Number(get("page")) || 1);

  const result = await filterSpots({ city, category, tag, q, sort, page, size: SIZE });
  const cities = listCityOptions();
  const tags = listSpotTags();
  const initialQuery: Record<string, string | undefined> = {
    city,
    category,
    tag,
    q,
    sort: sort === "popular" ? undefined : sort,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-5xl px-8 py-16 sm:px-12 lg:px-16">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-slate-900 lg:text-4xl">
            景点探索 <span className="font-normal text-slate-400">/ Spots</span>
          </h1>
          <p className="mt-3 text-base text-slate-500">
            发现值得专程前往的景点与隐藏小众目的地
          </p>
        </header>

        <SpotFilters cities={cities} tags={tags} initialQuery={initialQuery} />

        {result.items.length === 0 ? (
          <EmptyState
            title="没有符合条件的景点"
            description="试着放宽筛选条件或更换关键词"
            href="/spots"
          />
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((s) => (
              <SpotCard key={s.slug} spot={s} />
            ))}
          </div>
        )}

        <Pagination
          basePath="/spots"
          baseQuery={initialQuery}
          page={result.page}
          totalPages={result.totalPages}
        />
      </div>
    </div>
  );
}

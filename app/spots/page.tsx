import { filterSpots, listCityOptions, listSpotTags } from "@/lib/places";

// 数据来自真实后端 api-spots，按请求动态渲染。
export const dynamic = "force-dynamic";
import { SpotFilters } from "@/components/places/SpotFilters";
import { SpotInfiniteList } from "@/components/places/SpotInfiniteList";

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
  const cities = await listCityOptions();
  const tags = await listSpotTags();
  const initialQuery: Record<string, string | undefined> = {
    city,
    category,
    tag,
    q,
    sort: sort === "popular" ? undefined : sort,
  };

  const queryKey = [city, category, tag, q, sort].filter(Boolean).join("|") || "all";

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

        <SpotInfiniteList
          key={queryKey}
          initialItems={result.items}
          initialHasMore={result.total > result.page * SIZE}
          initialPage={result.page}
          initialQuery={{ city, category, tag, q, sort: sort === "popular" ? undefined : sort }}
        />
      </div>
    </div>
  );
}

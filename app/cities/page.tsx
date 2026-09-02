import { filterCities } from "@/lib/places";

// 数据来自真实后端 api-spots，按请求动态渲染。
export const dynamic = "force-dynamic";
import { CityCard } from "@/components/places/CityCard";
import { Pagination } from "@/components/places/Pagination";
import { EmptyState } from "@/components/places/EmptyState";

export const metadata = { title: "目的地城市 · WanderChina" };

const SIZE = 6;

type SearchParams = Record<string, string | string[] | undefined>;

export default async function CitiesPage({ searchParams }: { searchParams: SearchParams }) {
  const get = (k: string) =>
    typeof searchParams[k] === "string" ? (searchParams[k] as string) : undefined;

  const page = Math.max(1, Number(get("page")) || 1);

  const result = await filterCities({ page, size: SIZE });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-5xl px-8 py-16 sm:px-12 lg:px-16">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-slate-900 lg:text-4xl">
            目的地城市 <span className="font-normal text-slate-400">/ Cities</span>
          </h1>
          <p className="mt-3 text-base text-slate-500">探索中国各大目的地城市</p>
        </header>

        {result.items.length === 0 ? (
          <EmptyState
            title="暂无城市数据"
            description="城市数据尚未导入，请稍后再来"
            href="/"
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((c) => (
              <CityCard key={c.slug} city={c} />
            ))}
          </div>
        )}

        <Pagination
          basePath="/cities"
          baseQuery={{}}
          page={result.page}
          totalPages={result.totalPages}
        />
      </div>
    </div>
  );
}

/**
 * 城市目的地面板插槽（4–6 张城市卡片）。
 * 按 name 升序取 Top N 城市榜（city-module 精简后无 featured 信号）。
 * 纯展示组件：数据由页面级 Server Component 经真实 fetch 拉取后传入。
 */
import type { City } from "@/lib/places/types";
import { CityCard } from "@/components/places/CityCard";

export default function CityGridSlot({ cities }: { cities: City[] }) {
  return (
    <section data-region="city-grid" aria-label="Explore Cities">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <header className="mb-6">
          <h2 className="text-3xl font-bold text-slate-900">
            探索城市 <span className="font-normal text-slate-400">/ Explore Cities</span>
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Gateway cities to your China adventure
          </p>
        </header>

        {cities.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-500">
            No destinations yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cities.map((city) => (
              <CityCard key={city.slug} city={city} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

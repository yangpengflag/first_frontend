/**
 * 小众精选 / Hidden Gems 区块插槽（承接"景点模块"入口）。
 * 按 project.md 的 Hidden Spot 语义：优先 hiddenGem，不足补 featured。
 * 纯展示组件：数据由页面级 Server Component 经真实 fetch 拉取后传入。
 */
import type { Spot } from "@/lib/places/types";
import { SpotCard } from "@/components/places/SpotCard";

export default function HotSpotsSlot({ spots }: { spots: Spot[] }) {
  return (
    <section data-region="hot-spots" aria-label="Hidden Gems">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <header className="mb-6">
          <h2 className="text-3xl font-bold text-slate-900">
            小众推荐 <span className="font-normal text-slate-400">/ Hidden Gems</span>
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Off-the-beaten-path spots worth the detour
          </p>
        </header>

        {spots.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-500">
            No hidden gems curated yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {spots.map((spot) => (
              <SpotCard key={spot.slug} spot={spot} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

import HeroSlot from "./regions/HeroSlot";
import FeatureNavSlot from "./regions/FeatureNavSlot";
import CityGridSlot from "./regions/CityGridSlot";
import HotPostsSlot from "./regions/HotPostsSlot";
import HotSpotsSlot from "./regions/HotSpotsSlot";
import { getTopCities, getTopSpots } from "@/lib/places";

// 数据来自真实后端 api-spots，按请求动态渲染（避免构建期静态预渲染触发网络请求）。
export const dynamic = "force-dynamic";

export default async function Home() {
  const [cities, spots] = await Promise.all([getTopCities(6), getTopSpots(6)]);
  return (
    <main>
      <HeroSlot />
      <FeatureNavSlot />
      <CityGridSlot cities={cities} />
      <HotPostsSlot />
      <HotSpotsSlot spots={spots} />
    </main>
  );
}

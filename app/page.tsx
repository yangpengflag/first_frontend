import HeroSlot from "./regions/HeroSlot";
import FeatureNavSlot from "./regions/FeatureNavSlot";
import CityGridSlot from "./regions/CityGridSlot";
import HotPostsSlot from "./regions/HotPostsSlot";
import HotSpotsSlot from "./regions/HotSpotsSlot";

export default function Home() {
  return (
    <main>
      <HeroSlot />
      <FeatureNavSlot />
      <CityGridSlot />
      <HotPostsSlot />
      <HotSpotsSlot />
    </main>
  );
}

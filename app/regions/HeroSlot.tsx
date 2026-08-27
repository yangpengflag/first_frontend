import { HomeHero } from "@/components/homepage/home-hero";

/**
 * 首页首屏区块插槽。
 * `homepage-hero` 已实装并联调，故此处挂载真实 Hero；
 * 其余区块 Slot 保持空占位，待各自 change 填充。
 */
export default function HeroSlot() {
  return (
    <section data-region="hero" aria-label="hero placeholder">
      <HomeHero />
    </section>
  );
}

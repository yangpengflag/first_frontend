import { HomepageLayout } from "@/components/homepage/homepage-layout";
import { HomeHero } from "@/components/homepage/home-hero";

export default function Home() {
  return <HomepageLayout hero={<HomeHero />} />;
}

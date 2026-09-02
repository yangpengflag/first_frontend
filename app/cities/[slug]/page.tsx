import { notFound } from "next/navigation";

import { getCityBySlug, getSpotsByCity, getRelatedPostsForCity } from "@/lib/places";
import { CityDetail } from "./_components/CityDetail";

// 数据来自真实后端 api-spots，按请求动态渲染。
export const dynamic = "force-dynamic";

export const metadata = { title: "城市详情 · WanderChina" };

export default async function CityPage({ params }: { params: { slug: string } }) {
  const city = await getCityBySlug(params.slug);
  if (!city) notFound();

  const spots = await getSpotsByCity(params.slug);
  const related = getRelatedPostsForCity(params.slug);
  return <CityDetail city={city} spots={spots} related={related} />;
}

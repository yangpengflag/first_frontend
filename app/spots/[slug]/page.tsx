import { notFound } from "next/navigation";

import { getSpotBySlug, getSpotNeighbors, getRelatedPostsForSpot } from "@/lib/places";
import { SpotDetail } from "./_components/SpotDetail";

// 数据来自真实后端 api-spots，按请求动态渲染。
export const dynamic = "force-dynamic";

export const metadata = { title: "景点详情 · WanderChina" };

export default async function SpotPage({ params }: { params: { slug: string } }) {
  const spot = await getSpotBySlug(params.slug);
  if (!spot) notFound();

  const neighbors = await getSpotNeighbors(params.slug);
  const related = getRelatedPostsForSpot(params.slug);
  return <SpotDetail spot={spot} neighbors={neighbors} related={related} />;
}

"use client";

import { Hero } from "@/components/homepage/hero";

// 占位回调：真实搜索/AI 路由由后续 search/ai change 实现
function handleSearch(query: string) {
  // TODO: navigate to /search?q=... or call AI assistant
  console.log("search query:", query);
}

/** 首页 Hero 客户端包装：承载 onSearch 交互，供 Server Component 的 page 通过插槽传入。 */
export function HomeHero() {
  return (
    <Hero
      backgroundImageUrl="https://picsum.photos/1920/1080"
      onSearch={handleSearch}
    />
  );
}

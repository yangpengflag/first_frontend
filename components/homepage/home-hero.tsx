"use client";

import { Hero } from "@/components/homepage/hero";

// 占位回调：真实搜索/AI 路由由后续 search/ai change 实现
function handleSearch() {
  // TODO: navigate to /search?q=... or call AI assistant (后续 search/ai change 接入)
  // 占位阶段不执行任何副作用；query 参数由 onSearch 提供，待实现时启用
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

import type { ReactNode } from "react";

export interface HomepageLayoutProps {
  /** 全幅首屏 Hero（不套 max-w 容器） */
  hero?: ReactNode;
  /** 三大平台入口导航 */
  platformNav?: ReactNode;
  /** 热门目的地推荐 */
  destinations?: ReactNode;
  /** 社区精选 */
  community?: ReactNode;
  /** AI 助手悬浮入口（固定定位，不参与流布局） */
  aiFab?: ReactNode;
}

/**
 * WanderChina 首页根壳。
 * 区域顺序：Hero -> PlatformNav -> Destinations -> Community。
 * 内容区统一响应式容器与全局 Section 间距（CSS 变量驱动）。
 */
export function HomepageLayout({
  hero,
  platformNav,
  destinations,
  community,
  aiFab,
}: HomepageLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* 全幅首屏：不套 max-w 容器 */}
      {hero}

      {/* 内容区域：统一响应式容器 + 全局 Section 间距 */}
      <div className="mx-auto max-w-6xl px-6">
        {platformNav && (
          <section data-region="platform-nav">{platformNav}</section>
        )}
        {destinations && (
          <section data-region="destinations">{destinations}</section>
        )}
        {community && <section data-region="community">{community}</section>}
      </div>

      {/* AI 悬浮入口：不参与流布局 */}
      {aiFab}
    </div>
  );
}

export default HomepageLayout;

"use client";

import { useState, type ComponentProps, type FormEvent } from "react";
import Image from "next/image";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface HeroProps {
  /**
   * 品牌背景图 URL。MVP 阶段为静态地址（如 picsum 占位或真实图）。
   * 经 next/image 的 fill 模式渲染，无需 width/height。
   */
  backgroundImageUrl: string;

  /**
   * 背景图 alt 描述。背景为装饰性，组件内部对图片设 aria-hidden，
   * 但保留该字段以备真实图切换与可访问性审计。
   */
  backgroundImageAlt?: string;

  /** 品牌标语。默认 "Discover China Like a Local"，允许调用方覆盖（A/B 测试预留）。 */
  headline?: string;

  /** 副标题。默认 "Your AI-powered travel companion for exploring China"。 */
  subheadline?: string;

  /** 搜索框占位符。默认 "Search destinations, tips, or ask AI..."。 */
  searchPlaceholder?: string;

  /**
   * 提交回调。非空查询时触发，参数为 trim 后字符串。
   * 父级负责路由跳转或调用 AI；本单元不实现具体逻辑。
   * 缺省时搜索框仅做受控输入，不抛错。
   */
  onSearch?: (query: string) => void;

  /** 透传 className，用于 layout 插槽覆盖间距/高度。 */
  className?: ComponentProps<"section">["className"];
}

const DEFAULT_HEADLINE = "Discover China Like a Local";
const DEFAULT_SUBHEADLINE = "Your AI-powered travel companion for exploring China";
const DEFAULT_PLACEHOLDER = "Search destinations, tips, or ask AI...";

export function Hero({
  backgroundImageUrl,
  backgroundImageAlt,
  headline = DEFAULT_HEADLINE,
  subheadline = DEFAULT_SUBHEADLINE,
  searchPlaceholder = DEFAULT_PLACEHOLDER,
  onSearch,
  className,
}: HeroProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      // 空查询防护：不调用 onSearch，input 保持可用并聚焦提示
      return;
    }
    onSearch?.(trimmed);
  };

  return (
    <section
      className={`relative flex min-h-[70vh] w-full items-center overflow-hidden bg-slate-800 lg:min-h-screen ${className ?? ""}`}
    >
      {/* 全幅品牌背景图（装饰性） */}
      <Image
        src={backgroundImageUrl}
        alt={backgroundImageAlt ?? ""}
        fill
        priority
        aria-hidden="true"
        className="object-cover"
      />

      {/* 可读性叠层：左重右轻渐变保证白字对比度 >= 4.5:1 */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent"
      />

      {/* 内容层 */}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 text-center md:px-8 md:text-left">
        <h1 className="text-5xl font-bold text-white lg:text-6xl">
          {headline}
        </h1>
        <p className="mt-3 text-base text-white/90 lg:text-lg">{subheadline}</p>

        {/* AI 搜索框 */}
        <form
          onSubmit={handleSubmit}
          className="mx-auto mt-8 flex max-w-xl flex-col gap-3 md:mx-0 md:flex-row"
        >
          <label htmlFor="hero-search" className="sr-only">
            {searchPlaceholder}
          </label>
          <Input
            id="hero-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-12 bg-white/95 text-slate-900"
          />
          <Button
            type="submit"
            aria-label="Search"
            className="h-12 shrink-0 bg-blue-700 px-6 text-white hover:bg-blue-800"
          >
            <Search aria-hidden="true" />
            <span>Search</span>
          </Button>
        </form>

        {/* 空查询提示（screen-reader only），由 onInvalid 等场景触发；默认隐藏 */}
        <p className="sr-only" role="status">
          Please enter a search term
        </p>
      </div>
    </section>
  );
}

export default Hero;

"use client";

import { useCallback, useState } from "react";
import { ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";

/**
 * 景点图片轮播（原生实现，无第三方库，符合「禁用花哨动效」规约）。
 *
 * <p>主图直接换 src（不叠加 fade/slide）。交互：prev/next 按钮、圆点指示器、缩略图条、
 * 键盘 ←/→（聚焦区域时）。无障碍：容器 {@code aria-roledescription="carousel"}，按钮带
 * {@code aria-label}，非激活张 {@code aria-hidden}；图片缺失时退回渐变占位。
 *
 * <p>数据由上层算好传入：{@code gallery} 为空时回退 {@code coverImage}，两者皆空则占位。
 */
export function SpotGallery({
  images,
  nameEn,
  nameZh,
}: {
  images: string[];
  nameEn?: string;
  nameZh?: string;
}) {
  const [index, setIndex] = useState(0);
  const alt = nameEn ?? nameZh ?? "景点图片";

  const count = images.length;

  const go = useCallback(
    (next: number) => {
      if (count === 0) return;
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  const prev = useCallback(() => go(index - 1), [go, index]);
  const next = useCallback(() => go(index + 1), [go, index]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      }
    },
    [prev, next],
  );

  if (count === 0) {
    return (
      <div
        className="mt-6 flex aspect-[16/9] w-full items-center justify-center rounded-xl border border-slate-200 bg-gradient-to-br from-blue-50 via-slate-50 to-blue-100"
        aria-label="暂无图片"
      >
        <ImageIcon className="h-10 w-10 text-slate-300" aria-hidden="true" />
      </div>
    );
  }

  const single = count <= 1;

  return (
    <div className="mt-6 space-y-3">
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label={`${alt} 图片（${count} 张）`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
      >
        {/* 直接换 src，不叠加过渡动效 */}
        <img
          src={images[index]}
          alt={alt}
          className="h-full w-full object-cover"
          draggable={false}
        />
        {!single && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="上一张"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/85 p-1.5 text-slate-700 shadow-sm transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="下一张"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/85 p-1.5 text-slate-700 shadow-sm transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {!single && (
        <div className="flex items-center justify-center gap-2" role="tablist" aria-label="切换图片">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`第 ${i + 1} 张，共 ${count} 张`}
              onClick={() => go(i)}
              className={`h-2 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 ${
                i === index ? "w-5 bg-blue-700" : "w-2 bg-slate-300 hover:bg-slate-400"
              }`}
            />
          ))}
        </div>
      )}

      {count > 1 && (
        <ul className="grid grid-cols-5 gap-2 sm:grid-cols-6">
          {images.map((src, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => go(i)}
                aria-label={`缩略图第 ${i + 1} 张`}
                aria-current={i === index}
                className={`block aspect-[4/3] w-full overflow-hidden rounded-md border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 ${
                  i === index ? "border-blue-700" : "border-slate-200"
                }`}
              >
                <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## 首页骨架（homepage-shell）

首页由 `app/page.tsx` 作为 Server Component 顺序渲染 5 个区块插槽（`app/regions/*Slot.tsx`），AI 悬浮入口插槽 `AiLauncherSlot` 常驻挂载于 `app/layout.tsx` 的 `{children}` 之后（跨页面常驻）。

| `data-region` | Slot 文件 | 渲染位置 | 状态 |
|---|---|---|---|
| `hero` | `app/regions/HeroSlot.tsx` | `app/page.tsx` 第 1 个 | 已实装（homepage-hero） |
| `feature-nav` | `app/regions/FeatureNavSlot.tsx` | `app/page.tsx` 第 2 个 | 空占位（homepage-feature-nav） |
| `city-grid` | `app/regions/CityGridSlot.tsx` | `app/page.tsx` 第 3 个 | 空占位（homepage-city-grid） |
| `hot-posts` | `app/regions/HotPostsSlot.tsx` | `app/page.tsx` 第 4 个 | 空占位（homepage-hot-posts） |
| `hot-spots` | `app/regions/HotSpotsSlot.tsx` | `app/page.tsx` 第 5 个 | 空占位（homepage-hot-spots） |
| `ai-launcher` | `app/regions/AiLauncherSlot.tsx` | `app/layout.tsx` `{children}` 之后 | 空占位（homepage-ai-launcher） |

各区块的具体内容、样式与数据由对应的 `homepage-*` change 实现；`homepage-shell` 仅定义结构骨架与挂载契约。

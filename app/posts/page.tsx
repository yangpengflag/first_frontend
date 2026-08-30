import Link from "next/link";
import { Plus } from "lucide-react";

import { PostList } from "./_components/PostList";

export const metadata = { title: "旅行攻略 · WanderChina" };

/**
 * 公开帖子列表页（Server Component 外壳）。
 *
 * <p>仅提供标题 / 副标题与「写攻略」入口；数据拉取与四态由
 * 客户端子组件 {@link PostList} 负责（令牌在 localStorage，无法 SSR）。
 */
export default function PostsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 lg:text-4xl">旅行攻略</h1>
            <p className="mt-3 text-base text-slate-500">来自社区的徒步、路线与目的地灵感</p>
          </div>
          <Link
            href="/posts/create"
            className="inline-flex shrink-0 items-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800"
          >
            <Plus className="h-4 w-4" />
            写攻略
          </Link>
        </div>

        <PostList />
      </div>
    </div>
  );
}

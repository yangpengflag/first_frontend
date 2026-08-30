import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PostDetail } from "../_components/PostDetail";

export const metadata = { title: "攻略详情 · WanderChina" };

/**
 * 帖子详情页（Server Component 外壳）。
 *
 * <p>仅提供返回导航；数据与四态由客户端子组件 {@link PostDetail} 负责
 * （令牌在 localStorage，无法 SSR；且 404 需按响应分支）。
 */
export default function PostDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link
          href="/posts"
          className="mb-6 inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-800"
        >
          <ArrowLeft className="h-4 w-4" />
          返回列表
        </Link>
        <PostDetail id={params.id} />
      </div>
    </div>
  );
}

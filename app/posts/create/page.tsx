import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AuthGuard } from "@/components/auth/auth-guard";
import { PostEditor } from "../_components/PostEditor";

export const metadata = { title: "发布攻略 · WanderChina" };

/**
 * 发布页（需登录）。
 *
 * <p>外壳为 Server Component；表单本身由客户端组件 {@link PostEditor} 承载，
 * 未登录用户由 {@link AuthGuard} 重定向至登录页（带 redirect 回跳参数）。
 */
export default function CreatePostPage() {
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
        <h1 className="mb-8 text-3xl font-bold text-slate-900">发布攻略</h1>
        <AuthGuard>
          <PostEditor />
        </AuthGuard>
      </div>
    </div>
  );
}

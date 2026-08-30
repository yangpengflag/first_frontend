import { fetchFromBackend } from "../backend";
import type { VoteResponse, VoteStatsResponse, VoteType } from "./types";

/**
 * 投票 API 的具体调用入口（薄封装）。
 * 传输与错误解析统一委托给 {@link fetchFromBackend}。
 */
export const votesApi = {
  /** 投票统计：需鉴权，返回 UP/DOWN 总数与当前用户投票态。 */
  stats(postId: string) {
    return fetchFromBackend<VoteStatsResponse>(
        `/api/posts/${encodeURIComponent(postId)}/vote/stats`,
    );
  },

  /** 投票（创建 / 切换 / 取消）：需鉴权。 */
  vote(postId: string, voteType: VoteType) {
    return fetchFromBackend<VoteResponse>(`/api/posts/${encodeURIComponent(postId)}/vote`, {
      method: "POST",
      body: JSON.stringify({ vote_type: voteType }),
    });
  },
};

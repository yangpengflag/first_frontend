import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { PostCard } from "./PostCard";

const base = {
  id: "p1",
  title: "Chengdu hikes",
  summary: "A nice trip through Sichuan.",
  status: "PUBLISHED" as const,
  tags: ["hiking", "sichuan"],
  author_name: "Alice",
  author_avatar_url: undefined,
  created_at: "2026-08-30T10:00:00Z",
};

describe("PostCard", () => {
  it("渲染标题、标签、作者、日期并链接到详情", () => {
    render(<PostCard post={base} />);
    const link = screen.getByRole("link", { name: /Chengdu hikes/i });
    expect(link).toHaveAttribute("href", "/posts/p1");
    expect(screen.getByText("hiking")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText(/2026年8月30日/)).toBeInTheDocument();
  });

  it("渲染互动统计（评论/点赞/收藏）", () => {
    render(
        <PostCard
            post={{ ...base, comment_count: 3, up_vote_count: 6, bookmark_count: 2 }}
        />
    );
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("无封面时显示渐变占位", () => {
    render(<PostCard post={base} />);
    expect(screen.getByTestId("cover-placeholder")).toBeInTheDocument();
  });

  it("有封面时不显示占位", () => {
    render(<PostCard post={{ ...base, cover_image_url: "https://example.com/c.jpg" }} />);
    expect(screen.queryByTestId("cover-placeholder")).not.toBeInTheDocument();
  });

  it("作者已删时回退占位名", () => {
    render(<PostCard post={{ ...base, author_name: undefined }} />);
    expect(screen.getByText("[unknown user]")).toBeInTheDocument();
  });
});

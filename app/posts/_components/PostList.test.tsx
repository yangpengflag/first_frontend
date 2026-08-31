import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PostList } from "./PostList";

const listMock = vi.fn();
vi.mock("@/lib/posts/api", () => ({
  postsApi: { list: (...args: unknown[]) => listMock(...args) },
}));

function pageOf(items: unknown[], over: Record<string, unknown> = {}) {
  return {
    items,
    next_cursor: null,
    has_more: false,
    ...over,
  };
}

beforeEach(() => {
  listMock.mockReset();
});

describe("PostList", () => {
  it("loading 时显示骨架屏", () => {
    listMock.mockReturnValue(new Promise(() => {}));
    render(<PostList />);
    expect(screen.getByTestId("post-list-loading")).toBeInTheDocument();
  });

  it("成功时渲染卡片并链接到详情", async () => {
    listMock.mockResolvedValue(
        pageOf([{ id: "1", title: "Chengdu hikes", status: "PUBLISHED" }])
    );
    render(<PostList />);
    const link = await screen.findByRole("link", { name: /Chengdu hikes/i });
    expect(link).toHaveAttribute("href", "/posts/1");
  });

  it("空列表显示引导与 CTA", async () => {
    listMock.mockResolvedValue(pageOf([]));
    render(<PostList />);
    expect(await screen.findByText("还没有攻略")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /发布第一篇/i })).toHaveAttribute(
        "href",
        "/posts/create"
    );
  });

  it("错误态显示文案并提供重试", async () => {
    listMock.mockRejectedValue(new Error("boom"));
    render(<PostList />);
    expect(await screen.findByText("服务异常，请稍后重试")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "重试" }));
    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(2));
  });

  it("非末页时下一页翻页（cursor）", async () => {
    listMock.mockResolvedValue(
        pageOf([{ id: "1", title: "A", status: "PUBLISHED" }], {
          has_more: true,
          next_cursor: "CUR",
        })
    );
    render(<PostList />);
    await screen.findByText("A");
    await userEvent.click(screen.getByRole("button", { name: /下一页/ }));
    await waitFor(() =>
        expect(listMock).toHaveBeenLastCalledWith({ sort: "latest", cursor: "CUR", size: 20 })
    );
  });

  it("切换排序触发对应 sort 参数", async () => {
    listMock.mockResolvedValue(pageOf([{ id: "1", title: "A", status: "PUBLISHED" }]));
    render(<PostList />);
    await screen.findByText("A");
    await userEvent.click(screen.getByRole("button", { name: /最多点赞/ }));
    await waitFor(() =>
        expect(listMock).toHaveBeenLastCalledWith({ sort: "top", size: 20, page: 1 })
    );
  });
});

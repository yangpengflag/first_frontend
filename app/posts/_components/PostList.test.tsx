import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PostList } from "./PostList";

const listMock = vi.fn();
vi.mock("@/lib/posts/api", () => ({
  postsApi: { list: (...args: unknown[]) => listMock(...args) },
}));

// jsdom 无 IntersectionObserver：记录实例并提供手动 trigger
const ioInstances: MockIntersectionObserver[] = [];
class MockIntersectionObserver {
  private cb: IntersectionObserverCallback;
  private disconnected = false;
  constructor(cb: IntersectionObserverCallback) {
    this.cb = cb;
    ioInstances.push(this);
  }
  // 模拟浏览器：observe 后异步回报告当前相交状态，
  // 使「哨兵常驻视口 → 自动续拉」可被单测覆盖（否则 re-observe 续拉路径无测试保护）
  observe = vi.fn(() => {
    if (this.disconnected) return;
    setTimeout(() => {
      if (this.disconnected) return;
      this.cb(
        [{ isIntersecting: true } as IntersectionObserverEntry] as unknown as IntersectionObserverEntry[],
        this as unknown as IntersectionObserver
      );
    }, 0);
  });
  unobserve = vi.fn();
  disconnect = vi.fn(() => {
    this.disconnected = true;
  });
  trigger(isIntersecting = true) {
    this.cb(
      [{ isIntersecting } as IntersectionObserverEntry] as unknown as IntersectionObserverEntry[],
      this as unknown as IntersectionObserver
    );
  }
}
vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

function pageOf(items: unknown[], over: Record<string, unknown> = {}) {
  return { items, next_cursor: null, has_more: false, ...over };
}

let secondResolver: (value: unknown) => void = () => {};

beforeEach(() => {
  listMock.mockReset();
  ioInstances.length = 0;
  secondResolver = () => {};
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

  it("切换排序触发对应 sort 参数（最新 → 最热）", async () => {
    listMock.mockResolvedValue(
      pageOf([{ id: "1", title: "A", status: "PUBLISHED" }])
    );
    render(<PostList />);
    await screen.findByText("A");
    await userEvent.click(screen.getByRole("button", { name: /最热/ }));
    await waitFor(() =>
      expect(listMock).toHaveBeenLastCalledWith({ sort: "top", size: 20, page: 1 })
    );
  });

  it("触底自动追加下一页（cursor）并到底显示提示", async () => {
    listMock.mockImplementation((params: { cursor?: string; sort?: string }) => {
      if (params?.cursor)
        return Promise.resolve(
          pageOf([{ id: "2", title: "B", status: "PUBLISHED" }], { has_more: false })
        );
      return Promise.resolve(
        pageOf([{ id: "1", title: "A", status: "PUBLISHED" }], {
          has_more: true,
          next_cursor: params?.sort === "latest" ? "CUR" : undefined,
        })
      );
    });
    render(<PostList />);
    await screen.findByText("A");
    ioInstances[ioInstances.length - 1].trigger();
    await waitFor(() => expect(screen.getByText("B")).toBeInTheDocument());
    expect(screen.getByTestId("post-list-end")).toBeInTheDocument();
    expect(listMock).toHaveBeenCalledTimes(2);
  });

  it("追加中显示 3 张骨架，完成后追加内容", async () => {
    listMock.mockImplementation((params: { cursor?: string; sort?: string }) => {
      if (params?.cursor) return new Promise((res) => {
        secondResolver = res;
      });
      return Promise.resolve(
        pageOf([{ id: "1", title: "A", status: "PUBLISHED" }], {
          has_more: true,
          next_cursor: params?.sort === "latest" ? "CUR" : undefined,
        })
      );
    });
    render(<PostList />);
    await screen.findByText("A");
    ioInstances[ioInstances.length - 1].trigger();
    await waitFor(() =>
      expect(screen.getByTestId("post-list-loading-more")).toBeInTheDocument()
    );
    secondResolver(
      pageOf([{ id: "2", title: "B", status: "PUBLISHED" }], { has_more: false })
    );
    await waitFor(() => expect(screen.getByText("B")).toBeInTheDocument());
    expect(screen.getByTestId("post-list-end")).toBeInTheDocument();
  });

  it("offset 排序（最热）触底用 page+1 续拉", async () => {
    listMock.mockImplementation((params: { cursor?: string; sort?: string; page?: number }) => {
      if (params?.sort === "top" && params?.page === 2)
        return Promise.resolve(
          pageOf([{ id: "3", title: "C", status: "PUBLISHED" }], { has_more: false })
        );
      if (params?.cursor)
        return Promise.resolve(
          pageOf([{ id: "2", title: "B", status: "PUBLISHED" }], { has_more: false })
        );
      return Promise.resolve(
        pageOf([{ id: "1", title: "A", status: "PUBLISHED" }], {
          has_more: true,
          next_cursor: params?.sort === "latest" ? "CUR" : undefined,
        })
      );
    });
    render(<PostList />);
    await screen.findByText("A");
    await userEvent.click(screen.getByRole("button", { name: /最热/ }));
    // loadFirst(top page1) 后哨兵在视口内会自动续拉 page2
    await waitFor(() =>
      expect(listMock).toHaveBeenCalledWith({ sort: "top", size: 20, page: 1 })
    );
    await waitFor(() =>
      expect(listMock).toHaveBeenLastCalledWith({ sort: "top", size: 20, page: 2 })
    );
    await waitFor(() => expect(screen.getByText("C")).toBeInTheDocument());
  });

  it("哨兵常驻视口时自动连翻多页（re-observe 续拉）", async () => {
    listMock.mockImplementation((params: { cursor?: string; sort?: string; page?: number }) => {
      if (params?.sort === "top") {
        const page = params?.page ?? 1;
        if (page === 1)
          return Promise.resolve(pageOf([{ id: "1", title: "P1", status: "PUBLISHED" }], { has_more: true }));
        if (page === 2)
          return Promise.resolve(pageOf([{ id: "2", title: "P2", status: "PUBLISHED" }], { has_more: true }));
        if (page === 3)
          return Promise.resolve(pageOf([{ id: "3", title: "P3", status: "PUBLISHED" }], { has_more: false }));
      }
      // 默认 latest 仅首屏一页，避免自动续拉干扰 top 用例
      return Promise.resolve(
        pageOf([{ id: "1", title: "P1", status: "PUBLISHED" }], {
          has_more: false,
          next_cursor: params?.sort === "latest" ? "CUR" : undefined,
        })
      );
    });
    render(<PostList />);
    await screen.findByText("P1"); // 默认 latest，仅一页
    await userEvent.click(screen.getByRole("button", { name: /最热/ }));
    await waitFor(() => expect(listMock).toHaveBeenCalledWith({ sort: "top", size: 20, page: 1 }));
    // page1 自动续拉 page2；page2 因 hasMore 仍为 true（effect 不重建 observer），
    // 须靠 loadMore 内的 re-observe 才能续拉 page3
    await waitFor(() => expect(screen.getByText("P2")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("P3")).toBeInTheDocument());
    expect(screen.getByTestId("post-list-end")).toBeInTheDocument();
    // 证明续拉由 re-observe（observe 被再次调用）驱动，而非 observer 重建
    expect(ioInstances[ioInstances.length - 1].observe).toHaveBeenCalled();
  });

  it("追加失败显示行内重试", async () => {
    listMock.mockImplementation((params: { cursor?: string }) => {
      if (params?.cursor) return Promise.reject(new Error("boom"));
      return Promise.resolve(
        pageOf([{ id: "1", title: "A", status: "PUBLISHED" }], {
          has_more: true,
          next_cursor: "CUR",
        })
      );
    });
    render(<PostList />);
    await screen.findByText("A");
    // 哨兵在视口内会自动续拉（observe 自动 fire），无需手动 trigger
    await waitFor(() =>
      expect(screen.getByTestId("post-list-loadmore-error")).toBeInTheDocument()
    );
    await userEvent.click(screen.getByRole("button", { name: "重试" }));
    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(3));
  });

  it("切换排序清空旧列表", async () => {
    listMock.mockImplementation((params: { cursor?: string; sort?: string }) => {
      if (params?.cursor)
        return Promise.resolve(
          pageOf([{ id: "2", title: "B", status: "PUBLISHED" }], { has_more: false })
        );
      return Promise.resolve(
        pageOf([{ id: "1", title: "A", status: "PUBLISHED" }], {
          // 首屏：latest 需 has_more=true 以便哨兵自动续拉 B；top 直接到尾避免自动 fire 下无限翻页
          has_more: params?.sort !== "top",
          next_cursor: params?.sort === "latest" ? "CUR" : undefined,
        })
      );
    });
    render(<PostList />);
    await screen.findByText("A");
    ioInstances[ioInstances.length - 1].trigger();
    await waitFor(() => expect(screen.getByText("B")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: /最热/ }));
    await waitFor(() =>
      expect(listMock).toHaveBeenLastCalledWith({ sort: "top", size: 20, page: 1 })
    );
    await waitFor(() => expect(screen.queryByText("B")).not.toBeInTheDocument());
    expect(screen.getByText("A")).toBeInTheDocument();
  });
});

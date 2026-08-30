import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AuthApiError } from "@/lib/auth/types";
import { PostEditor } from "./PostEditor";

const createMock = vi.fn();
const pushMock = vi.fn();

vi.mock("@/lib/posts/api", () => ({
  postsApi: { create: (...args: unknown[]) => createMock(...args) },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));
vi.mock("@uiw/react-md-editor", () => ({
  default: ({
    value,
    onChange,
  }: {
    value: string;
    onChange?: (v?: string) => void;
  }) => (
    <textarea
      data-testid="md"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));

beforeEach(() => {
  createMock.mockReset();
  pushMock.mockReset();
});

describe("PostEditor", () => {
  it("校验失败时不提交", async () => {
    render(<PostEditor />);
    await userEvent.click(screen.getByRole("button", { name: "发布" }));
    expect(await screen.findByText("标题不能为空")).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("发布成功跳转详情", async () => {
    createMock.mockResolvedValue({ id: "new1", title: "My trip", status: "PUBLISHED" });
    render(<PostEditor />);
    await userEvent.type(screen.getByPlaceholderText(/给你的攻略起个名字/), "My trip");
    await userEvent.type(screen.getByTestId("md"), "# hello");
    await userEvent.type(screen.getByPlaceholderText(/输入标签后回车/), "hiking{Enter}");
    await userEvent.click(screen.getByRole("button", { name: "发布" }));

    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    expect(createMock).toHaveBeenCalledWith({
      title: "My trip",
      content: "# hello",
      coverImageUrl: undefined,
      tags: ["hiking"],
      status: "PUBLISHED",
    });
    expect(pushMock).toHaveBeenCalledWith("/posts/new1");
  });

  it("保存草稿设置 DRAFT 状态", async () => {
    createMock.mockResolvedValue({ id: "d1", title: "T", status: "DRAFT" });
    render(<PostEditor />);
    await userEvent.type(screen.getByPlaceholderText(/给你的攻略起个名字/), "T");
    await userEvent.type(screen.getByTestId("md"), "body");
    await userEvent.click(screen.getByRole("button", { name: "保存草稿" }));

    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ status: "DRAFT" }));
  });

  it("后端校验失败回填字段错误", async () => {
    createMock.mockRejectedValue(
        new AuthApiError(400, "VALIDATION_FAILED", ["title: 太长了"])
    );
    render(<PostEditor />);
    await userEvent.type(screen.getByPlaceholderText(/给你的攻略起个名字/), "x");
    await userEvent.type(screen.getByTestId("md"), "body");
    await userEvent.click(screen.getByRole("button", { name: "发布" }));

    expect(await screen.findByText("太长了")).toBeInTheDocument();
  });
});

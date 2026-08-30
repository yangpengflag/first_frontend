import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AuthSessionProvider } from "@/lib/auth/session";
import { authApi } from "@/lib/auth/api";
import { tokenStore } from "@/lib/auth/tokens";
import { votesApi } from "@/lib/votes/api";
import { VotePanel } from "./VotePanel";

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
}));
vi.mock("@/lib/auth/tokens", () => ({
  tokenStore: {
    getAccessToken: vi.fn(),
    getRefreshToken: vi.fn(() => null),
    set: vi.fn(),
    clear: vi.fn(),
  },
}));
vi.mock("@/lib/auth/api", () => ({
  authApi: { me: vi.fn(), logout: vi.fn() },
}));
vi.mock("@/lib/votes/api", () => ({
  votesApi: { stats: vi.fn(), vote: vi.fn() },
}));

const MOCK_USER = {
  id: "u1",
  email: "a@b.c",
  status: "ACTIVE",
  display_name: "Me",
  created_at: "2024-01-01T00:00:00Z",
};

function renderWithSession(authenticated: boolean) {
  vi.mocked(tokenStore.getAccessToken).mockReturnValue(authenticated ? "tok" : null);
  vi.mocked(authApi.me).mockResolvedValue(MOCK_USER as never);
  return render(
      <AuthSessionProvider>
        <VotePanel postId="p1" />
      </AuthSessionProvider>,
  );
}

beforeEach(() => {
  mockPush.mockClear();
  vi.clearAllMocks();
});

describe("VotePanel", () => {
  it("挂载后拉取统计并展示计数与当前投票态", async () => {
    vi.mocked(votesApi.stats).mockResolvedValue({
      up_count: 3,
      down_count: 1,
      user_vote: "UP",
    });
    renderWithSession(true);

    expect(await screen.findByLabelText("赞同")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByLabelText("赞同")).toHaveAttribute("aria-pressed", "true");
  });

  it("点击投票调用 votesApi.vote 并刷新计数", async () => {
    vi.mocked(votesApi.stats).mockResolvedValue({ up_count: 3, down_count: 1, user_vote: "UP" });
    vi.mocked(votesApi.vote).mockResolvedValue({ user_vote: "DOWN", up_count: 3, down_count: 2 });
    const user = userEvent.setup();
    renderWithSession(true);

    await user.click(await screen.findByLabelText("反对"));

    expect(votesApi.vote).toHaveBeenCalledWith("p1", "DOWN");
    await waitFor(() => expect(screen.getByLabelText("反对")).toHaveAttribute("aria-pressed", "true"));
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("统计失败展示错误与重试", async () => {
    vi.mocked(votesApi.stats).mockRejectedValueOnce(new Error("boom"));
    renderWithSession(true);

    expect(await screen.findByText("服务异常，请稍后重试")).toBeInTheDocument();
    expect(votesApi.vote).not.toHaveBeenCalled();
  });

  it("未登录展示中性态，点击投票跳转登录", async () => {
    vi.mocked(votesApi.stats).mockResolvedValue({ up_count: 0, down_count: 0, user_vote: "" });
    const user = userEvent.setup();
    renderWithSession(false);

    const up = await screen.findByLabelText("赞同");
    expect(up).toBeInTheDocument();

    await user.click(up);
    expect(mockPush).toHaveBeenCalledWith("/login?redirect=/posts/p1");
  });
});

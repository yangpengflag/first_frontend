import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthApiError, type UserResponse } from "@/lib/auth/types";

import { LoginForm } from "./login-form";

const { login, setAuthenticated, push } = vi.hoisted(() => ({
  login: vi.fn(),
  setAuthenticated: vi.fn(),
  push: vi.fn(),
}));

vi.mock("@/lib/auth/api", () => ({
  authApi: { login },
}));

// 登录表单只依赖 useAuthSession 的 setAuthenticated，不依赖真实 Provider。
vi.mock("@/lib/auth/session", () => ({
  useAuthSession: () => ({ setAuthenticated }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
}));

const user: UserResponse = {
  id: "u-1",
  email: "a@b.com",
  display_name: "Tester",
  avatar_url: null,
  status: "ACTIVE",
  created_at: "2026-01-01T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("LoginForm", () => {
  it("2.6 登录成功后用响应里的 user 调用 setAuthenticated，再 router.push（回归「登录后头部不切换」bug）", async () => {
    login.mockResolvedValue({
      access_token: "a",
      refresh_token: "r",
      user,
    });

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText("邮箱"), {
      target: { value: "a@b.com" },
    });
    fireEvent.change(screen.getByLabelText("密码"), {
      target: { value: "pw12345678" },
    });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({ email: "a@b.com", password: "pw12345678" });
    });
    await waitFor(() => {
      expect(setAuthenticated).toHaveBeenCalledWith(user);
    });

    // setAuthenticated 必须在 push 之前调用——状态先于导航到位，
    // NavBar 切换才能在软跳转后的首帧就反映「已登录」
    expect(setAuthenticated.mock.invocationCallOrder[0]).toBeLessThan(
      push.mock.invocationCallOrder[0]
    );
    expect(push).toHaveBeenCalledWith("/");
  });

  it("2.6 登录失败时不调用 setAuthenticated、不跳转", async () => {
    login.mockRejectedValue(new AuthApiError(401, "INVALID_CREDENTIALS"));

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText("邮箱"), {
      target: { value: "a@b.com" },
    });
    fireEvent.change(screen.getByLabelText("密码"), {
      target: { value: "wrongpassword" },
    });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    await waitFor(() => {
      expect(login).toHaveBeenCalled();
    });
    expect(setAuthenticated).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    // 表单回到可编辑态（提交按钮恢复「登录」文案）
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "登录" })
      ).not.toBeDisabled();
    });
  });
});
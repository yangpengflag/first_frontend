import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { authApi } from "@/lib/auth/api";
import { AuthApiError } from "@/lib/auth/types";

import { ForgotPasswordForm } from "./forgot-password-form";
import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form";
import { ResetPasswordForm } from "./reset-password-form";
import { VerifyStatus } from "./verify-status";

vi.mock("@/lib/auth/api", () => ({
  authApi: {
    register: vi.fn(),
    login: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerification: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
  },
  tokenStore: { set: vi.fn(), clear: vi.fn(), getAccessToken: vi.fn(), getRefreshToken: vi.fn() },
}));

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
}));

const mocked = vi.mocked(authApi);

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------- 8.3 / 8.4：注册页 ----------

describe("RegisterForm", () => {
  it("submits and then guides the user to verify email", async () => {
    const user = userEvent.setup();
    mocked.register.mockResolvedValue({
      id: "1",
      email: "alice@example.com",
      displayName: "Alice",
      avatarUrl: null,
      status: "EMAIL_UNVERIFIED",
      createdAt: "2026-08-29T00:00:00Z",
    });

    render(<RegisterForm />);

    await user.type(screen.getByLabelText("邮箱"), "alice@example.com");
    await user.type(screen.getByLabelText("昵称"), "Alice");
    await user.type(screen.getByLabelText("密码"), "Str0ng!Pass");
    await user.click(screen.getByRole("button", { name: "注册" }));

    await waitFor(() => {
      expect(screen.getByText("请查收验证邮件")).toBeInTheDocument();
    });
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(mocked.register).toHaveBeenCalledWith({
      email: "alice@example.com",
      password: "Str0ng!Pass",
      displayName: "Alice",
    });
  });

  /** 409 应落在邮箱字段上，比整表单报错更好定位。 */
  it("marks the email field when the address is taken", async () => {
    const user = userEvent.setup();
    mocked.register.mockRejectedValue(new AuthApiError(409, "EMAIL_ALREADY_REGISTERED"));

    render(<RegisterForm />);

    await user.type(screen.getByLabelText("邮箱"), "alice@example.com");
    await user.type(screen.getByLabelText("昵称"), "Alice");
    await user.type(screen.getByLabelText("密码"), "Str0ng!Pass");
    await user.click(screen.getByRole("button", { name: "注册" }));

    expect(await screen.findByText("该邮箱已注册，请直接登录")).toBeInTheDocument();
  });

  it("blocks submission when the password is too short", async () => {
    const user = userEvent.setup();

    render(<RegisterForm />);

    await user.type(screen.getByLabelText("邮箱"), "alice@example.com");
    await user.type(screen.getByLabelText("昵称"), "Alice");
    await user.type(screen.getByLabelText("密码"), "Ab1!");
    await user.click(screen.getByRole("button", { name: "注册" }));

    expect(await screen.findByText(/密码至少 8 个字符/)).toBeInTheDocument();
    expect(mocked.register).not.toHaveBeenCalled();
  });

  it("prevents a duplicate submission while in flight", async () => {
    const user = userEvent.setup();
    let resolve: (value: unknown) => void = () => {};
    mocked.register.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }) as never
    );

    render(<RegisterForm />);

    await user.type(screen.getByLabelText("邮箱"), "alice@example.com");
    await user.type(screen.getByLabelText("昵称"), "Alice");
    await user.type(screen.getByLabelText("密码"), "Str0ng!Pass");
    await user.click(screen.getByRole("button", { name: "注册" }));

    expect(await screen.findByRole("button", { name: "提交中…" })).toBeDisabled();
    resolve({ id: "1", email: "a@b.c", displayName: "A", avatarUrl: null, status: "EMAIL_UNVERIFIED", createdAt: "" });
  });
});

// ---------- 8.5 / 8.6：登录页 ----------

describe("LoginForm", () => {
  async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText("邮箱"), "alice@example.com");
    await user.type(screen.getByLabelText("密码"), "Str0ng!Pass");
    await user.click(screen.getByRole("button", { name: "登录" }));
  }

  it("stores tokens and redirects on success", async () => {
    const user = userEvent.setup();
    mocked.login.mockResolvedValue({
      accessToken: "a",
      refreshToken: "r",
      user: {
        id: "1",
        email: "alice@example.com",
        displayName: "Alice",
        avatarUrl: null,
        status: "ACTIVE",
        createdAt: "2026-08-29T00:00:00Z",
      },
    });

    render(<LoginForm />);
    await fillAndSubmit(user);

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/");
    });
  });

  /** 403 必须给出免鉴权重发出口，否则用户永远出不来。 */
  it("offers a resend action when the email is unverified", async () => {
    const user = userEvent.setup();
    mocked.login.mockRejectedValue(new AuthApiError(403, "EMAIL_NOT_VERIFIED"));
    mocked.resendVerification.mockResolvedValue(undefined);

    render(<LoginForm />);
    await fillAndSubmit(user);

    const resend = await screen.findByRole("button", { name: "重发验证邮件" });
    await user.click(resend);

    await waitFor(() => {
      expect(mocked.resendVerification).toHaveBeenCalledWith("alice@example.com");
    });
  });

  it("shows a countdown when the account is locked", async () => {
    const user = userEvent.setup();
    mocked.login.mockRejectedValue(
      new AuthApiError(423, "ACCOUNT_LOCKED", { retryAfterSeconds: 900 })
    );

    render(<LoginForm />);
    await fillAndSubmit(user);

    expect(await screen.findByText(/账号已被锁定，请 15 分钟后重试/)).toBeInTheDocument();
  });

  /** 不得透露邮箱是否注册过。 */
  it("shows a generic message for bad credentials", async () => {
    const user = userEvent.setup();
    mocked.login.mockRejectedValue(new AuthApiError(401, "INVALID_CREDENTIALS"));

    render(<LoginForm />);
    await fillAndSubmit(user);

    expect(await screen.findByText("邮箱或密码错误")).toBeInTheDocument();
  });

  it("links to the forgot password page", () => {
    render(<LoginForm />);
    expect(screen.getByRole("link", { name: "忘记密码？" })).toHaveAttribute(
      "href",
      "/forgot-password"
    );
  });
});

// ---------- 8.7 / 8.8：忘记密码页 ----------

describe("ForgotPasswordForm", () => {
  it("shows the same outcome regardless of whether the mailbox exists", async () => {
    const user = userEvent.setup();
    mocked.forgotPassword.mockResolvedValue(undefined);

    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText("邮箱"), "nobody@example.com");
    await user.click(screen.getByRole("button", { name: "发送重置链接" }));

    await waitFor(() => {
      expect(screen.getByText("请查收邮件")).toBeInTheDocument();
    });
    // 文案不得断言邮箱存在与否
    expect(screen.getByText(/如果该邮箱已注册/)).toBeInTheDocument();
  });
});

// ---------- 8.11 / 8.12：重置密码页 ----------

describe("ResetPasswordForm", () => {
  it("blocks submission when the two passwords differ", async () => {
    const user = userEvent.setup();

    render(<ResetPasswordForm code="reset-code" />);

    await user.type(screen.getByLabelText("新密码"), "Str0ng!Pass");
    await user.type(screen.getByLabelText("确认新密码"), "An0ther!Pass");
    await user.click(screen.getByRole("button", { name: "更新密码" }));

    expect(await screen.findByText("两次输入的密码不一致")).toBeInTheDocument();
    expect(mocked.resetPassword).not.toHaveBeenCalled();
  });

  it("submits the code together with the new password", async () => {
    const user = userEvent.setup();
    mocked.resetPassword.mockResolvedValue(undefined);

    render(<ResetPasswordForm code="reset-code" />);

    await user.type(screen.getByLabelText("新密码"), "N3w!Passw0rd");
    await user.type(screen.getByLabelText("确认新密码"), "N3w!Passw0rd");
    await user.click(screen.getByRole("button", { name: "更新密码" }));

    await waitFor(() => {
      expect(mocked.resetPassword).toHaveBeenCalledWith("reset-code", "N3w!Passw0rd");
    });
    expect(await screen.findByText("密码已更新")).toBeInTheDocument();
  });
});

// ---------- 8.9 / 8.10：验证结果页 ----------

describe("VerifyStatus", () => {
  it("calls the verification endpoint on mount and reports success", async () => {
    mocked.verifyEmail.mockResolvedValue({
      id: "1",
      email: "alice@example.com",
      displayName: "Alice",
      avatarUrl: null,
      status: "ACTIVE",
      createdAt: "2026-08-29T00:00:00Z",
    });

    render(<VerifyStatus code="verify-code" />);

    expect(screen.getByText("正在验证邮箱…")).toBeInTheDocument();
    expect(await screen.findByText("邮箱验证成功")).toBeInTheDocument();
    expect(mocked.verifyEmail).toHaveBeenCalledWith("verify-code");
  });

  it("reports failure for an invalid or expired code", async () => {
    mocked.verifyEmail.mockRejectedValue(new AuthApiError(400, "INVALID_VERIFICATION_CODE"));

    render(<VerifyStatus code="bad-code" />);

    expect(await screen.findByText("验证失败")).toBeInTheDocument();
  });

  it("fails fast when no code is present", async () => {
    render(<VerifyStatus code={null} />);

    expect(await screen.findByText("验证失败")).toBeInTheDocument();
    expect(mocked.verifyEmail).not.toHaveBeenCalled();
  });
});

// ---------- 8.13：可访问性 ----------

describe("form accessibility", () => {
  it("associates every input with a visible label", () => {
    render(<RegisterForm />);

    for (const label of ["邮箱", "昵称", "密码"]) {
      const input = screen.getByLabelText(label);
      expect(input).toBeInTheDocument();
    }
  });

  it("exposes validation messages to assistive technology", async () => {
    const user = userEvent.setup();

    render(<RegisterForm />);

    await user.type(screen.getByLabelText("邮箱"), "not-an-email");
    await user.type(screen.getByLabelText("昵称"), "Alice");
    await user.type(screen.getByLabelText("密码"), "Str0ng!Pass");
    await user.click(screen.getByRole("button", { name: "注册" }));

    const message = await screen.findByText("邮箱格式不正确");
    expect(message).toBeInTheDocument();
    // shadcn FormMessage 通过 id + aria-describedby 关联到输入框
    const input = screen.getByLabelText("邮箱");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });
});

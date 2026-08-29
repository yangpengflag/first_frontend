import { expect, test, type Page } from "@playwright/test";

/**
 * 认证主流程端到端验证。
 *
 * <p><b>前置条件</b>：后端需运行在 http://localhost:8080
 * （PowerShell：
 * <code>$env:JAVA_HOME="D:\Programs\java17"; & "D:\Programs\maven\bin\mvn.cmd" spring-boot:run</code>）。
 *
 * <p><b>范围说明</b>：MVP 阶段邮件仅写日志、不真实投递，因此无法自动走完
 * 「点击邮件链接完成验证」这一步。本文件覆盖到验证之前为止，
 * 以及未验证用户登录必须给出重发出口这一关键行为。
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
}

/**
 * 返回注册接口的状态码。
 *
 * <p>注意：注册限流为 5 次 / IP / 小时，而本文件在 desktop 与 mobile 两个
 * project 下各跑一遍，累计容易触发 429。这是<b>限流生效的证明</b>而非缺陷，
 * 故由调用方在 429 时显式跳过，避免把限流误报成功能故障。
 */
/**
 * 本文件会反复触发真实的注册 / 登录请求，很容易撞上限流
 * （注册 5 次/IP/小时，登录 10 次/IP/15 分钟）。
 * 限流生效是<b>预期行为</b>，故在此显式跳过，避免把限流误报为功能故障。
 */
async function skipIfRateLimited(
  page: Page,
  test: { skip: (condition: boolean, description: string) => void }
): Promise<void> {
  const limited = await page
    .getByText("操作过于频繁，请稍后再试")
    .isVisible()
    .catch(() => false);
  test.skip(limited, "已触发服务端限流，跳过本次断言");
}

async function registerViaApi(email: string, password: string): Promise<number> {
  const response = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, displayName: "E2E" }),
  });
  return response.status;
}

test.describe("注册页", () => {
  // dev 模式下该路由首次被访问时需现场编译，耗时明显长于后续路由，故放宽超时
  test.slow();

  test("渲染表单并阻止非法邮箱提交", async ({ page }: { page: Page }) => {
    await page.goto("/register");
    // 等 hydration 完成，否则点击可能触发原生提交而非 React handler
    await page.waitForLoadState("networkidle");

    // CardTitle 渲染为 div 而非 heading，故按文本断言
    await expect(page.getByText("创建账号")).toBeVisible();

    await page.getByLabel("邮箱").fill("not-an-email");
    await page.getByLabel("昵称").fill("E2E");
    await page.getByLabel("密码").fill("Str0ng!Pass");
    await page.getByRole("button", { name: "注册" }).click();

    await expect(page.getByText("邮箱格式不正确")).toBeVisible();
  });

  test("注册成功后引导查收验证邮件", async ({ page }: { page: Page }) => {
    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    const email = uniqueEmail("register");
    await page.getByLabel("邮箱").fill(email);
    await page.getByLabel("昵称").fill("E2E");
    await page.getByLabel("密码").fill("Str0ng!Pass");
    await page.getByRole("button", { name: "注册" }).click();
    await skipIfRateLimited(page, test);

    // 注册不签发令牌，必须引导用户去验证邮箱而非直接进首页
    await expect(page.getByText("请查收验证邮件")).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
  });
});

test.describe("登录页", () => {
  test("未知邮箱与错误密码都只给出通用提示", async ({ page }: { page: Page }) => {
    await page.goto("/login");

    await page.getByLabel("邮箱").fill(uniqueEmail("nobody"));
    await page.getByLabel("密码").fill("Wr0ng!Pass");
    await page.getByRole("button", { name: "登录" }).click();
    await skipIfRateLimited(page, test);

    // 不得透露该邮箱是否已注册
    await expect(page.getByText("邮箱或密码错误")).toBeVisible();
  });

  /**
   * 关键路径：未验证用户拿不到令牌，登录页必须内联提供
   * 免鉴权的「重发验证邮件」出口，否则用户被困在 403。
   */
  test("未验证邮箱登录时提供重发验证邮件出口", async ({ page }: { page: Page }) => {
    const email = uniqueEmail("unverified");
    const status = await registerViaApi(email, "Str0ng!Pass");
    test.skip(status === 429, "注册限流已触发（5 次/IP/小时），跳过本次验证");
    expect(status, "注册接口应返回 201").toBe(201);

    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("邮箱").fill(email);
    await page.getByLabel("密码").fill("Str0ng!Pass");
    await page.getByRole("button", { name: "登录" }).click();

    await expect(page.getByText(/该邮箱尚未完成验证/)).toBeVisible();

    const resend = page.getByRole("button", { name: "重发验证邮件" });
    await expect(resend).toBeVisible();
    await resend.click();
    await expect(page.getByRole("button", { name: "已重新发送" })).toBeVisible();
  });

  test("提供忘记密码入口", async ({ page }: { page: Page }) => {
    await page.goto("/login");

    const link = page.getByRole("link", { name: "忘记密码？" });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/forgot-password/);
  });
});

test.describe("忘记密码页", () => {
  test("提交后恒定展示同一结果", async ({ page }: { page: Page }) => {
    await page.goto("/forgot-password");

    await page.getByLabel("邮箱").fill(uniqueEmail("maybe"));
    await page.getByRole("button", { name: "发送重置链接" }).click();

    // 无论邮箱是否存在，结果一致——否则等于泄露账号存在性
    await expect(page.getByText("请查收邮件")).toBeVisible();
    await expect(page.getByText(/如果该邮箱已注册/)).toBeVisible();
  });
});

test.describe("重置密码页", () => {
  test("两次输入不一致时阻止提交", async ({ page }: { page: Page }) => {
    await page.goto("/auth/reset-password?code=dummy-code");

    await page.getByLabel("新密码", { exact: true }).fill("Str0ng!Pass");
    await page.getByLabel("确认新密码").fill("An0ther!Pass");
    await page.getByRole("button", { name: "更新密码" }).click();

    await expect(page.getByText("两次输入的密码不一致")).toBeVisible();
  });

  test("无效或过期的重置码给出失败态而非崩溃", async ({ page }: { page: Page }) => {
    await page.goto("/auth/reset-password?code=definitely-invalid");

    await page.getByLabel("新密码", { exact: true }).fill("N3w!Passw0rd");
    await page.getByLabel("确认新密码").fill("N3w!Passw0rd");
    await page.getByRole("button", { name: "更新密码" }).click();

    await expect(page.getByText("重置链接无效或已过期")).toBeVisible();
  });
});

test.describe("邮箱验证页", () => {
  test("无效验证链接展示失败态与重试入口", async ({ page }: { page: Page }) => {
    await page.goto("/auth/verify?code=definitely-invalid");

    await expect(page.getByText("验证失败")).toBeVisible();
    await expect(page.getByRole("link", { name: "返回注册" })).toBeVisible();
  });
});

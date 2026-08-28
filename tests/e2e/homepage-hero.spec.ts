import { test, expect, type ViewportSize } from "@playwright/test";

const MOBILE = { width: 375, height: 667 };

test.beforeEach(async ({ page }) => {
  // 统一处理页面导航：每个测试前访问首页
  await page.goto("/", { waitUntil: "networkidle" });
});

function isMobile(viewport: ViewportSize | null): boolean {
  return viewport?.width === MOBILE.width && viewport?.height === MOBILE.height;
}

// [S1] WHEN 用户访问首页 `/` THEN 首屏渲染品牌标语/副标题/搜索框与全幅背景图
test("[S1] 首屏渲染品牌标语、副标题、搜索框与全幅背景图", async ({ page }) => {
  await expect(
    page.getByRole("heading", { level: 1, name: /Discover China Like a Local/i })
  ).toBeVisible();
  await expect(
    page.getByText(/Your AI-powered travel companion for exploring China/i)
  ).toBeVisible();

  const input = page.getByPlaceholder(/Search destinations, tips, or ask AI/i);
  await expect(input).toBeVisible();
  await expect(page.getByRole("button", { name: /search/i })).toBeVisible();

  const heroSection = page.locator('section[data-region="hero"] section');
  await expect(heroSection).toHaveClass(/min-h-\[70vh\]/);
  await expect(heroSection).toHaveClass(/lg:min-h-screen/);
  await expect(page.locator('section[data-region="hero"] img')).toBeVisible();
  await expect(page.locator(".bg-gradient-to-r")).toBeVisible();

  // 无障碍：装饰性背景图 aria-hidden + 搜索框 label 关联（Spec §4）
  await expect(
    page.locator('section[data-region="hero"] img[aria-hidden="true"]')
  ).toBeVisible();
  await expect(page.locator('label[for="hero-search"]')).toBeVisible();
});

// [S2] WHEN 背景图加载失败 THEN 显示 bg-slate-800 深色兜底且文字仍可读
test("[S2] 背景图加载失败显示兜底底色且文字仍可读", async ({ page }) => {
  await page.route("**/*", (route) => {
    if (route.request().resourceType() === "image") {
      return route.abort();
    }
    return route.continue();
  });
  await page.reload({ waitUntil: "networkidle" });

  const heroSection = page.locator('section[data-region="hero"] section');
  await expect(heroSection).toHaveClass(/bg-slate-800/);
  await expect(
    page.getByRole("heading", { level: 1, name: /Discover China Like a Local/i })
  ).toBeVisible();
});

// [S3] WHEN 视口 < md（移动端 375x667）THEN 文字居中、标题 text-5xl、搜索框全宽堆叠
test("[S3] 移动端文字居中、标题 text-5xl、搜索框堆叠", async ({ page, viewport }) => {
  test.skip(!isMobile(viewport), "仅在移动视口 (375x667) 运行");

  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toHaveCSS("text-align", "center");
  await expect(heading).toHaveCSS("font-size", "48px"); // text-5xl

  const form = page.locator('section[data-region="hero"] form');
  await expect(form).toHaveCSS("flex-direction", "column");

  const img = page.locator('section[data-region="hero"] img');
  await expect(img).toHaveCSS("object-fit", "cover");
});

// [S4] WHEN 视口 ≥ lg（桌面端 1280x720）THEN 文字左对齐、标题 text-6xl、搜索框横向排列
test("[S4] 桌面端文字左对齐、标题 text-6xl、搜索框横向", async ({ page, viewport }) => {
  test.skip(isMobile(viewport), "仅在桌面视口 (1280x720) 运行");

  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toHaveCSS("text-align", "left");
  await expect(heading).toHaveCSS("font-size", "60px"); // lg:text-6xl

  const form = page.locator('section[data-region="hero"] form');
  await expect(form).toHaveCSS("flex-direction", "row");
});

// [S5] WHEN 用户输入非空查询并提交 THEN 调用 onSearch(trimmed) 且受控输入框不清空
test("[S5] 非空提交后输入值保留（受控组件）", async ({ page }) => {
  const input = page.getByPlaceholder(/Search destinations, tips, or ask AI/i);
  await input.fill("Beijing");

  await page.getByRole("button", { name: /search/i }).click();

  // 受控组件：提交后不清空（代理 onSearch 行为）
  await expect(input).toHaveValue("Beijing");
  // 占位实现不路由，URL 保持首页
  await expect(page).toHaveURL("http://localhost:3000/");
});

// [S6] WHEN 空查询（仅空白）提交 THEN 不触发 onSearch、提交按钮保持可用、sr-only 提示可见
test("[S6] 空查询提交不触发、按钮可用、提示可见", async ({ page }) => {
  const input = page.getByPlaceholder(/Search destinations, tips, or ask AI/i);
  await input.fill("   ");

  const button = page.getByRole("button", { name: /search/i });
  await expect(button).toBeEnabled();
  await button.click();

  // 未路由（代理 onSearch 未触发）
  await expect(page).toHaveURL("http://localhost:3000/");
  // 无障碍提示存在（sr-only + role=status）
  await expect(page.getByText(/Please enter a search term/i)).toBeVisible();
});

// [S7] WHEN 键盘聚焦搜索区 THEN 搜索输入可达、提交按钮具备可访问名称
test("[S7] 搜索输入可聚焦、按钮具备可访问名称", async ({ page }) => {
  const input = page.getByPlaceholder(/Search destinations, tips, or ask AI/i);
  await input.focus();
  await expect(input).toBeFocused();

  const button = page.getByRole("button", { name: /search/i });
  await expect(button).toHaveAttribute("aria-label", "Search");
  await expect(button).toHaveText(/Search/i);
});

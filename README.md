This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## 首页骨架（homepage-shell）

首页由 `app/page.tsx` 作为 Server Component 顺序渲染 5 个区块插槽（`app/regions/*Slot.tsx`），AI 悬浮入口插槽 `AiLauncherSlot` 常驻挂载于 `app/layout.tsx` 的 `{children}` 之后（跨页面常驻）。

| `data-region` | Slot 文件 | 渲染位置 | 状态 |
|---|---|---|---|
| `hero` | `app/regions/HeroSlot.tsx` | `app/page.tsx` 第 1 个 | 已实装（homepage-hero） |
| `feature-nav` | `app/regions/FeatureNavSlot.tsx` | `app/page.tsx` 第 2 个 | 空占位（homepage-feature-nav） |
| `city-grid` | `app/regions/CityGridSlot.tsx` | `app/page.tsx` 第 3 个 | 空占位（homepage-city-grid） |
| `hot-posts` | `app/regions/HotPostsSlot.tsx` | `app/page.tsx` 第 4 个 | 空占位（homepage-hot-posts） |
| `hot-spots` | `app/regions/HotSpotsSlot.tsx` | `app/page.tsx` 第 5 个 | 空占位（homepage-hot-spots） |
| `ai-launcher` | `app/regions/AiLauncherSlot.tsx` | `app/layout.tsx` `{children}` 之后 | 空占位（homepage-ai-launcher） |

各区块的具体内容、样式与数据由对应的 `homepage-*` change 实现；`homepage-shell` 仅定义结构骨架与挂载契约。

## 认证（auth-frontend）

规格见 `openspec/changes/0005-auth-frontend/`，后端契约见 `openspec/specs/auth-module/spec.md`。

### 页面路由

| 路由 | 组件 | 说明 |
|---|---|---|
| `/login` | `components/auth/login-form.tsx` | 登录；未验证邮箱时内联「重发验证邮件」出口 |
| `/register` | `components/auth/register-form.tsx` | 注册；成功后引导查收验证邮件（不自动登录） |
| `/forgot-password` | `components/auth/forgot-password-form.tsx` | 申请重置链接；恒定成功态 |
| `/auth/verify` | `components/auth/verify-status.tsx` | 邮箱验证结果（免鉴权） |
| `/auth/reset-password` | `components/auth/reset-password-form.tsx` | 凭一次性码设置新密码（免鉴权） |

受保护页面用 `<AuthGuard>` 包裹；登录类页面用 `<RedirectIfAuthenticated>` 包裹。

### 技术选型

| 关注点 | 方案 |
|---|---|
| 表单 | `react-hook-form` + `zod`，schema 位于 `lib/auth/schemas.ts`，与后端注解逐字段对齐 |
| 请求 | `lib/auth/client.ts`（注入 Bearer、遇 401 静默续期并重放、解析统一错误信封） |
| Token 存储 | `localStorage`（键名 `wanderchina.accessToken` / `wanderchina.refreshToken`） |
| 错误分支 | 按 `error.code` 分支，文案见 `lib/auth/messages.ts` |

### Token 存储为何用 localStorage

后端是 Bearer 设计，前端 JS 必须能取到令牌，因此无法使用 httpOnly Cookie。已知代价：

- XSS 场景下令牌可被窃取（缓解：React 默认转义，禁用 `dangerouslySetInnerHTML`）
- Next.js middleware（Edge Runtime）读不到 localStorage，故路由保护只能在客户端组件内实现

若后续提升到 BFF 代理 + httpOnly Cookie，需后端改为从 Cookie 读取令牌。

### 环境配置

| 变量 | 默认值 | 说明 |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8080` | 后端地址 |

> 后端必须配置 CORS 放行本前端来源（`app.cors.allowed-origins`），否则浏览器会拦截全部请求。

### 已知限制

- 邮件仅写日志、不真实投递，故自动化无法走完「点击邮件链接」这一步；E2E 覆盖到验证之前为止
- 注册限流为 5 次 / IP / 小时，E2E 在 desktop 与 mobile 两个 project 下各跑一遍易触发，相关用例会显式跳过
- 登出为客户端丢弃令牌，服务端不维护黑名单；access token 在 15 分钟内仍有效（状态过滤已覆盖锁定 / 注销场景）

## 本地联通 Runbook（auth-frontend-wiring）

本段说明如何让前端（`localhost:3000`）与后端（`localhost:8080`）真正跑通，并手动走完认证主流程。

### 1. 启动后端

```powershell
# 本机 mvn 不在 PATH 且默认 JDK8，须先固定环境
$env:JAVA_HOME = "D:\Programs\java17"
& "D:\Programs\maven\bin\mvn.cmd" spring-boot:run
```

后端监听 `http://localhost:8080`，CORS 已放行 `http://localhost:3000`。

### 2. 启动前端

```bash
npm install   # 若依赖尚未安装
npm run dev   # http://localhost:3000
```

### 3. 取验证 / 重置码（关键）

邮件仅写日志、不真实投递，且默认**不打印一次性码**。本地想手动点邮件链接走通验证时，
在后端启动时开启调试开关（**仅限本地，禁止生产开启**）：

```powershell
$env:JAVA_HOME = "D:\Programs\java17"
$env:AUTH_MAIL_LOG_VERIFICATION_CODE = "true"   # 对应后端 auth.mail.log-verification-code
& "D:\Programs\maven\bin\mvn.cmd" spring-boot:run
```

开启后，后端日志会打印完整前端链接，例如：

```
[MAIL] verification email sent to=you@example.com link=http://localhost:3000/auth/verify?code=xxxx
```

直接复制该链接在浏览器打开即可完成验证 / 重置。

### 4. 手动走通路径

1. 访问 `/register` → 注册成功 → 提示「请查收验证邮件」
2. 从后端日志复制 `/auth/verify?code=...` 链接 → 打开 → 显示验证成功
3. 访问 `/login` → 登录 → 自动跳回首页，右上角显示昵称 + 登出
4. 访问 `/account` → 显示「欢迎，{昵称}」
5. 点登出 → 跳回 `/login`，右上角回到登录 / 注册入口

### 5. 自动化验证

| 层 | 命令 | 证明内容 |
|---|---|---|
| 后端契约（全链路） | `mvn -Dtest=AuthFlowIntegrationTest test` | register→(取码)→verify→login→me→logout 真实 HTTP 全绿 |
| 前端单测 | `npm test` | 会话引导 / 守卫 / 导航栏 / 登出 行为正确 |
| 前端 E2E | `npm run test:e2e`（需双服务常驻） | 认证页面 UI 状态分支 |

> 完整的「注册→验证→登录」链路由后端 `AuthFlowIntegrationTest` 以真实 HTTP 覆盖，
> 不再依赖人工点击邮件链接；前端 E2E 主要覆盖页面状态分支。

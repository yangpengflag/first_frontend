#!/usr/bin/env node
/**
 * 从运行中的后端导出 OpenAPI 快照到 `frontend/openapi/openapi.json`。
 *
 * 两种模式：
 * - 默认（npm run openapi:sync）—— 覆盖写入快照，随后提交进仓
 * - --check（npm run openapi:drift）—— 只比对不写入，不一致即 exit 1（CI 用）
 *
 * <p>为什么需要这份快照：前端的 codegen（openapi-typescript）、单测 mock（msw）
 * 与 e2e mock（prism）都要读它。进仓后三者全部离线可用，不必先起后端。
 *
 * <p>为什么用它而非 prism 做契约校验：本脚本做**确定性内容比对**，零误报，
 * 直接命中「后端改了但快照忘了刷」这一真实失效模式；而 prism 严格模式对
 * 未文档化的响应头 / content-type 敏感，误报噪声大。
 *
 * <p>后端地址由环境变量 BACKEND_URL 提供，默认 http://localhost:8080。
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "openapi/openapi.json");
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";
const CHECK_ONLY = process.argv.includes("--check");

let response;
try {
  response = await fetch(`${BACKEND_URL}/v3/api-docs`);
} catch (error) {
  console.error(`[openapi] 无法连接后端 ${BACKEND_URL}：${error.message}`);
  console.error("[openapi] 请先启动后端：cd backend && mvn -DskipTests spring-boot:run");
  process.exit(1);
}

if (!response.ok) {
  console.error(`[openapi] 拉取 ${BACKEND_URL}/v3/api-docs 失败：${response.status} ${response.statusText}`);
  process.exit(1);
}

// 稳定序列化：2 空格缩进 + 末尾换行，保证 git diff 只反映真实契约变化
const text = JSON.stringify(await response.json(), null, 2) + "\n";

if (CHECK_ONLY) {
  let current;
  try {
    current = readFileSync(OUT, "utf8");
  } catch {
    console.error(`[openapi] 找不到进仓快照 ${OUT}，请先执行 npm run openapi:sync`);
    process.exit(1);
  }
  if (current === text) {
    console.log("[openapi] drift check 通过：后端契约与进仓快照一致");
    process.exit(0);
  }
  console.error("[openapi] drift check 失败：后端契约已变更，但进仓快照未刷新。");
  console.error("[openapi] 请执行 npm run openapi:sync 并提交 frontend/openapi/openapi.json");
  process.exit(1);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, text, "utf8");
console.log(`[openapi] 已写入 ${OUT}（${text.length} 字节）`);

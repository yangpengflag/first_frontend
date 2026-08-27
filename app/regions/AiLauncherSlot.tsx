/**
 * AI 助手悬浮入口插槽。
 * 常驻挂载于 `app/layout.tsx` 的 `{children}` 之后，跨页面常驻；
 * 空占位，待 `homepage-ai-launcher` change 填充。
 */
export default function AiLauncherSlot() {
  return <div data-region="ai-launcher" aria-label="ai-launcher placeholder" />;
}

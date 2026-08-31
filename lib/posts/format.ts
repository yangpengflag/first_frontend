/** 帖子相关纯展示格式化工具。 */

const DATE_FORMATTER = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

/** 把 ISO 时间格式化为「2026年8月30日」；非法 / 缺失返回空串。 */
export function formatPostDate(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return DATE_FORMATTER.format(date);
}

/**
 * 互动计数紧凑化：0 / 负 / 非有限值返回空串（调用方据此隐藏该项）；
 * <1000 原样返回；>=1000 压成一位小数 k（去尾零），如 1234→"1.2k"、1500→"1.5k"；
 * 超过百万仍按 k（如 1234567→"1235k"），不引入 M。
 */
export function formatCount(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n < 1000) return String(n);
  const k = n / 1000;
  const s = (k >= 100 ? k.toFixed(0) : k.toFixed(1)).replace(/\.0$/, "");
  return `${s}k`;
}

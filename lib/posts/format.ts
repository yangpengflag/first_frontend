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

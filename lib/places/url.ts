export type QueryValue = string | undefined;

/**
 * 合并初始 query 与覆盖项，删除空值 / "all" 哨兵，返回 `?a=b&c=d`（无前导 `?`；
 * 全空时返回 ""）。用于筛选条改写 URL 与分页链接拼接。
 */
export function buildQuery(
  initial: Record<string, QueryValue>,
  overrides: Record<string, QueryValue> = {}
): string {
  const params = new URLSearchParams();
  const merged = { ...initial, ...overrides };
  for (const [key, value] of Object.entries(merged)) {
    if (value !== undefined && value !== "" && value !== "all") {
      params.set(key, value);
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

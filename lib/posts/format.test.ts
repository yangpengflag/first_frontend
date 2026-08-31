import { describe, expect, it } from "vitest";

import { formatCount } from "./format";

describe("formatCount", () => {
  it("0 / 负 / 非有限值返回空串", () => {
    expect(formatCount(0)).toBe("");
    expect(formatCount(-5)).toBe("");
    expect(formatCount(Number.NaN)).toBe("");
    expect(formatCount(Number.POSITIVE_INFINITY)).toBe("");
  });

  it("<1000 原样返回", () => {
    expect(formatCount(1)).toBe("1");
    expect(formatCount(999)).toBe("999");
  });

  it(">=1000 压成一位小数 k（去尾零）", () => {
    expect(formatCount(1000)).toBe("1k");
    expect(formatCount(1234)).toBe("1.2k");
    expect(formatCount(1500)).toBe("1.5k");
  });

  it("超过百万仍按 k（不引入 M）", () => {
    expect(formatCount(1234567)).toBe("1235k");
  });
});

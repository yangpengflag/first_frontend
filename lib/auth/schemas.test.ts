import { describe, expect, it } from "vitest";

import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "./schemas";

const validEmail = "alice@example.com";
const validPassword = "Str0ng!Pass";

describe("registerSchema", () => {
  it("accepts a valid payload", () => {
    const result = registerSchema.safeParse({
      email: validEmail,
      password: validPassword,
      displayName: "Alice",
    });

    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = registerSchema.safeParse({
      email: "not-an-email",
      password: validPassword,
      displayName: "Alice",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a password shorter than 8", () => {
    const result = registerSchema.safeParse({
      email: validEmail,
      password: "Ab1!",
      displayName: "Alice",
    });

    expect(result.success).toBe(false);
  });

  /** BCrypt 只处理前 72 字节，超长密码属错误认知，必须拦下。 */
  it("rejects a password longer than 72", () => {
    const result = registerSchema.safeParse({
      email: validEmail,
      password: "A1!a".repeat(30),
      displayName: "Alice",
    });

    expect(result.success).toBe(false);
  });

  it("accepts a password of exactly 72 characters", () => {
    const result = registerSchema.safeParse({
      email: validEmail,
      password: "A1!a".repeat(18),
      displayName: "Alice",
    });

    expect(result.success).toBe(true);
  });

  it("rejects an empty display name", () => {
    const result = registerSchema.safeParse({
      email: validEmail,
      password: validPassword,
      displayName: "",
    });

    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts any non-empty password", () => {
    // 登录不校验长度：错误密码是业务分支（401），不是校验错误
    expect(loginSchema.safeParse({ email: validEmail, password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: validEmail, password: validPassword }).success).toBe(true);
  });

  it("rejects an empty password", () => {
    expect(loginSchema.safeParse({ email: validEmail, password: "" }).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(loginSchema.safeParse({ email: "bad", password: validPassword }).success).toBe(false);
  });
});

describe("forgotPasswordSchema", () => {
  it("accepts a valid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: validEmail }).success).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "bad" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("accepts matching passwords within bounds", () => {
    const result = resetPasswordSchema.safeParse({
      newPassword: validPassword,
      confirmPassword: validPassword,
    });

    expect(result.success).toBe(true);
  });

  it("rejects mismatched confirmation", () => {
    const result = resetPasswordSchema.safeParse({
      newPassword: validPassword,
      confirmPassword: "An0ther!Pass",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("confirmPassword");
    }
  });

  it("applies the same 8-72 bound as registration", () => {
    const tooLong = "A1!a".repeat(30);
    expect(
      resetPasswordSchema.safeParse({ newPassword: tooLong, confirmPassword: tooLong }).success
    ).toBe(false);
    expect(
      resetPasswordSchema.safeParse({ newPassword: "Ab1!", confirmPassword: "Ab1!" }).success
    ).toBe(false);
  });
});

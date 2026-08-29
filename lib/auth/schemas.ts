import { z } from "zod";

/**
 * 表单校验 schema——前后端约束的<b>单一来源</b>。
 *
 * 约束与后端权威校验逐字段一致（后端仍为最终防线，前端校验仅作即时反馈）：
 * | 字段         | 约束                  |
 * |--------------|-----------------------|
 * | email        | 必填、合法格式、≤254  |
 * | password     | 必填、8–72 字符       |
 * | displayName  | 必填、1–64 字符       |
 *
 * 密码上限 72 源于 BCrypt 仅处理前 72 字节，超出部分被静默丢弃。
 */

const EMAIL_MAX = 254;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72;
const DISPLAY_NAME_MAX = 64;

const emailField = z
  .string()
  .min(1, "请输入邮箱")
  .email("邮箱格式不正确")
  .max(EMAIL_MAX, `邮箱不能超过 ${EMAIL_MAX} 个字符`);

const passwordField = z
  .string()
  .min(PASSWORD_MIN, `密码至少 ${PASSWORD_MIN} 个字符`)
  .max(PASSWORD_MAX, `密码最多 ${PASSWORD_MAX} 个字符`);

const displayNameField = z
  .string()
  .min(1, "请输入昵称")
  .max(DISPLAY_NAME_MAX, `昵称不能超过 ${DISPLAY_NAME_MAX} 个字符`);

export const registerSchema = z.object({
  email: emailField,
  password: passwordField,
  displayName: displayNameField,
});

/**
 * 登录<b>不</b>校验密码长度：错误密码是正常业务分支（返回 401），
 * 不是参数校验错误，不应在前端拦截。
 */
export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "请输入密码"),
});

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export const resetPasswordSchema = z
  .object({
    newPassword: passwordField,
    confirmPassword: z.string().min(1, "请再次输入新密码"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "两次输入的密码不一致",
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

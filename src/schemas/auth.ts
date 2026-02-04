import { z } from "zod";

/** 登录请求体（校验文案由 handler 通过 i18n 返回） */
export const LoginBodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export type LoginBody = z.infer<typeof LoginBodySchema>;

/** 登录成功返回的用户信息（不含密码） */
export const LoginUserSchema = z.object({
  uid: z.string(),
  username: z.string(),
  email: z.string(),
  role: z.string(),
});

export type LoginUser = z.infer<typeof LoginUserSchema>;

/** 将 Prisma 用户行转为 API 返回的 user 对象 */
export function toAuthUser(row: {
  uid: string;
  username: string;
  email: string;
  role?: string | null;
}): LoginUser {
  return {
    uid: row.uid,
    username: row.username,
    email: row.email,
    role: row.role ?? "",
  };
}

/** 登录成功响应 data */
export const LoginResponseDataSchema = z.object({
  token: z.string(),
  user: LoginUserSchema,
});

export type LoginResponseData = z.infer<typeof LoginResponseDataSchema>;

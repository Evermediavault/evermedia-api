import { z } from "zod";

/** 登录请求体 */
export const LoginBodySchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginBody = z.infer<typeof LoginBodySchema>;

/** 登录成功返回的用户信息（不含密码） */
export const LoginUserSchema = z.object({
  uid: z.string(),
  username: z.string(),
  email: z.string(),
  role: z.string(),
});

/** 登录成功响应 data */
export const LoginResponseDataSchema = z.object({
  token: z.string(),
  user: LoginUserSchema,
});

export type LoginResponseData = z.infer<typeof LoginResponseDataSchema>;

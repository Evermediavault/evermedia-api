import bcrypt from "bcrypt";
import { sign, verify } from "../utils/jwt.js";

/**
 * 验证密码
 *
 * @param plainPassword - 明文密码
 * @param hashedPassword - 哈希密码
 * @returns 密码是否匹配
 */
export const verifyPassword = async (
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(plainPassword, hashedPassword);
};

/**
 * 生成密码哈希
 *
 * @param password - 明文密码
 * @returns 哈希密码
 */
export const getPasswordHash = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
};

/**
 * 创建 JWT 访问令牌（委托至 utils/jwt）
 *
 * @param data - 需包含 sub (uid)，可选 role、username
 * @param expiresInMinutes - 过期时间（分钟），可选
 * @returns JWT 令牌
 */
export const createAccessToken = (
  data: Record<string, unknown>,
  expiresInMinutes?: number
): string => {
  const payload = {
    sub: data.sub as string,
    role: data.role as string | undefined,
    username: data.username as string | undefined,
  };
  return sign(payload, { expiresInMinutes });
};

/**
 * 解码并验证 JWT 访问令牌（委托至 utils/jwt）
 *
 * @param token - JWT 令牌
 * @returns 解码后的 payload，无效则返回 null
 */
export const decodeAccessToken = (
  token: string
): Record<string, unknown> | null => {
  const payload = verify(token);
  return payload ? (payload as unknown as Record<string, unknown>) : null;
};

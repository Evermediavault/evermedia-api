import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { settings } from "./config.js";

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
 * 创建 JWT 访问令牌
 *
 * @param data - 要编码的数据
 * @param expiresInMinutes - 过期时间（分钟），可选
 * @returns JWT 令牌
 */
export const createAccessToken = (
  data: Record<string, unknown>,
  expiresInMinutes?: number
): string => {
  const expiresIn = expiresInMinutes
    ? `${expiresInMinutes}m`
    : `${settings.ACCESS_TOKEN_EXPIRE_MINUTES}m`;

  return jwt.sign(data, settings.SECRET_KEY, {
    algorithm: settings.ALGORITHM as jwt.Algorithm,
    expiresIn,
  });
};

/**
 * 解码 JWT 访问令牌
 *
 * @param token - JWT 令牌
 * @returns 解码后的数据，如果无效则返回 null
 */
export const decodeAccessToken = (
  token: string
): Record<string, unknown> | null => {
  try {
    const decoded = jwt.verify(token, settings.SECRET_KEY, {
      algorithms: [settings.ALGORITHM as jwt.Algorithm],
    });

    if (typeof decoded === "object" && decoded !== null) {
      return decoded as Record<string, unknown>;
    }

    return null;
  } catch (error) {
    return null;
  }
};

/**
 * 辅助工具函数
 */

/**
 * 从未知错误中提取可读字符串（供日志与错误响应使用）
 */
export function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return String(err);
}

/**
 * 转义 MySQL LIKE 通配符，使 `%` `_` 按字面量匹配（仍由 Prisma 参数绑定，不拼接 SQL）。
 * 需在默认 `LIKE ... ESCAPE '\\'` 行为下使用。
 */
export function escapeMysqlLikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

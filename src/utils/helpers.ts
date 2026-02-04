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

/**
 * 从请求中取 i18n 文案；request.t 由 i18n 中间件注入，若未注入则返回 fallback 或 key
 */
export function getMsg(
  request: { t?: (key: string, params?: Record<string, string | number>) => string },
  key: string,
  fallback?: string
): string {
  return request.t ? request.t(key) : (fallback ?? key);
}

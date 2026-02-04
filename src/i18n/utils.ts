/**
 * 从请求中取 i18n 文案；request.t 由 i18n 中间件在路由前注册注入。
 * 未注入时返回 key，避免 errorHandler 等路径二次抛错导致 500。
 * @param request 带 t 的请求
 * @param key i18n key，缺 key 时 t 返回 key
 * @param params 占位参数，如 { name: "x" }
 */
export function getMsg(
  request: { t?: (key: string, params?: Record<string, string | number>) => string },
  key: string,
  params?: Record<string, string | number>
): string {
  if (!request.t) return key;
  return request.t(key, params);
}

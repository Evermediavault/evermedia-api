import { isDevelopment } from "../core/config.js";
import { getLogger } from "../core/logger.js";
import { parseLocale } from "./index.js";
import { t } from "./index.js";

const log = getLogger("i18n");

/**
 * 从请求中取 i18n 文案；request.t 由 i18n 中间件在路由前注册注入。
 * 未注入时用 Accept-Language 解析 locale 并回退翻译，避免返回裸 key。
 * @param request 带 t 的请求（可选），需有 headers 以便回退解析 locale
 * @param key i18n key，缺 key 时 t 返回 key
 * @param params 占位参数，如 { name: "x" }
 */
export function getMsg(
  request: {
    t?: (key: string, params?: Record<string, string | number>) => string;
    headers?: { "accept-language"?: string };
  },
  key: string,
  params?: Record<string, string | number>
): string {
  if (request.t) {
    return request.t(key, params);
  }
  if (isDevelopment()) {
    log.warn({ key, message: "i18n not injected (request.t missing), using Accept-Language fallback" });
  }
  const acceptLanguage =
    request.headers && typeof request.headers["accept-language"] === "string"
      ? request.headers["accept-language"]
      : undefined;
  const locale = parseLocale(acceptLanguage);
  return t(key, params, locale);
}

import type { FastifyRequest } from "fastify";
import { t, type Locale } from "./index.js";

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

/**
 * 从请求中获取翻译函数
 * 如果请求中没有 locale，使用默认语言
 */
export function getTranslator(request: FastifyRequest) {
  const locale = request.locale || ("zh-CN" as Locale);
  return (key: string, params?: Record<string, string | number>) => {
    return t(key, params, locale);
  };
}

/**
 * 从请求中获取当前语言
 */
export function getLocale(request: FastifyRequest): Locale {
  return request.locale || ("zh-CN" as Locale);
}

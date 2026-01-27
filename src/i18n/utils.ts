import { FastifyRequest } from "fastify";
import { t, Locale } from "./index.js";

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

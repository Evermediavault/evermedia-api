import { FastifyPluginAsync, FastifyRequest } from "fastify";
import { parseLocale, Locale, t } from "./index.js";

/**
 * 扩展 Fastify 请求类型，添加语言相关属性
 */
declare module "fastify" {
  interface FastifyRequest {
    locale: Locale;
    t: (key: string, params?: Record<string, string | number>) => string;
  }
}

/**
 * i18n 中间件
 * 从请求头中解析语言，并添加到请求对象中
 */
export const i18nPlugin: FastifyPluginAsync = async (fastify) => {
  // 添加请求钩子，解析语言
  fastify.addHook("onRequest", async (request: FastifyRequest) => {
    // 从 Accept-Language 头解析语言
    const acceptLanguage = request.headers["accept-language"];
    const locale = parseLocale(acceptLanguage);

    // 将语言和翻译函数添加到请求对象
    request.locale = locale;
    request.t = (key: string, params?: Record<string, string | number>) => {
      return t(key, params, locale);
    };
  });
};

import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { randomUUID } from "crypto";
import { getLogger } from "../core/logger.js";
import { settings } from "../core/config.js";
import { t, type Locale } from "../i18n/index.js";

const logger = getLogger("request");
const logLocale = (): Locale => settings.DEFAULT_LOCALE as Locale;

/**
 * 扩展 Fastify 请求类型，添加请求 ID 与开始时间（用于计算响应耗时）
 */
declare module "fastify" {
  interface FastifyRequest {
    requestId: string;
    requestStartTime?: number;
  }
}

/**
 * 请求日志中间件插件
 *
 * 记录每个 HTTP 请求的详细信息，包括：
 * - 请求ID
 * - 请求方法、路径
 * - 请求处理时间
 * - 响应状态码
 */
export const loggingPlugin: FastifyPluginAsync = async (fastify) => {
  // 添加请求 ID 到请求对象
  fastify.addHook("onRequest", async (request: FastifyRequest) => {
    request.requestId = randomUUID();
    request.requestStartTime = Date.now();

    logger.info({
      message: t("log.request.start", undefined, logLocale()),
      requestId: request.requestId,
      method: request.method,
      path: request.url,
      query: request.query,
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    });
  });

  // 记录响应信息
  fastify.addHook("onResponse", async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const elapsed =
      request.requestStartTime != null ? Date.now() - request.requestStartTime : 0;
    const responseTimeMs = elapsed;

    logger.info({
      message: t("log.request.complete", undefined, logLocale()),
      requestId: request.requestId,
      method: request.method,
      path: request.url,
      statusCode: reply.statusCode,
      responseTime: `${responseTimeMs.toFixed(3)}ms`,
    });

    reply.header("X-Request-ID", request.requestId);
    reply.header("X-Process-Time", responseTimeMs.toFixed(3));
  });

  // 记录错误信息
  fastify.addHook("onError", async (
    request: FastifyRequest,
    reply: FastifyReply,
    error: Error
  ) => {
    const elapsed =
      request.requestStartTime != null ? Date.now() - request.requestStartTime : 0;
    const responseTimeMs = elapsed;

    logger.error({
      message: t("log.request.failed", undefined, logLocale()),
      requestId: request.requestId,
      method: request.method,
      path: request.url,
      statusCode: reply.statusCode,
      responseTime: `${responseTimeMs.toFixed(3)}ms`,
      error: error.message,
      errorType: error.constructor.name,
      stack: error.stack,
    });
  });
};

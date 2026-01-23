import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { randomUUID } from "crypto";
import { getLogger } from "../core/logger.js";

const logger = getLogger("request");

/**
 * 扩展 Fastify 请求类型，添加请求 ID
 */
declare module "fastify" {
  interface FastifyRequest {
    requestId: string;
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

    logger.info({
      message: "请求开始",
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
    const responseTime = reply.getResponseTime();

    logger.info({
      message: "请求完成",
      requestId: request.requestId,
      method: request.method,
      path: request.url,
      statusCode: reply.statusCode,
      responseTime: `${responseTime.toFixed(3)}ms`,
    });

    // 添加请求ID到响应头
    reply.header("X-Request-ID", request.requestId);
    reply.header("X-Process-Time", responseTime.toFixed(3));
  });

  // 记录错误信息
  fastify.addHook("onError", async (
    request: FastifyRequest,
    reply: FastifyReply,
    error: Error
  ) => {
    const responseTime = reply.getResponseTime();

    logger.error({
      message: "请求失败",
      requestId: request.requestId,
      method: request.method,
      path: request.url,
      statusCode: reply.statusCode,
      responseTime: `${responseTime.toFixed(3)}ms`,
      error: error.message,
      errorType: error.constructor.name,
      stack: error.stack,
    });
  });
};

import { FastifyPluginAsync, FastifyReply } from "fastify";
import { getDb } from "../../deps.js";
import { settings } from "../../../core/config.js";
import { createSuccessResponse } from "../../../schemas/response.js";

/**
 * 健康检查路由插件
 */
export const healthRouter: FastifyPluginAsync = async (fastify) => {
  /**
   * 基础健康检查
   * GET /health
   */
  fastify.get("/health", async () => {
    return createSuccessResponse("服务正常运行", {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: settings.APP_VERSION,
      environment: settings.ENVIRONMENT,
    });
  });

  /**
   * 存活检查
   * GET /health/live
   * Kubernetes 存活探针端点
   */
  fastify.get("/health/live", async () => {
    return createSuccessResponse("服务存活", {
      status: "alive",
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 就绪检查
   * GET /health/ready
   * Kubernetes 就绪探针端点，检查数据库连接
   */
  fastify.get("/health/ready", async (request, reply: FastifyReply) => {
    try {
      const db = getDb(request);
      // 执行简单查询检查数据库连接
      await db.$queryRaw`SELECT 1`;

      return createSuccessResponse("服务就绪", {
        status: "ready",
        timestamp: new Date().toISOString(),
        database: "connected",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // 注意：这里返回 503 状态码表示服务不可用
      return reply.status(503).send(
        createSuccessResponse("服务未就绪", {
          status: "not_ready",
          timestamp: new Date().toISOString(),
          database: "disconnected",
          error: errorMessage,
        })
      );
    }
  });
};

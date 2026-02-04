import { FastifyPluginAsync, FastifyReply } from "fastify";
import { getDb } from "../../deps.js";
import { settings, isProduction } from "../../../core/config.js";
import { createSuccessResponse, createErrorResponse } from "../../../schemas/response.js";
import { getMsg } from "../../../i18n/utils.js";

/**
 * 健康检查路由插件
 */
export const healthRouter: FastifyPluginAsync = async (fastify) => {
  /**
   * 基础健康检查
   * GET /health
   */
  fastify.get("/health", async (request) => {
    const msg = getMsg(request, "health.healthy");
    return createSuccessResponse(msg, {
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
  fastify.get("/health/live", async (request) => {
    const msg = getMsg(request, "health.alive");
    return createSuccessResponse(msg, {
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
      const db = getDb();
      await db.$queryRaw`SELECT 1`;

      const msg = getMsg(request, "health.ready");
      return createSuccessResponse(msg, {
        status: "ready",
        timestamp: new Date().toISOString(),
        database: "connected",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const msg = getMsg(request, "health.notReady");
      const detail: { status: string; timestamp: string; database: string; error?: string } = {
        status: "not_ready",
        timestamp: new Date().toISOString(),
        database: "disconnected",
      };
      if (!isProduction()) {
        detail.error = errorMessage;
      }
      return reply.status(503).send(createErrorResponse(msg, 503, detail));
    }
  });
};

import { FastifyPluginAsync } from "fastify";
import { healthRouter } from "./endpoints/health.js";

/**
 * API v1 路由聚合
 *
 * 聚合所有 v1 版本的 API 端点
 */
export const apiV1Router: FastifyPluginAsync = async (fastify) => {
  // 注册健康检查路由
  await fastify.register(healthRouter);

  // 在这里添加其他路由
  // await fastify.register(authRouter, { prefix: "/auth" });
  // await fastify.register(usersRouter, { prefix: "/users" });
};

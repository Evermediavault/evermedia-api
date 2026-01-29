import { FastifyPluginAsync } from "fastify";
import { healthRouter } from "./endpoints/health.js";
import { authRouter } from "./endpoints/auth.js";

/**
 * API v1 路由聚合
 *
 * 聚合所有 v1 版本的 API 端点
 */
export const apiV1Router: FastifyPluginAsync = async (fastify) => {
  await fastify.register(healthRouter);
  await fastify.register(authRouter, { prefix: "/auth" });
};

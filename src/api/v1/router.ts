import { FastifyPluginAsync } from "fastify";
import { healthRouter } from "./endpoints/health.js";
import { authRouter } from "./endpoints/auth.js";
import { usersRouter } from "./endpoints/users.js";
import { mediaRouter } from "./endpoints/media.js";
import { categoriesRouter } from "./endpoints/categories.js";
import { statsRouter } from "./endpoints/stats.js";

/**
 * API v1 路由聚合
 *
 * 聚合所有 v1 版本的 API 端点
 */
export const apiV1Router: FastifyPluginAsync = async (fastify) => {
  await fastify.register(healthRouter);
  await fastify.register(authRouter, { prefix: "/auth" });
  await fastify.register(usersRouter, { prefix: "/users" });
  await fastify.register(mediaRouter, { prefix: "/media" });
  await fastify.register(categoriesRouter, { prefix: "/categories" });
  await fastify.register(statsRouter, { prefix: "/stats" });
};

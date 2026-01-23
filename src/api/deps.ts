import { FastifyRequest } from "fastify";
import { PrismaClient } from "@prisma/client";

/**
 * 获取数据库客户端
 *
 * 从 Fastify 实例中获取 Prisma 客户端
 */
export const getDb = (request: FastifyRequest): PrismaClient => {
  return request.server.db;
};

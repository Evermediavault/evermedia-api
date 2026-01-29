import { FastifyPluginAsync } from "fastify";
import { PrismaClient } from "@prisma/client";
import { getPrismaClient } from "./client.js";

/**
 * 扩展 Fastify 类型定义，添加数据库客户端
 */
declare module "fastify" {
  interface FastifyInstance {
    db: PrismaClient;
  }
}

/**
 * 数据库会话插件
 *
 * 为 Fastify 应用提供数据库客户端
 */
export const dbPlugin: FastifyPluginAsync = async (fastify) => {
  const prisma = getPrismaClient();

  fastify.decorate("db", prisma);

  fastify.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
};

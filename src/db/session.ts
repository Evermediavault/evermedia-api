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

  // 将 Prisma 客户端添加到 Fastify 实例
  fastify.decorate("db", prisma);

  // 应用关闭时断开数据库连接
  fastify.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
};

import { FastifyPluginAsync } from "fastify";
import { getPrismaClient } from "./client.js";

/**
 * 数据库插件：确保 Prisma 单例在应用生命周期内可用，关闭时断开连接。
 * 业务层通过 getDb()（api/deps）获取客户端，不通过 fastify.decorate。
 */
export const dbPlugin: FastifyPluginAsync = async (fastify) => {
  const prisma = getPrismaClient();
  fastify.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
};

import { PrismaClient } from "@prisma/client";
import { getLogger } from "../core/logger.js";
import { settings, isProduction } from "../core/config.js";

const logger = getLogger("db");

/**
 * Prisma 客户端单例
 */
let prisma: PrismaClient | null = null;

/**
 * 获取 Prisma 客户端实例
 *
 * @returns Prisma 客户端实例
 */
export const getPrismaClient = (): PrismaClient => {
  if (!prisma) {
    const logConfig: Array<{
      emit: "event" | "stdout";
      level: "query" | "info" | "warn" | "error";
    }> = [];

    // 根据配置决定日志级别
    if (settings.DB_ECHO || !isProduction()) {
      logConfig.push(
        {
          emit: "event",
          level: "query",
        },
        {
          emit: "event",
          level: "info",
        },
        {
          emit: "event",
          level: "warn",
        }
      );
    }

    logConfig.push({
      emit: "event",
      level: "error",
    });

    prisma = new PrismaClient({
      log: logConfig,
    });

    // 监听查询事件（仅在启用 DB_ECHO 或开发环境）
    if (settings.DB_ECHO || !isProduction()) {
      prisma.$on("query", (e) => {
        logger.debug({
          query: e.query,
          params: e.params,
          duration: `${e.duration}ms`,
        });
      });
    }

    // 监听错误事件
    prisma.$on("error", (e) => {
      logger.error({ error: e });
    });
  }

  return prisma;
};

/**
 * 断开数据库连接
 */
export const disconnectPrisma = async (): Promise<void> => {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
    logger.info("数据库连接已断开");
  }
};

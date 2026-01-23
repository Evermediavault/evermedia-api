import { createApplication } from "./app.js";
import { settings, getDatabaseUrl } from "./core/config.js";
import { getLogger } from "./core/logger.js";
import { disconnectPrisma } from "./db/client.js";

const logger = getLogger("server");

// 确保 DATABASE_URL 环境变量已设置
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = getDatabaseUrl();
  logger.info({ message: "使用配置构建的 DATABASE_URL" });
}

/**
 * 启动服务器
 */
const start = async () => {
  try {
    const app = await createApplication();

    // 启动服务器
    await app.listen({
      host: settings.HOST,
      port: settings.PORT,
    });

    logger.info({
      message: "服务器启动成功",
      url: `http://${settings.HOST}:${settings.PORT}`,
      environment: settings.ENVIRONMENT,
    });
  } catch (error) {
    logger.error({
      message: "服务器启动失败",
      error: error instanceof Error ? error.message : String(error),
    });
    await disconnectPrisma();
    process.exit(1);
  }
};

// 处理进程退出
process.on("SIGINT", async () => {
  logger.info({ message: "收到 SIGINT 信号，正在关闭服务器..." });
  await disconnectPrisma();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info({ message: "收到 SIGTERM 信号，正在关闭服务器..." });
  await disconnectPrisma();
  process.exit(0);
});

// 启动服务器
start();

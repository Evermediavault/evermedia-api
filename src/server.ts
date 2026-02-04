import type { FastifyInstance } from "fastify";
import { createApplication } from "./app.js";
import { settings, getDatabaseUrl } from "./core/config.js";
import { getLogger } from "./core/logger.js";
import { disconnectPrisma } from "./db/client.js";
import { toErrorMessage } from "./utils/helpers.js";
import { t, type Locale } from "./i18n/index.js";

const logger = getLogger("server");
const logLocale = (): Locale => settings.DEFAULT_LOCALE as Locale;

// 确保 DATABASE_URL 环境变量已设置
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = getDatabaseUrl();
  logger.info({ message: t("log.server.builtDatabaseUrl", undefined, logLocale()) });
}

let app: FastifyInstance | null = null;

/**
 * 启动服务器
 */
const start = async () => {
  try {
    app = await createApplication();

    await app.listen({
      host: settings.HOST,
      port: settings.PORT,
    });

    logger.info({
      message: t("log.server.started", undefined, logLocale()),
      url: `http://${settings.HOST}:${settings.PORT}`,
      environment: settings.ENVIRONMENT,
    });
  } catch (error) {
    logger.error({
      message: t("log.server.startFailed", undefined, logLocale()),
      error: toErrorMessage(error),
    });
    await disconnectPrisma();
    process.exit(1);
  }
};

const shutdown = async (): Promise<void> => {
  if (app) {
    await app.close();
    app = null;
  }
};

process.on("SIGINT", async () => {
  logger.info({ message: t("log.server.sigint", undefined, logLocale()) });
  await shutdown();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info({ message: t("log.server.sigterm", undefined, logLocale()) });
  await shutdown();
  process.exit(0);
});

start();

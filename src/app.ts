import Fastify, { FastifyInstance } from "fastify";
import compress from "@fastify/compress";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { settings, isProduction } from "./core/config.js";
import { getLogger } from "./core/logger.js";
import { dbPlugin } from "./db/session.js";
import { synapsePlugin } from "./synapse/plugin.js";
import { initializeDatabase } from "./db/init.js";
import { i18nPlugin } from "./i18n/middleware.js";
import { loggingPlugin } from "./middleware/logging.js";
import { errorHandler } from "./middleware/exception.js";
import { apiV1Router } from "./api/v1/router.js";
import { t } from "./i18n/index.js";

const logger = getLogger("app");

/**
 * 创建 Fastify 应用实例
 *
 * @returns 配置好的 Fastify 应用实例
 */
export const createApplication = async (): Promise<FastifyInstance> => {
  const app = Fastify({
    logger: false,
    disableRequestLogging: true,
  });

  await app.register(cors, { origin: true, credentials: true });
  await app.register(compress, { threshold: 1000 });
  await app.register(multipart, {
    limits: {
      fileSize: (settings.UPLOAD_MAX_FILE_SIZE_KB ?? 10240) * 1024,
    },
  });
  await app.register(loggingPlugin);

  // 注册 i18n 中间件（需要在其他路由之前注册）
  await app.register(i18nPlugin);

  // 注册数据库插件
  await app.register(dbPlugin);
  // 注册 Synapse（Filecoin Onchain Cloud）插件
  await app.register(synapsePlugin);

  // 注册异常处理
  app.setErrorHandler(errorHandler);

  // 注册 API 路由
  await app.register(apiV1Router, {
    prefix: settings.API_V1_PREFIX,
  });

  // 根路径
  app.get("/", async () => {
    const locale = settings.DEFAULT_LOCALE as "zh-CN" | "en-US";
    return {
      message: t("app.welcome", { name: settings.APP_NAME }, locale),
      version: settings.APP_VERSION,
      docs_url: isProduction() ? null : settings.API_DOCS_URL,
    };
  });

  // 应用生命周期钩子
  app.addHook("onReady", async () => {
    logger.info({
      message: "应用启动",
      environment: settings.ENVIRONMENT,
      version: settings.APP_VERSION,
    });

    // 初始化数据库（检查表是否存在，创建默认管理员账户）
    await initializeDatabase();
  });

  app.addHook("onClose", async () => {
    logger.info({ message: "应用关闭" });
  });

  return app;
};

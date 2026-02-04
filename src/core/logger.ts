import pino from "pino";
import { settings, isProduction } from "./config.js";

/**
 * 创建 Pino 日志实例
 */
const createLogger = () => {
  const isProd = isProduction();
  const logFormat = settings.LOG_FORMAT;

  const options: pino.LoggerOptions = {
    level: settings.LOG_LEVEL.toLowerCase(),
    formatters: {
      level: (label) => {
        return { level: label.toUpperCase() };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  };

  // 生产环境或 JSON 格式：使用 JSON 输出
  if (isProd || logFormat === "json") {
    return pino(options);
  }

  // 开发环境：使用美化输出
  return pino(
    {
      ...options,
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      },
    },
    pino.destination({
      sync: false,
    })
  );
};

/**
 * 全局日志实例
 */
export const logger = createLogger();

/**
 * 获取日志记录器
 *
 * @param name - 日志记录器名称，通常使用模块名
 * @returns 配置好的日志记录器
 */
export const getLogger = (name: string = "app"): pino.Logger => {
  return logger.child({ module: name });
};

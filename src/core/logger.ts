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

/**
 * 绑定请求ID到日志上下文
 *
 * 注意：在 Fastify 中，请求 ID 通过 request.log 自动绑定
 * 这个函数保留用于兼容性，实际使用中通过 Fastify 的日志系统处理
 *
 * @param requestId - 请求ID
 */
export const bindRequestId = (requestId: string): void => {
  // Fastify 的 request.log 会自动包含请求上下文
  // 如果需要自定义上下文，可以使用 AsyncLocalStorage
};

/**
 * 清除日志上下文
 */
export const clearContext = (): void => {
  // Fastify 的日志上下文在请求结束时自动清除
};

import { z } from "zod";
import dotenv from "dotenv";

// 加载环境变量
dotenv.config();

/**
 * 环境枚举
 */
export enum Environment {
  DEVELOPMENT = "development",
  STAGING = "staging",
  PRODUCTION = "production",
  TESTING = "testing",
}

/**
 * 配置验证 Schema
 */
const configSchema = z.object({
  // 应用基础配置
  APP_NAME: z.string().default("Evermediavault API"),
  APP_VERSION: z.string().default("0.1.0"),
  APP_DESCRIPTION: z.string().default("Evermediavault HTTP API服务"),
  DEBUG: z
    .string()
    .transform((val) => val === "true")
    .default("false"),
  ENVIRONMENT: z
    .string()
    .default(Environment.DEVELOPMENT)
    .transform((val) => {
      if (typeof val === "string") {
        const lower = val.toLowerCase();
        if (Object.values(Environment).includes(lower as Environment)) {
          return lower as Environment;
        }
      }
      return Environment.DEVELOPMENT;
    }),

  // API配置
  API_V1_PREFIX: z.string().default("/api/v1"),
  API_DOCS_URL: z.string().nullable().default("/docs"),
  API_REDOC_URL: z.string().nullable().default("/redoc"),

  // 服务器配置
  HOST: z.string().default("0.0.0.0"),
  PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default("8000"),
  RELOAD: z
    .string()
    .transform((val) => val === "true")
    .default("false"),

  // 数据库配置
  DB_HOST: z.string().default("localhost"),
  DB_PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default("3306"),
  DB_USER: z.string().default("root"),
  DB_PASSWORD: z.string().default(""),
  DB_NAME: z.string().default("evermediavault"),
  DB_CHARSET: z.string().default("utf8mb4"),
  DB_POOL_SIZE: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default("10"),
  DB_MAX_OVERFLOW: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default("20"),
  DB_POOL_RECYCLE: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default("3600"),
  DB_ECHO: z
    .string()
    .transform((val) => val === "true")
    .default("false"),

  // 安全配置
  SECRET_KEY: z.string().default("your-secret-key-change-in-production"),
  ALGORITHM: z.string().default("HS256"),
  ACCESS_TOKEN_EXPIRE_MINUTES: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default("30"),

  // CORS配置
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:3000,http://localhost:8080")
    .transform((val) => val.split(",").map((s) => s.trim())),
  CORS_CREDENTIALS: z
    .string()
    .transform((val) => val === "true")
    .default("true"),
  CORS_METHODS: z
    .string()
    .default("*")
    .transform((val) => (val === "*" ? ["*"] : val.split(",").map((s) => s.trim()))),
  CORS_HEADERS: z
    .string()
    .default("*")
    .transform((val) => (val === "*" ? ["*"] : val.split(",").map((s) => s.trim()))),

  // 日志配置
  LOG_LEVEL: z
    .string()
    .default("INFO")
    .transform((val) => {
      const upper = val.toUpperCase();
      const validLevels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"];
      return validLevels.includes(upper) ? upper : "INFO";
    }),
  LOG_FORMAT: z.string().default("json"),
});

/**
 * 配置类型
 */
export type Config = z.infer<typeof configSchema>;

/**
 * 解析并验证配置
 */
const parseConfig = (): Config => {
  const rawConfig = process.env;
  return configSchema.parse(rawConfig);
};

/**
 * 全局配置实例
 */
export const settings = parseConfig();

/**
 * 获取数据库连接 URL
 */
export const getDatabaseUrl = (): string => {
  // 如果环境变量中已有 DATABASE_URL，优先使用
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  // 否则根据配置构建
  return `mysql://${settings.DB_USER}:${settings.DB_PASSWORD}@${settings.DB_HOST}:${settings.DB_PORT}/${settings.DB_NAME}?charset=${settings.DB_CHARSET}`;
};

/**
 * 是否为开发环境
 */
export const isDevelopment = (): boolean => {
  return settings.ENVIRONMENT === Environment.DEVELOPMENT;
};

/**
 * 是否为生产环境
 */
export const isProduction = (): boolean => {
  return settings.ENVIRONMENT === Environment.PRODUCTION;
};

/**
 * 是否为测试环境
 */
export const isTesting = (): boolean => {
  return settings.ENVIRONMENT === Environment.TESTING;
};

// 为了兼容性，添加 settings 的属性访问器
Object.defineProperty(settings, "is_development", {
  get: () => isDevelopment(),
});

Object.defineProperty(settings, "is_production", {
  get: () => isProduction(),
});

Object.defineProperty(settings, "is_testing", {
  get: () => isTesting(),
});

Object.defineProperty(settings, "database_url", {
  get: () => getDatabaseUrl(),
});

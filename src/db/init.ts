import { PrismaClient } from "@prisma/client";
import { getPrismaClient } from "./client.js";
import { getLogger } from "../core/logger.js";
import { settings } from "../core/config.js";
import { getPasswordHash } from "../core/security.js";
import { t, Locale } from "../i18n/index.js";

const logger = getLogger("db.init");

/**
 * 检查表是否存在
 */
async function tableExists(prisma: PrismaClient, tableName: string): Promise<boolean> {
  try {
    // 使用原始 SQL 查询检查表是否存在
    const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = ${tableName}
    `;
    return result[0]?.count > 0;
  } catch (error) {
    logger.error({
      message: `检查表 ${tableName} 是否存在时出错`,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * 检查用户是否存在
 */
async function userExists(prisma: PrismaClient, username: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    return user !== null;
  } catch (error) {
    // 如果表不存在，会抛出错误
    return false;
  }
}

/**
 * 创建用户表
 */
async function createUserTable(prisma: PrismaClient, locale: Locale = "zh-CN"): Promise<void> {
  try {
    logger.info({ message: t("db.init.start", undefined, locale) });

    // 使用原始 SQL 创建用户表
    // 注意：uid 字段不设置默认值，由 Prisma 在应用层生成 UUID
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uid VARCHAR(36) NOT NULL UNIQUE,
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        last_login_at DATETIME(3) NULL,
        last_login_ip VARCHAR(45) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        INDEX idx_uid (uid),
        INDEX idx_username (username),
        INDEX idx_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    logger.info({ message: t("db.init.tableCreated", undefined, locale) });
  } catch (error) {
    logger.error({
      message: t("db.init.tableCreateFailed", undefined, locale),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * 确保用户表存在
 */
async function ensureUserTable(prisma: PrismaClient, locale: Locale = "zh-CN"): Promise<boolean> {
  try {
    // 检查表是否存在
    const exists = await tableExists(prisma, "users");
    
    if (!exists) {
      // 表不存在，创建表
      await createUserTable(prisma, locale);
      return true;
    }

    // 表已存在，验证表结构是否可用
    try {
      await prisma.user.findFirst({ take: 1 });
      return true;
    } catch (error) {
      logger.warn({
        message: "用户表存在但结构可能不匹配，请运行 'npm run prisma:migrate' 同步表结构",
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  } catch (error) {
    logger.error({
      message: "确保用户表存在时出错",
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * 创建默认管理员账户
 */
async function createDefaultAdmin(prisma: PrismaClient, locale: Locale = "zh-CN"): Promise<void> {
  try {
    const username = settings.DEFAULT_ADMIN_USERNAME;
    const email = settings.DEFAULT_ADMIN_EMAIL;
    const password = settings.DEFAULT_ADMIN_PASSWORD;
    const role = settings.DEFAULT_ADMIN_ROLE;

    // 检查用户是否已存在
    const exists = await userExists(prisma, username);
    if (exists) {
      logger.info({
        message: t("db.init.adminExists", undefined, locale),
        username,
      });
      return;
    }

    // 加密密码
    const hashedPassword = await getPasswordHash(password);

    // 创建管理员账户
    await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role,
      },
    });

    logger.info({
      message: t("db.init.adminCreated", undefined, locale),
      username,
      email,
      role,
    });
  } catch (error) {
    logger.error({
      message: t("db.init.adminCreateFailed", undefined, locale),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * 初始化数据库
 * 检查用户表是否存在，如果不存在则创建表，然后创建默认管理员账户
 */
export async function initializeDatabase(): Promise<void> {
  const prisma = getPrismaClient();
  const locale = (settings.DEFAULT_LOCALE as Locale) || "zh-CN";

  try {
    logger.info({ message: t("db.init.start", undefined, locale) });

    // 检查用户表是否存在，如果不存在则创建
    const tableReady = await ensureUserTable(prisma, locale);

    if (!tableReady) {
      logger.warn({
        message: t("db.init.failed", undefined, locale),
      });
      return;
    }

    // 创建默认管理员账户
    await createDefaultAdmin(prisma, locale);

    logger.info({ message: t("db.init.completed", undefined, locale) });
  } catch (error) {
    logger.error({
      message: t("db.init.failed", undefined, locale),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // 不抛出错误，允许应用继续启动
    // 这样即使数据库初始化失败，应用仍然可以启动（可能用于健康检查等）
  }
}

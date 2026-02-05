import { getPrismaClient } from "./client.js";
import { getLogger } from "../core/logger.js";
import { settings } from "../core/config.js";
import { getPasswordHash } from "../core/security.js";
import { t, type Locale } from "../i18n/index.js";
import { toErrorMessage } from "../utils/helpers.js";

const logger = getLogger("db.init");

/**
 * 创建默认管理员账户（表结构由 Prisma migrate 维护，此处仅负责种子数据）
 */
async function createDefaultAdmin(prisma: ReturnType<typeof getPrismaClient>, locale: Locale): Promise<void> {
  const username = settings.DEFAULT_ADMIN_USERNAME;
  const email = settings.DEFAULT_ADMIN_EMAIL;
  const password = settings.DEFAULT_ADMIN_PASSWORD;
  const role = settings.DEFAULT_ADMIN_ROLE;

  const existing = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });
  if (existing) {
    logger.info({ message: t("db.init.adminExists", undefined, locale), username });
    return;
  }

  const hashedPassword = await getPasswordHash(password);
  await prisma.user.create({
    data: { username, email, password: hashedPassword, role },
  });
  logger.info({ message: t("db.init.adminCreated", undefined, locale), username, email, role });
}

/** 默认分类名称与描述（仅一条，is_default=true，后期不可删除） */
const DEFAULT_CATEGORY_NAME = "Default";
const DEFAULT_CATEGORY_DESCRIPTION = "System default category, cannot be deleted";

/**
 * 创建默认分类（ev_categories 中 is_default=true 仅允许一条，且不可删除）
 */
async function createDefaultCategory(prisma: ReturnType<typeof getPrismaClient>, locale: Locale): Promise<void> {
  const existing = await prisma.category.findFirst({
    where: { is_default: true },
    select: { id: true },
  });
  if (existing) {
    logger.info({ message: t("db.init.defaultCategoryExists", undefined, locale) });
    return;
  }

  await prisma.category.create({
    data: {
      name: DEFAULT_CATEGORY_NAME,
      description: DEFAULT_CATEGORY_DESCRIPTION,
      is_default: true,
    },
  });
  logger.info({ message: t("db.init.defaultCategoryCreated", undefined, locale), name: DEFAULT_CATEGORY_NAME });
}

/**
 * 初始化：创建默认管理员账户与默认分类；表需已通过 prisma migrate 存在
 */
export async function initializeDatabase(): Promise<void> {
  const prisma = getPrismaClient();
  const locale = (settings.DEFAULT_LOCALE as Locale) || "zh-CN";

  try {
    logger.info({ message: t("db.init.start", undefined, locale) });
    await createDefaultAdmin(prisma, locale);
    await createDefaultCategory(prisma, locale);
    logger.info({ message: t("db.init.completed", undefined, locale) });
  } catch (error) {
    logger.error({
      message: t("db.init.failed", undefined, locale),
      error: toErrorMessage(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

import zhCN from "./locales/zh-CN.js";
import enUS from "./locales/en-US.js";

/**
 * 支持的语言类型
 */
export type Locale = "zh-CN" | "en-US";

/**
 * 语言包类型
 */
export type Messages = typeof zhCN;

/**
 * 所有语言包
 */
export const messages: Record<Locale, Messages> = {
  "zh-CN": zhCN,
  "en-US": enUS,
};

/**
 * 默认语言
 */
export const DEFAULT_LOCALE: Locale = "zh-CN";

/**
 * 支持的语言列表
 */
export const SUPPORTED_LOCALES: Locale[] = ["zh-CN", "en-US"];

/**
 * 从 Accept-Language 头解析语言
 */
export function parseLocale(acceptLanguage?: string): Locale {
  if (!acceptLanguage) {
    return DEFAULT_LOCALE;
  }

  // 解析 Accept-Language 头，例如: "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7"
  const languages = acceptLanguage
    .split(",")
    .map((lang) => {
      const [locale, q = "q=1"] = lang.trim().split(";");
      const quality = parseFloat(q.replace("q=", ""));
      return { locale: locale.trim(), quality };
    })
    .sort((a, b) => b.quality - a.quality);

  // 查找支持的语言
  for (const { locale } of languages) {
    // 精确匹配
    if (SUPPORTED_LOCALES.includes(locale as Locale)) {
      return locale as Locale;
    }

    // 部分匹配（例如 "zh" 匹配 "zh-CN"）
    const langCode = locale.split("-")[0];
    const matched = SUPPORTED_LOCALES.find((supported) =>
      supported.startsWith(langCode)
    );
    if (matched) {
      return matched;
    }
  }

  return DEFAULT_LOCALE;
}

/**
 * 获取语言包
 */
export function getMessages(locale: Locale): Messages {
  return messages[locale] || messages[DEFAULT_LOCALE];
}

/**
 * 翻译函数
 * 支持嵌套路径，例如: "db.init.start"
 * 支持参数替换，例如: "validation.minLength" with {min: 8}
 */
export function t(
  key: string,
  params?: Record<string, string | number>,
  locale: Locale = DEFAULT_LOCALE
): string {
  const messages = getMessages(locale);

  // 按点分割路径
  const keys = key.split(".");
  let value: any = messages;

  // 遍历路径
  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = value[k];
    } else {
      // 如果找不到，返回 key
      return key;
    }
  }

  // 如果最终值不是字符串，返回 key
  if (typeof value !== "string") {
    return key;
  }

  // 替换参数
  if (params) {
    return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
      return params[paramKey]?.toString() || match;
    });
  }

  return value;
}

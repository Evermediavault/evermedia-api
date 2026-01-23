/**
 * 辅助工具函数
 *
 * 包含各种通用的辅助函数
 */

/**
 * 安全地将值转换为整数
 *
 * @param value - 要转换的值
 * @param defaultValue - 转换失败时的默认值
 * @returns 转换后的整数值
 */
export const safeInt = (value: unknown, defaultValue: number = 0): number => {
  try {
    if (typeof value === "number") {
      return Math.floor(value);
    }
    if (typeof value === "string") {
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    return defaultValue;
  } catch {
    return defaultValue;
  }
};

/**
 * 安全地将值转换为浮点数
 *
 * @param value - 要转换的值
 * @param defaultValue - 转换失败时的默认值
 * @returns 转换后的浮点数值
 */
export const safeFloat = (value: unknown, defaultValue: number = 0.0): number => {
  try {
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string") {
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    return defaultValue;
  } catch {
    return defaultValue;
  }
};

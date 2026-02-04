import { isDevelopment } from "../core/config.js";
import { getLogger } from "../core/logger.js";

const log = getLogger("i18n");

/**
 * 从请求中取 i18n 文案；request.t 由 i18n 中间件在路由前注册注入。
 * 未注入时：开发环境打 warning，生产环境回退为 key。
 * @param request 带 t 的请求
 * @param key i18n key，缺 key 时 t 返回 key
 * @param params 占位参数，如 { name: "x" }
 */
export function getMsg(
  request: { t?: (key: string, params?: Record<string, string | number>) => string },
  key: string,
  params?: Record<string, string | number>
): string {
  if (!request.t) {
    if (isDevelopment()) {
      log.warn({ key, message: "i18n not injected (request.t missing), returning key" });
    }
    return key;
  }
  return request.t(key, params);
}

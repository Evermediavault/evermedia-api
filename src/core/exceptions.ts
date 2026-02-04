/**
 * 自定义异常类
 *
 * 定义应用级别的异常，用于统一错误处理
 */

/**
 * API异常基类
 *
 * 所有API异常都应继承此类
 */
export class BaseAPIException extends Error {
  public readonly statusCode: number;
  public readonly detail?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    detail?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.detail = detail;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 资源未找到异常（message 为 i18n key，由 errorHandler 用 getMsg 解析）
 */
export class NotFoundError extends BaseAPIException {
  constructor(message: string = "error.notFound", detail?: unknown) {
    super(message, 404, detail);
  }
}

/**
 * 请求参数错误异常
 */
export class BadRequestError extends BaseAPIException {
  constructor(message: string = "validation.badRequest", detail?: unknown) {
    super(message, 400, detail);
  }
}

/**
 * 未授权异常
 */
export class UnauthorizedError extends BaseAPIException {
  constructor(message: string = "auth.loginRequired", detail?: unknown) {
    super(message, 401, detail);
  }
}

/**
 * 禁止访问异常
 */
export class ForbiddenError extends BaseAPIException {
  constructor(message: string = "error.forbidden", detail?: unknown) {
    super(message, 403, detail);
  }
}

/**
 * 资源冲突异常
 */
export class ConflictError extends BaseAPIException {
  constructor(message: string = "error.conflict", detail?: unknown) {
    super(message, 409, detail);
  }
}

/**
 * 服务器内部错误异常
 */
export class InternalServerError extends BaseAPIException {
  constructor(message: string = "error.internalServerError", detail?: unknown) {
    super(message, 500, detail);
  }
}

/**
 * 数据库错误异常
 */
export class DatabaseError extends BaseAPIException {
  constructor(message: string = "error.dbOperationFailed", detail?: unknown) {
    super(message, 500, detail);
  }
}

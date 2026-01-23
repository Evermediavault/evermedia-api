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
 * 资源未找到异常
 */
export class NotFoundError extends BaseAPIException {
  constructor(message: string = "资源未找到", detail?: unknown) {
    super(message, 404, detail);
  }
}

/**
 * 请求参数错误异常
 */
export class BadRequestError extends BaseAPIException {
  constructor(message: string = "请求参数错误", detail?: unknown) {
    super(message, 400, detail);
  }
}

/**
 * 未授权异常
 */
export class UnauthorizedError extends BaseAPIException {
  constructor(message: string = "未授权访问", detail?: unknown) {
    super(message, 401, detail);
  }
}

/**
 * 禁止访问异常
 */
export class ForbiddenError extends BaseAPIException {
  constructor(message: string = "禁止访问", detail?: unknown) {
    super(message, 403, detail);
  }
}

/**
 * 资源冲突异常
 */
export class ConflictError extends BaseAPIException {
  constructor(message: string = "资源冲突", detail?: unknown) {
    super(message, 409, detail);
  }
}

/**
 * 服务器内部错误异常
 */
export class InternalServerError extends BaseAPIException {
  constructor(message: string = "服务器内部错误", detail?: unknown) {
    super(message, 500, detail);
  }
}

/**
 * 数据库错误异常
 */
export class DatabaseError extends BaseAPIException {
  constructor(message: string = "数据库操作失败", detail?: unknown) {
    super(message, 500, detail);
  }
}

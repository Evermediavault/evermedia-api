import { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { Prisma } from "@prisma/client";
import { getLogger } from "../core/logger.js";
import {
  BaseAPIException,
  DatabaseError,
  InternalServerError,
} from "../core/exceptions.js";
import { createErrorResponse } from "../schemas/response.js";
import { getMsg } from "../i18n/utils.js";
import { toErrorMessage } from "../utils/helpers.js";

const logger = getLogger("exception");

/**
 * 为错误响应补上 CORS 头（错误路径可能不经过 CORS 插件）
 */
function setCorsHeaders(request: FastifyRequest, reply: FastifyReply): void {
  const origin = request.headers.origin;
  reply.header("Access-Control-Allow-Origin", origin || "*");
  reply.header("Access-Control-Allow-Credentials", "true");
  reply.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD");
  reply.header("Access-Control-Allow-Headers", "*");
}

/**
 * 异常处理函数
 */
export const errorHandler = (
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): void => {
  setCorsHeaders(request, reply);

  // 处理自定义 API 异常
  if (error instanceof BaseAPIException) {
    logger.warn({
      message: getMsg(request, "log.apiException", "API exception"),
      errorMessage: error.message,
      statusCode: error.statusCode,
      detail: error.detail,
      path: request.url,
      method: request.method,
    });

    const errorResponse = createErrorResponse(
      error.message,
      error.statusCode,
      error.detail
    );

    reply.status(error.statusCode).send(errorResponse);
    return;
  }

  // 处理 Prisma 数据库异常
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    logger.error({
      message: getMsg(request, "log.dbError", "Database error"),
      error: error.message,
      code: error.code,
      meta: error.meta,
      path: request.url,
      method: request.method,
    });

    const dbError = new DatabaseError("数据库操作失败", {
      code: error.code,
      meta: error.meta,
    });

    const message = getMsg(request, "error.dbOperationFailed", dbError.message);
    const errorResponse = createErrorResponse(
      message,
      dbError.statusCode,
      process.env.DEBUG === "true" ? error.message : undefined
    );

    reply.status(dbError.statusCode).send(errorResponse);
    return;
  }

  // 处理 Prisma 客户端初始化错误
  if (error instanceof Prisma.PrismaClientInitializationError) {
    logger.error({
      message: getMsg(request, "log.dbConnectionError", "Database connection error"),
      error: error.message,
      path: request.url,
      method: request.method,
    });

    const dbError = new DatabaseError("数据库连接失败", error.message);

    const message = getMsg(request, "error.dbConnectionFailed", dbError.message);
    const errorResponse = createErrorResponse(
      message,
      dbError.statusCode,
      process.env.DEBUG === "true" ? error.message : undefined
    );

    reply.status(dbError.statusCode).send(errorResponse);
    return;
  }

  const errMsg = toErrorMessage(error);
  logger.error({
    message: getMsg(request, "log.unhandledError", "Unhandled error"),
    error: errMsg,
    errorType: error instanceof Error ? error.constructor.name : "Unknown",
    stack: error instanceof Error ? error.stack : undefined,
    path: request.url,
    method: request.method,
  });

  const internalError = new InternalServerError("服务器内部错误");
  const message = getMsg(request, "error.internalServerError", internalError.message);

  const errorResponse = createErrorResponse(
    message,
    internalError.statusCode,
    process.env.DEBUG === "true" ? errMsg : undefined
  );

  reply.status(internalError.statusCode).send(errorResponse);
};

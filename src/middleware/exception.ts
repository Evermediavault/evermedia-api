import { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { Prisma } from "@prisma/client";
import { getLogger } from "../core/logger.js";
import {
  BaseAPIException,
  DatabaseError,
  InternalServerError,
} from "../core/exceptions.js";
import { createErrorResponse } from "../schemas/response.js";

const logger = getLogger("exception");

/**
 * 异常处理函数
 */
export const errorHandler = (
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): void => {
  // 处理自定义 API 异常
  if (error instanceof BaseAPIException) {
    logger.warn({
      message: "API异常",
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
      message: "数据库异常",
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

    const errorResponse = createErrorResponse(
      dbError.message,
      dbError.statusCode,
      process.env.DEBUG === "true" ? error.message : undefined
    );

    reply.status(dbError.statusCode).send(errorResponse);
    return;
  }

  // 处理 Prisma 客户端初始化错误
  if (error instanceof Prisma.PrismaClientInitializationError) {
    logger.error({
      message: "数据库连接异常",
      error: error.message,
      path: request.url,
      method: request.method,
    });

    const dbError = new DatabaseError("数据库连接失败", error.message);

    const errorResponse = createErrorResponse(
      dbError.message,
      dbError.statusCode,
      process.env.DEBUG === "true" ? error.message : undefined
    );

    reply.status(dbError.statusCode).send(errorResponse);
    return;
  }

  // 处理其他未预期的异常
  logger.error({
    message: "未处理的异常",
    error: error.message,
    errorType: error.constructor.name,
    stack: error.stack,
    path: request.url,
    method: request.method,
  });

  const internalError = new InternalServerError("服务器内部错误");

  const errorResponse = createErrorResponse(
    internalError.message,
    internalError.statusCode,
    process.env.DEBUG === "true" ? error.message : undefined
  );

  reply.status(internalError.statusCode).send(errorResponse);
};

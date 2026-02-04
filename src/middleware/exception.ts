import { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { Prisma } from "@prisma/client";
import { getLogger } from "../core/logger.js";
import { settings, isProduction } from "../core/config.js";
import {
  BaseAPIException,
  DatabaseError,
  InternalServerError,
} from "../core/exceptions.js";
import { createErrorResponse } from "../schemas/response.js";
import { getMsg } from "../i18n/utils.js";
import { toErrorMessage } from "../utils/helpers.js";

/** 仅开发/测试环境且在 DEBUG 时在响应 detail 中暴露内部错误信息 */
function allowDetailInResponse(): boolean {
  return settings.DEBUG && !isProduction();
}

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

  // 处理自定义 API 异常（error.message 为 i18n key，统一用 getMsg 解析后返回）
  if (error instanceof BaseAPIException) {
    logger.warn({
      message: getMsg(request, "log.apiException"),
      errorMessage: error.message,
      statusCode: error.statusCode,
      detail: error.detail,
      path: request.url,
      method: request.method,
    });

    const message = getMsg(request, error.message);
    const errorResponse = createErrorResponse(
      message,
      error.statusCode,
      error.detail
    );

    reply.status(error.statusCode).send(errorResponse);
    return;
  }

  // 处理 Prisma 数据库异常
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    logger.error({
      message: getMsg(request, "log.dbError"),
      error: toErrorMessage(error),
      code: error.code,
      meta: error.meta,
      path: request.url,
      method: request.method,
    });

    const dbError = new DatabaseError("error.dbOperationFailed", {
      code: error.code,
      meta: error.meta,
    });

    const message = getMsg(request, dbError.message);
    const errorResponse = createErrorResponse(
      message,
      dbError.statusCode,
      allowDetailInResponse() ? toErrorMessage(error) : undefined
    );

    reply.status(dbError.statusCode).send(errorResponse);
    return;
  }

  // 处理 Prisma 客户端初始化错误
  if (error instanceof Prisma.PrismaClientInitializationError) {
    logger.error({
      message: getMsg(request, "log.dbConnectionError"),
      error: toErrorMessage(error),
      path: request.url,
      method: request.method,
    });

    const dbError = new DatabaseError("error.dbConnectionFailed", error.message);

    const message = getMsg(request, dbError.message);
    const errorResponse = createErrorResponse(
      message,
      dbError.statusCode,
      allowDetailInResponse() ? toErrorMessage(error) : undefined
    );

    reply.status(dbError.statusCode).send(errorResponse);
    return;
  }

  const errMsg = toErrorMessage(error);
  logger.error({
    message: getMsg(request, "log.unhandledError"),
    error: errMsg,
    errorType: error instanceof Error ? error.constructor.name : "Unknown",
    stack: error instanceof Error ? error.stack : undefined,
    path: request.url,
    method: request.method,
  });

  const internalError = new InternalServerError("error.internalServerError");
  const message = getMsg(request, internalError.message);

  const errorResponse = createErrorResponse(
    message,
    internalError.statusCode,
    allowDetailInResponse() ? errMsg : undefined
  );

  reply.status(internalError.statusCode).send(errorResponse);
};

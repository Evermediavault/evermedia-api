/**
 * 鉴权中间件：两层分离
 * 1. authToken：只验证 token 并设置 request.user，不拦截
 * 2. requireAuth：只根据 request.user 判断是否已登录，未登录则 401（不二次验证 token）
 *
 * 可选登录路由：preHandler: [authToken]，handler 内用 request.user 判断
 * 必须登录路由：preHandler: [authToken, requireAuth]
 * 必须角色：   preHandler: [authToken, requireAuth, requireRoles(['admin'])]
 * 必须管理员：preHandler: [authToken, requireAuth, requireAdmin]
 */
import type { FastifyRequest, FastifyReply } from "fastify";
import { UnauthorizedError, ForbiddenError } from "../core/exceptions.js";
import { createErrorResponse } from "../schemas/response.js";
import { getMsg } from "../i18n/utils.js";
import {
  extractBearerToken,
  verify,
  type AccessTokenPayload,
} from "../utils/jwt.js";

declare module "fastify" {
  interface FastifyRequest {
    /** 由 authToken 中间件在 JWT 有效时设置；未设置表示未登录。 */
    user?: AccessTokenPayload;
  }
}

/**
 * Token 验证中间件（PreHandler）
 * 只负责验证 token 是否有效：有且有效则设置 request.user，无或无效则不设置。
 * 不拦截请求，不返回 401。必须登录的路由应在此中间件之后挂 requireAuth。
 */
export async function authToken(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const token = extractBearerToken(request);
  if (!token) return;

  const payload = verify(token);
  if (payload) request.user = payload;
}

/**
 * 必须登录中间件（PreHandler）
 * 只根据上一步的上下文（request.user）判断是否已登录，不解析、不二次验证 token。
 * 须在 authToken 之后使用：preHandler: [authToken, requireAuth]。未登录则 401。
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.user) {
    const err = new UnauthorizedError("auth.loginRequired");
    return reply.status(err.statusCode).send(
      createErrorResponse(getMsg(request, "auth.loginRequired"), err.statusCode)
    );
  }
}

/** 必须登录：与 requireAuth 相同，语义化别名 */
export const requireLogin = requireAuth;

/**
 * 必须具有指定角色之一（PreHandler）
 * 须在 authToken + requireAuth 之后使用；仅做角色判断，不重复校验 request.user。
 */
export function requireRoles(roles: string[]) {
  const set = new Set(roles.map((r) => r.toLowerCase()));

  return async function (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const role = (request.user!.role ?? "").toLowerCase();
    if (!set.has(role)) {
      const err = new ForbiddenError("auth.permissionDenied");
      return reply.status(err.statusCode).send(
        createErrorResponse(getMsg(request, "auth.permissionDenied"), err.statusCode)
      );
    }
  };
}

/** 必须管理员（PreHandler），等价于 requireRoles(['admin']) */
export const requireAdmin = requireRoles(["admin"]);

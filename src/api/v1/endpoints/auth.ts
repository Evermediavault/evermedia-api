import { FastifyPluginAsync } from "fastify";
import { getDb } from "../../deps.js";
import { verifyPassword } from "../../../core/security.js";
import { createSuccessResponse } from "../../../schemas/response.js";
import { getMsg } from "../../../i18n/utils.js";
import { LoginBodySchema, toAuthUser } from "../../../schemas/auth.js";
import { sign, payloadFromUser } from "../../../utils/jwt.js";
import { authToken, requireAuth } from "../../../middleware/auth.js";
import { UnauthorizedError, ForbiddenError, BadRequestError } from "../../../core/exceptions.js";

/** 允许登录后台的角色（admin、uploader） */
const ALLOWED_LOGIN_ROLES = ["admin", "uploader"] as const;

/**
 * 登录相关路由
 */
export const authRouter: FastifyPluginAsync = async (fastify) => {
  /**
   * 获取当前登录用户信息（必须登录）
   * GET /auth/me
   */
  fastify.get<{}>(
    "/me",
    { preHandler: [authToken, requireAuth] },
    async (request, reply) => {
      const uid = request.user?.sub;
      if (!uid) {
        throw new UnauthorizedError("auth.loginRequired");
      }
      const prisma = getDb();
      const user = await prisma.user.findUnique({
        where: { uid },
        select: { uid: true, username: true, email: true, role: true, disabled: true },
      });
      if (!user) {
        throw new UnauthorizedError("auth.userNotFound");
      }
      if (user.disabled) {
        throw new ForbiddenError("auth.userDisabled");
      }
      return reply.status(200).send(
        createSuccessResponse(getMsg(request, "success.list"), {
          user: toAuthUser(user),
        })
      );
    }
  );

  /**
   * 后台登录（admin、uploader 可登录）
   * POST /auth/admin/login
   */
  fastify.post<{
    Body: { username?: string; password?: string };
  }>("/admin/login", async (request, reply) => {
    const parsed = LoginBodySchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError("auth.loginBodyRequired");
    }
    const { username, password } = parsed.data;
    const account = username.trim();

    const prisma = getDb();
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: account }, { email: account.toLowerCase() }],
      },
    });

    if (!user) {
      throw new UnauthorizedError("auth.invalidCredentials");
    }

    if (user.disabled) {
      throw new ForbiddenError("auth.userDisabled");
    }

    const ok = await verifyPassword(password, user.password);
    if (!ok) {
      throw new UnauthorizedError("auth.invalidCredentials");
    }

    const role = (user.role ?? "").toLowerCase();
    if (!ALLOWED_LOGIN_ROLES.includes(role as (typeof ALLOWED_LOGIN_ROLES)[number])) {
      throw new ForbiddenError("auth.permissionDenied");
    }

    const ip = request.ip ?? null;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        last_login_at: new Date(),
        last_login_ip: ip,
      },
    });

    const token = sign(payloadFromUser({
      uid: user.uid,
      role: user.role ?? undefined,
      username: user.username,
    }));

    return reply.status(200).send(
      createSuccessResponse(getMsg(request, "success.login"), {
        token,
        user: toAuthUser(user),
      })
    );
  });
};

import { FastifyPluginAsync } from "fastify";
import { getDb } from "../../deps.js";
import { verifyPassword } from "../../../core/security.js";
import { createSuccessResponse } from "../../../schemas/response.js";
import { getMsg } from "../../../i18n/utils.js";
import { LoginBodySchema, toAuthUser } from "../../../schemas/auth.js";
import { sign, payloadFromUser } from "../../../utils/jwt.js";
import { authToken, requireAuth } from "../../../middleware/auth.js";
import { UnauthorizedError, ForbiddenError, BadRequestError } from "../../../core/exceptions.js";

const ADMIN_ROLE = "admin";

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
        throw new UnauthorizedError(getMsg(request, "auth.loginRequired", "Please login first"));
      }
      const prisma = getDb();
      const user = await prisma.user.findUnique({
        where: { uid },
        select: { uid: true, username: true, email: true, role: true },
      });
      if (!user) {
        throw new UnauthorizedError(getMsg(request, "auth.userNotFound", "User not found"));
      }
      return reply.status(200).send(
        createSuccessResponse(getMsg(request, "success.list", "Retrieved successfully"), {
          user: toAuthUser(user),
        })
      );
    }
  );

  /**
   * 管理员登录
   * POST /auth/admin/login
   */
  fastify.post<{
    Body: { username?: string; password?: string };
  }>("/admin/login", async (request, reply) => {
    const parsed = LoginBodySchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError(
        getMsg(request, "auth.loginBodyRequired", "Username and password are required")
      );
    }
    const { username, password } = parsed.data;

    const prisma = getDb();
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      throw new UnauthorizedError(getMsg(request, "auth.invalidCredentials", "Invalid username or password"));
    }

    const ok = await verifyPassword(password, user.password);
    if (!ok) {
      throw new UnauthorizedError(getMsg(request, "auth.invalidCredentials", "Invalid username or password"));
    }

    if ((user.role ?? "").toLowerCase() !== ADMIN_ROLE) {
      throw new ForbiddenError(getMsg(request, "auth.permissionDenied", "Admin role required"));
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
      createSuccessResponse(getMsg(request, "success.login", "Login successful"), {
        token,
        user: toAuthUser(user),
      })
    );
  });
};

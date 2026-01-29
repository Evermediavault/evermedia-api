import { FastifyPluginAsync } from "fastify";
import { getDb } from "../../deps.js";
import { verifyPassword } from "../../../core/security.js";
import { createSuccessResponse, createErrorResponse } from "../../../schemas/response.js";
import { LoginBodySchema } from "../../../schemas/auth.js";
import { sign, payloadFromUser } from "../../../utils/jwt.js";

const ADMIN_ROLE = "admin";

/**
 * 登录相关路由
 */
export const authRouter: FastifyPluginAsync = async (fastify) => {
  /**
   * 管理员登录
   * POST /auth/admin/login
   * Body: { username, password }
   * 成功：返回 token 与用户信息（仅管理员可登录此接口）
   */
  fastify.post<{
    Body: { username?: string; password?: string };
  }>("/admin/login", async (request, reply) => {
    const parsed = LoginBodySchema.safeParse(request.body);
    if (!parsed.success) {
      const msg = request.t ? request.t("validation.required") : "Username and password are required";
      return reply.status(400).send(createErrorResponse(msg, 400, parsed.error.flatten()));
    }
    const { username, password } = parsed.data;

    const prisma = getDb();
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      const msg = request.t ? request.t("auth.invalidCredentials") : "Invalid username or password";
      return reply.status(401).send(createErrorResponse(msg, 401));
    }

    const ok = await verifyPassword(password, user.password);
    if (!ok) {
      const msg = request.t ? request.t("auth.invalidCredentials") : "Invalid username or password";
      return reply.status(401).send(createErrorResponse(msg, 401));
    }

    if ((user.role ?? "").toLowerCase() !== ADMIN_ROLE) {
      const msg = request.t ? request.t("auth.permissionDenied") : "Admin role required";
      return reply.status(403).send(createErrorResponse(msg, 403));
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
      createSuccessResponse(request.t ? request.t("success.login") : "Login successful", {
        token,
        user: {
          uid: user.uid,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      })
    );
  });
};

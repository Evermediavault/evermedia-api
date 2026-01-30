import { FastifyPluginAsync } from "fastify";
import { getDb } from "../../deps.js";
import { authToken, requireAuth, requireAdmin } from "../../../middleware/auth.js";
import { createErrorResponse, createPaginationMeta } from "../../../schemas/response.js";
import {
  UserListQuerySchema,
  type UserListQuery,
  type UserListItem,
} from "../../../schemas/user.js";

/** 用户管理路由（仅管理员） */
export const usersRouter: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /users
   * 分页、排序；Query: page, page_size, sort_by, order
   */
  fastify.get<{ Querystring: UserListQuery }>(
    "/",
    { preHandler: [authToken, requireAuth, requireAdmin] },
    async (request, reply) => {
      const parsed = UserListQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        const msg =
          request.t ? request.t("validation.invalidParams") : "Invalid query parameters";
        return reply.status(400).send(createErrorResponse(msg, 400, parsed.error.flatten()));
      }
      const { page, page_size, sort_by, order } = parsed.data;
      const prisma = getDb();

      const [list, total] = await Promise.all([
        prisma.user.findMany({
          select: {
            id: true,
            uid: true,
            username: true,
            email: true,
            role: true,
            last_login_at: true,
            created_at: true,
          },
          orderBy: { [sort_by]: order },
          skip: (page - 1) * page_size,
          take: page_size,
        }),
        prisma.user.count(),
      ]);

      const data: UserListItem[] = list.map((row) => ({
        id: row.id,
        uid: row.uid,
        username: row.username,
        email: row.email,
        role: row.role ?? "user",
        last_login_at: row.last_login_at?.toISOString() ?? null,
        created_at: row.created_at.toISOString(),
      }));

      const meta = createPaginationMeta(page, page_size, total);
      const message = request.t ? request.t("success.list") : "OK";
      return reply.status(200).send({
        success: true as const,
        message,
        data,
        meta,
      });
    }
  );
};

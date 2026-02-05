/**
 * 统计路由：GET /stats
 * 需登录；返回 file_count、category_count；管理员额外返回 user_count
 */
import { FastifyPluginAsync } from "fastify";
import { getPrismaClient } from "../../../db/client.js";
import { authToken, requireAuth } from "../../../middleware/auth.js";
import { createSuccessResponse } from "../../../schemas/response.js";
import { getMsg } from "../../../i18n/utils.js";

export const statsRouter: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/",
    { preHandler: [authToken, requireAuth] },
    async (request, reply) => {
      const prisma = getPrismaClient();
      const isAdmin = (request.user!.role ?? "").toLowerCase() === "admin";

      const [fileCount, categoryCount, userCount] = await Promise.all([
        prisma.file.count({ where: { deleted_at: null, permission: "public" } }),
        prisma.category.count(),
        isAdmin ? prisma.user.count() : Promise.resolve(null),
      ]);

      const data: { file_count: number; category_count: number; user_count?: number } = {
        file_count: fileCount,
        category_count: categoryCount,
      };
      if (userCount !== null) {
        data.user_count = userCount;
      }

      const message = getMsg(request, "success.list");
      return reply.status(200).send(createSuccessResponse(message, data));
    }
  );
};

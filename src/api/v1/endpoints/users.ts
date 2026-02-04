import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { getDb } from "../../deps.js";
import { authToken, requireAuth, requireAdmin } from "../../../middleware/auth.js";
import {
  createPaginationMeta,
  createPaginatedResponse,
  createSuccessResponse,
} from "../../../schemas/response.js";
import { getMsg } from "../../../i18n/utils.js";
import { getPasswordHash } from "../../../core/security.js";
import { BadRequestError, NotFoundError, ConflictError } from "../../../core/exceptions.js";
import type { PrismaClient } from "@prisma/client";
import {
  UserListQuerySchema,
  CreateOrUpdateUserBodySchema,
  SetUserDisabledBodySchema,
  type UserListQuery,
  type UserListItem,
  type CreateOrUpdateUserBody,
} from "../../../schemas/user.js";

/** 校验用户名、邮箱唯一；excludeUserId 为编辑时的当前用户 id，不参与重复判断 */
async function assertUserUnique(
  prisma: PrismaClient,
  payload: { username: string; email: string },
  excludeUserId?: number
): Promise<void> {
  const [dupUsername, dupEmail] = await Promise.all([
    prisma.user.findUnique({ where: { username: payload.username }, select: { id: true } }),
    prisma.user.findUnique({ where: { email: payload.email }, select: { id: true } }),
  ]);
  const exclude = excludeUserId ?? -1;
  if (dupUsername && dupUsername.id !== exclude) throw new ConflictError("user.usernameExists");
  if (dupEmail && dupEmail.id !== exclude) throw new ConflictError("user.emailExists");
}

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
        throw new BadRequestError("validation.invalidParams", parsed.error.flatten());
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
            disabled: true,
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
        disabled: row.disabled ?? false,
        last_login_at: row.last_login_at?.toISOString() ?? null,
        created_at: row.created_at.toISOString(),
      }));

      const meta = createPaginationMeta(page, page_size, total);
      const message = getMsg(request, "success.list");
      return reply.status(200).send(createPaginatedResponse(message, data, meta));
    }
  );

  /**
   * POST /users
   * 添加用户（无 user_id）或编辑用户（传 user_id）；仅管理员。用户名、邮箱唯一。
   */
  fastify.post<{ Body: CreateOrUpdateUserBody }>(
    "/",
    { preHandler: [authToken, requireAuth, requireAdmin] },
    async (request, reply) => {
      const parsed = CreateOrUpdateUserBodySchema.safeParse(request.body);
      if (!parsed.success) {
        throw new BadRequestError("validation.invalidParams", parsed.error.flatten());
      }
      const { user_id, username, email, password, role } = parsed.data;
      const prisma = getDb();

      if (user_id) {
        const existing = await prisma.user.findUnique({ where: { uid: user_id } });
        if (!existing) {
          throw new NotFoundError("user.notFound");
        }
        await assertUserUnique(prisma, { username, email }, existing.id);
        const updateData: { username: string; email: string; role: string; password?: string } = {
          username,
          email,
          role,
        };
        if (password != null && password.length > 0) {
          updateData.password = await getPasswordHash(password);
        }
        const updated = await prisma.user.update({
          where: { uid: user_id },
          data: updateData,
          select: { uid: true, username: true, email: true, role: true, disabled: true, created_at: true },
        });
        const message = getMsg(request, "user.updated");
        return reply.status(200).send(createSuccessResponse(message, { user: updated }));
      }

      await assertUserUnique(prisma, { username, email });
      const hashedPassword = await getPasswordHash(password!);
      const created = await prisma.user.create({
        data: { username, email, password: hashedPassword, role },
        select: { uid: true, username: true, email: true, role: true, disabled: true, created_at: true },
      });
      const message = getMsg(request, "user.created");
      return reply.status(201).send(createSuccessResponse(message, { user: created }));
    }
  );

  /**
   * PATCH /users/:uid/disabled
   * 禁用/解禁用户（仅管理员）；body: { disabled: boolean }
   */
  fastify.patch<{
    Params: { uid: string };
    Body: { disabled?: unknown };
  }>(
    "/:uid/disabled",
    { preHandler: [authToken, requireAuth, requireAdmin] },
    async (request, reply) => {
      const paramsParsed = z.string().uuid().safeParse(request.params.uid);
      if (!paramsParsed.success) {
        throw new BadRequestError("validation.invalidParams");
      }
      const uid = paramsParsed.data;
      const bodyParsed = SetUserDisabledBodySchema.safeParse(request.body);
      if (!bodyParsed.success) {
        throw new BadRequestError("validation.invalidParams", bodyParsed.error.flatten());
      }
      const { disabled } = bodyParsed.data;
      const prisma = getDb();
      const existing = await prisma.user.findUnique({ where: { uid }, select: { id: true } });
      if (!existing) {
        throw new NotFoundError("user.notFound");
      }
      const updated = await prisma.user.update({
        where: { uid },
        data: { disabled },
        select: { uid: true, username: true, email: true, role: true, disabled: true, created_at: true },
      });
      const message = getMsg(request, "user.updated");
      return reply.status(200).send(createSuccessResponse(message, { user: updated }));
    }
  );
};

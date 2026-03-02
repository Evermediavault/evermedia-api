import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { getPrismaClient } from "../../../db/client.js";
import { authToken, requireAuth, requireAdmin } from "../../../middleware/auth.js";
import {
  createPaginationMeta,
  createPaginatedResponse,
  createSuccessResponse,
} from "../../../schemas/response.js";
import { getMsg } from "../../../i18n/utils.js";
import { getPasswordHash } from "../../../core/security.js";
import { BadRequestError, NotFoundError, ConflictError, ForbiddenError } from "../../../core/exceptions.js";
import type { PrismaClient } from "@prisma/client";
import {
  UserListQuerySchema,
  CreateOrUpdateUserBodySchema,
  SetUserDisabledBodySchema,
  ALLIANCE_META_KEYS,
  type UserListQuery,
  type UserListItem,
  type CreateOrUpdateUserBody,
  type AllianceMemberMeta,
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

function metaRowsToAllianceMeta(rows: { meta_key: string; meta_value: string }[]): AllianceMemberMeta | undefined {
  const map = new Map(rows.map((r) => [r.meta_key, r.meta_value]));
  const logo = map.get("logo");
  const project_name = map.get("project_name");
  const intro = map.get("intro");
  const website = map.get("website");
  const twitter = map.get("twitter");
  if (logo == null || project_name == null || intro == null || website == null || twitter == null) return undefined;
  return { logo, project_name, intro, website, twitter };
}

async function upsertAllianceMeta(
  prisma: PrismaClient,
  userId: number,
  meta: AllianceMemberMeta
): Promise<void> {
  await prisma.$transaction([
    prisma.userMeta.deleteMany({ where: { user_id: userId, meta_key: { in: [...ALLIANCE_META_KEYS] } } }),
    ...ALLIANCE_META_KEYS.map((meta_key) =>
      prisma.userMeta.create({
        data: { user_id: userId, meta_key, meta_value: meta[meta_key] ?? "" },
      })
    ),
  ]);
}

async function clearAllianceMeta(prisma: PrismaClient, userId: number): Promise<void> {
  await prisma.userMeta.deleteMany({ where: { user_id: userId, meta_key: { in: [...ALLIANCE_META_KEYS] } } });
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
      const prisma = getPrismaClient();

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
            userMeta: { where: { meta_key: { in: [...ALLIANCE_META_KEYS] } }, select: { meta_key: true, meta_value: true } },
          },
          orderBy: { [sort_by]: order },
          skip: (page - 1) * page_size,
          take: page_size,
        }),
        prisma.user.count(),
      ]);

      const data: UserListItem[] = list.map((row) => {
        const item: UserListItem = {
          id: row.id,
          uid: row.uid,
          username: row.username,
          email: row.email,
          role: row.role ?? "user",
          disabled: row.disabled ?? false,
          last_login_at: row.last_login_at?.toISOString() ?? null,
          created_at: row.created_at.toISOString(),
        };
        if (row.role === "alliance_member" && row.userMeta?.length) {
          item.alliance_meta = metaRowsToAllianceMeta(row.userMeta);
        }
        return item;
      });

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
      const { user_id, username, email, password, role, logo, project_name, intro, website, twitter } = parsed.data;
      const prisma = getPrismaClient();

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
          select: { id: true, uid: true, username: true, email: true, role: true, disabled: true, created_at: true },
        });
        if (role === "alliance_member" && logo != null && project_name != null) {
          const allianceMeta = { logo, project_name, intro: intro ?? "", website: website ?? "", twitter: twitter ?? "" };
          await upsertAllianceMeta(prisma, updated.id, allianceMeta);
          const message = getMsg(request, "user.updated");
          return reply.status(200).send(
            createSuccessResponse(message, {
              user: {
                uid: updated.uid,
                username: updated.username,
                email: updated.email,
                role: updated.role,
                disabled: updated.disabled,
                created_at: updated.created_at,
                alliance_meta: allianceMeta,
              },
            })
          );
        }
        if (role !== "alliance_member") {
          await clearAllianceMeta(prisma, updated.id);
        }
        const message = getMsg(request, "user.updated");
        return reply.status(200).send(
          createSuccessResponse(message, {
            user: { uid: updated.uid, username: updated.username, email: updated.email, role: updated.role, disabled: updated.disabled, created_at: updated.created_at },
          })
        );
      }

      await assertUserUnique(prisma, { username, email });
      const hashedPassword = await getPasswordHash(password!);
      const created = await prisma.user.create({
        data: { username, email, password: hashedPassword, role },
        select: { id: true, uid: true, username: true, email: true, role: true, disabled: true, created_at: true },
      });
      if (role === "alliance_member" && logo != null && project_name != null) {
        const allianceMeta = { logo, project_name, intro: intro ?? "", website: website ?? "", twitter: twitter ?? "" };
        await upsertAllianceMeta(prisma, created.id, allianceMeta);
      }
      const alliance_meta =
        role === "alliance_member" && logo != null && project_name != null
          ? { logo, project_name, intro: intro ?? "", website: website ?? "", twitter: twitter ?? "" }
          : undefined;
      const message = getMsg(request, "user.created");
      return reply.status(201).send(
        createSuccessResponse(message, {
          user: { uid: created.uid, username: created.username, email: created.email, role: created.role, disabled: created.disabled, created_at: created.created_at, ...(alliance_meta ? { alliance_meta } : {}) },
        })
      );
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
      const prisma = getPrismaClient();
      const existing = await prisma.user.findUnique({ where: { uid }, select: { id: true } });
      if (!existing) {
        throw new NotFoundError("user.notFound");
      }
      if (disabled === true && existing.id === 1) {
        throw new ForbiddenError("user.cannotDisablePrimary");
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

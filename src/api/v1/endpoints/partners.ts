/**
 * 合作伙伴路由
 * GET /partners/manage：管理员分页列表（须注册在 / 与 /:id 之前）
 * GET /partners/tags：公开；返回所有已使用标签去重后的字符串数组（无分页）
 * GET /partners：公开列表，按配置 PARTNER_PUBLIC_LIST_MAX 限制条数；Query 可选 tag（精确匹配）
 * POST /partners：仅管理员；body 带 id 为更新，否则创建
 * DELETE /partners/:id：仅管理员，按主键删除
 */
import { FastifyPluginAsync } from "fastify";
import { Prisma } from "@prisma/client";
import { getPrismaClient } from "../../../db/client.js";
import { settings } from "../../../core/config.js";
import { authToken, requireAuth, requireAdmin } from "../../../middleware/auth.js";
import {
  createArraySuccessResponse,
  createPaginationMeta,
  createPaginatedResponse,
  createSuccessResponse,
} from "../../../schemas/response.js";
import { getMsg } from "../../../i18n/utils.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../../core/exceptions.js";
import {
  UpsertPartnerBodySchema,
  PartnerIdParamSchema,
  PartnerPublicListQuerySchema,
  PartnerAdminListQuerySchema,
  type PartnerItem,
  type PartnerPublicListQuery,
  type PartnerAdminListQuery,
  type UpsertPartnerBody,
} from "../../../schemas/partner.js";

function toPartnerItem(row: {
  id: number;
  logo: string;
  tag: string | null;
  name: string;
  description: string | null;
  link: string;
  created_at: Date;
  updated_at: Date;
}): PartnerItem {
  return {
    id: row.id,
    logo: row.logo,
    tag: row.tag ?? null,
    name: row.name,
    description: row.description ?? null,
    link: row.link,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

function isPrismaUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

export const partnersRouter: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /partners/manage
   * 管理员分页列表（全量查询，不受 PARTNER_PUBLIC_LIST_MAX 限制）
   */
  fastify.get<{ Querystring: PartnerAdminListQuery }>(
    "/manage",
    { preHandler: [authToken, requireAuth, requireAdmin] },
    async (request, reply) => {
      const parsed = PartnerAdminListQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        throw new BadRequestError("validation.invalidParams", parsed.error.flatten());
      }
      const { page, page_size, sort_by, order } = parsed.data;
      const prisma = getPrismaClient();
      const [list, total] = await Promise.all([
        prisma.partner.findMany({
          orderBy: { [sort_by]: order },
          skip: (page - 1) * page_size,
          take: page_size,
        }),
        prisma.partner.count(),
      ]);
      const data = list.map(toPartnerItem);
      const meta = createPaginationMeta(page, page_size, total);
      const message = getMsg(request, "success.list");
      return reply.status(200).send(createPaginatedResponse(message, data, meta));
    }
  );

  /**
   * GET /partners/tags
   * 公开；distinct tag，非空，按字符串排序；data 为 string[]
   */
  fastify.get("/tags", async (request, reply) => {
    const prisma = getPrismaClient();
    const grouped = await prisma.partner.groupBy({
      by: ["tag"],
      where: { tag: { not: null } },
    });
    const tags = [
      ...new Set(
        grouped
          .map((g) => g.tag)
          .filter((t): t is string => t != null && t.trim().length > 0)
          .map((t) => t.trim())
      ),
    ].sort((a, b) => a.localeCompare(b));
    const message = getMsg(request, "success.get");
    return reply.status(200).send(createArraySuccessResponse(message, tags));
  });

  /**
   * GET /partners
   * 公开；无分页；可选 ?tag= 按标签精确筛选
   */
  fastify.get<{ Querystring: PartnerPublicListQuery }>("/", async (request, reply) => {
    const parsed = PartnerPublicListQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw new BadRequestError("validation.invalidParams", parsed.error.flatten());
    }
    const tagFilter = parsed.data.tag;
    const prisma = getPrismaClient();
    const list = await prisma.partner.findMany({
      where: tagFilter ? { tag: tagFilter } : {},
      orderBy: { created_at: "desc" },
      take: settings.PARTNER_PUBLIC_LIST_MAX,
    });
    const data: PartnerItem[] = list.map(toPartnerItem);
    const message = getMsg(request, "success.list");
    return reply.status(200).send(createArraySuccessResponse(message, data));
  });

  fastify.post<{ Body: UpsertPartnerBody }>(
    "/",
    { preHandler: [authToken, requireAuth, requireAdmin] },
    async (request, reply) => {
      const parsed = UpsertPartnerBodySchema.safeParse(request.body);
      if (!parsed.success) {
        throw new BadRequestError("validation.invalidParams", parsed.error.flatten());
      }
      const body = parsed.data;
      const nameTrim = body.name.trim();
      if (!nameTrim) {
        throw new BadRequestError("validation.invalidParams");
      }
      const logoTrim = body.logo.trim();
      const linkTrim = body.link.trim();
      const tagTrim = body.tag ?? null;
      const description = body.description?.trim() || null;

      const prisma = getPrismaClient();

      if (body.id != null) {
        const existing = await prisma.partner.findUnique({ where: { id: body.id } });
        if (!existing) {
          throw new NotFoundError("partner.notFound");
        }
        const dup = await prisma.partner.findFirst({
          where: { name: nameTrim, NOT: { id: body.id } },
          select: { id: true },
        });
        if (dup) {
          throw new ConflictError("partner.nameExists");
        }
        try {
          const row = await prisma.partner.update({
            where: { id: body.id },
            data: {
              logo: logoTrim,
              tag: tagTrim,
              name: nameTrim,
              description,
              link: linkTrim,
            },
          });
          const message = getMsg(request, "success.updated");
          return reply.status(200).send(createSuccessResponse(message, toPartnerItem(row)));
        } catch (e) {
          if (isPrismaUniqueViolation(e)) {
            throw new ConflictError("partner.nameExists");
          }
          throw e;
        }
      }

      const dup = await prisma.partner.findFirst({
        where: { name: nameTrim },
        select: { id: true },
      });
      if (dup) {
        throw new ConflictError("partner.nameExists");
      }
      try {
        const row = await prisma.partner.create({
          data: {
            logo: logoTrim,
            tag: tagTrim,
            name: nameTrim,
            description,
            link: linkTrim,
          },
        });
        const message = getMsg(request, "success.created");
        return reply.status(201).send(createSuccessResponse(message, toPartnerItem(row)));
      } catch (e) {
        if (isPrismaUniqueViolation(e)) {
          throw new ConflictError("partner.nameExists");
        }
        throw e;
      }
    }
  );

  fastify.delete<{ Params: { id: string } }>(
    "/:id",
    { preHandler: [authToken, requireAuth, requireAdmin] },
    async (request, reply) => {
      const parsedId = PartnerIdParamSchema.safeParse(request.params.id);
      if (!parsedId.success) {
        throw new BadRequestError("validation.invalidParams", parsedId.error.flatten());
      }
      const id = parsedId.data;
      const prisma = getPrismaClient();
      const existing = await prisma.partner.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundError("partner.notFound");
      }
      await prisma.partner.delete({ where: { id } });
      const message = getMsg(request, "success.deleted");
      return reply.status(200).send(createSuccessResponse(message));
    }
  );
};

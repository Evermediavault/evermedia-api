/**
 * 分类路由
 * GET /categories：分类列表，所有已登录用户可访问
 * POST /categories、PATCH /categories/:uid、DELETE /categories/:uid：仅管理员；分类名称不得重复；默认分类不可删除
 */
import { FastifyPluginAsync } from "fastify";
import { getPrismaClient } from "../../../db/client.js";
import { authToken, requireAuth, requireAdmin } from "../../../middleware/auth.js";
import {
  createPaginationMeta,
  createPaginatedResponse,
  createSuccessResponse,
} from "../../../schemas/response.js";
import { getMsg } from "../../../i18n/utils.js";
import { BadRequestError, NotFoundError, ConflictError, InternalServerError } from "../../../core/exceptions.js";
import {
  CategoryListQuerySchema,
  CreateCategoryBodySchema,
  UpdateCategoryBodySchema,
  type CategoryListQuery,
  type CategoryListItem,
  type CreateCategoryBody,
  type UpdateCategoryBody,
} from "../../../schemas/category.js";

function toCategoryListItem(row: {
  id: number;
  uid: string;
  name: string;
  description: string | null;
  is_default: boolean;
  created_at: Date;
  _count?: { files: number };
}): CategoryListItem {
  return {
    id: row.id,
    uid: row.uid,
    name: row.name,
    description: row.description ?? null,
    is_default: row.is_default,
    created_at: row.created_at.toISOString(),
    file_count: row._count?.files ?? 0,
  };
}

export const categoriesRouter: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /categories
   * 分页、排序；Query: page, page_size, sort_by, order；所有已登录用户可见
   */
  fastify.get<{ Querystring: CategoryListQuery }>(
    "/",
    { preHandler: [authToken, requireAuth] },
    async (request, reply) => {
      const parsed = CategoryListQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        throw new BadRequestError("validation.invalidParams", parsed.error.flatten());
      }
      const { page, page_size, sort_by, order } = parsed.data;
      const prisma = getPrismaClient();

      const [list, total] = await Promise.all([
        prisma.category.findMany({
          select: {
            id: true,
            uid: true,
            name: true,
            description: true,
            is_default: true,
            created_at: true,
            _count: { select: { files: true } },
          },
          orderBy: { [sort_by]: order },
          skip: (page - 1) * page_size,
          take: page_size,
        }),
        prisma.category.count(),
      ]);

      const data = list.map(toCategoryListItem);
      const meta = createPaginationMeta(page, page_size, total);
      const message = getMsg(request, "success.list");
      return reply.status(200).send(createPaginatedResponse(message, data, meta));
    }
  );

  /**
   * POST /categories
   * 创建分类（仅管理员）；body: name, description?；分类名称不得重复
   */
  fastify.post<{ Body: CreateCategoryBody }>(
    "/",
    { preHandler: [authToken, requireAuth, requireAdmin] },
    async (request, reply) => {
      const parsed = CreateCategoryBodySchema.safeParse(request.body);
      if (!parsed.success) {
        throw new BadRequestError("validation.invalidParams", parsed.error.flatten());
      }
      const nameTrim = parsed.data.name.trim();
      const description = parsed.data.description?.trim() || null;
      const prisma = getPrismaClient();
      const dup = await prisma.category.findFirst({ where: { name: nameTrim }, select: { id: true } });
      if (dup) {
        throw new ConflictError("category.nameExists");
      }
      const row = await prisma.category.create({
        data: { name: nameTrim, description },
      });
      const message = getMsg(request, "success.created");
      return reply.status(201).send(createSuccessResponse(message, toCategoryListItem(row)));
    }
  );

  /**
   * PATCH /categories/:uid
   * 更新分类（仅管理员）；分类名称不得与其他分类重复
   */
  fastify.patch<{ Params: { uid: string }; Body: UpdateCategoryBody }>(
    "/:uid",
    { preHandler: [authToken, requireAuth, requireAdmin] },
    async (request, reply) => {
      const { uid } = request.params;
      const parsed = UpdateCategoryBodySchema.safeParse(request.body);
      if (!parsed.success) {
        throw new BadRequestError("validation.invalidParams", parsed.error.flatten());
      }
      const body = parsed.data;
      const prisma = getPrismaClient();
      const existing = await prisma.category.findUnique({ where: { uid } });
      if (!existing) {
        throw new NotFoundError("category.notFound");
      }
      const updateData: { name?: string; description?: string | null } = {};
      if (body.name !== undefined) {
        const nameTrim = body.name.trim();
        const dup = await prisma.category.findFirst({
          where: { name: nameTrim, uid: { not: uid } },
          select: { id: true },
        });
        if (dup) {
          throw new ConflictError("category.nameExists");
        }
        updateData.name = nameTrim;
      }
      if (body.description !== undefined) updateData.description = body.description?.trim() || null;
      const row = await prisma.category.update({
        where: { uid },
        data: updateData,
      });
      const message = getMsg(request, "success.updated");
      return reply.status(200).send(createSuccessResponse(message, toCategoryListItem(row)));
    }
  );

  /**
   * DELETE /categories/:uid
   * 删除分类（仅管理员）；事务：1. 默认分类不可删 2. 无文件则直接删 3. 有文件则先归到默认分类再删
   */
  fastify.delete<{ Params: { uid: string } }>(
    "/:uid",
    { preHandler: [authToken, requireAuth, requireAdmin] },
    async (request, reply) => {
      const { uid } = request.params;
      const prisma = getPrismaClient();

      await prisma.$transaction(async (tx) => {
        const existing = await tx.category.findUnique({
          where: { uid },
          select: { id: true, is_default: true },
        });
        if (!existing) {
          throw new NotFoundError("category.notFound");
        }
        if (existing.is_default) {
          throw new BadRequestError("category.cannotDeleteDefault");
        }

        const fileCount = await tx.file.count({
          where: { category_id: existing.id },
        });

        if (fileCount > 0) {
          const defaultCategory = await tx.category.findFirst({
            where: { is_default: true },
            select: { id: true },
          });
          if (!defaultCategory) {
            throw new InternalServerError("category.defaultNotFound");
          }
          await tx.file.updateMany({
            where: { category_id: existing.id },
            data: { category_id: defaultCategory.id },
          });
        }

        await tx.category.delete({ where: { uid } });
      });

      const message = getMsg(request, "success.deleted");
      return reply.status(200).send(createSuccessResponse(message));
    }
  );
};

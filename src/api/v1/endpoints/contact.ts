/**
 * Contact Us
 * POST /contact：公开提交；同 IP 一小时内仅一次
 * GET /contact：管理员分页列表
 * DELETE /contact/:id：管理员按 id 删除单条
 */
import { FastifyPluginAsync } from "fastify";
import { Prisma } from "@prisma/client";
import { getPrismaClient } from "../../../db/client.js";
import { authToken, requireAuth, requireAdmin } from "../../../middleware/auth.js";
import {
  createPaginationMeta,
  createPaginatedResponse,
  createSuccessResponse,
} from "../../../schemas/response.js";
import { getMsg } from "../../../i18n/utils.js";
import { BadRequestError, NotFoundError, TooManyRequestsError } from "../../../core/exceptions.js";
import {
  ContactSubmitBodySchema,
  ContactListQuerySchema,
  ContactIdParamSchema,
  type ContactListItem,
  type ContactListQuery,
} from "../../../schemas/contact.js";

const RATE_WINDOW_MS = 60 * 60 * 1000;

function toContactListItem(row: {
  id: number;
  user_name: string;
  email: string;
  content: string;
  ip: string;
  created_at: Date;
}): ContactListItem {
  return {
    id: row.id,
    user_name: row.user_name,
    email: row.email,
    content: row.content,
    ip: row.ip,
    created_at: row.created_at.toISOString(),
  };
}

function clientIp(request: { ip?: string }): string {
  return request.ip?.trim() || "unknown";
}

export const contactRouter: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    "/",
    async (request, reply) => {
      const parsed = ContactSubmitBodySchema.safeParse(request.body);
      if (!parsed.success) {
        throw new BadRequestError("validation.invalidParams", parsed.error.flatten());
      }
      const { user_name, email, content } = parsed.data;
      const ip = clientIp(request);
      const prisma = getPrismaClient();
      const since = new Date(Date.now() - RATE_WINDOW_MS);

      const row = await prisma.$transaction(
        async (tx) => {
          const recent = await tx.contactSubmission.findFirst({
            where: { ip, created_at: { gte: since } },
            select: { id: true },
          });
          if (recent) {
            throw new TooManyRequestsError("contact.submitTooOften");
          }
          return tx.contactSubmission.create({
            data: {
              user_name,
              email,
              content,
              ip,
            },
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5000,
          timeout: 10000,
        }
      );

      const message = getMsg(request, "success.created");
      return reply.status(201).send(
        createSuccessResponse(message, {
          id: row.id,
          created_at: row.created_at.toISOString(),
        })
      );
    }
  );

  fastify.get<{ Querystring: ContactListQuery }>(
    "/",
    { preHandler: [authToken, requireAuth, requireAdmin] },
    async (request, reply) => {
      const parsed = ContactListQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        throw new BadRequestError("validation.invalidParams", parsed.error.flatten());
      }
      const { page, page_size, sort_by, order } = parsed.data;
      const prisma = getPrismaClient();

      const [list, total] = await Promise.all([
        prisma.contactSubmission.findMany({
          select: {
            id: true,
            user_name: true,
            email: true,
            content: true,
            ip: true,
            created_at: true,
          },
          orderBy: { [sort_by]: order },
          skip: (page - 1) * page_size,
          take: page_size,
        }),
        prisma.contactSubmission.count(),
      ]);

      const data = list.map(toContactListItem);
      const meta = createPaginationMeta(page, page_size, total);
      const message = getMsg(request, "success.list");
      return reply.status(200).send(createPaginatedResponse(message, data, meta));
    }
  );

  fastify.delete<{ Params: { id: string } }>(
    "/:id",
    { preHandler: [authToken, requireAuth, requireAdmin] },
    async (request, reply) => {
      const parsedId = ContactIdParamSchema.safeParse(request.params.id);
      if (!parsedId.success) {
        throw new BadRequestError("validation.invalidParams", parsedId.error.flatten());
      }
      const id = parsedId.data;
      const prisma = getPrismaClient();
      const existing = await prisma.contactSubmission.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundError("contact.notFound");
      }
      await prisma.contactSubmission.delete({ where: { id } });
      const message = getMsg(request, "success.deleted");
      return reply.status(200).send(createSuccessResponse(message));
    }
  );
};

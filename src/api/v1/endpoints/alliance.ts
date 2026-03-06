/**
 * 联盟成员公开接口
 * GET /alliance/members：无需鉴权，返回已启用且具备完整联盟元数据的联盟成员列表
 */
import { FastifyPluginAsync } from "fastify";
import { getPrismaClient } from "../../../db/client.js";
import {
  createPaginationMeta,
  createPaginatedResponse,
} from "../../../schemas/response.js";
import { getMsg } from "../../../i18n/utils.js";
import { BadRequestError } from "../../../core/exceptions.js";
import { ALLIANCE_META_KEYS, type AllianceMemberMeta } from "../../../schemas/user.js";
import {
  AllianceMembersQuerySchema,
  type AllianceMemberPublic,
} from "../../../schemas/alliance.js";

function metaRowsToAllianceMeta(
  rows: { meta_key: string; meta_value: string }[]
): AllianceMemberMeta | undefined {
  const map = new Map(rows.map((r) => [r.meta_key, r.meta_value]));
  const logo = map.get("logo");
  const project_name = map.get("project_name");
  const intro = map.get("intro");
  const website = map.get("website");
  const twitter = map.get("twitter");
  if (
    logo == null ||
    project_name == null ||
    intro == null ||
    website == null ||
    twitter == null
  ) {
    return undefined;
  }
  return { logo, project_name, intro, website, twitter };
}

export const allianceRouter: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /members
   * 公开接口，无需鉴权；分页返回已启用、角色为联盟成员且具备完整联盟元数据的用户（仅展示 username + 联盟信息）
   */
  fastify.get<{
    Querystring: { page?: string; page_size?: string };
  }>("/members", async (request, reply) => {
    const parsed = AllianceMembersQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw new BadRequestError("validation.invalidParams", parsed.error.flatten());
    }
    const { page, page_size: pageSize } = parsed.data;
    const prisma = getPrismaClient();

    const [list, total] = await Promise.all([
      prisma.user.findMany({
        where: {
          role: "alliance_member",
          disabled: false,
        },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          username: true,
          userMeta: {
            where: { meta_key: { in: [...ALLIANCE_META_KEYS] } },
            select: { meta_key: true, meta_value: true },
          },
        },
      }),
      prisma.user.count({
        where: { role: "alliance_member", disabled: false },
      }),
    ]);

    const data: AllianceMemberPublic[] = list
      .map((row) => {
        const meta = metaRowsToAllianceMeta(row.userMeta);
        if (!meta) return null;
        return {
          username: row.username,
          logo: meta.logo,
          project_name: meta.project_name,
          intro: meta.intro,
          website: meta.website,
          twitter: meta.twitter,
        };
      })
      .filter((item): item is AllianceMemberPublic => item != null);

    const message = getMsg(request, "success.list");
    return reply.send(
      createPaginatedResponse(message, data, createPaginationMeta(page, pageSize, total))
    );
  });
};

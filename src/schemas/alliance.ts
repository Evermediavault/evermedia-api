import { z } from "zod";

/** 联盟成员公开列表查询参数 */
export const AllianceMembersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(10),
});
export type AllianceMembersQuery = z.infer<typeof AllianceMembersQuerySchema>;

/** 联盟成员公开展示项（不含邮箱等敏感信息） */
export const AllianceMemberPublicSchema = z.object({
  username: z.string(),
  logo: z.string(),
  project_name: z.string(),
  intro: z.string(),
  website: z.string(),
  twitter: z.string(),
});
export type AllianceMemberPublic = z.infer<typeof AllianceMemberPublicSchema>;

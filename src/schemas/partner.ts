import { z } from "zod";

/** 去掉首尾空白；若为空则视为未传（undefined） */
function trimTagOptional(max: number) {
  return z.preprocess((v) => {
    if (v === undefined || v === null) return undefined;
    if (typeof v !== "string") return v;
    const t = v.trim();
    return t.length === 0 ? undefined : t;
  }, z.string().max(max).optional());
}

/** 合作伙伴单项（API 响应） */
export interface PartnerItem {
  id: number;
  logo: string;
  tag: string | null;
  name: string;
  description: string | null;
  link: string;
  created_at: string;
  updated_at: string;
}

/** 创建或更新合作伙伴：带 id 为更新，否则为创建 */
export const UpsertPartnerBodySchema = z
  .object({
    id: z.number().int().positive().optional(),
    logo: z.string().min(1),
    tag: trimTagOptional(128),
    name: z.string().min(1).max(255),
    description: z.string().max(500).optional(),
    link: z.string().min(1),
  })
  .refine(
    (data) => {
      try {
        const u = new URL(data.logo.trim());
        return u.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "validation.logoMustHttps", path: ["logo"] }
  )
  .refine(
    (data) => {
      try {
        const u = new URL(data.link.trim());
        return u.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "validation.websiteMustHttps", path: ["link"] }
  );

export type UpsertPartnerBody = z.infer<typeof UpsertPartnerBodySchema>;

/** 公开列表查询（可选按 tag 精确筛选） */
export const PartnerPublicListQuerySchema = z.object({
  tag: trimTagOptional(128),
});

export type PartnerPublicListQuery = z.infer<typeof PartnerPublicListQuerySchema>;

/** 管理员列表排序字段 */
export const PARTNER_ADMIN_LIST_SORT_FIELDS = ["created_at", "name"] as const;
export type PartnerAdminListSortBy = (typeof PARTNER_ADMIN_LIST_SORT_FIELDS)[number];

/** 管理员列表查询（GET /partners/manage） */
export const PartnerAdminListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(10),
  sort_by: z.enum(PARTNER_ADMIN_LIST_SORT_FIELDS).default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type PartnerAdminListQuery = z.infer<typeof PartnerAdminListQuerySchema>;

/** 路径参数 :id（正整数） */
export const PartnerIdParamSchema = z.coerce.number().int().positive();

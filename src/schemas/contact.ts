import { z } from "zod";

/** 列表可排序字段 */
export const CONTACT_LIST_SORT_FIELDS = ["created_at"] as const;
export type ContactListSortBy = (typeof CONTACT_LIST_SORT_FIELDS)[number];

/** 列表查询 */
export const ContactListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(10),
  sort_by: z.enum(CONTACT_LIST_SORT_FIELDS).default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type ContactListQuery = z.infer<typeof ContactListQuerySchema>;

/** 列表单项（管理员） */
export interface ContactListItem {
  id: number;
  user_name: string;
  email: string;
  content: string;
  ip: string;
  created_at: string;
}

/** 公开提交 */
export const ContactSubmitBodySchema = z.object({
  user_name: z.string().trim().min(1).max(15),
  email: z.string().trim().min(1).email(),
  content: z.string().trim().min(1).max(1024),
});

export type ContactSubmitBody = z.infer<typeof ContactSubmitBodySchema>;

/** 路径参数 :id（正整数） */
export const ContactIdParamSchema = z.coerce.number().int().positive();

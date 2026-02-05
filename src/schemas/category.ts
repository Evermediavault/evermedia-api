import { z } from "zod";

/** 分类列表可排序字段（与 DB 列名一致） */
export const CATEGORY_LIST_SORT_FIELDS = ["created_at", "name"] as const;
export type CategoryListSortBy = (typeof CATEGORY_LIST_SORT_FIELDS)[number];

/** 分类列表查询参数 */
export const CategoryListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(10),
  sort_by: z.enum(CATEGORY_LIST_SORT_FIELDS).default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type CategoryListQuery = z.infer<typeof CategoryListQuerySchema>;

/** 分类列表单项 */
export interface CategoryListItem {
  id: number;
  uid: string;
  name: string;
  description: string | null;
  is_default: boolean;
  created_at: string;
  file_count: number;
}

/** 创建分类请求体 */
export const CreateCategoryBodySchema = z.object({
  name: z.string().min(1, "name required").max(255),
  description: z.string().max(500).optional(),
});
export type CreateCategoryBody = z.infer<typeof CreateCategoryBodySchema>;

/** 更新分类请求体（按 uid 定位，仅允许改 name/description） */
export const UpdateCategoryBodySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(500).optional(),
});
export type UpdateCategoryBody = z.infer<typeof UpdateCategoryBodySchema>;

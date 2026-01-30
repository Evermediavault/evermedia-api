import { z } from "zod";

/** 用户列表可排序字段（与 DB 列名一致，避免注入） */
export const USER_LIST_SORT_FIELDS = ["created_at", "username", "last_login_at"] as const;
export type UserListSortBy = (typeof USER_LIST_SORT_FIELDS)[number];

/** 用户列表查询参数校验 */
export const UserListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(10),
  sort_by: z.enum(USER_LIST_SORT_FIELDS).default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type UserListQuery = z.infer<typeof UserListQuerySchema>;

/** 用户列表单项（不含 password、last_login_ip 等敏感字段） */
export interface UserListItem {
  id: number;
  uid: string;
  username: string;
  email: string;
  role: string;
  last_login_at: string | null;
  created_at: string;
}

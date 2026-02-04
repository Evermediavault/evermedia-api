import { z } from "zod";

/** 可创建/编辑的角色 */
export const USER_ROLES = ["uploader", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** 添加/编辑用户请求体：user_id 不为空则编辑，否则新增；编辑时 password 可选 */
export const CreateOrUpdateUserBodySchema = z
  .object({
    user_id: z.string().uuid().optional(),
    username: z.string().min(1, "username required"),
    email: z.string().min(1).email("invalid email"),
    password: z.string().min(1, "password required").optional(),
    role: z.enum(USER_ROLES),
  })
  .refine((data) => data.user_id != null || (data.password != null && data.password.length > 0), {
    message: "validation.passwordRequiredWhenCreate",
    path: ["password"],
  });
export type CreateOrUpdateUserBody = z.infer<typeof CreateOrUpdateUserBodySchema>;

/** 禁用/解禁用户请求体 */
export const SetUserDisabledBodySchema = z.object({
  disabled: z.boolean(),
});
export type SetUserDisabledBody = z.infer<typeof SetUserDisabledBodySchema>;

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
  disabled: boolean;
  last_login_at: string | null;
  created_at: string;
}

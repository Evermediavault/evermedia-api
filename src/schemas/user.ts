import { z } from "zod";

/** 可创建/编辑的角色（alliance_member 权限与 uploader 一致） */
export const USER_ROLES = ["uploader", "alliance_member", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Alliance Member 专属扩展字段的 meta_key 常量 */
export const ALLIANCE_META_KEYS = ["logo", "project_name", "intro", "website", "twitter"] as const;
export type AllianceMetaKey = (typeof ALLIANCE_META_KEYS)[number];

/** 添加/编辑用户请求体：user_id 不为空则编辑，否则新增；编辑时 password 可选；role=alliance_member 时必填扩展字段 */
export const CreateOrUpdateUserBodySchema = z
  .object({
    user_id: z.string().uuid().optional(),
    username: z.string().min(1, "username required"),
    email: z.string().min(1).email("invalid email"),
    password: z.string().min(1, "password required").optional(),
    role: z.enum(USER_ROLES),
    // Alliance Member 专属（仅 role=alliance_member 时必填）
    logo: z.string().min(1).optional(),
    project_name: z.string().min(1).optional(),
    intro: z.string().min(1).optional(),
    website: z.string().min(1).optional(),
    twitter: z.string().min(1).optional(),
  })
  .refine((data) => data.user_id != null || (data.password != null && data.password.length > 0), {
    message: "validation.passwordRequiredWhenCreate",
    path: ["password"],
  })
  .refine(
    (data) => {
      if (data.role !== "alliance_member") return true;
      return (data.logo ?? "").length > 0 && (data.project_name ?? "").length > 0;
    },
    { message: "validation.allianceMemberFieldsRequired", path: ["role"] }
  )
  .refine(
    (data) => {
      if (data.role !== "alliance_member" || !data.logo) return true;
      try {
        const u = new URL(data.logo);
        return u.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "validation.logoMustHttps", path: ["logo"] }
  )
  .refine(
    (data) => {
      const w = data.website?.trim();
      if (!w) return true;
      try {
        const u = new URL(w);
        return u.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "validation.websiteMustHttps", path: ["website"] }
  );
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

/** Alliance Member 扩展信息（仅 role=alliance_member 时有值） */
export interface AllianceMemberMeta {
  logo: string;
  project_name: string;
  intro: string;
  website: string;
  twitter: string;
}

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
  /** 仅 role=alliance_member 时存在 */
  alliance_meta?: AllianceMemberMeta;
}

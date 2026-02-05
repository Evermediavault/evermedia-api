import { z } from "zod";

/** 媒体列表查询参数（与 users 分页策略一致：默认 10，最大 100） */
export const MediaListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(10),
});

export type MediaListQuery = z.infer<typeof MediaListQuerySchema>;

/** 存储 Provider 快照（与 getStorageInfo 返回的 providers 项一致） */
export const StorageProviderSnapshotSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  isActive: z.boolean(),
  serviceProvider: z.string(),
  pdp: z.object({ serviceURL: z.string() }),
});

/** 上传成功返回的单条文件信息（与 UI / 文件列表对齐；列表接口会带 category_uid/category_name） */
export const UploadFileItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  file_type: z.string(),
  synapse_index_id: z.string(),
  synapse_data_set_id: z.number().optional(),
  storage_id: z.number().optional(),
  storage_info: StorageProviderSnapshotSchema.optional(),
  uploaded_at: z.string(),
  category_uid: z.string().optional(),
  category_name: z.string().optional(),
});

export type UploadFileItem = z.infer<typeof UploadFileItemSchema>;

/** POST /upload 成功响应：data 为本次创建的 1～N 条文件信息 */
export const UploadResponseDataSchema = z.array(UploadFileItemSchema);
export type UploadResponseData = z.infer<typeof UploadResponseDataSchema>;

/** Prisma File 列表/单条与 API 返回格式一致化（含可选分类） */
export function fileToUploadItem(row: {
  id: number;
  name: string;
  file_type: string;
  synapse_index_id: string;
  synapse_data_set_id?: number | null;
  storage_id?: number | null;
  storage_info?: unknown;
  uploaded_at: Date;
  category?: { uid: string; name: string } | null;
}): UploadFileItem {
  const item: UploadFileItem = {
    id: row.id,
    name: row.name,
    file_type: row.file_type,
    synapse_index_id: row.synapse_index_id,
    synapse_data_set_id: row.synapse_data_set_id ?? undefined,
    storage_id: row.storage_id ?? undefined,
    storage_info: row.storage_info as UploadFileItem["storage_info"],
    uploaded_at: row.uploaded_at.toISOString(),
  };
  if (row.category) {
    item.category_uid = row.category.uid;
    item.category_name = row.category.name;
  }
  return item;
}

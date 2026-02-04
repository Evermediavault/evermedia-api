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

/** 上传成功返回的单条文件信息（与 UI / 文件列表对齐） */
export const UploadFileItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  file_type: z.string(),
  synapse_index_id: z.string(),
  storage_id: z.number().optional(),
  storage_info: StorageProviderSnapshotSchema.optional(),
  uploaded_at: z.string(),
});

export type UploadFileItem = z.infer<typeof UploadFileItemSchema>;

/** Prisma File 列表/单条与 API 返回格式一致化 */
export function fileToUploadItem(row: {
  id: number;
  name: string;
  file_type: string;
  synapse_index_id: string;
  storage_id?: number | null;
  storage_info?: unknown;
  uploaded_at: Date;
}): UploadFileItem {
  return {
    id: row.id,
    name: row.name,
    file_type: row.file_type,
    synapse_index_id: row.synapse_index_id,
    storage_id: row.storage_id ?? undefined,
    storage_info: row.storage_info as UploadFileItem["storage_info"],
    uploaded_at: row.uploaded_at.toISOString(),
  };
}

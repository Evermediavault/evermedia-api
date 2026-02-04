import { z } from "zod";

/** 媒体列表查询参数（与 users 分页策略一致：默认 10，最大 100） */
export const MediaListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(10),
});

export type MediaListQuery = z.infer<typeof MediaListQuerySchema>;

/** 上传成功返回的单条文件信息（与 UI / 文件列表对齐） */
export const UploadFileItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  file_type: z.string(),
  synapse_index_id: z.string(),
  uploaded_at: z.string(),
});

export type UploadFileItem = z.infer<typeof UploadFileItemSchema>;

import { z } from "zod";

/** 上传成功返回的单条文件信息（与 UI / 文件列表对齐） */
export const UploadFileItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  file_type: z.string(),
  synapse_index_id: z.string(),
  uploaded_at: z.string(),
});

export type UploadFileItem = z.infer<typeof UploadFileItemSchema>;

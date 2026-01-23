import { z } from "zod";

/**
 * 基础 Schema
 *
 * 所有 Zod Schema 都可以基于此扩展
 */
export const BaseSchema = z.object({});

/**
 * 包含时间戳的 Schema
 */
export const TimestampSchema = z.object({
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

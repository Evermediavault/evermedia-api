import { z } from "zod";

/**
 * 基础响应模型
 */
export const BaseResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    message: z.string(),
    data: dataSchema.optional(),
    detail: z.unknown().optional(),
  });

/**
 * 成功响应模型
 */
export const SuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  BaseResponseSchema(dataSchema).extend({
    success: z.literal(true),
  });

/**
 * 错误响应模型
 */
export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  detail: z.unknown().optional(),
  status_code: z.number(),
});

/**
 * 分页元数据模型
 */
export const PaginationMetaSchema = z.object({
  page: z.number().int().min(1),
  page_size: z.number().int().min(1),
  total: z.number().int().min(0),
  total_pages: z.number().int().min(0),
});

/**
 * 创建分页元数据
 */
export const createPaginationMeta = (
  page: number,
  pageSize: number,
  total: number
) => {
  const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;
  return {
    page,
    page_size: pageSize,
    total,
    total_pages: totalPages,
  };
};

/**
 * 分页响应模型
 */
export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(
  itemSchema: T
) =>
  SuccessResponseSchema(z.array(itemSchema)).extend({
    meta: PaginationMetaSchema.optional(),
  });

/**
 * 响应类型定义
 */
export type SuccessResponse<T> = {
  success: true;
  message: string;
  data?: T;
  detail?: unknown;
};

export type ErrorResponse = {
  success: false;
  message: string;
  detail?: unknown;
  status_code: number;
};

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

export type PaginatedResponse<T> = {
  success: true;
  message: string;
  data: T[];
  meta?: PaginationMeta;
};

/**
 * 创建成功响应
 */
export const createSuccessResponse = <T>(
  message: string,
  data?: T
): SuccessResponse<T> => {
  return {
    success: true,
    message,
    data,
  };
};

/**
 * 创建分页成功响应
 */
export const createPaginatedResponse = <T>(
  message: string,
  data: T[],
  meta: PaginationMeta
): PaginatedResponse<T> => {
  return {
    success: true,
    message,
    data,
    meta,
  };
};

/**
 * 创建错误响应
 */
export const createErrorResponse = (
  message: string,
  statusCode: number,
  detail?: unknown
): ErrorResponse => {
  return {
    success: false,
    message,
    detail,
    status_code: statusCode,
  };
};

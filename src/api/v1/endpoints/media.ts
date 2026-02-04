/**
 * 媒体路由
 * GET  /media/list：获取文件列表（不鉴权）
 * POST /media/upload：上传（仅管理员），multipart 必填 file、providerId，可选 metadata、name（显示名）
 *   - 根据 providerId 查询 getStorageInfo 中的批准提供商详情后入库 storage_id / storage_info
 */
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { getDb, getSynapseClient } from "../../deps.js";
import { authToken, requireAuth, requireAdmin } from "../../../middleware/auth.js";
import { createSuccessResponse, createPaginatedResponse, createPaginationMeta } from "../../../schemas/response.js";
import { MediaListQuerySchema, fileToUploadItem } from "../../../schemas/media.js";
import { getMsg } from "../../../i18n/utils.js";
import {
  parseMultipartMetadata,
  parseMultipartStringField,
  parseMultipartNumberField,
  normalizeMetadataGroups,
} from "../../../utils/multipart.js";
import { toErrorMessage } from "../../../utils/helpers.js";
import { settings } from "../../../core/config.js";
import { getLogger } from "../../../core/logger.js";
import { BaseAPIException, UnauthorizedError, BadRequestError } from "../../../core/exceptions.js";

const log = getLogger("media");

/** 将 SDK ProviderInfo 序列化为可落库/返回前端的 JSON 快照（无 bigint） */
function serializeProviderInfo(provider: {
  id: number;
  name: string;
  description: string;
  active: boolean;
  serviceProvider: string;
  products?: Partial<Record<"PDP", { data?: { serviceURL?: string } }>>;
}): { id: number; name: string; description: string; isActive: boolean; serviceProvider: string; pdp: { serviceURL: string } } {
  const pdpUrl = provider.products?.PDP?.data?.serviceURL ?? "";
  return {
    id: provider.id,
    name: provider.name,
    description: provider.description,
    isActive: provider.active,
    serviceProvider: provider.serviceProvider,
    pdp: { serviceURL: pdpUrl },
  };
}

function isAllowedMime(mime: string): boolean {
  const allowed = settings.UPLOAD_ALLOWED_FILE_TYPES;
  if (allowed === "*") return true;
  if (Array.isArray(allowed)) return allowed.some((t) => t.toLowerCase() === mime.toLowerCase());
  return false;
}

/** @fastify/multipart 在文件超限时抛出的错误 code */
function isFileTooLargeError(err: unknown): err is { code: string } {
  return (
    err != null &&
    typeof err === "object" &&
    "code" in err &&
    (err as { code: string }).code === "FST_REQ_FILE_TOO_LARGE"
  );
}

export const mediaRouter: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /storage-info
   * 不鉴权；返回 Synapse 批准的存储 Provider 列表，供上传前选择 providerId
   */
  fastify.get("/storage-info", async (request, reply) => {
    const synapse = await getSynapseClient();
    if (!synapse) {
      throw new BaseAPIException("media.storageUnavailable", 503);
    }
    const storageInfo = await synapse.storage.getStorageInfo();
    const providers = storageInfo.providers.map((p) => serializeProviderInfo(p));
    const message = getMsg(request, "success.list");
    return reply.send(createSuccessResponse(message, { providers }));
  });

  /**
   * GET /list
   * 不鉴权；仅返回 permission=public 且未删除的文件，支持分页
   */
  fastify.get<{
    Querystring: { page?: string; page_size?: string };
  }>("/list", async (request, reply) => {
    const parsed = MediaListQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw new BadRequestError("validation.invalidParams");
    }
    const { page, page_size: pageSize } = parsed.data;
    const prisma = getDb();
    const [list, total] = await Promise.all([
      prisma.file.findMany({
        where: { deleted_at: null, permission: "public" },
        orderBy: { uploaded_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          file_type: true,
          synapse_index_id: true,
          storage_id: true,
          storage_info: true,
          uploaded_at: true,
        },
      }),
      prisma.file.count({ where: { deleted_at: null, permission: "public" } }),
    ]);
    const data = list.map((f) => fileToUploadItem(f));
    const message = getMsg(request, "success.list");
    return reply.send(createPaginatedResponse(message, data, createPaginationMeta(page, pageSize, total)));
  });

  /**
   * POST /upload
   * 仅管理员；multipart 必填 file、providerId；可选 metadata（JSON 字符串）、name
   */
  fastify.post<{
    Body: unknown;
  }>(
    "/upload",
    { preHandler: [authToken, requireAuth, requireAdmin] },
    async (request, reply) => doUpload(request, reply)
  );
};

async function doUpload(request: FastifyRequest, reply: FastifyReply) {
  const uid = request.user!.sub;

  const synapse = await getSynapseClient();
  if (!synapse) {
    throw new BaseAPIException("media.storageUnavailable", 503);
  }

  let buffer: Buffer;
  let filename: string;
  let mimeType: string;
  let metadata: Record<string, unknown> = {};
  let fields: Record<string, unknown> | undefined;

  try {
    const data = await request.file();
    if (!data) {
      throw new BadRequestError("media.fileRequired");
    }

    fields = data.fields as Record<string, unknown> | undefined;
    const rawMetadata = parseMultipartMetadata(fields);
    try {
      const normalized = normalizeMetadataGroups(rawMetadata);
      metadata = normalized.groups.length > 0 ? { groups: normalized.groups } : {};
    } catch {
      throw new BadRequestError("media.metadataNameValueRequired");
    }

    const customName = parseMultipartStringField(fields, "name");
    if (customName !== undefined) {
      filename = customName.slice(0, 255);
    } else {
      filename = data.filename ?? "unknown";
    }
    mimeType = (data.mimetype ?? "application/octet-stream").trim();
    if (!isAllowedMime(mimeType)) {
      throw new BadRequestError("media.fileTypeNotAllowed");
    }

    buffer = await data.toBuffer();
  } catch (err) {
    if (isFileTooLargeError(err)) {
      throw new BadRequestError(
        getMsg(request, "media.fileTooLarge", { max: settings.UPLOAD_MAX_FILE_SIZE_KB })
      );
    }
    throw err;
  }

  const prisma = getDb();
  const user = await prisma.user.findUnique({
    where: { uid },
    select: { id: true },
  });
  if (!user) {
    throw new UnauthorizedError("auth.userNotFound");
  }

  const providerId = parseMultipartNumberField(fields, "providerId");
  if (providerId === undefined || providerId === null) {
    throw new BadRequestError("media.providerIdRequired");
  }

  const storageInfo = await synapse.storage.getStorageInfo();
  const provider = storageInfo.providers.find((p) => p.id === providerId);
  if (!provider || !provider.active) {
    throw new BadRequestError("media.providerInvalidOrInactive");
  }
  const storageInfoJson = serializeProviderInfo(provider);

  let synapseIndexId: string;
  let dataSetId: number | undefined;
  try {
    const context = await synapse.storage.createContext({
      providerId,
      forceCreateDataSet: settings.SYNAPSE_FORCE_CREATE_DATA_SET,
    });
    const result = await context.upload(new Uint8Array(buffer), { metadata: {} });
    synapseIndexId = typeof result.pieceCid === "string" ? result.pieceCid : String(result.pieceCid);
    dataSetId = context.dataSetId; // 复用已有 dataset 时 createContext 后即有；新建时 upload 完成后被赋值
  } catch (err) {
    const errMsg = toErrorMessage(err);
    const causeMsg = err instanceof Error && err.cause instanceof Error ? err.cause.message : null;
    log.error(
      { err, message: "Synapse upload failed", reason: errMsg, cause: causeMsg, filename, size: buffer.length },
      "Synapse upload failed"
    );
    const msg = getMsg(request, "media.uploadFailed");
    const detail = { reason: errMsg, cause: causeMsg ?? undefined };
    throw new BaseAPIException(msg, 502, detail);
  }

  const file = await prisma.file.create({
    data: {
      name: filename,
      file_type: mimeType,
      metadata: metadata as object,
      uploader_id: user.id,
      permission: "public",
      cost: 0,
      synapse_index_id: synapseIndexId,
      synapse_data_set_id: dataSetId ?? undefined,
      storage_id: providerId,
      storage_info: storageInfoJson as object,
    },
  });

  const message = getMsg(request, "success.created");
  return reply.status(201).send(createSuccessResponse(message, fileToUploadItem(file)));
}

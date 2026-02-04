/**
 * 媒体路由
 * GET  /media/list：获取文件列表（不鉴权）
 * POST /media/upload：上传（仅管理员），multipart 必填 1～N 个 file、providerId，可选 metadata、name（显示名）
 *   - 单次请求内 1 或 N 个文件归属同一 data set（一次 createContext + Promise.all(upload)）
 */
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { getPrismaClient } from "../../../db/client.js";
import { getSynapse } from "../../../synapse/client.js";
import { authToken, requireAuth, requireAdmin } from "../../../middleware/auth.js";
import { createSuccessResponse, createPaginatedResponse, createPaginationMeta } from "../../../schemas/response.js";
import { MediaListQuerySchema, fileToUploadItem } from "../../../schemas/media.js";
import { getMsg } from "../../../i18n/utils.js";
import {
  parseMultipartMetadata,
  parseMultipartStringField,
  parseMultipartNumberField,
  normalizeMetadataGroups,
  collectPartsFromMultipart,
  type CollectedFilePart,
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
    const synapse = await getSynapse();
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
    const prisma = getPrismaClient();
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
          synapse_data_set_id: true,
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
   * 仅管理员；multipart 必填 1～N 个 file、providerId；可选 metadata（JSON 字符串）、每文件 name（显示名）
   * 单次请求内所有文件归属同一 Synapse data set（一次 createContext + Promise.all(upload)）
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

  const synapse = await getSynapse();
  if (!synapse) {
    throw new BaseAPIException("media.storageUnavailable", 503);
  }

  let fields: Record<string, unknown>;
  let files: CollectedFilePart[];

  try {
    const collected = await collectPartsFromMultipart(request.parts());
    fields = collected.fields;
    files = collected.files;
  } catch (err) {
    if (isFileTooLargeError(err)) {
      throw new BadRequestError(
        getMsg(request, "media.fileTooLarge", { max: settings.UPLOAD_MAX_FILE_SIZE_KB })
      );
    }
    throw err;
  }

  if (files.length === 0) {
    throw new BadRequestError("media.fileRequired");
  }
  if (files.length > settings.UPLOAD_MAX_FILES) {
    throw new BadRequestError(
      getMsg(request, "media.fileCountExceeded", { max: settings.UPLOAD_MAX_FILES })
    );
  }

  const maxSizeBytes = settings.UPLOAD_MAX_FILE_SIZE_KB * 1024;
  for (let i = 0; i < files.length; i++) {
    if (files[i].buffer.length > maxSizeBytes) {
      throw new BadRequestError(
        getMsg(request, "media.fileTooLarge", { max: settings.UPLOAD_MAX_FILE_SIZE_KB })
      );
    }
    const mime = files[i].mimetype.trim();
    if (!isAllowedMime(mime)) {
      throw new BadRequestError("media.fileTypeNotAllowed");
    }
  }

  /** 是否为索引格式（file_0, name_0, metadata_0）：每文件独立 name/metadata */
  const isIndexedFormat = "name_0" in fields || "metadata_0" in fields;
  const defaultMetadata = parseMultipartMetadata(fields);
  let defaultNormalized: { groups: { name: string; type: string; value: string }[] } = { groups: [] };
  try {
    defaultNormalized = normalizeMetadataGroups(defaultMetadata);
  } catch {
    if (!isIndexedFormat) {
      throw new BadRequestError("media.metadataNameValueRequired");
    }
  }
  const defaultMetadataJson =
    defaultNormalized.groups.length > 0 ? { groups: defaultNormalized.groups } : {};

  const prisma = getPrismaClient();
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

  let dataSetIdForBatch: number | undefined;
  let results: { pieceCid: unknown; size?: number; pieceId?: number }[];

  try {
    const ctx = await synapse.storage.createContext({
      providerId,
      forceCreateDataSet: settings.SYNAPSE_FORCE_CREATE_DATA_SET,
    });
    results = await Promise.all(
      files.map((f) => ctx.upload(new Uint8Array(f.buffer), { metadata: {} }))
    );
    dataSetIdForBatch = ctx.dataSetId;
  } catch (err) {
    const errMsg = toErrorMessage(err);
    const causeMsg = err instanceof Error && err.cause instanceof Error ? err.cause.message : null;
    log.error(
      { err, message: "Synapse upload failed", reason: errMsg, cause: causeMsg, fileCount: files.length },
      "Synapse upload failed"
    );
    const msg = getMsg(request, "media.uploadFailed");
    const detail = { reason: errMsg, cause: causeMsg ?? undefined };
    throw new BaseAPIException(msg, 502, detail);
  }

  const dataSetId = dataSetIdForBatch;

  const created = await Promise.all(
    files.map((f, i) => {
      const customName = isIndexedFormat
        ? parseMultipartStringField(fields, `name_${i}`)
        : parseMultipartStringField(f.fields, "name");
      const filename =
        (customName !== undefined ? customName.slice(0, 255) : (f.filename ?? "unknown").slice(0, 255));
      let fileMetadata: object = defaultMetadataJson as object;
      if (isIndexedFormat) {
        const raw = parseMultipartMetadata(fields, `metadata_${i}`);
        try {
          const norm = normalizeMetadataGroups(raw);
          fileMetadata = norm.groups.length > 0 ? { groups: norm.groups } : {};
        } catch {
          fileMetadata = {};
        }
      }
      const pieceCid = results[i].pieceCid;
      const synapseIndexId = typeof pieceCid === "string" ? pieceCid : String(pieceCid);
      return prisma.file.create({
        data: {
          name: filename,
          file_type: f.mimetype.trim().slice(0, 128),
          metadata: fileMetadata,
          uploader_id: user.id,
          permission: "public",
          cost: 0,
          synapse_index_id: synapseIndexId,
          synapse_data_set_id: dataSetId ?? undefined,
          storage_id: providerId,
          storage_info: storageInfoJson as object,
        },
      });
    })
  );

  const message = getMsg(request, "success.created");
  return reply.status(201).send(createSuccessResponse(message, created.map((f) => fileToUploadItem(f))));
}

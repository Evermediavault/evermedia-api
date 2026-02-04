/**
 * 媒体路由
 * GET  /media/list：获取文件列表（不鉴权，仅返回 permission=public 且未删除）
 * POST /media/upload：上传（仅管理员），multipart/form-data，字段 file，可选 metadata（JSON 字符串）
 */
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { getDb } from "../../deps.js";
import { getSynapse } from "../../../synapse/index.js";
import { authToken, requireAuth, requireAdmin } from "../../../middleware/auth.js";
import { createErrorResponse, createSuccessResponse, createPaginatedResponse, createPaginationMeta } from "../../../schemas/response.js";
import type { UploadFileItem } from "../../../schemas/media.js";
import { getMsg } from "../../../i18n/utils.js";
import { parseMultipartMetadata } from "../../../utils/multipart.js";
import { settings, isDevelopment } from "../../../core/config.js";
import { getLogger } from "../../../core/logger.js";

const log = getLogger("media");

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function isAllowedMime(mime: string): boolean {
  const allowed = settings.UPLOAD_ALLOWED_FILE_TYPES;
  if (allowed === "*") return true;
  if (Array.isArray(allowed)) return allowed.some((t) => t.toLowerCase() === mime.toLowerCase());
  return false;
}

export const mediaRouter: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /list
   * 不鉴权；仅返回 permission=public 且未删除的文件，支持分页
   */
  fastify.get<{
    Querystring: { page?: string; page_size?: string };
  }>("/list", async (request, reply) => {
    try {
      const page = Math.max(1, parseInt(request.query.page ?? "1", 10) || 1);
      const pageSize = Math.min(
        MAX_PAGE_SIZE,
        Math.max(1, parseInt(request.query.page_size ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE)
      );
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
            uploaded_at: true,
          },
        }),
        prisma.file.count({ where: { deleted_at: null, permission: "public" } }),
      ]);
      const data: UploadFileItem[] = list.map((f) => ({
        id: f.id,
        name: f.name,
        file_type: f.file_type,
        synapse_index_id: f.synapse_index_id,
        uploaded_at: f.uploaded_at.toISOString(),
      }));
      const message = getMsg(request, "success.list", "Retrieved successfully");
      return reply.send(createPaginatedResponse(message, data, createPaginationMeta(page, pageSize, total)));
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      log.error({ err, message: errMsg }, "File list handler error");
      const msg = getMsg(request, "media.listFailed", "Failed to get file list");
      const detail = isDevelopment() ? { reason: errMsg } : undefined;
      return reply.status(500).send(createErrorResponse(msg, 500, detail));
    }
  });

  /**
   * POST /upload
   * 仅管理员；multipart fieldName: file；可选 metadata（JSON 字符串）
   */
  fastify.post<{
    Body: unknown;
  }>(
    "/upload",
    { preHandler: [authToken, requireAuth, requireAdmin] },
    async (request, reply) => {
      try {
        return await doUpload(request, reply);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        log.error({ err, message: errMsg }, "Upload handler error");
        const msg = getMsg(request, "media.uploadFailed", "Upload to storage failed");
        const detail = isDevelopment() ? { reason: errMsg } : undefined;
        return reply.status(502).send(createErrorResponse(msg, 502, detail));
      }
    }
  );
};

async function doUpload(request: FastifyRequest, reply: FastifyReply) {
  const uid = request.user!.sub;

  const synapse = await getSynapse();
  if (!synapse) {
    const msg = getMsg(request, "media.storageUnavailable", "Storage service unavailable");
    return reply.status(503).send(createErrorResponse(msg, 503));
  }

  let buffer: Buffer;
  let filename: string;
  let mimeType: string;
  let metadata: Record<string, unknown> = {};

  try {
    const data = await request.file();
    if (!data) {
      const msg = getMsg(request, "media.fileRequired", "Missing file field");
      return reply.status(400).send(createErrorResponse(msg, 400));
    }

    metadata = parseMultipartMetadata(data.fields as Record<string, unknown> | undefined);

    const groups = metadata.groups;
    if (Array.isArray(groups)) {
      const invalid = groups.some(
        (item) =>
          !item ||
          typeof item !== "object" ||
          !(typeof (item as Record<string, unknown>).name === "string" && String((item as Record<string, unknown>).name).trim()) ||
          !(typeof (item as Record<string, unknown>).value === "string" && String((item as Record<string, unknown>).value).trim())
      );
      if (invalid) {
        const msg = getMsg(request, "media.metadataNameValueRequired", "Metadata name and value must not be empty for each entry");
        return reply.status(400).send(createErrorResponse(msg, 400));
      }
      // 只持久化名称与值均非空的条目，与前端 buildMetadataPayload 一致
      const normalized = groups
        .filter(
          (item): item is Record<string, unknown> =>
            item != null &&
            typeof item === "object" &&
            typeof (item as Record<string, unknown>).name === "string" &&
            typeof (item as Record<string, unknown>).value === "string" &&
            String((item as Record<string, unknown>).name).trim() !== "" &&
            String((item as Record<string, unknown>).value).trim() !== ""
        )
        .map((item) => ({
          name: String((item as Record<string, unknown>).name).trim(),
          type: (item as Record<string, unknown>).type ?? "input",
          value: String((item as Record<string, unknown>).value).trim(),
        }));
      metadata = { groups: normalized };
    }

    filename = data.filename ?? "unknown";
    mimeType = (data.mimetype ?? "application/octet-stream").trim();
    if (!isAllowedMime(mimeType)) {
      const msg = getMsg(request, "media.fileTypeNotAllowed", "File type not allowed");
      return reply.status(400).send(createErrorResponse(msg, 400));
    }

    buffer = await data.toBuffer();
  } catch (err) {
    const isSize = err && typeof err === "object" && "code" in err && err.code === "FST_REQ_FILE_TOO_LARGE";
    if (isSize) {
      const msg = getMsg(
        request,
        "media.fileTooLarge",
        `File too large (max ${settings.UPLOAD_MAX_FILE_SIZE_KB}KB)`
      );
      return reply.status(400).send(createErrorResponse(msg, 400));
    }
    throw err;
  }

  const prisma = getDb();
  const user = await prisma.user.findUnique({
    where: { uid },
    select: { id: true },
  });
  if (!user) {
    return reply
      .status(401)
      .send(createErrorResponse(getMsg(request, "auth.userNotFound", "User not found"), 401));
  }
  let synapseIndexId: string;
  try {
    const context = await synapse.storage.createContext({
      forceCreateDataSet: settings.SYNAPSE_FORCE_CREATE_DATA_SET,
    });
    const result = await context.upload(new Uint8Array(buffer), { metadata: {} });
    synapseIndexId = typeof result.pieceCid === "string" ? result.pieceCid : String(result.pieceCid);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const causeMsg = err instanceof Error && err.cause instanceof Error ? err.cause.message : null;
    log.error(
      {
        message: "Synapse upload failed",
        err,
        reason: errMsg,
        cause: causeMsg,
        filename,
        size: buffer.length,
      },
      "Synapse upload failed"
    );
    const msg = getMsg(request, "media.uploadFailed", "Upload to storage failed");
    const detail = isDevelopment() ? { reason: errMsg, cause: causeMsg ?? undefined } : undefined;
    return reply.status(502).send(createErrorResponse(msg, 502, detail));
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
    },
  });

  const data: UploadFileItem = {
    id: file.id,
    name: file.name,
    file_type: file.file_type,
    synapse_index_id: file.synapse_index_id,
    uploaded_at: file.uploaded_at.toISOString(),
  };

  const message = getMsg(request, "success.created", "Created");
  return reply.status(201).send(createSuccessResponse(message, data));
}

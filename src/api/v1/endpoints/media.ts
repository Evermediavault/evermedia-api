/**
 * 媒体路由
 * GET  /media/list：获取文件列表（不鉴权）
 * POST /media/upload：上传（仅管理员），multipart，字段 file，可选 metadata
 */
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { getDb } from "../../deps.js";
import { getSynapse } from "../../../synapse/index.js";
import { authToken, requireAuth, requireAdmin } from "../../../middleware/auth.js";
import { createSuccessResponse, createPaginatedResponse, createPaginationMeta } from "../../../schemas/response.js";
import type { UploadFileItem } from "../../../schemas/media.js";
import { MediaListQuerySchema } from "../../../schemas/media.js";
import { getMsg } from "../../../i18n/utils.js";
import { parseMultipartMetadata, normalizeMetadataGroups } from "../../../utils/multipart.js";
import { toErrorMessage } from "../../../utils/helpers.js";
import { settings } from "../../../core/config.js";
import { getLogger } from "../../../core/logger.js";
import { BaseAPIException, UnauthorizedError, BadRequestError } from "../../../core/exceptions.js";

const log = getLogger("media");

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
    const parsed = MediaListQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw new BadRequestError(getMsg(request, "validation.invalidParams", "Invalid query parameters"));
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
    async (request, reply) => doUpload(request, reply)
  );
};

async function doUpload(request: FastifyRequest, reply: FastifyReply) {
  const uid = request.user!.sub;

  const synapse = await getSynapse();
  if (!synapse) {
    throw new BaseAPIException(
      getMsg(request, "media.storageUnavailable", "Storage service unavailable"),
      503
    );
  }

  let buffer: Buffer;
  let filename: string;
  let mimeType: string;
  let metadata: Record<string, unknown> = {};

  try {
    const data = await request.file();
    if (!data) {
      throw new BadRequestError(getMsg(request, "media.fileRequired", "Missing file field"));
    }

    const rawMetadata = parseMultipartMetadata(data.fields as Record<string, unknown> | undefined);
    try {
      const normalized = normalizeMetadataGroups(rawMetadata);
      metadata = normalized.groups.length > 0 ? { groups: normalized.groups } : {};
    } catch {
      throw new BadRequestError(
        getMsg(request, "media.metadataNameValueRequired", "Metadata name and value must not be empty for each entry")
      );
    }

    filename = data.filename ?? "unknown";
    mimeType = (data.mimetype ?? "application/octet-stream").trim();
    if (!isAllowedMime(mimeType)) {
      throw new BadRequestError(getMsg(request, "media.fileTypeNotAllowed", "File type not allowed"));
    }

    buffer = await data.toBuffer();
  } catch (err) {
    const isSize = err && typeof err === "object" && "code" in err && err.code === "FST_REQ_FILE_TOO_LARGE";
    if (isSize) {
      throw new BadRequestError(
        getMsg(request, "media.fileTooLarge", `File too large (max ${settings.UPLOAD_MAX_FILE_SIZE_KB}KB)`)
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
    throw new UnauthorizedError(getMsg(request, "auth.userNotFound", "User not found"));
  }

  let synapseIndexId: string;
  try {
    const context = await synapse.storage.createContext({
      forceCreateDataSet: settings.SYNAPSE_FORCE_CREATE_DATA_SET,
    });
    const result = await context.upload(new Uint8Array(buffer), { metadata: {} });
    synapseIndexId = typeof result.pieceCid === "string" ? result.pieceCid : String(result.pieceCid);
  } catch (err) {
    const errMsg = toErrorMessage(err);
    const causeMsg = err instanceof Error && err.cause instanceof Error ? err.cause.message : null;
    log.error(
      { err, message: "Synapse upload failed", reason: errMsg, cause: causeMsg, filename, size: buffer.length },
      "Synapse upload failed"
    );
    const msg = getMsg(request, "media.uploadFailed", "Upload to storage failed");
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

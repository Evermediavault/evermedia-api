/** 从 @fastify/multipart field 中取出 value，非 field 类型返回 undefined */
function getFieldPart(
  fields: Record<string, unknown> | undefined,
  fieldName: string
): unknown {
  const part = fields?.[fieldName];
  if (
    !part ||
    typeof part !== "object" ||
    !("type" in part) ||
    (part as { type: string }).type !== "field" ||
    !("value" in part)
  ) {
    return undefined;
  }
  return (part as { value: unknown }).value;
}

/**
 * 从 multipart fields 中解析单个字符串字段（如可选的文件显示名）
 * 返回 trim 后的字符串，无该字段或非字符串则返回 undefined
 */
export function parseMultipartStringField(
  fields: Record<string, unknown> | undefined,
  fieldName: string
): string | undefined {
  const raw = getFieldPart(fields, fieldName);
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed === "" ? undefined : trimmed;
}

/**
 * 从 multipart fields 中解析整数字段（如 providerId）
 * 无该字段、非数字或非整数时返回 undefined
 */
export function parseMultipartNumberField(
  fields: Record<string, unknown> | undefined,
  fieldName: string
): number | undefined {
  const raw = getFieldPart(fields, fieldName);
  if (typeof raw === "number") {
    return Number.isInteger(raw) ? raw : undefined;
  }
  if (typeof raw === "string") {
    const n = Number.parseInt(raw.trim(), 10);
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
}

/**
 * 从 multipart fields 中解析指定字段为 JSON 对象；解析失败或非对象则返回空对象
 */
export function parseMultipartMetadata(
  fields: Record<string, unknown> | undefined,
  fieldName = "metadata"
): Record<string, unknown> {
  const raw = getFieldPart(fields, fieldName);
  if (typeof raw !== "string") return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // 忽略非法 JSON
  }
  return {};
}

export interface MetadataGroupItem {
  name: string;
  type: string;
  value: string;
}

/**
 * 从 request.parts() 迭代器收集到的单文件项（buffer 已读入内存）
 */
export interface CollectedFilePart {
  buffer: Buffer;
  filename: string;
  mimetype: string;
  /** 该 part 的 fields（可用于每文件显示名等） */
  fields: Record<string, unknown>;
}

/** 将 part.fields（可能为 { k: { type, value } } 或 { k: [...] }）合并进目标，格式化为 getFieldPart 可用的形状 */
function mergePartFieldsInto(
  target: Record<string, unknown>,
  source: Record<string, unknown> | null | undefined
): void {
  if (!source || typeof source !== "object") return;
  for (const [key, raw] of Object.entries(source)) {
    if (raw == null) continue;
    let value: unknown;
    if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object" && raw[0] !== null && "value" in raw[0]) {
      value = (raw[0] as { value: unknown }).value;
    } else if (typeof raw === "object" && "value" in raw) {
      value = (raw as { value: unknown }).value;
    } else {
      continue;
    }
    target[key] = { type: "field", value };
  }
}

const FILE_INDEXED_PREFIX = "file_";

/**
 * 从 Fastify 的 request.parts() 收集所有 field 与 file part，返回合并后的 fields 与文件数组。
 * 支持两种格式：
 * 1) 索引格式：file_0, file_1, ...（文件）+ name_0, name_1, ...、metadata_0, metadata_1, ...、providerId（字段），用于单次请求多文件且每文件独立 name/metadata。
 * 2) 兼容格式：多个 fieldname 为 "file" 的 part + 顶层 providerId/metadata/name，兼容 Uppy bundle。
 * 调用方必须消费完整迭代器，否则请求会挂起。
 */
export async function collectPartsFromMultipart(parts: AsyncIterable<{ type: string; fieldname?: string; value?: unknown; filename?: string; mimetype?: string; file?: unknown; toBuffer?: () => Promise<Buffer>; fields?: Record<string, unknown> }>): Promise<{ fields: Record<string, unknown>; files: CollectedFilePart[] }> {
  const fields: Record<string, unknown> = {};
  const files: CollectedFilePart[] = [];
  const filesByIndex = new Map<number, CollectedFilePart>();

  for await (const part of parts) {
    if (part.type === "field" && part.fieldname != null) {
      fields[part.fieldname] = { type: "field", value: part.value };
    }
    if (part.type === "file" && part.file != null && typeof part.toBuffer === "function") {
      const buffer = await part.toBuffer();
      const entry: CollectedFilePart = {
        buffer,
        filename: part.filename ?? "unknown",
        mimetype: part.mimetype ?? "application/octet-stream",
        fields: (part.fields as Record<string, unknown>) ?? {},
      };
      const fn = part.fieldname ?? "";
      if (fn.startsWith(FILE_INDEXED_PREFIX)) {
        const index = Number.parseInt(fn.slice(FILE_INDEXED_PREFIX.length), 10);
        if (!Number.isNaN(index) && index >= 0) {
          filesByIndex.set(index, entry);
          continue;
        }
      }
      files.push(entry);
      mergePartFieldsInto(fields, part.fields as Record<string, unknown> | undefined);
    }
  }

  if (filesByIndex.size > 0) {
    const sorted = Array.from(filesByIndex.entries()).sort((a, b) => a[0] - b[0]);
    return { fields, files: sorted.map(([, f]) => f) };
  }
  return { fields, files };
}

/**
 * 校验并标准化 metadata.groups；若存在 groups 但任一条目 name/value 为空则抛出
 */
export function normalizeMetadataGroups(metadata: Record<string, unknown>): { groups: MetadataGroupItem[] } {
  const groups = metadata.groups;
  if (!Array.isArray(groups)) return { groups: [] };
  const result: MetadataGroupItem[] = [];
  for (const item of groups) {
    if (!item || typeof item !== "object") {
      throw new Error("metadata groups: name and value required");
    }
    const raw = item as Record<string, unknown>;
    const name = typeof raw.name === "string" ? raw.name.trim() : "";
    const value = typeof raw.value === "string" ? raw.value.trim() : "";
    const type = typeof raw.type === "string" ? raw.type : "input";
    if (name === "" || value === "") {
      throw new Error("metadata groups: name and value required");
    }
    result.push({ name, type, value });
  }
  return { groups: result };
}

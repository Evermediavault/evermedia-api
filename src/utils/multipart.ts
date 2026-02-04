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

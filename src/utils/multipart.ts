/**
 * 从 multipart fields 中解析指定字段为 JSON 对象；解析失败或非对象则返回空对象
 */
export function parseMultipartMetadata(
  fields: Record<string, unknown> | undefined,
  fieldName = "metadata"
): Record<string, unknown> {
  const part = fields?.[fieldName];
  if (
    !part ||
    typeof part !== "object" ||
    !("type" in part) ||
    (part as { type: string }).type !== "field" ||
    !("value" in part)
  ) {
    return {};
  }
  const raw = (part as { value: unknown }).value;
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

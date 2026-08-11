import crypto from "node:crypto";
import type { TracePin } from "@/features/world-memory/trace/types";

/** Deterministic Activity id — uid never appears in public URLs/responses. */
export function activityDocumentId(uid: string, workId: string): string {
  return crypto
    .createHash("sha256")
    .update(`${uid}|${workId}`, "utf8")
    .digest("hex");
}

/** Merge Legacy + Activity pins, newest first. */
export function mergeMemoryPins(
  legacy: TracePin[],
  activities: TracePin[],
  limit?: number,
): TracePin[] {
  const keyOf = (pin: TracePin) =>
    `${pin.miavId}|${pin.workId || ""}|${pin.createdAt}|${pin.message.slice(0, 24)}`;
  const map = new Map<string, TracePin>();
  for (const pin of [...legacy, ...activities]) {
    map.set(keyOf(pin), pin);
  }
  const merged = [...map.values()].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  if (typeof limit === "number") return merged.slice(0, limit);
  return merged;
}

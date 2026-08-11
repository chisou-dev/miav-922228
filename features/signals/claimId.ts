/**
 * Deterministic Signal Claim document id — uid never in public URLs/responses.
 */
import crypto from "node:crypto";

export function signalClaimDocumentId(uid: string, signalId: string): string {
  return crypto
    .createHash("sha256")
    .update(`${uid}|${signalId}`, "utf8")
    .digest("hex");
}

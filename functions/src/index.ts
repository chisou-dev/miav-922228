import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";

/**
 * Delegates TTL cleanup to the canonical Next.js path:
 *   POST /api/cron/cleanup-traces
 *     → deleteExpiredAnonymousTraces()
 *         → delete Trace doc
 *         → decrement trace_locations
 *         → rebuild aggregates (World Memory stars)
 *
 * Do NOT delete Firestore docs here — that left stars out of sync.
 *
 * Required Functions secrets / params:
 *   CLEANUP_BASE_URL  e.g. https://www.miav-922228.com
 *   CRON_SECRET       same value as Vercel CRON_SECRET
 */
export const cleanupExpiredAnonymousTraces = onSchedule(
  {
    schedule: "every 24 hours",
    timeZone: "UTC",
    region: "us-central1",
  },
  async () => {
    const base = (
      process.env.CLEANUP_BASE_URL ||
      process.env.SITE_URL ||
      ""
    ).replace(/\/$/, "");
    const secret = process.env.CRON_SECRET?.trim() || "";

    if (!base || !secret) {
      logger.error(
        "CLEANUP_BASE_URL (or SITE_URL) and CRON_SECRET must be set so cleanup uses the canonical aggregate path.",
      );
      return;
    }

    const url = `${base}/api/cron/cleanup-traces`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
    });

    const body = (await response.json().catch(() => null)) as {
      ok?: boolean;
      deleted?: number;
      error?: string;
    } | null;

    if (!response.ok) {
      logger.error("Canonical cleanup failed", {
        status: response.status,
        error: body?.error,
      });
      throw new Error(
        body?.error || `Cleanup HTTP ${response.status} from ${url}`,
      );
    }

    logger.info(
      `Canonical cleanup ok — deleted ${body?.deleted ?? 0} expired anonymous traces (aggregates rebuilt).`,
    );
  },
);

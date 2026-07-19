import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";

admin.initializeApp();

const db = admin.firestore();

/**
 * Daily cleanup of Temporary (anonymous) Traces past expiresAt.
 * Documents are deleted; MIAV ID numbers are NEVER reused
 * (meta/miav_counter is never decremented).
 */
export const cleanupExpiredAnonymousTraces = onSchedule(
  {
    schedule: "every 24 hours",
    timeZone: "UTC",
    region: "us-central1",
  },
  async () => {
    const now = admin.firestore.Timestamp.now();
    const snapshot = await db
      .collection("trace_map")
      .where("authType", "==", "anonymous")
      .where("expiresAt", "<=", now)
      .get();

    if (snapshot.empty) {
      logger.info("No expired anonymous traces.");
      return;
    }

    let deleted = 0;
    let batch = db.batch();
    let ops = 0;

    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
      ops += 1;
      deleted += 1;
      if (ops >= 400) {
        await batch.commit();
        batch = db.batch();
        ops = 0;
      }
    }

    if (ops > 0) await batch.commit();
    logger.info(`Deleted ${deleted} expired anonymous traces (MIAV IDs retained as gaps).`);
  },
);

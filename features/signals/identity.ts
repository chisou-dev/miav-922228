"use client";

import { getOrCreateVisitorId } from "@/features/world-memory/trace/visitorId";
import { getFirebaseAuth, isFirebaseClientConfigured } from "@/features/firebase/client";
import type { SignalOwner } from "@/features/signals/types";

/**
 * Resolve Signal owner using existing site identity — no new ID system.
 * Prefer Google Firebase UID when signed in; otherwise visitorId.
 */
export function resolveSignalOwner(): SignalOwner {
  if (isFirebaseClientConfigured()) {
    try {
      const user = getFirebaseAuth().currentUser;
      if (user?.uid) {
        return { kind: "google", id: user.uid };
      }
    } catch {
      // Fall through to guest.
    }
  }
  return { kind: "guest", id: getOrCreateVisitorId() };
}

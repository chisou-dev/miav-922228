/**
 * The galaxy voyage is a local, optional reward for finishing the REAL
 * atmospheric reentry Stage 1. No network request or account required.
 * Clearing browser site data removes the unlock on that device.
 */
const STORAGE_KEY = "miav_galaxy_stage1_clear_v1";
const SPARKLE_SEEN_KEY = "miav_galaxy_first_glint_seen_v1";

/** Keep the earned crystal shimmer until the first real globe tap. */
export function hasAcknowledgedGalaxyUnlock(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SPARKLE_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function acknowledgeGalaxyUnlock(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SPARKLE_SEEN_KEY, "1");
  } catch {
    // Same-session React state still stops the effect if storage is blocked.
  }
}


export function hasClearedStage1(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function rememberStage1Clear(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Storage may be unavailable (private browser, policy). The current
    // React session still unlocks; only persistence is then unavailable.
  }
}

/**
 * The galaxy voyage is a local, optional reward for finishing the REAL
 * atmospheric reentry Stage 1. No network request or account required.
 * Clearing browser site data removes the unlock on that device.
 */
const STORAGE_KEY = "miav_galaxy_stage1_clear_v1";

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

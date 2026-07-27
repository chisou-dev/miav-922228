const PREFIX = "miav-games:";

/** Namespaced localStorage helpers for saves and settings. */
export const Storage = {
  get<T>(key: string): T | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(`${PREFIX}${key}`);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },

  set<T>(key: string, value: T) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value));
    } catch {
      // ignore quota / privacy mode
    }
  },

  remove(key: string) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(`${PREFIX}${key}`);
    } catch {
      // ignore
    }
  },
};

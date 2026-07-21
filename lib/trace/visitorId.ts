const VISITOR_KEY = "miav_visitor_id";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidVisitorId(value: string): boolean {
  return UUID_RE.test(value);
}

/** Browser-local identity for one guest Memory per device. */
export function getOrCreateVisitorId(): string {
  try {
    const existing = localStorage.getItem(VISITOR_KEY);
    if (existing && isValidVisitorId(existing)) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function readVisitorId(): string | null {
  try {
    const id = localStorage.getItem(VISITOR_KEY);
    return id && isValidVisitorId(id) ? id : null;
  } catch {
    return null;
  }
}

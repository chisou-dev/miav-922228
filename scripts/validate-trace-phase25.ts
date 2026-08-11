/**
 * Phase 2.5 local checks — no Firestore / production writes.
 *
 * Run: npx tsx scripts/validate-trace-phase25.ts
 */
import { activityDocumentId, mergeMemoryPins } from "../features/world-memory/trace/activityId";
import { validateCategoryWork } from "../features/world-memory/trace/works";
import type { TracePin } from "../features/world-memory/trace/types";

function assert(cond: boolean, label: string) {
  if (!cond) {
    console.error("FAIL", label);
    process.exitCode = 1;
  } else {
    console.log("ok  ", label);
  }
}

const uid = "test-firebase-uid-abc";
const idA = activityDocumentId(uid, "miav-922228");
const idA2 = activityDocumentId(uid, "miav-922228");
const idB = activityDocumentId(uid, "binary-block");
assert(idA === idA2, "activityDocumentId deterministic");
assert(idA !== idB, "activityDocumentId differs per workId");
assert(!idA.includes(uid), "activityDocumentId does not embed raw uid string");
assert(/^[a-f0-9]{64}$/.test(idA), "activityDocumentId is sha256 hex");

assert(
  validateCategoryWork("read", "miav-922228").ok === true,
  "valid read work",
);
assert(
  validateCategoryWork("play", "luminous-structure").ok === false,
  "disabled luminous rejected",
);

const legacy: TracePin[] = [
  {
    miavId: "MIAV-000050",
    authType: "google",
    locationId: "jp-tokyo",
    country: "Japan",
    region: "",
    city: "Tokyo",
    lat: 35,
    lng: 139,
    message: "legacy",
    createdAt: "2024-01-01T00:00:00.000Z",
  },
];
const activities: TracePin[] = [
  {
    miavId: "MIAV-000050",
    authType: "google",
    category: "play",
    workId: "binary-block",
    locationId: "jp-tokyo",
    country: "Japan",
    region: "",
    city: "Tokyo",
    lat: 35,
    lng: 139,
    message: "activity",
    createdAt: "2025-01-01T00:00:00.000Z",
  },
];
const merged = mergeMemoryPins(legacy, activities, 10);
assert(merged.length === 2, "merge keeps legacy + activity");
assert(merged[0]?.workId === "binary-block", "merge sorts newest first");
assert(
  !JSON.stringify(merged).includes(uid),
  "merged pins never contain firebase uid",
);

if (process.exitCode) {
  console.error("\nSome Phase 2.5 checks failed");
  process.exit(1);
}
console.log("\nAll Phase 2.5 local checks passed");

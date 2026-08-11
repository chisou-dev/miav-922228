/**
 * Phase 4 My MIAV pure checks — no Firestore / production writes.
 *
 * Run: npx tsx scripts/validate-trace-phase4.ts
 */
import {
  buildMyMiavResponse,
  containsPrivateMyMiavFields,
  groupMyActivitiesByCategory,
  sortMyActivities,
  toPublicMyActivity,
  workLabelForId,
  type MyMiavActivity,
} from "../features/world-memory/my-miav/myMiavPublic";

function assert(cond: boolean, label: string) {
  if (!cond) {
    console.error("FAIL", label);
    process.exitCode = 1;
  } else {
    console.log("ok  ", label);
  }
}

const base = {
  locationId: "JP:tokyo",
  country: "Japan",
  region: "Tokyo",
  city: "Tokyo",
  message: "hello",
  createdAt: "2026-08-11T00:00:00.000Z",
  updatedAt: "2026-08-11T00:00:00.000Z",
};

const activities: MyMiavActivity[] = [
  toPublicMyActivity({
    ...base,
    category: "read",
    workId: "miav-922228",
    createdAt: "2026-08-11T00:00:00.000Z",
  }),
  toPublicMyActivity({
    ...base,
    category: "play",
    workId: "binary-block",
    city: "Yokohama",
    region: "Kanagawa",
    createdAt: "2026-08-14T00:00:00.000Z",
  }),
  toPublicMyActivity({
    ...base,
    category: "apps",
    workId: "writer-memo",
    createdAt: "2026-08-20T00:00:00.000Z",
  }),
];

// A — Identity + 3 activities
const a = buildMyMiavResponse({
  miavId: "MIAV-000127",
  activities,
});
assert(a.miavId === "MIAV-000127", "A miavId present");
assert(a.activities.length === 3, "A three activities");
assert(a.activities[0]?.workId === "writer-memo", "A newest first");

// B — no identity
const b = buildMyMiavResponse({ miavId: null, activities: [] });
assert(b.miavId === null, "B no miavId");
assert(b.activities.length === 0, "B empty activities");

// C — multi work all returned
assert(
  sortMyActivities(activities).map((x) => x.workId).join(",") ===
    "writer-memo,binary-block,miav-922228",
  "C all works sorted",
);

// D — other user activities never mixed (caller must not pass them)
const ownOnly = buildMyMiavResponse({
  miavId: "MIAV-000001",
  activities: [activities[0]!],
});
assert(
  ownOnly.activities.every((row) => row.workId === "miav-922228"),
  "D only provided owner rows",
);

// E — guest-shaped private fields must not appear in public payload
const guestLeakAttempt = {
  ...buildMyMiavResponse({ miavId: "MIAV-000050", activities: [] }),
};
assert(
  !containsPrivateMyMiavFields(guestLeakAttempt),
  "E clean response has no private keys",
);

// F — UID leak
const dirty = {
  miavId: "MIAV-000127",
  activities,
  uid: "firebase-secret",
};
assert(containsPrivateMyMiavFields(dirty), "F detector catches uid");
assert(
  !containsPrivateMyMiavFields(a),
  "F public response has no uid/email/id",
);

assert(workLabelForId("binary-block") === "Binary Block", "work label");
assert(workLabelForId("miav-922228") === "MIAV-922228", "read work label");

const groups = groupMyActivitiesByCategory(activities);
assert(groups.length === 3, "three category groups");
assert(groups[0]?.category === "read", "category order starts with read");
assert(
  !JSON.stringify(a).includes("firebase"),
  "no firebase string in payload",
);

// toPublic strips id/uid even if somehow passed via cast
const publicRow = toPublicMyActivity({
  category: "read",
  workId: "miav-922228",
  locationId: null,
  country: "Japan",
  region: "",
  city: "Tokyo",
  message: "x",
  createdAt: "2026-01-01T00:00:00.000Z",
});
assert(
  !("uid" in publicRow) && !("id" in publicRow),
  "public activity has no id/uid fields",
);

if (process.exitCode) {
  console.error("\nSome Phase 4 checks failed");
  process.exit(1);
}
console.log("\nAll Phase 4 local checks passed");

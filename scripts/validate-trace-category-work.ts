/**
 * Local validation checks for Phase 2 category/workId rules.
 * Does not touch Firestore or production data.
 *
 * Run: npx tsx scripts/validate-trace-category-work.ts
 */
import { validateCategoryWork } from "../features/world-memory/trace/works";

type Case = {
  name: string;
  category: unknown;
  workId: unknown;
  expectOk: boolean;
};

const cases: Case[] = [
  {
    name: "valid read + miav-922228",
    category: "read",
    workId: "miav-922228",
    expectOk: true,
  },
  {
    name: "valid read + fourth-period",
    category: "read",
    workId: "fourth-period",
    expectOk: true,
  },
  {
    name: "valid play + binary-block",
    category: "play",
    workId: "binary-block",
    expectOk: true,
  },
  {
    name: "valid apps + writer-memo",
    category: "apps",
    workId: "writer-memo",
    expectOk: true,
  },
  {
    name: "missing category",
    category: undefined,
    workId: "miav-922228",
    expectOk: false,
  },
  {
    name: "missing workId",
    category: "read",
    workId: undefined,
    expectOk: false,
  },
  {
    name: "unknown category",
    category: "games",
    workId: "miav-922228",
    expectOk: false,
  },
  {
    name: "unknown workId",
    category: "read",
    workId: "not-a-work",
    expectOk: false,
  },
  {
    name: "category/work mismatch",
    category: "read",
    workId: "binary-block",
    expectOk: false,
  },
  {
    name: "disabled luminous-structure",
    category: "play",
    workId: "luminous-structure",
    expectOk: false,
  },
];

let failed = 0;
for (const testCase of cases) {
  const result = validateCategoryWork(testCase.category, testCase.workId);
  const ok = result.ok === testCase.expectOk;
  if (!ok) {
    failed += 1;
    console.error("FAIL", testCase.name, result);
  } else {
    console.log("ok  ", testCase.name);
  }
}

if (failed > 0) {
  console.error(`\n${failed} case(s) failed`);
  process.exit(1);
}

console.log(`\nAll ${cases.length} cases passed`);

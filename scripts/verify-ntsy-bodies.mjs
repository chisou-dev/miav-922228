import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const sourcePath =
  process.argv[2] ??
  "C:\\Users\\PC\\Desktop\\Next_Time_I_See_You_HP_SOURCE.txt";
const storiesDir = path.join(
  process.cwd(),
  "content",
  "stories",
  "next-time-i-see-you",
  "en",
);

const buf = fs.readFileSync(sourcePath);
const raw =
  buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe
    ? buf.toString("utf16le")
    : buf.toString("utf8");

const headerRe = /^## (?:Chapter \d+ — |Final Chapter — )/;
const parts = raw.split(/(?=^## (?:Chapter \d+ — |Final Chapter — ))/m).filter(
  (p) => headerRe.test(p),
);

let failed = 0;
for (const part of parts) {
  const firstLine = part.split(/\r?\n/)[0];
  const isFinal = firstLine.includes("Final Chapter");
  const pathSlug = isFinal
    ? "final-chapter"
    : `chapter-${firstLine.match(/Chapter (\d+)/)[1]}`;
  const bodyFromSource = part
    .split(/\r?\n/)
    .slice(1)
    .join("\n")
    .replace(/^\n+/, "")
    .replace(/\n+$/, "");

  const mdPath = path.join(storiesDir, `${pathSlug}.md`);
  const { content } = matter(fs.readFileSync(mdPath, "utf8"));
  const bodyFromMd = content.trim();

  if (bodyFromSource !== bodyFromMd) {
    failed++;
    console.error(`MISMATCH ${pathSlug}`);
    console.error(`  source len ${bodyFromSource.length} md len ${bodyFromMd.length}`);
    const minLen = Math.min(bodyFromSource.length, bodyFromMd.length);
    for (let i = 0; i < minLen; i++) {
      if (bodyFromSource[i] !== bodyFromMd[i]) {
        console.error(
          `  first diff at ${i}: source=${JSON.stringify(bodyFromSource.slice(i, i + 20))} md=${JSON.stringify(bodyFromMd.slice(i, i + 20))}`,
        );
        break;
      }
    }
  }
}

if (failed === 0) {
  console.log(`OK: ${parts.length} chapters match source bodies byte-for-byte.`);
} else {
  console.error(`${failed} chapter(s) failed.`);
  process.exit(1);
}

/**
 * One-off: split Next_Time_I_See_You_HP_SOURCE into content/stories markdown.
 * Does not alter paragraph text — only splits on ## headers.
 */
import fs from "node:fs";
import path from "node:path";

const sourcePath =
  process.argv[2] ??
  "C:\\Users\\PC\\Desktop\\Next_Time_I_See_You_HP_SOURCE.txt";
const outDir = path.join(
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
const lines = raw.split(/\r?\n/);

const headerRe = /^## (?:Chapter (\d+) — |Final Chapter — )(.+)$/;

const chapters = [];
let current = null;

for (const line of lines) {
  const m = line.match(headerRe);
  if (m) {
    if (current) chapters.push(current);
    const isFinal = line.startsWith("## Final Chapter");
    const number = isFinal ? 18 : Number(m[1]);
    const title = isFinal ? m[2] : m[2];
    const pathSlug = isFinal ? "final-chapter" : `chapter-${number}`;
    current = { number, title, pathSlug, bodyLines: [] };
    continue;
  }
  if (line.startsWith("# Next Time I See You")) continue;
  if (current) current.bodyLines.push(line);
}

if (current) chapters.push(current);

fs.mkdirSync(outDir, { recursive: true });

for (const ch of chapters) {
  let body = ch.bodyLines.join("\n");
  body = body.replace(/^\n+/, "").replace(/\n+$/, "");
  const file = `---
title: ${JSON.stringify(ch.title).slice(1, -1)}
---

${body}
`;
  fs.writeFileSync(path.join(outDir, `${ch.pathSlug}.md`), file, "utf8");
}

console.log(`Wrote ${chapters.length} chapters to ${outDir}`);
for (const ch of chapters) {
  console.log(`  ${ch.pathSlug} — ${ch.title} (${ch.bodyLines.length} lines)`);
}

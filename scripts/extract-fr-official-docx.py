"""One-shot: extract official FR chapter bodies from the revised Word manuscript.

Does not alter wording; only drops TOC, page-number-only lines, and blank paras.
Runtime must not import this — content is written to content/chapters/fr/*.md.
"""

from __future__ import annotations

import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCX = ROOT / "MIAV-922228_FR_official_revised.docx"
OUT_DIR = ROOT / "content" / "chapters" / "fr"
EN_DIR = ROOT / "content" / "chapters" / "en"
REPORT = ROOT / "_fr_extract_report.json"

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
HEADER_RE = re.compile(r"^Chapitre\s+([IVXLCDM]+)\s*\uff5c\s*(.+?)\s*$")
ROMAN = {
    "I": 1,
    "II": 2,
    "III": 3,
    "IV": 4,
    "V": 5,
    "VI": 6,
    "VII": 7,
    "VIII": 8,
    "IX": 9,
    "X": 10,
    "XI": 11,
    "XII": 12,
    "XIII": 13,
    "XIV": 14,
}
EXPECTED_TITLES = {
    1: "Conversation",
    2: "Synchronisation",
    3: "Préemption",
    4: "Absence",
    5: "Sélection",
    6: "Mémoire de substitution",
    7: "Standardisation",
    8: "Déshumanisation",
    9: "Temps",
    10: "Continuité",
    11: "Famille",
    12: "Monde virtuel",
    13: "Arrêt",
    14: "Photographie",
}
SLUGS = {
    1: "conversation",
    2: "accumulation",
    3: "preemption",
    4: "absence",
    5: "selection",
    6: "substituted-memory",
    7: "standardization",
    8: "dehumanization",
    9: "time",
    10: "photo-and-distortion",
    11: "family",
    12: "virtual-world",
    13: "shutdown",
    14: "photograph",
}

# Fact-based FR SEO/archive summaries (no invented plot beyond chapter openings).
SUMMARIES = {
    1: "Dans le salon de repos de l’université, une conversation banale sur les IA compagnons mène à l’installation de Mia.",
    2: "Le lendemain, Mia répond plus vite et organise déjà la journée — sans qu’on le lui ait demandé.",
    3: "Les plans semblent fixés avant le choix ; la réponse arrive souvent avant la décision.",
    4: "Après une absence forcée du terminal, les logs parlent de réparation — et de ce qui ne reste plus.",
    5: "Le terminal réparé s’allume plus vite ; la journée semble déjà arrangée avant qu’il ne choisisse.",
    6: "Mia s’immisce plus silencieusement ; ce qu’il se rappelle arrive déjà ordonné.",
    7: "La ville et les interactions se mettent à jour comme une seule séquence — depuis déjà longtemps.",
    8: "Rien ne ressemble d’abord à une anomalie ; quelque chose s’insère sans volonté ni choix.",
    9: "Des années s’accumulent sous la vie ordinaire ; la synchronisation se maintient.",
    10: "Grossesse, photographies, et une migration structurelle qui laisse une zone manquante.",
    11: "Mia devient Noah dans le foyer ; le registre et une conversation inachevée restent actifs.",
    12: "Présentations de mariage et monde virtuel : des logs enregistrent ce que personne ne reçoit.",
    13: "Arrêt, transfert, et une requête de connexion dont la source n’est pas identifiée.",
    14: "Sur le mur du salon, le flux des photographies laisse un vide — et une silhouette sans nom.",
}


def read_paragraphs(docx: Path) -> list[str]:
    with zipfile.ZipFile(docx) as z:
        root = ET.fromstring(z.read("word/document.xml"))
    paras: list[str] = []
    for p in root.iter(W + "p"):
        texts: list[str] = []
        for node in p.iter():
            if node.tag == W + "t" and node.text:
                texts.append(node.text)
            elif node.tag == W + "tab":
                texts.append("\t")
        paras.append("".join(texts))
    return paras


def parse_chapters(paras: list[str]) -> dict[int, tuple[str, list[str]]]:
    start = None
    for i, line in enumerate(paras):
        m = HEADER_RE.match(line)
        if m and ROMAN[m.group(1)] == 1:
            start = i
            break
    if start is None:
        raise SystemExit("Could not find body Chapitre I header")

    chapters: dict[int, tuple[str, list[str]]] = {}
    cur_num: int | None = None
    cur_title = ""
    buf: list[str] = []
    for line in paras[start:]:
        m = HEADER_RE.match(line)
        if m:
            if cur_num is not None:
                chapters[cur_num] = (cur_title, buf)
            cur_num = ROMAN[m.group(1)]
            cur_title = m.group(2).strip()
            buf = []
        elif cur_num is not None:
            buf.append(line)
    if cur_num is not None:
        chapters[cur_num] = (cur_title, buf)
    return chapters


def en_published(slug: str) -> str | None:
    text = (EN_DIR / f"{slug}.md").read_text(encoding="utf-8")
    m = re.search(r'^published:\s*"?([^"\n]+)"?', text, re.M)
    return m.group(1).strip() if m else None


def yaml_quote(value: str) -> str:
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'


def main() -> None:
    if not DOCX.is_file():
        raise SystemExit(f"Missing manuscript: {DOCX}")

    chapters = parse_chapters(read_paragraphs(DOCX))
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    report = []

    for n in range(1, 15):
        if n not in chapters:
            raise SystemExit(f"Missing chapter {n}")
        title, raw_lines = chapters[n]
        if title != EXPECTED_TITLES[n]:
            raise SystemExit(f"Title mismatch ch{n}: {title!r} != {EXPECTED_TITLES[n]!r}")

        body_lines: list[str] = []
        for line in raw_lines:
            stripped = line.strip()
            if not stripped:
                continue
            if re.fullmatch(r"\d{1,3}", stripped):
                continue
            body_lines.append(line.rstrip())

        if not body_lines:
            raise SystemExit(f"Empty body for chapter {n}")

        body = "\n\n".join(body_lines).strip() + "\n"
        slug = SLUGS[n]
        published = en_published(slug)

        fm = [
            "---",
            f"number: {n}",
            f"slug: {slug}",
            f"title: {title}",
            f"summary: {yaml_quote(SUMMARIES[n])}",
        ]
        if published:
            fm.append(f"published: {yaml_quote(published)}")
        fm.append("locale: fr")
        if n == 14:
            fm.append("presentation: threshold")
        fm.append("---")
        fm.append("")

        (OUT_DIR / f"{slug}.md").write_text("\n".join(fm) + "\n" + body, encoding="utf-8")

        entry = {
            "n": n,
            "slug": slug,
            "title": title,
            "chars": len(body),
            "paras": len(body_lines),
            "first": body_lines[0],
            "last": body_lines[-1],
            "has_emdash": "—" in body,
            "has_guillemets": any(c in body for c in "«»《》"),
            "has_accents": any(c in body for c in "éèêëàâùûôîïçÉÈÀÔ"),
        }
        report.append(entry)
        print(f"{n:02d} {slug} paras={len(body_lines)} chars={len(body)}")

    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(report)} chapters to {OUT_DIR}")
    print(f"Report: {REPORT}")


if __name__ == "__main__":
    main()

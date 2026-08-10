"""Verify FR edition routes + SEO meta against a running local server."""

from __future__ import annotations

import json
import re
import urllib.request
from pathlib import Path

BASE = "http://127.0.0.1:3010"
OUT = Path("verify-fr-edition-report.json")

ROUTES = [
    "/chapters",
    "/chapters/conversation",
    "/chapters/selection",
    "/chapters/photograph",
    "/fr/chapters",
    "/fr/chapters/conversation",
    "/fr/chapters/selection",
    "/fr/chapters/photograph",
    "/works",
    "/books",
    "/sitemap.xml",
]


def fetch(path: str) -> tuple[int, str]:
    req = urllib.request.Request(BASE + path, headers={"User-Agent": "miav-verify"})
    with urllib.request.urlopen(req, timeout=60) as response:
        return response.status, response.read().decode("utf-8", "replace")


def first_meta_content(html: str, *, name: str | None = None, prop: str | None = None) -> str | None:
    if name:
        patterns = [
            rf'<meta[^>]+name=["\']{re.escape(name)}["\'][^>]+content=["\']([^"\']*)["\']',
            rf'<meta[^>]+content=["\']([^"\']*)["\'][^>]+name=["\']{re.escape(name)}["\']',
        ]
    else:
        assert prop is not None
        patterns = [
            rf'<meta[^>]+property=["\']{re.escape(prop)}["\'][^>]+content=["\']([^"\']*)["\']',
            rf'<meta[^>]+content=["\']([^"\']*)["\'][^>]+property=["\']{re.escape(prop)}["\']',
        ]
    for pattern in patterns:
        match = re.search(pattern, html, re.I)
        if match:
            return match.group(1)
    return None


def link_href(html: str, *, rel: str | None = None, hreflang: str | None = None) -> str | None:
    if rel:
        match = re.search(
            rf'<link[^>]+rel=["\']{re.escape(rel)}["\'][^>]+href=["\']([^"\']*)["\']',
            html,
            re.I,
        )
        return match.group(1) if match else None
    assert hreflang is not None
    match = re.search(
        rf'<link[^>]+hreflang=["\']{re.escape(hreflang)}["\'][^>]+href=["\']([^"\']*)["\']',
        html,
        re.I,
    )
    return match.group(1) if match else None


def chapter_body_snip(html: str) -> str:
    match = re.search(r'class="chapter-prose"[^>]*>(.*?)</article>', html, re.S)
    if not match:
        return ""
    text = re.sub("<[^>]+>", " ", match.group(1))
    return re.sub(r"\s+", " ", text).strip()[:160]


def main() -> None:
    report: dict[str, object] = {}
    for path in ROUTES:
        status, html = fetch(path)
        title_match = re.search(r"<title>(.*?)</title>", html, re.I | re.S)
        entry = {
            "status": status,
            "title": title_match.group(1).strip() if title_match else None,
            "body": chapter_body_snip(html),
            "robots": first_meta_content(html, name="robots"),
            "canonical": link_href(html, rel="canonical"),
            "hreflang_en": link_href(html, hreflang="en"),
            "hreflang_fr": link_href(html, hreflang="fr"),
            "x_default": link_href(html, hreflang="x-default"),
            "og_title": first_meta_content(html, prop="og:title"),
            "twitter_title": first_meta_content(html, name="twitter:title"),
            "jsonld": "application/ld+json" in html,
            "en_active": 'aria-current="page">EN<' in html,
            "fr_active": 'aria-current="page">FR<' in html,
            "has_prev": ("Previous" in html) or ("Chapitre précédent" in html),
            "has_next": ("Next" in html) or ("Chapitre suivant" in html),
            "has_all": ("All chapters" in html) or ("Tous les chapitres" in html),
            "ch1_hint": ("Start from Chapter 1" in html)
            or ("Commencer au chapitre I" in html),
            "book_cta": ("PART II" in html)
            or ("Voir les livres" in html)
            or ("Coming soon" in html),
            "english_link": "English" in html and "/chapters" in html,
            "francais_link": "Français" in html and "/fr/chapters" in html,
            "html_len": len(html),
        }
        report[path] = entry
        print(
            path,
            status,
            "body=" + ("Y" if entry["body"] else "n"),
            "canon=",
            entry["canonical"],
        )

    status, sitemap = fetch("/sitemap.xml")
    report["sitemap_summary"] = {
        "status": status,
        "has_fr_archive": f"{BASE.replace('http://127.0.0.1:3010', '')}/fr/chapters"
        in sitemap
        or "/fr/chapters<" in sitemap
        or "/fr/chapters\"" in sitemap
        or "fr/chapters" in sitemap,
        "has_fr_conversation": "fr/chapters/conversation" in sitemap,
        "has_en_conversation": "chapters/conversation" in sitemap,
        "xhtml_link_count": sitemap.count("xhtml:link"),
    }
    print("sitemap", report["sitemap_summary"])
    OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print("wrote", OUT)


if __name__ == "__main__":
    main()

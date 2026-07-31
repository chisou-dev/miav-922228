#!/usr/bin/env python3
"""Phase 1-3: completed-text / board visual balance audit (read-only analysis)."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEVELS = ROOT / "games/binary-mosaic/levels/levels.json"


def text_to_bits(text: str) -> list[int]:
    out: list[int] = []
    for ch in text:
        code = ord(ch)
        for i in range(7, -1, -1):
            out.append((code >> i) & 1)
    return out


def char_ones(ch: str) -> int:
    return sum(text_to_bits(ch))


def main() -> None:
    levels = sorted(
        json.loads(LEVELS.read_text(encoding="utf-8")),
        key=lambda x: x["id"],
    )
    print(
        f"{'Lv':>3} {'Word':12} {'R×C':>5} {'#1%':>4} {'sparse':>6} {'notes'}"
    )
    flags: list[tuple[int, str, list[str]]] = []

    for lv in levels:
        w = lv["targetText"]
        rows, cols = lv["rows"], lv["cols"]
        bits = lv["bits"]
        flat = [bits[r][c] for r in range(rows) for c in range(cols)]
        ones = sum(flat)
        density = 100 * ones / len(flat)
        # per-row (per-char) density when cols==8
        sparse_chars = []
        if cols == 8 and rows == len(w):
            for i, ch in enumerate(w):
                row = bits[i]
                o = sum(row)
                if o <= 2:
                    sparse_chars.append(f"{ch}:{o}")
        notes: list[str] = []
        if cols != 8:
            notes.append("non_8col")
        if cols == 8 and rows != len(w):
            notes.append("row_len_mismatch")
        if len(w) <= 2:
            notes.append("short_word")
        if len(w) >= 11:
            notes.append("long_finale_ok" if lv["id"] >= 26 else "long_word")
        if density < 28:
            notes.append("low_bit_density")
        if density > 55:
            notes.append("high_bit_density")
        if sparse_chars:
            notes.append("sparse_rows=" + ",".join(sparse_chars))
        # board size feel vs stage
        if lv["id"] >= 28 and rows < 9:
            notes.append("final_board_small")
        if lv["id"] >= 20 and rows <= 4:
            notes.append("late_small_board")
        # L20 HOME is 4x8 — known tight; flag for visibility review
        if lv["id"] == 20 and rows == 4:
            notes.append("bridge_compact")

        print(
            f"{lv['id']:3d} {w:12} {rows}x{cols:<2d} {density:4.0f} "
            f"{str(sparse_chars) if sparse_chars else '-':6} {' '.join(notes) or '-'}"
        )
        if any(
            n.startswith("sparse")
            or n in ("late_small_board", "final_board_small", "row_len_mismatch", "low_bit_density")
            for n in notes
        ):
            flags.append((lv["id"], w, notes))

    print("\n=== Flagged for review ===")
    if not flags:
        print("(none critical)")
    for lid, w, notes in flags:
        print(f"  L{lid} {w}: {', '.join(notes)}")

    print("\n=== Letter bit counts (ASCII 8-bit) for words used ===")
    seen = []
    for lv in levels:
        for ch in lv["targetText"]:
            if ch not in seen:
                seen.append(ch)
    for ch in seen:
        print(f"  {ch} ones={char_ones(ch)} pattern={''.join(str(b) for b in text_to_bits(ch))}")


if __name__ == "__main__":
    main()

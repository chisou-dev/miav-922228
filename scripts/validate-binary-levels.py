#!/usr/bin/env python3
"""Validate Binary Block levels (mirrors games/binary-mosaic/config.ts rules)."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEVELS_PATH = ROOT / "games/binary-mosaic/levels/levels.json"


def text_to_bits(text: str) -> list[int]:
    out: list[int] = []
    for ch in text:
        code = ord(ch)
        for i in range(7, -1, -1):
            out.append((code >> i) & 1)
    return out


def build_active_mask(solution: list[list[int]]) -> set[tuple[int, int]] | None:
    active: set[tuple[int, int]] = set()
    has_inactive = False
    for r, row in enumerate(solution):
        for c, v in enumerate(row):
            if v >= 0:
                active.add((r, c))
            else:
                has_inactive = True
    return active if has_inactive else None


def flatten_bits(bits: list[list[int]], mask: set[tuple[int, int]] | None) -> list[int]:
    out: list[int] = []
    for r, row in enumerate(bits):
        for c, b in enumerate(row):
            if mask is not None and (r, c) not in mask:
                continue
            out.append(row[c])
    return out


def is_connected(cells: list[tuple[int, int]]) -> bool:
    if not cells:
        return False
    s = set(cells)
    seen = {cells[0]}
    stack = [cells[0]]
    while stack:
        r, c = stack.pop()
        for nr, nc in ((r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1)):
            if (nr, nc) in s and (nr, nc) not in seen:
                seen.add((nr, nc))
                stack.append((nr, nc))
    return len(seen) == len(cells)


def extract_pieces(level: dict) -> list[dict]:
    rows, cols = level["rows"], level["cols"]
    bits, solution = level["bits"], level["solution"]
    indices = sorted({solution[r][c] for r in range(rows) for c in range(cols) if solution[r][c] >= 0})
    pieces = []
    for pid in indices:
        cells = []
        for r in range(rows):
            for c in range(cols):
                if solution[r][c] == pid:
                    cells.append({"row": r, "col": c, "bit": bits[r][c]})
        if not cells:
            raise ValueError(f"empty piece {pid}")
        if not is_connected([(c["row"], c["col"]) for c in cells]):
            raise ValueError(f"piece {pid} disconnected")
        min_r = min(c["row"] for c in cells)
        min_c = min(c["col"] for c in cells)
        shape = sorted(
            [{"row": c["row"] - min_r, "col": c["col"] - min_c, "bit": c["bit"]} for c in cells],
            key=lambda x: (x["row"], x["col"]),
        )
        pieces.append({"id": pid, "cells": len(cells), "shape": shape})
    return pieces


def shape_kind(piece: dict) -> str:
    shape = piece["shape"]
    rows = max(c["row"] for c in shape) + 1
    cols = max(c["col"] for c in shape) + 1
    n = len(shape)
    if rows == 1 or cols == 1:
        return "I"
    if n == rows * cols:
        return "O" if rows == 2 and cols == 2 else "rect"
    # classify L/T/Z loosely by bounding box fill ratio
    if n == 4:
        coords = {(c["row"], c["col"]) for c in shape}
        if rows == 2 and cols == 3:
            return "L/Z/T"
        if rows == 3 and cols == 2:
            return "L/Z/T"
    return "concave"


def max_filled_rects(level_id: int) -> int:
    if level_id >= 15:
        return 2
    return 1


def validate_all(levels: list[dict]) -> None:
    prev_count = 0
    for level in sorted(levels, key=lambda x: x["id"]):
        lid = level["id"]
        rows, cols = level["rows"], level["cols"]
        if len(level["bits"]) != rows or len(level["solution"]) != rows:
            raise ValueError(f"L{lid}: row count mismatch")
        mask = build_active_mask(level["solution"])
        expected = text_to_bits(level["targetText"])
        flat = flatten_bits(level["bits"], mask)
        if flat != expected:
            raise ValueError(f"L{lid}: bits != ASCII for {level['targetText']}")

        pieces = extract_pieces(level)
        if lid <= 3 and len(pieces) != lid + 2:
            raise ValueError(f"L{lid}: expected {lid+2} pieces, got {len(pieces)}")
        if len(pieces) < prev_count:
            raise ValueError(f"L{lid}: piece count {len(pieces)} < prev {prev_count}")
        prev_count = len(pieces)

        filled = 0
        kinds: dict[str, int] = {}
        bars = 0
        squares = 0
        for p in pieces:
            k = shape_kind(p)
            kinds[k] = kinds.get(k, 0) + 1
            shape = p["shape"]
            pr = max(c["row"] for c in shape) + 1
            pc = max(c["col"] for c in shape) + 1
            if pr == 1 or pc == 1:
                bars += 1
            if len(shape) == pr * pc and not (pr == 1 or pc == 1):
                filled += 1
                if pr == 2 and pc == 2:
                    squares += 1

        limit = max_filled_rects(lid)
        if filled > limit:
            raise ValueError(f"L{lid}: {filled} filled rects > limit {limit}")

        print(
            f"L{lid:2d} {level['targetText']:8s} rows={rows} pieces={len(pieces):2d} "
            f"O={squares} I={bars} kinds={kinds}"
        )


if __name__ == "__main__":
    levels = json.loads(LEVELS_PATH.read_text(encoding="utf-8"))
    validate_all(levels)
    print(f"OK — {len(levels)} levels")

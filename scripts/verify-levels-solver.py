#!/usr/bin/env python3
"""
Verify Binary Block levels — thin wrapper around the TypeScript solver.

Canonical verifier:
  npm run verify:levels
  npx tsx scripts/verify-levels-solver.mts

Library: games/binary-mosaic/core/solver.ts

This file keeps extract_pieces / solve_level helpers for legacy Python
tooling (fix-unique, inspect-multi, phase1-2-audit). Prefer the TS
solver for new work.
"""
from __future__ import annotations

import json
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEVELS_PATH = ROOT / "games/binary-mosaic/levels/levels.json"

ROTATABLE_COUNT = {
    20: 1,
    21: 1,
    22: 2,
    23: 2,
    24: 2,
    25: 3,
    26: 3,
    27: 3,
    28: 3,
    29: 5,
    30: 5,
    31: 4,
    32: 3,
    33: 4,
    34: 4,
    35: 4,
    36: 4,
    37: 3,
    38: 3,
}

SOLUTION_LIMIT = 3  # stop after this many solutions
NODE_LIMIT = 2_000_000  # per level soft cap


def text_to_bits(text: str) -> list[int]:
    out: list[int] = []
    for ch in text:
        code = ord(ch)
        for i in range(7, -1, -1):
            out.append((code >> i) & 1)
    return out


def normalize(cells: list[tuple[int, int, int]]) -> list[tuple[int, int, int]]:
    min_r = min(r for r, _, _ in cells)
    min_c = min(c for _, c, _ in cells)
    return sorted((r - min_r, c - min_c, b) for r, c, b in cells)


def rotate_once(cells: list[tuple[int, int, int]]) -> list[tuple[int, int, int]]:
    # 90° CW: (r,c) -> (c, -r) then normalize
    return normalize([(c, -r, b) for r, c, b in cells])


def rotate_n(cells: list[tuple[int, int, int]], times: int) -> list[tuple[int, int, int]]:
    out = cells
    for _ in range(times % 4):
        out = rotate_once(out)
    return out


def shape_needs_rotation(cells: list[tuple[int, int, int]]) -> bool:
    a = normalize(cells)
    b = rotate_n(a, 1)
    return {(r, c) for r, c, _ in a} != {(r, c) for r, c, _ in b}


def bounds(cells: list[tuple[int, int, int]]) -> tuple[int, int]:
    return max(r for r, _, _ in cells) + 1, max(c for _, c, _ in cells) + 1


def is_connected(coords: list[tuple[int, int]]) -> bool:
    s = set(coords)
    if not s:
        return False
    start = next(iter(s))
    seen = {start}
    stack = [start]
    while stack:
        r, c = stack.pop()
        for nr, nc in ((r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1)):
            if (nr, nc) in s and (nr, nc) not in seen:
                seen.add((nr, nc))
                stack.append((nr, nc))
    return len(seen) == len(s)


@dataclass
class Piece:
    index: int
    base: list[tuple[int, int, int]]  # normalized (r,c,bit)
    can_rotate: bool
    target_origin: tuple[int, int]


def extract_pieces(level: dict) -> list[Piece]:
    rows, cols = level["rows"], level["cols"]
    bits, sol = level["bits"], level["solution"]
    indices = sorted(
        {sol[r][c] for r in range(rows) for c in range(cols) if sol[r][c] >= 0}
    )
    raw: list[tuple[int, list[tuple[int, int, int]], tuple[int, int]]] = []
    for pid in indices:
        cells = []
        for r in range(rows):
            for c in range(cols):
                if sol[r][c] == pid:
                    cells.append((r, c, bits[r][c]))
        if not is_connected([(r, c) for r, c, _ in cells]):
            raise ValueError(f"piece {pid} disconnected")
        min_r = min(r for r, _, _ in cells)
        min_c = min(c for _, c, _ in cells)
        base = normalize(cells)
        raw.append((pid, base, (min_r, min_c)))

    quota = ROTATABLE_COUNT.get(level["id"], 0)
    ranked = sorted(
        raw,
        key=lambda x: (0 if shape_needs_rotation(x[1]) else 1, x[0]),
    )
    rotatable = {ranked[i][0] for i in range(min(quota, len(ranked)))}

    return [
        Piece(
            index=pid,
            base=base,
            can_rotate=pid in rotatable,
            target_origin=origin,
        )
        for pid, base, origin in raw
    ]


def designed_packing_ok(level: dict, pieces: list[Piece]) -> bool:
    """Place each piece at packed origin, rotation 0 — must match bits & fill."""
    rows, cols = level["rows"], level["cols"]
    target = level["bits"]
    board = [[None for _ in range(cols)] for _ in range(rows)]
    for p in pieces:
        orr, orc = p.target_origin
        for dr, dc, bit in p.base:
            r, c = orr + dr, orc + dc
            if not (0 <= r < rows and 0 <= c < cols):
                return False
            if board[r][c] is not None:
                return False
            if target[r][c] != bit:
                return False
            board[r][c] = bit
    for r in range(rows):
        for c in range(cols):
            if board[r][c] is None:
                return False
    flat = [board[r][c] for r in range(rows) for c in range(cols)]
    return flat == text_to_bits(level["targetText"])


def orientations(p: Piece) -> list[list[tuple[int, int, int]]]:
    if not p.can_rotate:
        return [p.base]
    seen: set[tuple[tuple[int, int, int], ...]] = set()
    out = []
    for t in range(4):
        sh = rotate_n(p.base, t)
        key = tuple(sh)
        if key not in seen:
            seen.add(key)
            out.append(sh)
    return out


@dataclass
class SolveResult:
    solutions: int  # capped
    nodes: int
    timed_out: bool
    ms: float
    found_designed: bool


def solve_level(level: dict, pieces: list[Piece]) -> SolveResult:
    """Legacy Python exact-cover (prefer core/solver.ts via npm run verify:levels)."""
    rows, cols = level["rows"], level["cols"]
    target = level["bits"]
    n = rows * cols
    # occupancy: -1 empty else piece order index
    occ = [-1] * n
    target_flat = [target[r][c] for r in range(rows) for c in range(cols)]

    # Precompute placements: for each piece, list of (mask_indices, ok)
    # mask = list of board indices covered
    piece_placements: list[list[list[int]]] = []
    for p in pieces:
        places: list[list[int]] = []
        for shape in orientations(p):
            h, w = bounds(shape)
            for orr in range(rows - h + 1):
                for orc in range(cols - w + 1):
                    idxs: list[int] = []
                    ok = True
                    for dr, dc, bit in shape:
                        r, c = orr + dr, orc + dc
                        idx = r * cols + c
                        if target_flat[idx] != bit:
                            ok = False
                            break
                        idxs.append(idx)
                    if ok:
                        places.append(idxs)
        piece_placements.append(places)

    # designed placement present?
    designed_keys = []
    for p in pieces:
        idxs = []
        orr, orc = p.target_origin
        for dr, dc, bit in p.base:
            idxs.append((orr + dr) * cols + (orc + dc))
        designed_keys.append(tuple(sorted(idxs)))
    found_designed = False

    # Order pieces by fewest placements (MRV)
    order = sorted(range(len(pieces)), key=lambda i: len(piece_placements[i]))

    solutions = 0
    nodes = 0
    timed_out = False
    t0 = time.perf_counter()

    def dfs(pi: int) -> None:
        nonlocal solutions, nodes, timed_out, found_designed
        if solutions >= SOLUTION_LIMIT or timed_out:
            return
        nodes += 1
        if nodes > NODE_LIMIT:
            timed_out = True
            return
        if pi >= len(order):
            solutions += 1
            return
        # optional: skip empty-cell forcing — place next piece in MRV order
        pidx = order[pi]
        for place in piece_placements[pidx]:
            if any(occ[i] >= 0 for i in place):
                continue
            for i in place:
                occ[i] = pidx
            if tuple(sorted(place)) == designed_keys[pidx]:
                # track later
                pass
            dfs(pi + 1)
            for i in place:
                occ[i] = -1
            if solutions >= SOLUTION_LIMIT or timed_out:
                return

    # Check designed is among placements for each piece
    designed_placeable = all(
        any(tuple(sorted(pl)) == designed_keys[i] for pl in piece_placements[i])
        for i in range(len(pieces))
    )
    found_designed = designed_placeable and designed_packing_ok(level, pieces)

    dfs(0)
    ms = (time.perf_counter() - t0) * 1000
    return SolveResult(solutions, nodes, timed_out, ms, found_designed)


def difficulty_band(lid: int) -> str:
    if lid <= 10:
        return "early"
    if lid <= 20:
        return "mid"
    if lid <= 24:
        return "intro-hard"
    if lid <= 27:
        return "advanced"
    return "final"


def main() -> None:
    """Delegate to the TypeScript verifier (core/solver.ts)."""
    cmd = [
        "npm",
        "run",
        "verify:levels",
        "--prefix",
        str(ROOT),
    ]
    print(
        "Delegating to TypeScript verifier (games/binary-mosaic/core/solver.ts)…",
        file=sys.stderr,
    )
    raise SystemExit(subprocess.call(cmd, cwd=str(ROOT)))


if __name__ == "__main__":
    main()

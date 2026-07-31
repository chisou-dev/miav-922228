#!/usr/bin/env python3
"""
Verify Binary Block levels with structural checks + exact-cover solver.

Reports for each level:
  - designed packing reconstructs target bits (clearable by construction)
  - solver finds >=1 solution under game rotation rules
  - solution uniqueness (count up to LIMIT)
  - difficulty signals (pieces, rotate quota, board size, solver branching)
"""
from __future__ import annotations

import json
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

    def first_empty() -> int:
        for i, v in enumerate(occ):
            if v < 0:
                return i
        return -1

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
    levels = json.loads(LEVELS_PATH.read_text(encoding="utf-8"))
    levels = sorted(levels, key=lambda x: x["id"])
    assert len(levels) == 30, f"expected 30 levels, got {len(levels)}"

    prev_pieces = 0
    rows_out = []
    fail = 0

    print(
        f"{'Lv':>3} {'Word':12} {'Pc':>3} {'Rot':>3} {'Cells':>5} "
        f"{'Design':>6} {'Sol>=':>5} {'Unique?':>8} {'Nodes':>8} {'ms':>7} Band"
    )

    for level in levels:
        lid = level["id"]
        word = level["targetText"]
        pieces = extract_pieces(level)
        pc = len(pieces)
        rot = sum(1 for p in pieces if p.can_rotate)
        cells = level["rows"] * level["cols"]

        # structural ASCII
        flat = [level["bits"][r][c] for r in range(level["rows"]) for c in range(level["cols"])]
        ascii_ok = flat == text_to_bits(word)

        design_ok = designed_packing_ok(level, pieces)
        mono_ok = pc >= prev_pieces

        result = solve_level(level, pieces)

        if result.solutions == 0 and not result.timed_out:
            uniq = "NONE"
            fail += 1
        elif result.solutions == 1 and not result.timed_out:
            uniq = "UNIQUE"
        elif result.solutions >= SOLUTION_LIMIT:
            uniq = f"MULTI>={SOLUTION_LIMIT}"
        else:
            uniq = f"MULTI={result.solutions}"

        if result.timed_out:
            uniq = uniq + "/TO"

        ok = ascii_ok and design_ok and mono_ok and result.found_designed and (
            result.solutions >= 1 or result.timed_out
        )
        if not ok:
            fail += 1

        print(
            f"{lid:3d} {word:12} {pc:3d} {rot:3d} {cells:5d} "
            f"{'OK' if design_ok else 'FAIL':>6} {result.solutions:5d} {uniq:>8} "
            f"{result.nodes:8d} {result.ms:7.0f} {difficulty_band(lid)}"
        )
        rows_out.append(
            {
                "id": lid,
                "word": word,
                "pieces": pc,
                "rotate": rot,
                "cells": cells,
                "designed_clearable": design_ok,
                "ascii_ok": ascii_ok,
                "monotonic_pieces": mono_ok,
                "solver_solutions_capped": result.solutions,
                "uniqueness": uniq,
                "solver_nodes": result.nodes,
                "timed_out": result.timed_out,
                "found_designed": result.found_designed,
            }
        )
        prev_pieces = pc

    # Difficulty trend checks
    pcs = [r["pieces"] for r in rows_out]
    rots = [r["rotate"] for r in rows_out]
    piece_mono = all(pcs[i] <= pcs[i + 1] for i in range(len(pcs) - 1))
    rot_nondec_from_20 = all(
        rots[i] <= rots[i + 1]
        for i in range(19, len(rots) - 1)  # index 19 = L20
    )

    print()
    print("=== Summary ===")
    print(f"Levels: {len(rows_out)}")
    print(f"All designed packings clearable: {all(r['designed_clearable'] for r in rows_out)}")
    print(f"All ASCII bit match: {all(r['ascii_ok'] for r in rows_out)}")
    print(f"Piece count monotonic: {piece_mono} ({pcs[0]}..{pcs[-1]})")
    print(f"Rotate quota non-decreasing L20-30: {rot_nondec_from_20} ({rots[19:]})")
    unique_n = sum(1 for r in rows_out if r["uniqueness"].startswith("UNIQUE"))
    multi_n = sum(1 for r in rows_out if "MULTI" in r["uniqueness"])
    none_n = sum(1 for r in rows_out if r["uniqueness"].startswith("NONE"))
    to_n = sum(1 for r in rows_out if r["timed_out"])
    print(f"Solver UNIQUE: {unique_n}  MULTI: {multi_n}  NONE: {none_n}  timed_out: {to_n}")
    print(f"Failures flagged: {fail}")

    out_path = ROOT / "scripts" / "level-verify-report.json"
    out_path.write_text(json.dumps(rows_out, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()

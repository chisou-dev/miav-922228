#!/usr/bin/env python3
"""Inspect alternate solutions for multi-solution levels 21-30."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

# Load verify module properly
import importlib.util

path = ROOT / "scripts" / "verify-levels-solver.py"
spec = importlib.util.spec_from_file_location("verify_levels_solver", path)
verify = importlib.util.module_from_spec(spec)
sys.modules["verify_levels_solver"] = verify
spec.loader.exec_module(verify)

LEVELS_PATH = ROOT / "games/binary-mosaic/levels/levels.json"


def collect_solutions(level: dict, limit: int = 5):
    pieces = verify.extract_pieces(level)
    rows, cols = level["rows"], level["cols"]
    target = level["bits"]
    target_flat = [target[r][c] for r in range(rows) for c in range(cols)]
    occ = [-1] * (rows * cols)

    placements = []
    for p in pieces:
        places = []
        for shape in verify.orientations(p):
            h, w = verify.bounds(shape)
            for orr in range(rows - h + 1):
                for orc in range(cols - w + 1):
                    idxs = []
                    ok = True
                    for dr, dc, bit in shape:
                        r, c = orr + dr, orc + dc
                        idx = r * cols + c
                        if target_flat[idx] != bit:
                            ok = False
                            break
                        idxs.append(idx)
                    if ok:
                        places.append((orr, orc, tuple(sorted(idxs))))
        placements.append(places)

    designed = []
    for p in pieces:
        idxs = [
            (p.target_origin[0] + dr) * cols + (p.target_origin[1] + dc)
            for dr, dc, bit in p.base
        ]
        designed.append(tuple(sorted(idxs)))

    order = sorted(range(len(pieces)), key=lambda i: len(placements[i]))
    solutions = []

    def dfs(pi: int, chosen: list):
        if len(solutions) >= limit:
            return
        if pi >= len(order):
            solutions.append(list(chosen))
            return
        pidx = order[pi]
        for orr, orc, key in placements[pidx]:
            idxs = list(key)
            if any(occ[i] >= 0 for i in idxs):
                continue
            for i in idxs:
                occ[i] = pidx
            chosen.append((pidx, orr, orc, key == designed[pidx], key))
            dfs(pi + 1, chosen)
            chosen.pop()
            for i in idxs:
                occ[i] = -1
            if len(solutions) >= limit:
                return

    dfs(0, [])
    return pieces, designed, solutions


def main():
    levels = json.loads(LEVELS_PATH.read_text(encoding="utf-8"))
    for lid in [21, 22, 23, 24, 25, 26, 27, 28, 29, 30]:
        level = next(x for x in levels if x["id"] == lid)
        pieces, designed, sols = collect_solutions(level, limit=5)
        print(f"\n=== L{lid} {level['targetText']} sols={len(sols)} pc={len(pieces)} rot={sum(1 for p in pieces if p.can_rotate)} ===")
        if len(sols) <= 1:
            print("  UNIQUE")
            continue
        for si, sol in enumerate(sols):
            by_p = {pidx: (orr, orc, is_des, key) for pidx, orr, orc, is_des, key in sol}
            moved = []
            identical_swaps = 0
            for i, p in enumerate(pieces):
                orr, orc, is_des, key = by_p[i]
                if is_des:
                    continue
                # check if another piece took designed cells (swap)
                moved.append(f"p{p.index}:({p.target_origin})->({orr},{orc})")
            print(f"  sol[{si}]: moved {len(moved)} pieces: {', '.join(moved[:10])}")


if __name__ == "__main__":
    main()

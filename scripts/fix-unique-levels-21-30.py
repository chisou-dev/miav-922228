#!/usr/bin/env python3
"""
Regenerate unintentional multi-solution levels (21-30) to UNIQUE packings.
Level-data only. Keeps words, board size, piece counts.
"""
from __future__ import annotations

import json
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import importlib.util

gen_path = ROOT / "scripts" / "generate-levels-21-30.py"
spec_g = importlib.util.spec_from_file_location("gen2130", gen_path)
gen = importlib.util.module_from_spec(spec_g)
sys.modules["gen2130"] = gen
spec_g.loader.exec_module(gen)

ver_path = ROOT / "scripts" / "verify-levels-solver.py"
spec_v = importlib.util.spec_from_file_location("verify_levels_solver", ver_path)
verify = importlib.util.module_from_spec(spec_v)
sys.modules["verify_levels_solver"] = verify
spec_v.loader.exec_module(verify)

LEVELS_PATH = ROOT / "games/binary-mosaic/levels/levels.json"

# Unintentional multi-solution levels to fix (from inspection)
FIX_IDS = {22, 23, 24, 25, 26, 29, 30}


def solution_count(level: dict, limit: int = 2) -> int:
    """Count solutions up to `limit` (2 means: unique vs multi)."""
    old_limit = verify.SOLUTION_LIMIT
    verify.SOLUTION_LIMIT = limit
    try:
        pieces = verify.extract_pieces(level)
        if not verify.designed_packing_ok(level, pieces):
            return 0
        result = verify.solve_level(level, pieces)
        return result.solutions
    finally:
        verify.SOLUTION_LIMIT = old_limit


def make_level(lid: int, text: str, piece_count: int, seed: int) -> dict | None:
    bits = gen.bits_grid(text)
    rows, cols = len(bits), len(bits[0])
    board = gen.pack_board(rows, cols, piece_count, seed, max_attempts=600)
    if board is None:
        return None
    # connectivity + rect check
    pcs: dict[int, set] = {}
    for r in range(rows):
        for c in range(cols):
            pcs.setdefault(board[r][c], set()).add((r, c))
    if any(not gen.is_connected(cells) for cells in pcs.values()):
        return None
    if sum(1 for cells in pcs.values() if gen.is_filled_rect(cells)) > 1:
        return None
    return {
        "id": lid,
        "title": f"Level {lid}",
        "rows": rows,
        "cols": cols,
        "frame": "rect",
        "targetText": text,
        "hintAllowed": True,
        "bits": bits,
        "solution": board,
    }


def main() -> None:
    levels = json.loads(LEVELS_PATH.read_text(encoding="utf-8"))
    by_id = {lv["id"]: lv for lv in levels}

    for lid in sorted(FIX_IDS):
        cur = by_id[lid]
        text = cur["targetText"]
        pc = len({v for row in cur["solution"] for v in row if v >= 0})
        print(f"Fixing L{lid} {text} pieces={pc} ...")
        found = None
        # try many seeds
        for bump in range(0, 2500):
            seed = 100000 + lid * 10007 + bump * 17
            cand = make_level(lid, text, pc, seed)
            if cand is None:
                continue
            n = solution_count(cand, limit=2)
            if n == 1:
                found = cand
                print(f"  OK seed={seed} unique")
                break
            if bump % 100 == 0:
                print(f"  ... tried {bump}, last sols={n}")
        if found is None:
            # try piece_count +/- 0 only; if fail, allow +0 with more attempts via different grow
            raise SystemExit(f"Could not find unique packing for L{lid}")
        by_id[lid] = found

    # Verify all 21-30
    print("\nRe-verify L21-30:")
    prev_pc = len({v for row in by_id[20]["solution"] for v in row if v >= 0})
    for lid in range(21, 31):
        lv = by_id[lid]
        pieces = verify.extract_pieces(lv)
        pc = len(pieces)
        assert pc >= prev_pc, (lid, pc, prev_pc)
        assert verify.designed_packing_ok(lv, pieces)
        n = solution_count(lv, limit=2)
        status = "UNIQUE" if n == 1 else f"MULTI={n}"
        print(f"  L{lid} {lv['targetText']:12} pc={pc:2d} rot={sum(1 for p in pieces if p.can_rotate)} {status}")
        if n != 1:
            raise SystemExit(f"Still multi at L{lid}")
        prev_pc = pc

    out = [by_id[i] for i in sorted(by_id)]
    LEVELS_PATH.write_text(json.dumps(out, indent=2) + "\n", encoding="utf-8")
    print(f"\nWrote {LEVELS_PATH}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Phase 1-2 play-quality audit for Binary Block levels 1-30 (read-only)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import importlib.util

ver_path = ROOT / "scripts" / "verify-levels-solver.py"
spec = importlib.util.spec_from_file_location("verify_levels_solver", ver_path)
verify = importlib.util.module_from_spec(spec)
sys.modules["verify_levels_solver"] = verify
spec.loader.exec_module(verify)

LEVELS_PATH = ROOT / "games/binary-mosaic/levels/levels.json"


def piece_stats(level: dict, pieces: list) -> dict:
    sizes = [len(p.base) for p in pieces]
    bars = 0
    rects = 0
    for p in pieces:
        rs = max(r for r, _, _ in p.base) + 1
        cs = max(c for _, c, _ in p.base) + 1
        n = len(p.base)
        if rs == 1 or cs == 1:
            bars += 1
        elif n == rs * cs:
            rects += 1
    return {
        "min": min(sizes),
        "max": max(sizes),
        "avg": sum(sizes) / len(sizes),
        "bars": bars,
        "rects": rects,
        "rotatable": sum(1 for p in pieces if p.can_rotate),
    }


def main() -> None:
    levels = sorted(
        json.loads(LEVELS_PATH.read_text(encoding="utf-8")),
        key=lambda x: x["id"],
    )
    assert len(levels) == 30

    rows = []
    prev_pc = 0
    print(
        f"{'Lv':>3} {'Word':12} {'Pc':>3} {'dPc':>3} {'Rot':>3} {'Cell':>4} "
        f"{'Bar%':>4} {'Nodes':>7} {'Uniq':>6} Notes"
    )

    for level in levels:
        lid = level["id"]
        pieces = verify.extract_pieces(level)
        pc = len(pieces)
        st = piece_stats(level, pieces)
        cells = level["rows"] * level["cols"]
        design = verify.designed_packing_ok(level, pieces)
        verify.SOLUTION_LIMIT = 2
        verify.NODE_LIMIT = 3_000_000
        sol = verify.solve_level(level, pieces)
        uniq = "U" if sol.solutions == 1 and not sol.timed_out else (
            "M" if sol.solutions >= 2 else ("TO" if sol.timed_out else "0")
        )
        dpc = pc - prev_pc
        bar_pct = int(100 * st["bars"] / pc)
        notes = []
        if not design:
            notes.append("DESIGN_FAIL")
        if sol.solutions < 1 and not sol.timed_out:
            notes.append("NO_SOL")
        if dpc < 0:
            notes.append("PC_DROP")
        if lid >= 21 and uniq != "U":
            notes.append("MULTI_FINAL")
        if bar_pct >= 50:
            notes.append("many_bars")
        if lid >= 20 and st["rotatable"] == 0 and verify.ROTATABLE_COUNT.get(lid, 0) > 0:
            notes.append("rot_quota_unused")
        # stuck risk: few placements relative to pieces (tight) OR huge branch (ambiguous early)
        if sol.nodes > 5000 and lid < 28:
            notes.append("heavy_search")
        if sol.nodes <= pc + 2 and lid >= 15:
            notes.append("maybe_easy")
        # L20 small board with multi
        if lid == 20 and uniq == "M":
            notes.append("L20_multi")

        print(
            f"{lid:3d} {level['targetText']:12} {pc:3d} {dpc:+3d} {st['rotatable']:3d} {cells:4d} "
            f"{bar_pct:3d}% {sol.nodes:7d} {uniq:>6} {' '.join(notes) or '-'}"
        )
        rows.append(
            {
                "id": lid,
                "word": level["targetText"],
                "pieces": pc,
                "d_pieces": dpc,
                "rotate": st["rotatable"],
                "cells": cells,
                "bar_pct": bar_pct,
                "avg_size": round(st["avg"], 2),
                "nodes": sol.nodes,
                "unique": uniq,
                "designed_ok": design,
                "notes": notes,
            }
        )
        prev_pc = pc

    # Curve summary
    pcs = [r["pieces"] for r in rows]
    nodes = [r["nodes"] for r in rows]
    print("\n=== Difficulty curve ===")
    print(f"Pieces: {pcs[0]} -> {pcs[-1]} monotonic={all(pcs[i]<=pcs[i+1] for i in range(29))}")
    print(f"Nodes L1-10 avg={sum(nodes[:10])/10:.0f}  L11-20={sum(nodes[10:20])/10:.0f}  L21-30={sum(nodes[20:])/10:.0f}")
    print(f"Nodes L20={nodes[19]} L21={nodes[20]} (step)")

    stuck = [r for r in rows if "heavy_search" in r["notes"] or r["nodes"] > 2000]
    multi_final = [r for r in rows if r["id"] >= 21 and r["unique"] != "U"]
    flags = [r for r in rows if r["notes"]]

    print("\n=== Stuck / flag candidates ===")
    if not flags:
        print("(none)")
    for r in flags:
        print(f"  L{r['id']} {r['word']}: {', '.join(r['notes'])} (nodes={r['nodes']})")

    print("\n=== High search (feel stuck) ===")
    for r in sorted(rows, key=lambda x: -x["nodes"])[:8]:
        print(f"  L{r['id']} {r['word']}: nodes={r['nodes']} pc={r['pieces']} rot={r['rotate']}")

    out = ROOT / "scripts" / "phase1-2-audit.json"
    out.write_text(json.dumps(rows, indent=2) + "\n", encoding="utf-8")
    print(f"\nWrote {out}")
    print(f"Final-stage multi remaining: {len(multi_final)}")
    print(f"All designed clearable: {all(r['designed_ok'] for r in rows)}")


if __name__ == "__main__":
    main()

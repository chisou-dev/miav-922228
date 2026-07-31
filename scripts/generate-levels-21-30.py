#!/usr/bin/env python3
"""Generate Binary Block levels 21-30 (connected polyomino partition)."""
from __future__ import annotations

import json
import random
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


def bits_grid(text: str, cols: int = 8) -> list[list[int]]:
    flat = text_to_bits(text)
    assert len(flat) % cols == 0, (text, len(flat))
    rows = len(flat) // cols
    return [flat[r * cols : (r + 1) * cols] for r in range(rows)]


def neighbors(r: int, c: int, rows: int, cols: int):
    for nr, nc in ((r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1)):
        if 0 <= nr < rows and 0 <= nc < cols:
            yield nr, nc


def is_connected(cells: set[tuple[int, int]]) -> bool:
    if not cells:
        return False
    start = next(iter(cells))
    seen = {start}
    stack = [start]
    while stack:
        r, c = stack.pop()
        for nr, nc in ((r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1)):
            if (nr, nc) in cells and (nr, nc) not in seen:
                seen.add((nr, nc))
                stack.append((nr, nc))
    return len(seen) == len(cells)


def is_filled_rect(cells: set[tuple[int, int]]) -> bool:
    if not cells:
        return False
    rs = [r for r, _ in cells]
    cs = [c for _, c in cells]
    min_r, max_r = min(rs), max(rs)
    min_c, max_c = min(cs), max(cs)
    h = max_r - min_r + 1
    w = max_c - min_c + 1
    if h == 1 or w == 1:
        return False
    return len(cells) == h * w


def remaining_connected(empty: set[tuple[int, int]]) -> bool:
    return not empty or is_connected(empty)


def grow_piece(
    empty: set[tuple[int, int]],
    size: int,
    rows: int,
    cols: int,
    rng: random.Random,
) -> set[tuple[int, int]] | None:
    if size <= 0 or size > len(empty):
        return None
    # Prefer seeds that leave the remainder connectable — try several seeds
    seeds = list(empty)
    rng.shuffle(seeds)
    for start in seeds[: min(40, len(seeds))]:
        piece = {start}
        frontier = [
            (nr, nc)
            for nr, nc in neighbors(*start, rows, cols)
            if (nr, nc) in empty
        ]
        rng.shuffle(frontier)
        failed = False
        while len(piece) < size:
            # candidates adjacent to piece, still empty
            cand = [
                p
                for p in empty
                if p not in piece
                and any(n in piece for n in neighbors(*p, rows, cols))
            ]
            if not cand:
                failed = True
                break
            rng.shuffle(cand)
            # pick cell that keeps remainder potentially connected
            chosen = None
            for cell in cand:
                trial = piece | {cell}
                rem = empty - trial
                if len(trial) == size:
                    if remaining_connected(rem):
                        chosen = cell
                        break
                else:
                    # heuristic: remainder still one component OR we still have growth room
                    if remaining_connected(rem) or len(rem) > size - len(trial):
                        # lightly prefer not creating thin traps
                        chosen = cell
                        break
            if chosen is None:
                # fallback: any candidate
                chosen = cand[0]
            piece.add(chosen)
        if failed or len(piece) != size:
            continue
        rem = empty - piece
        if not remaining_connected(rem):
            continue
        if not is_connected(piece):
            continue
        return piece
    return None


def choose_sizes(total: int, n: int, rng: random.Random) -> list[int]:
    """Sizes in [2, 6] summing to total, length n. Prefer 3–5 for difficulty."""
    assert n >= 1 and total >= n * 2
    # start equal-ish then jitter
    base = total // n
    sizes = [base] * n
    for i in range(total % n):
        sizes[i] += 1
    # clamp / redistribute into 2..6
    for _ in range(2000):
        if all(2 <= s <= 6 for s in sizes) and sum(sizes) == total:
            rng.shuffle(sizes)
            return sizes
        # fix outliers
        for i, s in enumerate(sizes):
            if s > 6:
                for j in range(n):
                    if sizes[j] < 6 and i != j:
                        sizes[i] -= 1
                        sizes[j] += 1
                        break
            elif s < 2:
                for j in range(n):
                    if sizes[j] > 2 and i != j:
                        sizes[i] += 1
                        sizes[j] -= 1
                        break
    # last resort: mostly 4s and 3s
    sizes = []
    rem = total
    for left in range(n, 0, -1):
        if left == 1:
            sizes.append(rem)
        else:
            lo = max(2, rem - 6 * (left - 1))
            hi = min(6, rem - 2 * (left - 1))
            s = rng.randint(lo, hi)
            sizes.append(s)
            rem -= s
    return sizes


def pack_board(
    rows: int,
    cols: int,
    piece_count: int,
    seed: int,
    max_attempts: int = 400,
) -> list[list[int]] | None:
    cells = {(r, c) for r in range(rows) for c in range(cols)}
    total = rows * cols
    rng = random.Random(seed)

    for attempt in range(max_attempts):
        sizes = choose_sizes(total, piece_count, rng)
        empty = set(cells)
        board = [[-1] * cols for _ in range(rows)]
        rects = 0
        ok = True
        for pid, sz in enumerate(sizes):
            if pid == piece_count - 1:
                # last takes all remaining
                piece = set(empty)
                if len(piece) != sz or not is_connected(piece):
                    ok = False
                    break
            else:
                piece = grow_piece(empty, sz, rows, cols, rng)
                if piece is None:
                    ok = False
                    break
            if is_filled_rect(piece):
                rects += 1
                if rects > 1:
                    ok = False
                    break
            for r, c in piece:
                board[r][c] = pid
            empty -= piece
        if ok and not empty:
            return board
    return None


LEVEL_SPECS = [
    # id, text, target_piece_count, seed
    (21, "BINARY", 10, 21001),
    (22, "SIGNAL", 11, 22011),
    (23, "NETWORK", 12, 23021),
    (24, "DIGITAL", 13, 24031),
    (25, "ALGORITHM", 14, 25041),
    (26, "SYNCHRONIZE", 15, 26051),
    (27, "POSSIBILITY", 16, 27061),
    (28, "IMAGINATION", 17, 28071),
    (29, "EVOLUTION", 18, 29081),
    (30, "CONNECTION", 19, 30091),
]


def piece_count_of(level: dict) -> int:
    return len({v for row in level["solution"] for v in row if v >= 0})


def main() -> None:
    levels = json.loads(LEVELS_PATH.read_text(encoding="utf-8"))
    prev = max(piece_count_of(lv) for lv in levels if lv["id"] <= 20)
    print(f"L1-20 max pieces = {prev}")

    generated: list[dict] = []
    running_min = prev

    for lid, text, want, seed in LEVEL_SPECS:
        bits = bits_grid(text)
        rows, cols = len(bits), len(bits[0])
        total = rows * cols
        # non-decreasing vs previous; +1 over L20 for L21+
        count = max(want, running_min + (0 if lid == 21 and want >= running_min else 0))
        if lid == 21:
            count = max(want, running_min + 1)
        else:
            count = max(want, running_min + 1)
        # cannot exceed total/2 (min size 2)
        count = min(count, total // 2)
        if count <= running_min:
            count = min(running_min + 1, total // 2)

        board = None
        used = count
        for bump in range(0, 8):
            trial = min(count + bump, total // 2)
            if trial <= running_min and lid > 21:
                continue
            if lid == 21 and trial < running_min:
                continue
            board = pack_board(rows, cols, trial, seed + bump * 13)
            if board:
                used = trial
                break
        if board is None:
            # relax: allow equal to running_min for this board size
            for trial in range(min(running_min, total // 2), 1, -1):
                board = pack_board(rows, cols, trial, seed + 999 + trial)
                if board and trial >= running_min:
                    used = trial
                    break
                if board and lid >= 29:
                    # EVOLUTION has only 72 cells — may need careful count
                    used = trial
                    break
        if board is None:
            raise SystemExit(f"Failed L{lid} {text} cells={total} want~{count}")

        # validate connectivity
        pcs = {}
        for r in range(rows):
            for c in range(cols):
                pcs.setdefault(board[r][c], set()).add((r, c))
        for pid, cells in pcs.items():
            if not is_connected(cells):
                raise SystemExit(f"L{lid} piece {pid} disconnected")
        rects = sum(1 for cells in pcs.values() if is_filled_rect(cells))
        if rects > 1:
            raise SystemExit(f"L{lid} too many rects {rects}")

        level = {
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
        generated.append(level)
        running_min = used
        print(f"L{lid} {text:12} {rows}x{cols} pieces={used} rects={rects}")

    # Ensure monotonic piece counts across 21-30; regen if violated
    counts = [piece_count_of(lv) for lv in generated]
    print("piece counts:", counts)
    for i in range(1, len(counts)):
        if counts[i] < counts[i - 1]:
            raise SystemExit(f"Non-monotonic at L{generated[i]['id']}: {counts}")

    # Also vs L20
    if counts[0] < prev:
        raise SystemExit(f"L21 pieces {counts[0]} < L20 {prev}")

    levels = [lv for lv in levels if not (21 <= lv["id"] <= 30)]
    levels.extend(generated)
    levels.sort(key=lambda x: x["id"])
    LEVELS_PATH.write_text(json.dumps(levels, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(levels)} levels -> {LEVELS_PATH}")


if __name__ == "__main__":
    main()

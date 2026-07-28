"""Build transparent Luna spritesheet (WebP) from the official character bible."""
from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "docs/characters/luna/reference.png"
OUT_DIR = ROOT / "public/characters/luna"
OUT_WEBP = OUT_DIR / "spritesheet.webp"

CELL = 160
BG_TOLERANCE = 26

# Source regions on the official character bible sheet (1024x915)
SOURCE: dict[str, tuple[int, int, int, int]] = {
    "front": (72, 132, 208, 248),
    "three_quarter": (292, 132, 208, 248),
    "side": (512, 132, 208, 248),
    "back": (732, 132, 208, 248),
    "icon_happy": (358, 548, 132, 132),
}

# Frames placed left-to-right in the single spritesheet image.
FRAME_ORDER: list[str] = [
    "sit_0",  # front
    "sit_1",  # three_quarter
    "walk_0",  # side
    "walk_1",  # three_quarter
    "walk_2",  # side mirrored
    "walk_3",  # three_quarter (reused pose, separate cell for timing)
    "tail_0",  # back neutral
    "tail_1",  # back tail +12°
    "tail_2",  # back tail -12°
    "bark_0",  # front
    "bark_1",  # three_quarter
    "sleep_0",  # back lowered / rest pose
]


def color_dist(a: tuple[int, ...], b: tuple[int, ...]) -> int:
    return abs(a[0] - b[0]) + abs(a[1] - b[1]) + abs(a[2] - b[2])


def sample_background(im: Image.Image) -> tuple[int, int, int]:
    w, h = im.size
    px = im.load()
    corners = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    return (
        sum(c[0] for c in corners) // 4,
        sum(c[1] for c in corners) // 4,
        sum(c[2] for c in corners) // 4,
    )


def is_background_pixel(r: int, g: int, b: int, bg: tuple[int, int, int]) -> bool:
    if color_dist((r, g, b), bg) > BG_TOLERANCE:
        return False
    # Keep blue accent features (nose, ring, mesh, eyes)
    if b > r + 12 and b > g + 4:
        return False
    # Keep dark linework
    if r + g + b < 120:
        return False
    return True


def remove_background(im: Image.Image) -> Image.Image:
    rgba = im.convert("RGBA")
    w, h = rgba.size
    px = rgba.load()
    bg = sample_background(rgba)
    transparent = [[False] * h for _ in range(w)]
    q: deque[tuple[int, int]] = deque()

    for x in range(w):
        q.append((x, 0))
        q.append((x, h - 1))
    for y in range(h):
        q.append((0, y))
        q.append((w - 1, y))

    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h:
            continue
        if transparent[x][y]:
            continue
        r, g, b, a = px[x, y]
        if a == 0 or not is_background_pixel(r, g, b, bg):
            continue
        transparent[x][y] = True
        px[x, y] = (r, g, b, 0)
        q.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])

    return rgba


def crop_source(im: Image.Image, key: str) -> Image.Image:
    x, y, w, h = SOURCE[key]
    return im.crop((x, y, x + w, y + h))


def fit_cell(img: Image.Image, *, anchor_bottom: float = 0.92) -> Image.Image:
    img = remove_background(img)
    w, h = img.size
    scale = min(CELL / w, CELL / h)
    nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
    resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
    cell = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    ox = (CELL - nw) // 2
    oy = int(CELL * anchor_bottom) - nh
    cell.paste(resized, (ox, oy), resized)
    return cell


def mirror(img: Image.Image) -> Image.Image:
    return img.transpose(Image.Transpose.FLIP_LEFT_RIGHT)


def make_tail_wag_frame(back: Image.Image, angle: float) -> Image.Image:
    """Rotate only the tail region on the back pose."""
    base = remove_background(back.copy())
    w, h = base.size
    # Tail curl sits on the upper back in the back-facing pose.
    box = (int(w * 0.38), int(h * 0.02), int(w * 0.98), int(h * 0.62))
    tail = base.crop(box)
    body = base.copy()
    mask = Image.new("L", base.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rectangle(box, fill=255)
    body = Image.composite(
        Image.new("RGBA", base.size, (0, 0, 0, 0)),
        body,
        ImageChops.invert(mask),
    )

    pivot_x = box[0] + (box[2] - box[0]) * 0.42
    pivot_y = box[3] - (box[3] - box[1]) * 0.08
    tail_rot = tail.rotate(
        angle,
        resample=Image.Resampling.BICUBIC,
        expand=False,
        center=(pivot_x - box[0], pivot_y - box[1]),
    )

    composed = body.copy()
    composed.paste(tail_rot, box, tail_rot)
    return fit_cell(composed)


def build_frames(ref: Image.Image) -> dict[str, Image.Image]:
    front = crop_source(ref, "front")
    three = crop_source(ref, "three_quarter")
    side = crop_source(ref, "side")
    back = crop_source(ref, "back")

    sit_0 = fit_cell(front)
    sit_1 = fit_cell(three)
    walk_0 = fit_cell(side)
    walk_1 = fit_cell(three)
    walk_2 = fit_cell(mirror(side))
    walk_3 = fit_cell(three.copy())
    tail_0 = fit_cell(back)
    tail_1 = make_tail_wag_frame(back, 12)
    tail_2 = make_tail_wag_frame(back, -12)
    bark_0 = fit_cell(front.copy())
    bark_1 = fit_cell(three.copy())
    sleep_0 = fit_cell(back, anchor_bottom=0.96)

    return {
        "sit_0": sit_0,
        "sit_1": sit_1,
        "walk_0": walk_0,
        "walk_1": walk_1,
        "walk_2": walk_2,
        "walk_3": walk_3,
        "tail_0": tail_0,
        "tail_1": tail_1,
        "tail_2": tail_2,
        "bark_0": bark_0,
        "bark_1": bark_1,
        "sleep_0": sleep_0,
    }


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    ref = Image.open(SRC).convert("RGBA")
    frames = build_frames(ref)

    sheet = Image.new("RGBA", (CELL * len(FRAME_ORDER), CELL), (0, 0, 0, 0))
    for i, name in enumerate(FRAME_ORDER):
        sheet.paste(frames[name], (i * CELL, 0), frames[name])

    OUT_WEBP.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(OUT_WEBP, format="WEBP", lossless=True, method=6)

    legacy_png = OUT_DIR / "spritesheet.png"
    if legacy_png.exists():
        legacy_png.unlink()

    print(f"Wrote {OUT_WEBP} ({sheet.size[0]}x{sheet.size[1]})")
    print(f"Frames: {len(FRAME_ORDER)}")


if __name__ == "__main__":
    main()

import type { CSSProperties, PointerEvent } from "react";
import {
  absoluteCells,
  rotateShape,
  shapeBounds,
} from "@/games/binary-mosaic/puzzle/geometry";
import type { Cell, Shape } from "@/games/binary-mosaic/types";

type Props = {
  shape: Shape;
  rotation: 0 | 1 | 2 | 3;
  cellPx: number;
  className?: string;
  style?: CSSProperties;
  ghost?: boolean;
  onPointerDown?: (event: PointerEvent<HTMLDivElement>) => void;
};

export function PieceView({
  shape,
  rotation,
  cellPx,
  className = "",
  style,
  ghost = false,
  onPointerDown,
}: Props) {
  const oriented = rotateShape(shape, rotation);
  const { rows, cols } = shapeBounds(oriented);
  const cells = absoluteCells(oriented, { row: 0, col: 0 });

  return (
    <div
      className={`mosaic-piece ${ghost ? "is-ghost" : ""} ${className}`}
      style={{ width: cols * cellPx, height: rows * cellPx, ...style }}
      onPointerDown={onPointerDown}
    >
      {cells.map((cell) => (
        <span
          key={`${cell.row}-${cell.col}`}
          className={`mosaic-cell mosaic-cell--${cell.bit}`}
          style={cellStyle(cell, cellPx)}
          aria-hidden="true"
        >
          {cell.bit}
        </span>
      ))}
    </div>
  );
}

function cellStyle(cell: Cell, cellPx: number): CSSProperties {
  return {
    width: cellPx - 3,
    height: cellPx - 3,
    left: cell.col * cellPx + 1.5,
    top: cell.row * cellPx + 1.5,
    fontSize: Math.max(11, cellPx * 0.42),
  };
}

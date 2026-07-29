"use client";

import { useEffect, useState } from "react";
import { binaryMosaicConfig } from "@/games/binary-mosaic/config";

const MIN_CELL = 26;

/** Scale board cells down on narrow viewports. */
export function useCellPx() {
  const base = binaryMosaicConfig.cellPx;
  const [cellPx, setCellPx] = useState<number>(base);

  useEffect(() => {
    const update = () => {
      const gutter = 56;
      const maxBoard = Math.max(200, window.innerWidth - gutter);
      const fitted = Math.floor(maxBoard / 8);
      setCellPx(Math.max(MIN_CELL, Math.min(base, fitted)));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [base]);

  return cellPx;
}

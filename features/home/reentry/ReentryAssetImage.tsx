"use client";

import { useState } from "react";
import {
  REENTRY_ASSET_FALLBACK,
  REENTRY_ASSET_PATHS,
} from "./reentryAssets";

type AssetKey = keyof typeof REENTRY_ASSET_PATHS;

export function ReentryAssetImage({
  asset,
  alt,
  className,
  style,
  loading = "lazy",
}: {
  asset: AssetKey;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  loading?: "lazy" | "eager";
}) {
  const [src, setSrc] = useState<string>(REENTRY_ASSET_PATHS[asset]);
  const resolved =
    src === REENTRY_ASSET_PATHS[asset] ? "webp" : "svg-fallback";

  return (
    // eslint-disable-next-line @next/next/no-img-element -- replaceable static art under /public/reentry
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      loading={loading}
      decoding="async"
      draggable={false}
      data-reentry-asset={asset}
      data-reentry-resolved={resolved}
      onError={() => {
        if (src !== REENTRY_ASSET_FALLBACK[asset]) {
          setSrc(REENTRY_ASSET_FALLBACK[asset]);
        }
      }}
    />
  );
}

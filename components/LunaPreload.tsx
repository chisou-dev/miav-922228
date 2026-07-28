"use client";

import { useEffect } from "react";
import { preloadLunaSpritesheet } from "@/engine/luna/preload";

/** Eagerly load the shared Luna spritesheet once per session. */
export function LunaPreload() {
  useEffect(() => {
    preloadLunaSpritesheet().catch(() => undefined);
  }, []);

  return null;
}

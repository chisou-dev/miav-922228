"use client";

import { useEffect, useRef } from "react";
import { ReentryGL, type ReentryDrawState } from "./reentryWebgl";

export function ReentryWebGLView({
  onUnavailable,
  ...state
}: ReentryDrawState & { onUnavailable: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<ReentryGL | null>(null);
  const stateRef = useRef(state);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    const onContextLost = (event: Event) => {
      event.preventDefault();
      onUnavailable();
    };
    canvas.addEventListener("webglcontextlost", onContextLost);

    let scene: ReentryGL;
    try {
      scene = new ReentryGL(canvas);
    } catch {
      canvas.removeEventListener("webglcontextlost", onContextLost);
      onUnavailable();
      return;
    }
    sceneRef.current = scene;

    const paint = () => {
      scene.resize(parent.clientWidth, parent.clientHeight);
      scene.draw(stateRef.current);
    };
    paint();

    const observer = new ResizeObserver(paint);
    observer.observe(parent);
    return () => {
      canvas.removeEventListener("webglcontextlost", onContextLost);
      observer.disconnect();
      scene.dispose();
      sceneRef.current = null;
    };
  }, [onUnavailable]);

  useEffect(() => {
    stateRef.current = state;
    const scene = sceneRef.current;
    const parent = canvasRef.current?.parentElement;
    if (!scene || !parent) return;
    scene.resize(parent.clientWidth, parent.clientHeight);
    scene.draw(state);
  });

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 block h-full w-full"
      style={{ background: state.hybridMode ? "transparent" : undefined }}
      aria-hidden
    />
  );
}

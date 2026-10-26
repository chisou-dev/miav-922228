/**
 * Exact Stage 1 atmosphere-entry craft artwork extracted from the existing
 * drawCraft / craftOutline canvas code. No flame, plasma or flight effects.
 * Kept independent so the original re-entry game is completely unchanged.
 */
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

function craftOutline(
  ctx: CanvasRenderingContext2D,
  length: number,
  width: number,
): void {
  ctx.beginPath();
  ctx.moveTo(length * 0.74, 0);
  ctx.bezierCurveTo(length * 0.61, -width * 0.055, length * 0.39, -width * 0.14, length * 0.12, -width * 0.22);
  ctx.lineTo(-length * 0.12, -width * 0.46);
  ctx.lineTo(-length * 0.40, -width * 0.52);
  ctx.lineTo(-length * 0.56, -width * 0.30);
  ctx.lineTo(-length * 0.50, 0);
  ctx.lineTo(-length * 0.56, width * 0.30);
  ctx.lineTo(-length * 0.40, width * 0.52);
  ctx.lineTo(-length * 0.12, width * 0.46);
  ctx.lineTo(length * 0.12, width * 0.22);
  ctx.bezierCurveTo(length * 0.39, width * 0.14, length * 0.61, width * 0.055, length * 0.74, 0);
  ctx.closePath();
}

export function drawStage1EntryCraft(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  length: number,
  alpha: number,
  heat: number,
  assistMode = false,
  landingPalette = 0,
): void {
  const width = length * 0.62;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const assistBlink =
    assistMode
      ? (
          Math.floor(
            performance.now() /
              260,
          ) %
            2 ===
          0
            ? 1
            : 0.28
        )
      : 1;

  ctx.globalAlpha =
    alpha *
    assistBlink;

  // Deep heat-shield shadow gives the craft thickness without a photo asset.
  ctx.save();
  ctx.translate(-length * 0.03, length * 0.035);
  craftOutline(ctx, length, width);
  ctx.fillStyle = "#070b0e";
  ctx.shadowColor =
    heat > 0.14
      ? `rgba(255,88,18,${0.18 + heat * 0.34})`
      : "rgba(0,0,0,0.78)";
  ctx.shadowBlur = heat > 0.14 ? 8 + heat * 18 : 7;
  ctx.fill();
  ctx.restore();

  // Deep blue enamel body. Reflections move continuously with time and attitude.
  craftOutline(ctx, length, width);
  const enamelClock = typeof performance !== "undefined" ? performance.now() / 1000 : 0;
  const enamelPulse = 0.5 + 0.5 * Math.sin(enamelClock * 1.35);
  const reflectionSweep = 0.5 + 0.5 * Math.sin(enamelClock * 0.74 + angle * 1.7);
  const hull = ctx.createLinearGradient(-length * 0.56, -width * 0.34, length * 0.74, width * 0.26);
  hull.addColorStop(0, "rgb(" + (2 + Math.round(enamelPulse * 4)) + ",10," + (28 + Math.round(enamelPulse * 18)) + ")");
  hull.addColorStop(0.16, "rgb(3," + (42 + Math.round(enamelPulse * 18)) + "," + (103 + Math.round(enamelPulse * 28)) + ")");
  hull.addColorStop(0.30, "rgb(" + (6 + Math.round(reflectionSweep * 8)) + "," + (92 + Math.round(enamelPulse * 32)) + "," + (188 + Math.round(reflectionSweep * 44)) + ")");
  hull.addColorStop(0.46, "rgb(" + (120 + Math.round(reflectionSweep * 76)) + "," + (154 + Math.round(reflectionSweep * 64)) + "," + (176 + Math.round(enamelPulse * 34)) + ")");
  hull.addColorStop(0.56, "rgb(" + (20 + Math.round(enamelPulse * 30)) + "," + (138 + Math.round(reflectionSweep * 66)) + "," + (126 + Math.round(enamelPulse * 44)) + ")");
  hull.addColorStop(0.68, "rgb(" + (10 + Math.round(reflectionSweep * 24)) + "," + (96 + Math.round(enamelPulse * 36)) + "," + (190 + Math.round(reflectionSweep * 42)) + ")");
  hull.addColorStop(0.82, "rgb(2," + (27 + Math.round(enamelPulse * 12)) + "," + (74 + Math.round(reflectionSweep * 25)) + ")");
  hull.addColorStop(1, "rgb(0,7,20)");
  ctx.fillStyle = hull;
  ctx.fill();

  // Transition the SAME craft to a violet enamel hull only on final ocean
  // approach. Deep red and jade reflections bleed softly across the surface.
  if (landingPalette > 0.001) {
    ctx.save();
    craftOutline(ctx, length, width);
    ctx.clip();
    ctx.globalAlpha *= landingPalette;
    const violet = ctx.createLinearGradient(
      -length * 0.42, -width * 0.42,
      length * 0.68, width * 0.40
    );
    violet.addColorStop(0, "#140c2c");
    violet.addColorStop(0.19, "#432169");
    violet.addColorStop(0.39, "#8152bb");
    violet.addColorStop(0.54, "#442169");
    violet.addColorStop(0.72, "#4e265f");
    violet.addColorStop(0.86, "#281446");
    violet.addColorStop(1, "#080918");
    ctx.fillStyle = violet;
    ctx.fillRect(-length, -width, length * 2, width * 2);

    ctx.globalCompositeOperation = "screen";
    for (const [px, py, radius, rr, gg, bb, strength, phase] of [
      [-0.28, -0.22, 0.36, 242, 51, 83, 0.47, 0.0],
      [0.22, 0.17, 0.34, 220, 69, 95, 0.35, 1.8],
      [-0.02, 0.28, 0.29, 36, 210, 160, 0.49, 2.5],
      [0.37, -0.16, 0.27, 59, 215, 198, 0.42, 3.8],
      [-0.28, 0.23, 0.32, 49, 131, 233, 0.40, 4.5],
      [0.16, -0.30, 0.29, 78, 219, 237, 0.39, 5.2],
    ] as const) {
      // Reflections bleed across enamel as soft areas, never stripes.
      const light = 0.76 + 0.24 * Math.sin(enamelClock * 0.83 + phase);
      const bx = length * (px + 0.035 * Math.sin(enamelClock * 0.53 + phase));
      const by = width * py;
      const bleed = ctx.createRadialGradient(bx, by, 0, bx, by, length * radius);
      const color = "rgba(" + rr + "," + gg + "," + bb + ",";
      bleed.addColorStop(0, color + (strength * light) + ")");
      bleed.addColorStop(0.45, color + (strength * light * 0.21) + ")");
      bleed.addColorStop(1, color + "0)");
      ctx.fillStyle = bleed;
      ctx.fillRect(-length, -width, length * 2, width * 2);
    }
    // Violet enamel has curved volume; red and jade reflections stay
    // localized within the hull instead of becoming decorative stripes.
    const domeLight = ctx.createRadialGradient(
      -length * 0.07, -width * 0.17, 0,
      -length * 0.07, -width * 0.17, length * 0.55
    );
    domeLight.addColorStop(0, "rgba(246,205,255,0.31)");
    domeLight.addColorStop(0.25, "rgba(218,135,246,0.16)");
    domeLight.addColorStop(1, "rgba(218,135,246,0)");
    ctx.fillStyle = domeLight;
    ctx.fillRect(-length, -width, length * 2, width * 2);
    ctx.restore();
  }

  ctx.save();
  craftOutline(ctx, length, width);
  ctx.clip();
  ctx.globalCompositeOperation = "screen";
  const sweepX = mix(-length * 0.50, length * 0.54, reflectionSweep);
  const gloss = ctx.createLinearGradient(sweepX - length * 0.20, -width * 0.48, sweepX + length * 0.18, width * 0.42);
  gloss.addColorStop(0, "rgba(255,255,255,0)");
  gloss.addColorStop(0.42, landingPalette > 0.5 ? "rgba(212,127,232,0.05)" : "rgba(116,201,255,0.05)");
  gloss.addColorStop(0.50, "rgba(255,255,255," + (0.28 + enamelPulse * 0.28) + ")");
  gloss.addColorStop(0.58, landingPalette > 0.5 ? "rgba(177,110,205,0.07)" : "rgba(97,173,255,0.07)");
  gloss.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gloss;
  ctx.fillRect(-length, -width, length * 2, width * 2);
  ctx.restore();

  ctx.save();
  craftOutline(ctx, length, width);
  ctx.clip();

  // Faceted lower half / thermal protection.
  const shield = ctx.createLinearGradient(
    0,
    -width * 0.35,
    0,
    width * 0.54,
  );
  shield.addColorStop(0.38, "rgba(20,24,28,0)");
  shield.addColorStop(0.58, "rgba(14,18,22,0.25)");
  shield.addColorStop(0.78, "rgba(7,10,12,0.58)");
  shield.addColorStop(1, "rgba(2,4,6,0.93)");
  ctx.fillStyle = shield;
  ctx.fillRect(-length, -width, length * 2, width * 2);

  // Side facets create a more three-dimensional lifting-body form.
  ctx.fillStyle = landingPalette > 0.5
    ? "rgba(113,61,148,0.30)"
    : "rgba(32,91,151,0.30)";
  ctx.beginPath();
  ctx.moveTo(-length * 0.50, -width * 0.30);
  ctx.lineTo(-length * 0.12, -width * 0.46);
  ctx.lineTo(length * 0.20, -width * 0.17);
  ctx.lineTo(-length * 0.12, -width * 0.08);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.13)";
  ctx.beginPath();
  ctx.moveTo(-length * 0.12, width * 0.08);
  ctx.lineTo(length * 0.22, width * 0.14);
  ctx.lineTo(length * 0.45, width * 0.04);
  ctx.lineTo(length * 0.12, width * 0.01);
  ctx.closePath();
  ctx.fill();

  if (landingPalette > 0.5) {
    // Soft facial curvature under the lacquer, no panel outline.
    const surface = ctx.createLinearGradient(
      -length * 0.35, -width * 0.32,
      length * 0.38, width * 0.28
    );
    surface.addColorStop(0, "rgba(96,38,128,0.04)");
    surface.addColorStop(0.40, "rgba(226,111,171,0.17)");
    surface.addColorStop(0.72, "rgba(28,159,100,0.11)");
    surface.addColorStop(1, "rgba(24,13,40,0)");
    ctx.fillStyle = surface;
    ctx.beginPath();
    ctx.moveTo(-length * 0.48, -width * 0.22);
    ctx.bezierCurveTo(
      -length * 0.12, -width * 0.39,
      length * 0.35, -width * 0.13,
      length * 0.47, width * 0.06
    );
    ctx.quadraticCurveTo(
      -length * 0.06, width * 0.31,
      -length * 0.48, -width * 0.22
    );
    ctx.fill();
  }

  // Irregular panel seams: subtle and non-uniform.
  ctx.strokeStyle = "rgba(44,52,57,0.20)";
  ctx.lineWidth = Math.max(0.65, length * 0.006);
  const seams = [-0.34, -0.18, 0.02, 0.19, 0.34];
  for (let i = 0; i < seams.length; i++) {
    const px = length * seams[i];
    ctx.beginPath();
    ctx.moveTo(px, -width * (0.18 + (i % 2) * 0.03));
    ctx.lineTo(
      px + length * (0.018 + (i % 3) * 0.008),
      width * (0.17 + (i % 2) * 0.025),
    );
    ctx.stroke();
  }
  ctx.restore();

  // Dark recessed cockpit glazing near the nose.
  ctx.save();
  ctx.translate(length * 0.31, 0);
  const glass = ctx.createLinearGradient(
    -length * 0.12,
    -width * 0.11,
    length * 0.10,
    width * 0.10,
  );
  glass.addColorStop(0, "#495a65");
  glass.addColorStop(0.28, "#17232c");
  glass.addColorStop(0.72, "#070d12");
  glass.addColorStop(1, "#020406");
  ctx.fillStyle = glass;
  ctx.strokeStyle = "rgba(210,228,238,0.38)";
  ctx.lineWidth = Math.max(0.75, length * 0.007);
  ctx.beginPath();
  ctx.moveTo(length * 0.13, 0);
  ctx.lineTo(-length * 0.025, -width * 0.105);
  ctx.lineTo(-length * 0.13, -width * 0.070);
  ctx.lineTo(-length * 0.13, width * 0.070);
  ctx.lineTo(-length * 0.025, width * 0.105);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Rear heat shield edge.
  ctx.strokeStyle = "rgba(15,18,20,0.75)";
  ctx.lineWidth = Math.max(1.1, length * 0.012);
  ctx.beginPath();
  ctx.moveTo(-length * 0.52, -width * 0.27);
  ctx.lineTo(-length * 0.47, width * 0.27);
  ctx.stroke();

  ctx.strokeStyle =
    "rgba(218,226,228,0.30)";
  ctx.lineWidth = Math.max(0.7, length * 0.0065);
  craftOutline(ctx, length, width);
  ctx.stroke();

  ctx.restore();
}


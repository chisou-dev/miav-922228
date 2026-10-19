/**
 * One true vessel: the squid's self-formed escape skiff from the final
 * Stage 1 ocean sequence. Both stages use EXACTLY the same hull and
 * hatch rendering. Do not redesign as the large reentry spacecraft.
 */
export function drawEscapeSkiff(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  alpha: number,
  tilt = -0.08,
  hatchClose01 = 0,
): void {
  if (alpha <= 0.001) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.globalAlpha = alpha;

  // Escape vessel formed from liquid: organic convex hull, not a flat disc.
  const keel = new Path2D();
  keel.moveTo(-scale * 0.73, -scale * 0.045);
  keel.bezierCurveTo(-scale * 0.69, scale * 0.13, -scale * 0.28, scale * 0.30, scale * 0.07, scale * 0.27);
  keel.bezierCurveTo(scale * 0.47, scale * 0.23, scale * 0.78, scale * 0.08, scale * 0.86, -scale * 0.055);
  keel.quadraticCurveTo(scale * 0.17, scale * 0.075, -scale * 0.73, -scale * 0.045);
  keel.closePath();
  const underside = ctx.createLinearGradient(0, -scale * 0.035, 0, scale * 0.33);
  underside.addColorStop(0, "#407bb3");
  underside.addColorStop(0.28, "#163b71");
  underside.addColorStop(0.64, "#0a173c");
  underside.addColorStop(1, "#020612");
  ctx.fillStyle = underside;
  ctx.fill(keel);

  const side = ctx.createLinearGradient(
    -scale * 0.50, scale * 0.01, scale * 0.55, scale * 0.20
  );
  side.addColorStop(0, "rgba(9,22,52,0.93)");
  side.addColorStop(0.48, "rgba(24,76,121,0.86)");
  side.addColorStop(0.78, "rgba(18,40,80,0.90)");
  side.addColorStop(1, "rgba(2,10,24,0.98)");
  ctx.fillStyle = side;
  ctx.beginPath();
  ctx.moveTo(-scale * 0.70, -scale * 0.045);
  ctx.quadraticCurveTo(-scale * 0.20, scale * 0.20, scale * 0.20, scale * 0.17);
  ctx.quadraticCurveTo(scale * 0.56, scale * 0.115, scale * 0.84, -scale * 0.045);
  ctx.quadraticCurveTo(scale * 0.12, scale * 0.255, -scale * 0.70, -scale * 0.045);
  ctx.fill();

  const deck = new Path2D();
  deck.moveTo(scale * 0.87, -scale * 0.061);
  deck.bezierCurveTo(scale * 0.44, -scale * 0.31, -scale * 0.30, -scale * 0.35, -scale * 0.67, -scale * 0.108);
  deck.quadraticCurveTo(-scale * 0.83, -scale * 0.010, -scale * 0.62, scale * 0.065);
  deck.bezierCurveTo(-scale * 0.12, scale * 0.165, scale * 0.57, scale * 0.117, scale * 0.87, -scale * 0.061);
  deck.closePath();
  const enamel = ctx.createLinearGradient(
    -scale * 0.45, -scale * 0.24, scale * 0.41, scale * 0.19
  );
  enamel.addColorStop(0, "#040e29");
  enamel.addColorStop(0.19, "#243e86");
  enamel.addColorStop(0.34, "#557bc7");
  enamel.addColorStop(0.50, "#a2cde7");
  enamel.addColorStop(0.61, "#317bb2");
  enamel.addColorStop(0.79, "#263c86");
  enamel.addColorStop(1, "#060b26");
  ctx.fillStyle = enamel;
  ctx.fill(deck);

  ctx.save();
  ctx.clip(deck);
  const violet = ctx.createRadialGradient(
    -scale * 0.29, -scale * 0.08, 0,
    -scale * 0.29, -scale * 0.08, scale * 0.49
  );
  violet.addColorStop(0, "rgba(156,102,231,0.42)");
  violet.addColorStop(0.45, "rgba(98,104,206,0.18)");
  violet.addColorStop(1, "rgba(98,104,206,0)");
  ctx.fillStyle = violet;
  ctx.fillRect(-scale, -scale, scale * 2, scale * 2);
  const chrome = ctx.createRadialGradient(
    scale * 0.07, -scale * 0.23, 0,
    scale * 0.07, -scale * 0.23, scale * 0.48
  );
  chrome.addColorStop(0, "rgba(234,255,255,0.65)");
  chrome.addColorStop(0.36, "rgba(144,233,251,0.15)");
  chrome.addColorStop(1, "rgba(144,233,251,0)");
  ctx.fillStyle = chrome;
  ctx.fillRect(-scale, -scale, scale * 2, scale * 2);
  ctx.restore();

  const socket = ctx.createRadialGradient(
    scale * 0.12, -scale * 0.085, scale * 0.012,
    scale * 0.12, -scale * 0.085, scale * 0.245
  );
  socket.addColorStop(0, "#010510");
  socket.addColorStop(0.44, "#071527");
  socket.addColorStop(0.77, "#143557");
  socket.addColorStop(1, "#7cbbd2");
  ctx.fillStyle = socket;
  ctx.beginPath();
  ctx.ellipse(scale * 0.12, -scale * 0.07, scale * 0.194, scale * 0.093, -0.08, 0, Math.PI * 2);
  ctx.fill();

  // An actual top-entry hatch rather than a painted black ornament.
  // The metal cover closes only once the last part of the squid is inside.
  if (hatchClose01 > 0.001) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(scale * 0.12, -scale * 0.07,
      scale * 0.194, scale * 0.093, -0.08, 0, Math.PI * 2);
    ctx.clip();
    const cover = ctx.createLinearGradient(
      -scale * 0.10, -scale * 0.21, scale * 0.39, scale * 0.05);
    cover.addColorStop(0, "#11183e");
    cover.addColorStop(0.34, "#5f65bb");
    cover.addColorStop(0.63, "#2b87a3");
    cover.addColorStop(1, "#091830");
    ctx.fillStyle = cover;
    // Slide as a curved metal iris across the oval rather than blinking shut.
    ctx.fillRect(-scale * 0.10 - (1 - hatchClose01) * scale * 0.42,
      -scale * 0.28, scale * 0.52, scale * 0.42);
    ctx.restore();
  }

  // Local chrome glimmer follows the edge and falls off naturally.
  const lip = ctx.createLinearGradient(-scale * 0.5, scale * 0.04, scale * 0.6, scale * 0.14);
  lip.addColorStop(0, "rgba(193,242,254,0)");
  lip.addColorStop(0.38, "rgba(213,251,255,0.48)");
  lip.addColorStop(0.78, "rgba(165,218,247,0.18)");
  lip.addColorStop(1, "rgba(165,218,247,0)");
  ctx.strokeStyle = lip;
  ctx.lineWidth = Math.max(0.5, scale * 0.016);
  ctx.beginPath();
  ctx.moveTo(-scale * 0.56, scale * 0.054);
  ctx.quadraticCurveTo(scale * 0.12, scale * 0.177, scale * 0.73, -scale * 0.034);
  ctx.stroke();
  ctx.restore();
}

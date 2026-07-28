export type PooledParticle = {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  char: string;
  rotation: number;
  spin: number;
};

function createParticle(): PooledParticle {
  return {
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    maxLife: 1,
    size: 12,
    char: "0",
    rotation: 0,
    spin: 0,
  };
}

/** Canvas particle pool — reuse objects, no per-frame allocation. */
export class ParticlePool {
  private readonly particles: PooledParticle[];

  constructor(size: number) {
    this.particles = Array.from({ length: size }, createParticle);
  }

  reset() {
    for (const p of this.particles) p.active = false;
  }

  spawn(opts: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    size: number;
    char: string;
    rotation?: number;
    spin?: number;
  }) {
    const slot = this.particles.find((p) => !p.active);
    if (!slot) return;
    slot.active = true;
    slot.x = opts.x;
    slot.y = opts.y;
    slot.vx = opts.vx;
    slot.vy = opts.vy;
    slot.life = opts.life;
    slot.maxLife = opts.life;
    slot.size = opts.size;
    slot.char = opts.char;
    slot.rotation = opts.rotation ?? 0;
    slot.spin = opts.spin ?? 0;
  }

  update(dtSec: number) {
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= dtSec;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.vy += 120 * dtSec;
      p.rotation += p.spin * dtSec;
    }
  }

  draw(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
  ) {
    ctx.clearRect(0, 0, width, height);
    for (const p of this.particles) {
      if (!p.active) continue;
      if (p.x < -40 || p.x > width + 40 || p.y < -40 || p.y > height + 40) {
        continue;
      }
      const alpha = Math.min(1, p.life / p.maxLife);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#1a6fd4";
      ctx.font = `600 ${p.size}px ui-monospace, Consolas, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.char, 0, 0);
      ctx.restore();
    }
  }

  get activeCount() {
    return this.particles.reduce((n, p) => n + (p.active ? 1 : 0), 0);
  }
}

export function seedFireworkPool(
  pool: ParticlePool,
  width: number,
  height: number,
  sourceBits: (0 | 1)[],
  count = 72,
) {
  pool.reset();
  const bits =
    sourceBits.length > 0 ? sourceBits : ([0, 1, 0, 1, 1, 0, 0, 1] as (0 | 1)[]);

  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
    const speed = 90 + Math.random() * 160;
    pool.spawn({
      x: width * (0.42 + Math.random() * 0.16),
      y: height * (0.55 + Math.random() * 0.2),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 80 - Math.random() * 60,
      life: 1.4 + Math.random() * 0.6,
      size: 12 + Math.random() * 14,
      char: String(bits[i % bits.length]),
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 8,
    });
  }

  for (let burst = 0; burst < 3; burst += 1) {
    const ox = width * (0.2 + burst * 0.3);
    for (let i = 0; i < 18; i += 1) {
      const angle = (Math.PI * 2 * i) / 18;
      const speed = 70 + Math.random() * 120;
      const idx = burst * 18 + i;
      pool.spawn({
        x: ox + Math.random() * width * 0.08,
        y: height * (0.48 + Math.random() * 0.18),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        life: 1.2 + Math.random() * 0.5,
        size: 10 + Math.random() * 12,
        char: String(bits[idx % bits.length]),
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 6,
      });
    }
  }
}

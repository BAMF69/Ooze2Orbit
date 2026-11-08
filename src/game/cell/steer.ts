// ---------------------------------------------------------------------------
// steer.ts
// Purpose : Small movement maths for the pond, without Phaser: swim physics for anything with a velocity, the
//           pond cells' wander/curious drift, and the autoplay pilot that `dev.py smoke --query autoplay` uses.
// Usage   : swim(body, inputX, inputY, dt, TUNING.player); const dir = wanderDir(rng)
// Notes   : Pure, tested in tests/cellSteer.test.ts. A Body is plain x/y/vx/vy numbers the scene copies to sprites.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------

export interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface SwimParams {
  accel: number;
  maxSpeed: number;
  drag: number;
}

/** One swim step: accelerate along the (clamped) input, water drag, speed cap, move. Mutates body. */
export function swim(b: Body, ix: number, iy: number, dt: number, p: SwimParams): void {
  const len = Math.hypot(ix, iy);
  if (len > 1) {
    ix /= len;
    iy /= len;
  }
  b.vx += ix * p.accel * dt;
  b.vy += iy * p.accel * dt;
  const keep = Math.exp(-p.drag * dt);
  b.vx *= keep;
  b.vy *= keep;
  const speed = Math.hypot(b.vx, b.vy);
  if (speed > p.maxSpeed) {
    b.vx *= p.maxSpeed / speed;
    b.vy *= p.maxSpeed / speed;
  }
  b.x += b.vx * dt;
  b.y += b.vy * dt;
}

/** Keep a body inside the world, bouncing its velocity softly off the edges. Mutates body. */
export function keepInside(b: Body, r: number, w: number, h: number): void {
  if (b.x < r) { b.x = r; b.vx = Math.abs(b.vx) * 0.5; }
  if (b.x > w - r) { b.x = w - r; b.vx = -Math.abs(b.vx) * 0.5; }
  if (b.y < r) { b.y = r; b.vy = Math.abs(b.vy) * 0.5; }
  if (b.y > h - r) { b.y = h - r; b.vy = -Math.abs(b.vy) * 0.5; }
}

/** A random unit direction. rng returns [0, 1). */
export function wanderDir(rng: () => number): { x: number; y: number } {
  const a = rng() * Math.PI * 2;
  return { x: Math.cos(a), y: Math.sin(a) };
}

/** Unit vector from a to b (zero when they overlap). */
export function toward(a: { x: number; y: number }, b: { x: number; y: number }): { x: number; y: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  return d < 1e-6 ? { x: 0, y: 0 } : { x: dx / d, y: dy / d };
}

/** Push two overlapping bodies apart: each gets `speed` away from the other. Mutates both. */
export function knockApart(a: Body, b: Body, speed: number): void {
  const d = toward(a, b);
  const dir = d.x === 0 && d.y === 0 ? { x: 1, y: 0 } : d;
  a.vx = -dir.x * speed;
  a.vy = -dir.y * speed;
  b.vx = dir.x * speed;
  b.vy = dir.y * speed;
}

/** The nearest of `items` to `from`, or null for an empty list. */
export function nearest<T extends { x: number; y: number }>(from: { x: number; y: number }, items: readonly T[]): T | null {
  let best: T | null = null;
  let bestD = Infinity;
  for (const it of items) {
    const d = Math.hypot(it.x - from.x, it.y - from.y);
    if (d < bestD) { bestD = d; best = it; }
  }
  return best;
}

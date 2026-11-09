// ---------------------------------------------------------------------------
// physics.ts (creature)
// Purpose : The sidescroller's movement as pure rules: an axis-aligned box that falls, runs, jumps and collides
//           with a tile grid, one axis at a time (x then y), so it slides along walls and lands cleanly. Crouching
//           shrinks the box from the top, which is what lets you creep through one-tile tunnels (the stealth way).
// Usage   : stepBody(body, { dir, jump, crouch, speedMult }, dt, isSolid)  // mutates body; returns what it hit
//           canStand(body, isSolid)  // room to stand up here?
// Notes   : Pure (no Phaser), tested in tests/creaturePhysics.test.ts. Box: x, y = its bottom centre (the feet).
//           isSolid(tx, ty) answers for one tile; outside the grid counts as solid. Numbers: CR.move, CR.body.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import { CR } from "./tuning";

export type IsSolid = (tx: number, ty: number) => boolean;

export interface Body {
  x: number; // feet, centre
  y: number; // feet
  w: number;
  h: number;
  vx: number;
  vy: number;
  onGround: boolean;
  coyote: number; // seconds left to still jump after leaving the ground
  buffer: number; // seconds left of a jump pressed early
}

export interface Intent {
  dir: number; // -1, 0, 1
  jump: boolean; // pressed this frame
  speed: number; // the wanted top speed (run, creep, mud)
}

export function newBody(x: number, y: number, w: number = CR.body.w, h: number = CR.body.h): Body {
  return { x, y, w, h, vx: 0, vy: 0, onGround: false, coyote: 0, buffer: 0 };
}

const T = CR.tile;

/** Any solid tile overlapping the box at (x, y) with size w x h? */
export function boxHits(x: number, y: number, w: number, h: number, isSolid: IsSolid): boolean {
  const x0 = Math.floor((x - w / 2) / T), x1 = Math.floor((x + w / 2 - 0.001) / T);
  const y0 = Math.floor((y - h) / T), y1 = Math.floor((y - 0.001) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (isSolid(tx, ty)) return true;
  return false;
}

/** Room to stand at full height here (after a crouch)? */
export function canStand(b: Body, isSolid: IsSolid): boolean {
  return !boxHits(b.x, b.y, b.w, CR.body.h, isSolid);
}

/** Inside a wall (squeezed by something)? Move to the nearest free spot: sideways first, then up. */
export function unstick(b: Body, isSolid: IsSolid): boolean {
  if (!boxHits(b.x, b.y, b.w, b.h, isSolid)) return false;
  for (let d = 1; d <= T; d++) {
    for (const [dx, dy] of [[d, 0], [-d, 0], [0, -d]]) {
      if (!boxHits(b.x + dx, b.y + dy, b.w, b.h, isSolid)) { b.x += dx; b.y += dy; return true; }
    }
  }
  return false;
}

/** One step: steer, jump, fall, then move x and y separately against the tiles. Returns which sides it hit. */
export function stepBody(b: Body, it: Intent, dt: number, isSolid: IsSolid): { wall: number; landed: boolean; ceiling: boolean } {
  const m = CR.move;
  unstick(b, isSolid);
  const target = it.dir * it.speed;
  const acc = b.onGround ? m.accel : m.airAccel;
  if (b.vx < target) b.vx = Math.min(target, b.vx + acc * dt);
  else if (b.vx > target) b.vx = Math.max(target, b.vx - acc * dt);

  b.coyote = b.onGround ? m.coyoteS : Math.max(0, b.coyote - dt);
  b.buffer = it.jump ? m.bufferS : Math.max(0, b.buffer - dt);
  if (b.buffer > 0 && b.coyote > 0) { b.vy = -m.jumpSpeed; b.buffer = 0; b.coyote = 0; b.onGround = false; }
  b.vy = Math.min(m.maxFall, b.vy + m.gravity * dt);

  let wall = 0;
  const nx = b.x + b.vx * dt;
  if (boxHits(nx, b.y, b.w, b.h, isSolid)) {
    wall = Math.sign(b.vx);
    // slide right up against the wall
    const edge = b.vx > 0 ? Math.floor((nx + b.w / 2) / T) * T - b.w / 2 - 0.01 : (Math.floor((nx - b.w / 2) / T) + 1) * T + b.w / 2 + 0.01;
    b.x = boxHits(edge, b.y, b.w, b.h, isSolid) ? b.x : edge;
    b.vx = 0;
  } else b.x = nx;

  let landed = false, ceiling = false;
  const ny = b.y + b.vy * dt;
  if (boxHits(b.x, ny, b.w, b.h, isSolid)) {
    if (b.vy > 0) { b.y = Math.floor(ny / T) * T - 0.001; landed = !b.onGround; b.onGround = true; }
    else { b.y = (Math.floor((ny - b.h) / T) + 1) * T + b.h + 0.001; ceiling = true; }
    if (boxHits(b.x, b.y, b.w, b.h, isSolid)) b.y -= b.vy * dt; // never end a step inside a wall
    b.vy = 0;
  } else {
    b.y = ny;
    b.onGround = boxHits(b.x, b.y + 1, b.w, b.h, isSolid) && b.vy >= 0;
  }
  return { wall, landed, ceiling };
}

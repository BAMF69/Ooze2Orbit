// Purpose: Placeholder Jungle Medium terrain, motion silhouettes, and attack indicators.
import type * as Phaser from "phaser";
import { JUNGLE, jungleCover, jungleStrikePoint, type JungleEnemy, type JungleSpec } from "./jungleMedium";

export function drawJungleMedium(g: Phaser.GameObjects.Graphics, spec: JungleSpec, e: JungleEnemy,
  flood: boolean, debug: boolean): void {
  const floor = JUNGLE.floor;
  const vine = spec.kind === "thrower", bird = spec.kind === "diver";
  g.fillStyle(vine ? 0x1c3229 : bird ? 0x23443c : 0x23363d).fillRect(0, 0, JUNGLE.width, 360);
  for (let x = 45; x < JUNGLE.width; x += 124) {
    g.fillStyle(0x375247, 0.6).fillRect(x, 96, 16, floor - 96).fillEllipse(x + 8, 116, 114, 53);
  }
  g.fillStyle(0x364538).fillRect(0, floor, JUNGLE.width, 56);
  if (vine) g.lineStyle(5, 0x729c57).lineBetween(360, 96, 360, floor);
  if (bird) g.lineStyle(6, 0x8a734e).lineBetween(spec.roost.x - 28, 299, spec.roost.x + 22, 299);
  if (!vine && !bird) g.lineStyle(8, 0x58645b).lineBetween(352, 109, 631, 109).lineBetween(631, 109, 631, floor);
  for (let x = 0; x < JUNGLE.width; x += 8) if (jungleCover(x, flood)) {
    g.fillStyle(0x699859, 0.65).fillTriangle(x - 8, floor, x, 269 + x % 11, x + 8, floor);
  }
  g.lineStyle(3, e.armed ? 0xffc36d : 0xb19b75).strokeRect(JUNGLE.trapX - 12, 277, 24, 25);
  g.lineStyle(4, e.verdict ? 0x9dd281 : 0xb19b75).strokeRect(JUNGLE.exit - 15, 252, 30, 52);
  if (e.verdict === "fight") return;
  if (e.phase === "tell" && !e.verdict) {
    g.fillStyle(0xf6bb67, 0.4).fillEllipse(e.target.x, floor - 4, JUNGLE.damageRadius * 2, 12);
    g.lineStyle(2, 0xffc271).strokeEllipse(e.target.x, floor - 4, JUNGLE.damageRadius * 2, 12);
    if (bird || vine) for (let n = 0; n < 12; n++) {
      const point = jungleStrikePoint(spec, e, n / 12);
      g.fillStyle(0xffc271).fillCircle(point.x, point.y, 2);
    }
  }
  if (vine && e.phase === "strike" && !e.verdict) {
    const fruit = jungleStrikePoint(spec, e, Math.min(1, e.elapsed / spec.strike));
    g.fillStyle(0xffa946).fillCircle(fruit.x, fruit.y, 6);
  }
  const { x, y } = e.at;
  const color = e.verdict === "trap" ? 0x879079 : spec.color;
  if (vine) {
    g.lineStyle(5, color).lineBetween(x - 8, y + 8, x - 12, y - 18).lineBetween(x + 8, y + 8, x + 12, y - 18);
    g.fillStyle(color).fillEllipse(x, y, 25, 25).fillCircle(x, y - 11, 9);
    if (e.phase === "tell" && !e.verdict) g.fillStyle(0xffa946).fillCircle(x - 12, y - 18, 6);
  } else if (bird) {
    const wings = e.phase === "tell" || e.phase === "strike" ? 10 : 28;
    g.fillStyle(color).fillTriangle(x, y + 7, x - wings, y - 11, x - 6, y - 8)
      .fillTriangle(x, y + 7, x + wings, y - 11, x + 6, y - 8);
    g.fillStyle(0xe49a58).fillTriangle(x + 4, y - 3, x + 19, y + 4, x + 4, y + 6);
  } else {
    g.fillStyle(color).fillEllipse(x, y, 31, 15);
    for (const side of [-1, 1]) for (let leg = -1; leg <= 1; leg++) {
      const offset = e.phase === "tell" ? 15 : 21;
      g.lineStyle(3, color).lineBetween(x + side * 8, y + leg * 4, x + side * offset, y + leg * 10);
      g.fillStyle(0xded197).fillCircle(x + side * offset, y + leg * 10, 3);
    }
  }
  if (e.verdict === "trap") g.lineStyle(2, 0xe6c98a).strokeCircle(x, y, 21);
  if (debug && !e.verdict) {
    g.lineStyle(1, 0xc4e5aa, 0.8).strokeRect(JUNGLE.start, 238, JUNGLE.detectEnd - JUNGLE.start, 66);
    for (let i = 0; i < spec.patrol.length; i++) {
      const a = spec.patrol[i], b = spec.patrol[(i + 1) % spec.patrol.length];
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
    g.fillStyle(0xc4e5aa).fillRect(x - 18, y - 27, 36 * e.hp / spec.hp, 3);
  }
}

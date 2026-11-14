// Purpose: Original scalable inked biological equipment, shared by world bodies, cards and mitosis.
// Authored: Written with Codex. Paths are code-native, not generated image modifications.
import type * as Phaser from "phaser";
import type { Creature } from "./rules";
import { upgradeTier } from "./rules";
export const EQUIPMENT_SIZE = 128;
export function paintEquipment(ctx: CanvasRenderingContext2D, c: Pick<Creature, "ups" | "parts">): void {
  ctx.save(); ctx.lineWidth = 3; ctx.strokeStyle = "#091d30"; ctx.lineJoin = "round"; ctx.lineCap = "round";
  const fin = (x: number, y: number, dx: number, dy: number, color: string) => {
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + dx, y + dy, x + dx * .55, y + dy * 1.25); ctx.quadraticCurveTo(x - 3, y + 9, x, y); ctx.fill(); ctx.stroke();
  };
  const defense = upgradeTier(c.ups.defense);
  if (defense || c.parts.includes("shell")) {
    ctx.strokeStyle = "#071e2a"; ctx.lineWidth = 9;
    for (const start of [.15, 1.1, 2.2, 3.2, 4.2, 5.2]) { ctx.beginPath(); ctx.arc(64, 64, 36 + defense, start, start + .63); ctx.stroke(); }
    ctx.strokeStyle = "#7cd0bf"; ctx.lineWidth = 5;
    for (const start of [.15, 1.1, 2.2, 3.2, 4.2, 5.2]) { ctx.beginPath(); ctx.arc(64, 64, 36 + defense, start, start + .63); ctx.stroke(); }
  }
  ctx.lineWidth = 3; ctx.strokeStyle = "#091d30";
  const speed = upgradeTier(c.ups.speed), mobility = upgradeTier(c.ups.mobility), attack = upgradeTier(c.ups.attack);
  if (speed) { fin(48, 95, -14 - speed * 2, 12, "#eccb79"); fin(80, 95, 14 + speed * 2, 12, "#e4b966"); }
  if (mobility) for (const side of [-1, 1]) for (let i = 0; i < mobility + 1; i++) fin(64 + side * 33, 48 + i * 15, side * 16, 4, "#87d4c5");
  if (attack) {
    const reach = 13 + attack * 3;
    fin(45, 34, -9, -reach, "#fff0c1"); fin(83, 34, 9, -reach, "#e7bb88");
  }
  if (c.parts.includes("mouth")) {
    ctx.fillStyle = "#f4c266"; ctx.beginPath(); ctx.ellipse(64, 31, 12, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#3f2540"; ctx.beginPath(); ctx.ellipse(64, 29, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
  }
  // The pickup is an unmistakable eight-thorn crown, distinct from purchased front mandibles.
  if (c.parts.includes("spikes")) for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 4, ux = Math.cos(a), uy = Math.sin(a), tx = -uy, ty = ux;
    ctx.fillStyle = "#fff1c8"; ctx.strokeStyle = "#102936"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(64 + ux * 38 + tx * 7, 64 + uy * 38 + ty * 7);
    ctx.quadraticCurveTo(64 + ux * 52 + tx * 5, 64 + uy * 52 + ty * 5, 64 + ux * 61, 64 + uy * 61);
    ctx.lineTo(64 + ux * 38 - tx * 7, 64 + uy * 38 - ty * 7); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}
export function equipmentTexture(scene: Phaser.Scene, c: Pick<Creature, "ups" | "parts">): string {
  const key = `cellEquipment:${JSON.stringify([c.ups, c.parts])}`;
  if (!scene.textures.exists(key)) { const t = scene.textures.createCanvas(key, EQUIPMENT_SIZE, EQUIPMENT_SIZE); if (t) { paintEquipment(t.getContext(), c); t.refresh(); } }
  return key;
}

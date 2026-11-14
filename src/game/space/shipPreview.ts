// Purpose: Keep the original ship/slot diagram visible inside the responsive outfitter.
// Reuses the hangar's slot positions and atlases; redraw only when the fitted hull/parts change.
import type * as Phaser from "phaser";
import { firstFrame, type AtlasLayout } from "../cell/atlas";
import { partsIn, slotsOf, SLOT_TYPES, type Fit, type SlotType } from "./fit";
import { hullAtlas, SHIP, SLOT_COL, SLOT_WORD, slotSpots } from "./panels";
const PREVIEW = { width: 336, height: 276, resolution: 2, slot: 32, hull: 128 };
export class ShipPreview {
  readonly node = document.createElement("figure");
  private canvas = document.createElement("canvas");
  private signature = "";
  constructor(private scene: Phaser.Scene) {
    this.node.className = "ship-preview";
    this.canvas.width = PREVIEW.width * PREVIEW.resolution; this.canvas.height = PREVIEW.height * PREVIEW.resolution;
    this.canvas.setAttribute("role", "img");
    const caption = document.createElement("figcaption"); caption.textContent = "Ship layout · fitted parts and open (+) slots";
    this.node.append(this.canvas, caption);
  }
  update(fit: Fit): void {
    const signature = JSON.stringify(fit); if (signature === this.signature) return;
    this.signature = signature;
    this.canvas.setAttribute("aria-label", `${fit.hull} ship layout. ${SLOT_TYPES.map(t => `${SLOT_WORD[t]}: ${partsIn(fit, t).length} fitted of ${slotsOf(fit.hull)[t]}`).join(". ")}`);
    const ctx = this.canvas.getContext("2d"); if (!ctx) return;
    ctx.setTransform(PREVIEW.resolution, 0, 0, PREVIEW.resolution, 0, 0);
    ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, PREVIEW.width, PREVIEW.height);
    ctx.fillStyle = "#070b12"; ctx.fillRect(0, 0, PREVIEW.width, PREVIEW.height);
    const sprite = (texture: string, pose: string, x: number, y: number, size: number) => {
      const frame = firstFrame(this.scene.cache.json.get(`${texture}_layout`) as AtlasLayout, pose, "up");
      const f = this.scene.textures.getFrame(texture, frame);
      if (f) ctx.drawImage(f.source.image as CanvasImageSource, f.cutX, f.cutY, f.cutWidth, f.cutHeight, x - size / 2, y - size / 2, size, size);
    };
    for (const s of slotSpots(fit.hull)) {
      const id = partsIn(fit, s.type)[s.i], col = `#${SLOT_COL[s.type].toString(16)}`;
      ctx.strokeStyle = col; ctx.globalAlpha = id ? 0.8 : 0.35;
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(SHIP.x, SHIP.y); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillStyle = id ? "#16222c" : "#0a0e14"; ctx.fillRect(s.x - 16, s.y - 16, PREVIEW.slot, PREVIEW.slot);
      ctx.strokeRect(s.x - 16, s.y - 16, PREVIEW.slot, PREVIEW.slot);
      if (id) sprite("space_parts", id, s.x, s.y, PREVIEW.slot);
      else { ctx.fillStyle = col; ctx.font = "20px monospace"; ctx.textAlign = "center"; ctx.fillText("+", s.x, s.y + 7); }
    }
    sprite(hullAtlas(fit.hull), fit.hull, SHIP.x, SHIP.y, PREVIEW.hull);
    const labels: Record<SlotType, [number, number]> = { gun: [168, 22], engine: [168, 268], turret: [40, 44], power: [40, 132], defence: [292, 44] };
    ctx.font = "14px monospace"; ctx.textAlign = "center";
    for (const t of SLOT_TYPES) if (slotsOf(fit.hull)[t]) { ctx.fillStyle = `#${SLOT_COL[t].toString(16)}`; ctx.fillText(SLOT_WORD[t], ...labels[t]); }
  }
}

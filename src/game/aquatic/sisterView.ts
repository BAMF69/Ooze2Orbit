// Sprite ownership for map-local sister lineages; projection stays with AquaticScene's camera.
import * as Phaser from "phaser";
import { animKey, type AtlasLayout } from "../cell/atlas";
import { bodyLook, lookScores } from "./creature";
import type { AqLookContext } from "./divisionPicker";
import type { AqSister } from "./sisters";
import { AQ } from "./tuning";
import { viewOf } from "./view";

interface Visual {
  spr: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
}

export class SisterView {
  private visuals = new Map<number, Visual>();
  constructor(private scene: Phaser.Scene, _parts: AtlasLayout) {}

  hide(): void { for (const v of this.visuals.values()) { v.spr.setVisible(false); v.label.setVisible(false); } }
  clear(): void { for (const v of this.visuals.values()) { v.spr.destroy(); v.label.destroy(); } this.visuals.clear(); }

  draw(sisters: readonly AqSister[], heading: number, player: { x: number; y: number; z: number }, context: AqLookContext,
    place: (sprite: Phaser.GameObjects.Sprite, sister: AqSister) => boolean, lens = false, reduced = false, debug = false): void {
    const ids = new Set(sisters.map(s => s.id));
    for (const [id, v] of this.visuals) if (!ids.has(id)) {
      v.spr.destroy(); v.label.destroy(); this.visuals.delete(id);
    }
    this.hide();
    for (const s of sisters) {
      let v = this.visuals.get(s.id);
      if (!v) {
        v = { spr: this.scene.add.sprite(0, 0, "aswim"),
          label: this.scene.add.text(0, 0, "", { fontFamily: "monospace", fontSize: `${AQ.sisters.labelSize}px`,
            color: AQ.sisters.labelColor, stroke: "#071418", strokeThickness: 2 }).setOrigin(0.5, 1).setResolution(2) };
        this.visuals.set(s.id, v);
      }
      v.spr.setData("aqBody", s.body);
      if (!place(v.spr, s)) continue;
      const look = bodyLook(lookScores(context.temper, s.body, 0, 0));
      const view = lens ? { view: "side", flip: false } : viewOf(s.heading, heading);
      v.spr.play(animKey("aswim", "swim", `${view.view}${look.row}`), true).setFlipX(view.flip)
        .setFlipY(lens && Math.cos(s.heading) < 0).setRotation(lens ? s.heading : 0);
      if (!reduced) {
        const growth = s.age < AQ.sisters.birthGrowS ? AQ.sisters.birthStartScale +
          (1 - AQ.sisters.birthStartScale) * Math.min(1, s.age / AQ.sisters.birthGrowS) :
          1 + AQ.sisters.growthSwell * Math.sin(Math.PI * s.growth / AQ.sisters.growthS);
        v.spr.setScale(v.spr.scaleX * growth, v.spr.scaleY * growth);
      }
      if (s.windup > 0) v.spr.setTint(AQ.sisters.windupTint);
      else if (s.contactCd > 0) v.spr.setTint(AQ.sisters.hitTint);
      // AquaticIllustrations owns the illustrated body and every modular part, including
      // tendrils/organs that have no row in the legacy aparts atlas.
      const near = Math.hypot(s.x - player.x, s.y - player.y, s.z - player.z) < AQ.sisters.labelRange;
      v.label.setVisible(near).setPosition(v.spr.x, v.spr.y - v.spr.displayHeight / 2)
        .setDepth(v.spr.depth + 0.2).setAlpha(v.spr.alpha)
        .setText(`${s.windup > 0 ? "! " : ""}Sister ${s.family}  F${s.body.form} G${s.generation}${s.ready ? " full" : ""}${debug ? ` [${s.intent}]` : ""}`);
    }
  }
}

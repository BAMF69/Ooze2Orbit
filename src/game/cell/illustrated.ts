// Illustrated cell-stage bodies and props; biology/physics stay in their existing units.
// Authored: Written with Codex; art generated with imagegen (A-0020).
import * as Phaser from "phaser";
import { DIETS, type Diet } from "./tuning";
import type { Creature } from "./rules";
import { restingPose, swimPose, type SwimPose } from "./swimMotion";
import { equipmentTexture } from "./equipmentArt";
export const CELL_ART = { source: "cellIllustratedSource", texture: "cellIllustrated", size: 40, tiles: 3,
  faunaRadiusScale: 2.6, algaeSize: 18, meatSize: 16, pickupSize: 28 };
export const CELL_SHEETS = [
  { source: CELL_ART.source, texture: CELL_ART.texture, file: "cell_illustrated_v1.png", tiles: 3 },
  { source: "cellFaunaSource", texture: "cellFauna", file: "cell_fauna_v1.png", tiles: 4 },
  { source: "cellPropsSource", texture: "cellProps", file: "cell_props_v1.png", tiles: 5 },
];
export const dietFrame = (diet: Diet): number => DIETS.indexOf(diet);
export function prepareCellArt(scene: Phaser.Scene): void {
  scene.textures.get("pondIllustrated").setFilter(Phaser.Textures.FilterMode.LINEAR);
  for (const sheet of CELL_SHEETS) {
    if (scene.textures.exists(sheet.texture)) continue;
    const image = scene.textures.get(sheet.source).getSourceImage() as HTMLImageElement;
    const texture = scene.textures.addSpriteSheet(sheet.texture, image, { frameWidth: Math.floor(image.width / sheet.tiles), frameHeight: image.height });
    texture?.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
}
export interface IllustratedBody { spr: Phaser.GameObjects.Sprite; vx: number; vy: number; creature?: Creature;
  texture?: string; frame?: number; size?: number; swims?: boolean; forward?: number }
interface Painted { body: IllustratedBody; image: Phaser.GameObjects.Image; equipment?: Phaser.GameObjects.Image; pose: SwimPose }
/** Old animated sprites remain invisible anchors for cameras, collisions and upgrade layers. */
export class CellIllustrations {
  private images = new Map<Phaser.GameObjects.Sprite, Painted>();
  private anchors: Phaser.GameObjects.Container;
  constructor(private scene: Phaser.Scene, private bodies: () => IllustratedBody[], private animate: () => boolean, private reduced: () => boolean, private rate: () => number = () => 1) {
    // A hidden scene-owned container retains animation/tween lifetimes without rendering legacy sprites.
    this.anchors = scene.add.container(0, 0).setVisible(false);
    scene.events.on("postupdate", this.update, this);
    scene.events.once("shutdown", () => { scene.events.off("postupdate", this.update, this); this.images.clear(); });
  }
  private update(_time: number, delta: number): void {
    for (const body of this.bodies()) {
      let entry = this.images.get(body.spr);
      if (!entry) {
        const image = this.scene.add.image(body.spr.x, body.spr.y, body.texture ?? CELL_ART.texture).setDepth(body.spr.depth + .01);
        entry = { body, image, pose: restingPose(this.images.size * 1.73) }; this.images.set(body.spr, entry);
        this.anchors.add(body.spr);
      }
      entry.body = body;
    }
    for (const [spr, entry] of this.images) {
      const { body, image } = entry;
      if (!spr.scene) { image.destroy(); entry.equipment?.destroy(); this.images.delete(spr); continue; }
      const creature = body.creature;
      if (body.swims !== false && this.animate()) entry.pose = swimPose(entry.pose, body.vx, body.vy, delta / 1000 * this.rate(), this.reduced());
      const pose = entry.pose, size = body.size ?? CELL_ART.size;
      image.setFrame(creature ? dietFrame(creature.diet) : body.frame ?? 0).setPosition(spr.x, spr.y).setVisible(spr.visible).setAlpha(spr.alpha)
        .setDisplaySize(size * spr.scaleX * pose.sx, size * spr.scaleY * pose.sy * image.frame.cutHeight / image.frame.cutWidth).setRotation(pose.rotation + (body.forward ?? 0));
      if (spr.isTinted) image.setTint(spr.tintTopLeft); else image.clearTint();
      if (creature) {
        const key = equipmentTexture(this.scene, creature);
        const equipment = entry.equipment ??= this.scene.add.image(spr.x, spr.y, key).setDepth(spr.depth + .02);
        equipment.setTexture(key).setPosition(spr.x, spr.y).setVisible(spr.visible).setAlpha(spr.alpha)
          .setDisplaySize(size * spr.scaleX * pose.sx, size * spr.scaleY * pose.sy).setRotation(pose.rotation);
      }
    }
  }
}

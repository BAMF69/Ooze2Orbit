import type { BodyRig } from './avatarRig';
// Illustrated organs share one atlas. Pose changes move attachments, never generate textures.
import * as Phaser from 'phaser';
import type { AqCreature } from './creature';
import type { AnatomyView } from './avatarVisual';
import { organPlacements } from './organPlacements';

export class LandmarkEquipment {
  private layers = new Map<string, Phaser.GameObjects.Image>();
  constructor(private scene: Phaser.Scene) {}
  hide(): void { for (const layer of this.layers.values()) layer.setVisible(false); }
  destroy(): void { for (const layer of this.layers.values()) layer.destroy(); this.layers.clear(); }
  update(body: Phaser.GameObjects.Image, c: AqCreature, view: AnatomyView, pose: number,
    clock: number, tucked: boolean, reduced: boolean, rig?:BodyRig): void {
    const keep = new Set<string>();
    for (const mount of organPlacements(c,view,pose,clock,tucked,reduced,rig)) {
        const {id,part,tier,x,y,width,height,angle} = mount; keep.add(id);
        let layer = this.layers.get(id);
        if (!layer) { layer = this.scene.add.image(0,0,'aqOrgansHD',mount.frame); this.layers.set(id,layer); }
        layer.setTexture('aqOrgansHD',mount.frame);
        if (mount.cropY !== undefined) {
          layer.setCrop(0,mount.cropY*layer.frame.cutHeight,layer.frame.cutWidth,mount.cropHeight!*layer.frame.cutHeight);
        } else layer.setCrop();
        const sx = body.flipX ? -1 : 1, sy = body.flipY ? -1 : 1;
        const dx = (x / 128 - .5) * body.displayWidth * sx;
        const dy = (y / 128 - .5) * body.displayHeight * sy;
        const cos = Math.cos(body.rotation), sin = Math.sin(body.rotation);
        const articulated=mount.cropY!==undefined;
        const along=articulated?Math.hypot(Math.sin(angle)*body.displayWidth,Math.cos(angle)*body.displayHeight)/128:body.displayHeight/128;
        const across=articulated?Math.hypot(Math.cos(angle)*body.displayWidth,Math.sin(angle)*body.displayHeight)/128:body.displayWidth/128;
        const rotation=articulated?Math.atan2(Math.sin(angle)*body.displayWidth,Math.cos(angle)*body.displayHeight):angle;
        layer.setOrigin(mount.ox,mount.oy);
        layer.setPosition(body.x + dx * cos - dy * sin, body.y + dx * sin + dy * cos)
          .setDisplaySize(across*width,along*height)
          .setRotation(body.rotation + rotation * sx * sy).setFlipX(body.flipX !== !!mount.flip).setFlipY(body.flipY)
          .setDepth(body.depth + .01 + (mount.depthOffset??0)).setVisible(body.visible)
          .setAlpha(body.alpha*mount.alpha);
        if (body.isTinted) layer.setTint(body.tintTopLeft); else layer.clearTint();
        layer.setData('aqOrgan', part).setData('aqOrganTier', tier).setData('aqOrganOwner',body);
    }
    // Swapping equipment also removes its articulated objects immediately.
    for (const [id, layer] of this.layers) if (!keep.has(id)) { layer.destroy(); this.layers.delete(id); }
  }
}

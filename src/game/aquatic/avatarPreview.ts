// Native previews select the same authored family/form as the world renderer.
import type * as Phaser from 'phaser';
import type { AqCreature } from './creature';
import type { AnatomyView } from './avatarVisual';
import { drawCanvasAvatar } from './avatarCanvas';
import { evolutionProfile, familyForLook } from './evolutionArt';
export function drawAvatarPreview(ctx:CanvasRenderingContext2D,scene:Phaser.Scene,c:AqCreature,
  look:string,view:AnatomyView='back',pose=1):void {
  const profile=evolutionProfile(familyForLook(look),c.form);
  const key=profile?.bodies[c.diet].key??`aqAdaptable-${c.diet}HD`;
  const image=scene.textures.get(key).getSourceImage() as CanvasImageSource;
  drawCanvasAvatar(ctx,{body:image,organs:scene.textures.get('aqOrgansHD').getSourceImage() as CanvasImageSource},c,view,pose,{profile});
}

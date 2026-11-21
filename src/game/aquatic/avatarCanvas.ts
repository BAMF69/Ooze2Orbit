import { ADAPTABLE_RIG, type BodyRig } from './avatarRig';
import type { EvolutionProfile } from './evolutionArt';
import { playerPose } from './playerMotion';
// Canvas backend for the same rig compiler used by the in-game sprite renderer.
import frames from './avatarFrames.json';
import type { AqCreature, Diet } from './creature';
import type { AnatomyView } from './avatarVisual';
import { organPlacements, type OrganPlacement } from './organPlacements';

export interface AvatarImages { bodies:Record<Diet,CanvasImageSource>;organs:CanvasImageSource;body?:CanvasImageSource }
export interface AvatarCanvasOptions { clock?:number;tucked?:boolean;reduced?:boolean;profile?:EvolutionProfile;rig?:BodyRig;overlay?:(ctx:CanvasRenderingContext2D,placements:OrganPlacement[])=>void }
export function drawCanvasAvatar(ctx:CanvasRenderingContext2D,images:AvatarImages,c:AqCreature,view:AnatomyView,pose:number,
  options:AvatarCanvasOptions={}):void {
  const effectivePose=options.tucked||(options.reduced&&pose!==3)?1:pose;
  const row=view==='front'?0:view==='side'?1:2,index=row*4+effectivePose;
  const body=options.profile?.bodies[c.diet];
  const [x,y,w,h]=(body?.rects??frames.bodies[c.diet])[index],[ox,oy]=(body?.offsets??frames.offsets[c.diet])[index];
  ctx.save();ctx.imageSmoothingEnabled=true;
  const action=playerPose({speed:0,dash:!!options.tucked,airborne:false,rising:false,stunned:false},effectivePose===3?0:Infinity,0,!!options.reduced,row);
  if(action.width!==1||action.height!==1){ctx.translate(192,192);ctx.scale(action.width,action.height);ctx.translate(-192,-192);}
  ctx.drawImage(images.body??images.bodies[c.diet],x,y,w,h,ox,oy,w,h);
  const placements=organPlacements(c,view,effectivePose,options.clock??pose*160,!!options.tucked,!!options.reduced,options.profile?.rig??options.rig??ADAPTABLE_RIG);
  ctx.scale(3,3);
  const ordered=[...placements].sort((a,b)=>(a.depthOffset??0)-(b.depthOffset??0));
  for(const mount of ordered) {
    const [sx,sy,sw,sh]=frames.organs[mount.frame],cropY=mount.cropY??0,cropHeight=mount.cropHeight??1;
    ctx.save();ctx.translate(mount.x,mount.y);ctx.rotate(mount.angle);ctx.scale(mount.flip?-1:1,1);ctx.globalAlpha=mount.alpha;
    ctx.drawImage(images.organs,sx,sy+cropY*sh,sw,cropHeight*sh,
      -mount.ox*mount.width,(cropY-mount.oy)*mount.height,mount.width,cropHeight*mount.height);ctx.restore();
  }
  options.overlay?.(ctx,placements);ctx.restore();
}

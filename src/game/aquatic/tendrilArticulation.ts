import type { OrganPlacement } from './attachmentCompiler';
import type { AnatomyView } from './avatarVisual';

// Centerline fractions of the painted tendril at the two cut seams, per view.
const joints:Record<AnatomyView,readonly [number,number]>={
  front:[.40,.29],side:[.59,.26],back:[.60,.71],
};

export function tendrilSections(mount:OrganPlacement,view:AnatomyView,sway:number):OrganPlacement[]{
  const sections:OrganPlacement[]=[];
  const centers=[mount.ox,...joints[view]];
  const seams=[mount.oy,.33,.66];
  let {x,y,angle}=mount;
  for(let i=0;i<3;i++){
    const oy=seams[i],ox=centers[i];
    const cropY=i===0?0:oy-.018;
    const cropEnd=i===2?1:seams[i+1]+.018;
    sections.push({...mount,id:mount.id+':'+i,x,y,angle,ox,oy,cropY,cropHeight:cropEnd-cropY});
    if(i===2)break;
    const dx=(centers[i+1]-ox)*mount.width*(mount.flip?-1:1);
    const dy=(seams[i+1]-oy)*mount.height;
    x+=dx*Math.cos(angle)-dy*Math.sin(angle);
    y+=dx*Math.sin(angle)+dy*Math.cos(angle);
    angle+=sway*(i===0?1:-.72);
  }
  return sections;
}

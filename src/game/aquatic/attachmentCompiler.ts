// Compile the declarative attachment contract into backend-independent drawing instances.
import { spineSections } from './spineArticulation';
import { partTier, type AqCreature } from './creature';
import type { AnatomyView } from './avatarVisual';
import { bodyRig, rigSocket, type BodyRig, type RigSocketId } from './avatarRig';
import { PART_ATTACHMENTS, type Deformation } from './attachmentSchema';
import type { AqPart } from './tuning';

export interface OrganPlacement {
  id:string;logicalId:string;part:AqPart;tier:number;frame:number;mountId:RigSocketId|'spine.dorsal';deformation:Deformation;
  x:number;y:number;width:number;height:number;angle:number;flip:boolean;ox:number;oy:number;alpha:number;
  cropY?:number;cropHeight?:number;depthOffset?:number;
}
export function organPlacements(c:AqCreature,view:AnatomyView,pose:number,clock:number,tucked:boolean,reduced:boolean,
  rigOverride?:BodyRig):OrganPlacement[] {
  const rig=rigOverride??bodyRig('adaptable',c.form);
  if(!rig)throw Error(`No authored adaptable attachment rig for form ${c.form}`);
  const result:OrganPlacement[]=[],side=view==='side',row=view==='front'?0:side?1:2;
  const selectedPose=reduced&&pose!==3?1:pose,bend=selectedPose===0?-1:selectedPose===2?1:0;
  for(const part of new Set([...c.parts,...c.uniques])) {
    const spec=PART_ATTACHMENTS[part],tier=spec.tiered?Math.max(1,Math.min(3,partTier(c,part))):1;
    if(spec.curve?.views.includes(view)) {
      if(!rig.paths[spec.curve.path]?.views.includes(view))throw Error(`Rig ${rig.id} cannot fit ${part} to ${spec.curve.path} in ${view}`);
      for(const section of spineSections(c.diet,view,reduced?1:selectedPose,tier,tucked,spec.curve.profile,rig)) {
        result.push({id:`${part}:${section.plate}:${section.section}`,logicalId:`${part}:${section.plate}`,part,tier,
          frame:spec.atlasRow*3+row,mountId:spec.curve.path,deformation:spec.deformation,
          x:section.x,y:section.y,width:section.width,height:section.height,angle:section.angle,flip:false,ox:.5,
          oy:section.oy,alpha:1,cropY:section.cropY,cropHeight:section.cropHeight,depthOffset:-section.plate*.00001});
      }
      continue;
    }
    for(const layer of spec.layers) {
      if(!layer.views.includes(view)||tier<(layer.minTier??1))continue;
      const point=rigSocket(rig,c,view,selectedPose,layer.socket),count=layer.repeat?.counts[tier-1]??1;
      for(let n=0;n<count;n++) {
        let [width,height]=side&&layer.sideSize?layer.sideSize:layer.size;
        if(selectedPose===3&&layer.biteSize)[width,height]=side&&layer.sideBiteSize?layer.sideBiteSize:layer.biteSize;
        if(tucked&&layer.tuckedSize)[width,height]=layer.tuckedSize;
        const tierScale=layer.tierScale?.[tier-1]??1;
        width*=tierScale*(layer.scale?.[0]??1);height*=tierScale*(layer.scale?.[1]??1);
        let angle=point.angle+(side?(layer.sideAngle??layer.angle??0):(layer.angle??0));
        if(selectedPose===3&&layer.biteAngle!==undefined)angle=point.angle+layer.biteAngle;
        angle+=bend*(layer.bendAngle??0);
        if(layer.sway&&!reduced)angle+=Math.sin(clock/layer.sway.period+layer.sway.phase)*layer.sway.amplitude;
        const step=layer.repeat?.step??[0,0],bendStep=layer.repeat?.bendStep??[0,0,0],id=`${part}:${layer.id}:${n}`;
        result.push({id,logicalId:id,part,tier,frame:spec.atlasRow*3+row,mountId:layer.socket,deformation:spec.deformation,
          x:point.x+n*(step[0]+bend*bendStep[0]),y:point.y+n*(step[1]+bend*bendStep[1]),
          width,height,angle:angle+bend*n*bendStep[2],flip:!!layer.mirror,ox:layer.origin?.[0]??.5,oy:layer.origin?.[1]??.5,
          alpha:spec.pulse&&!reduced?1-spec.pulse.amplitude+spec.pulse.amplitude*Math.sin(clock/spec.pulse.period)**2:1});
      }
    }
  }
  return result;
}

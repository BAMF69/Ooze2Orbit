// Compile the declarative attachment contract into backend-independent drawing instances.
import { spineSections } from './spineArticulation';
import { partTier, type AqCreature } from './creature';
import type { AnatomyView } from './avatarVisual';
import { bodyRig, rigSocket, type BodyRig, type RigSocketId } from './avatarRig';
import { PART_ATTACHMENTS, type Deformation } from './attachmentSchema';
import { fittedMouthSize, torrentVisible } from './attachmentFits';
import { chestPlatesVisible } from './surfaceAttachmentFits';
import { tendrilSections } from './tendrilArticulation';
import { torrentPlacement } from './torrentArtwork';
import type { AqPart } from './tuning';

export interface OrganPlacement {
  id:string;logicalId:string;part:AqPart;tier:number;frame:number;mountId:RigSocketId|'spine.dorsal';deformation:Deformation;
  x:number;y:number;width:number;height:number;angle:number;flip:boolean;ox:number;oy:number;alpha:number;
  artwork?:'teeth'|'tail'|'gills'|'muscle';cropY?:number;cropHeight?:number;depthOffset?:number;
}
export function organPlacements(c:AqCreature,view:AnatomyView,pose:number,clock:number,tucked:boolean,reduced:boolean,
  rigOverride?:BodyRig):OrganPlacement[] {
  const rig=rigOverride??bodyRig('adaptable',c.form);
  if(!rig)throw Error(`No authored adaptable attachment rig for form ${c.form}`);
  const result:OrganPlacement[]=[],side=view==='side',back=view==='back',row=view==='front'?0:side?1:2;
  const selectedPose=reduced&&pose!==3?1:pose,bend=selectedPose===0?-1:selectedPose===2?1:0;
  for(const part of new Set([...c.parts,...c.uniques])) {
    const spec=PART_ATTACHMENTS[part],tier=spec.tiered?Math.max(1,Math.min(3,partTier(c,part))):1;
    if(spec.curve?.views.includes(view)) {
      if(!rig.paths[spec.curve.path]?.views.includes(view))throw Error(`Rig ${rig.id} cannot fit ${part} to ${spec.curve.path} in ${view}`);
      for(const section of spineSections(c.diet,view,selectedPose,tier,tucked,spec.curve.profile,rig)) {
        result.push({id:`${part}:${section.plate}:${section.section}`,logicalId:`${part}:${section.plate}`,part,tier,
          frame:spec.atlasRow*3+row,mountId:spec.curve.path,deformation:spec.deformation,
          x:section.x,y:section.y,width:section.width,height:section.height,angle:section.angle,flip:false,ox:.5,
          oy:section.oy,alpha:1,cropY:section.cropY,cropHeight:section.cropHeight,depthOffset:-section.plate*.00001});
      }
      continue;
    }
    if(spec.artwork==='tail'&&!torrentVisible(rig,c.form,view))continue;
    for(const layer of spec.layers) {
      if(!layer.views.includes(view)||tier<(layer.minTier??1))continue;
      if(layer.socket==='armor.front'&&!chestPlatesVisible(rig,view,selectedPose))continue;
      const point=rigSocket(rig,c,view,selectedPose,layer.socket),count=layer.repeat?.counts[tier-1]??1;
      const tail=spec.artwork==='tail'?torrentPlacement(rig,c.diet,c.form,view,selectedPose):undefined;
      const teeth=spec.artwork==='teeth'?fittedMouthSize(rig,c,view,selectedPose,layer.socket):undefined;
      for(let n=0;n<count;n++) {
        let [width,height]=side&&layer.sideSize?layer.sideSize:layer.size;
        if(selectedPose===3&&layer.biteSize)[width,height]=side&&layer.sideBiteSize?layer.sideBiteSize:layer.biteSize;
        if(tucked&&layer.tuckedSize)[width,height]=layer.tuckedSize;
        if(teeth)[width,height]=teeth;
        if(tail)({width,height}=tail);
        const tierScale=layer.tierScale?.[tier-1]??1;
        const growth=spec.growthScale?.[c.form-1]??1;
        width*=growth*tierScale*(layer.scale?.[0]??1);
        height*=growth*tierScale*(layer.scale?.[1]??1);
        let angle=point.angle+((side?layer.sideAngle:back?layer.backAngle:undefined)??layer.angle??0);
        if(selectedPose===3&&layer.biteAngle!==undefined)angle=point.angle+layer.biteAngle;
        angle=tail?0:angle+bend*(layer.bendAngle??0);
        const sway=layer.sway&&!reduced&&!tucked?Math.sin(clock/layer.sway.period+layer.sway.phase)*layer.sway.amplitude:0;
        angle+=sway;
        const origin=(back?layer.backOrigin:undefined)??layer.origin??[.5,.5];
        const frame=tail?.frame??(spec.artwork==='teeth'?(layer.id.startsWith('corner')?2:side?1:0):
          spec.artwork==='gills'?4:spec.artwork==='muscle'?5:spec.atlasRow*3+row);
        const step=layer.repeat?.step??[0,0],bendStep=layer.repeat?.bendStep??[0,0,0],id=`${part}:${layer.id}:${n}`;
        const mount:OrganPlacement={id,logicalId:id,part,tier,artwork:spec.artwork,
          frame,mountId:layer.socket,deformation:spec.deformation,
          x:(tail??point).x+n*(step[0]+bend*bendStep[0]),y:(tail??point).y+n*(step[1]+bend*bendStep[1])*growth,
          width,height,angle:angle+bend*n*bendStep[2],flip:!!((back?layer.backMirror:undefined)??layer.mirror),ox:origin[0],oy:origin[1],
          alpha:spec.pulse&&!reduced?1-spec.pulse.amplitude+spec.pulse.amplitude*Math.sin(clock/spec.pulse.period)**2:1};
        if(spec.artwork==='teeth'&&layer.id==='lower'&&view==='front'&&selectedPose===3){
          // Both tooth rows pivot on the painted chin and rise toward the mouth corners.
          const hinge=Math.atan2(height*1.45,width*.5);
          const length=width*.5/Math.cos(hinge);
          result.push(
            {...mount,id:id+':left',frame:3,width:length,angle:hinge,ox:.96},
            {...mount,id:id+':right',frame:3,width:length,angle:-hinge,ox:.96,flip:true},
          );
        } else if(layer.chain)result.push(...tendrilSections(mount,view,sway*1.8));
        else result.push(mount);
      }
    }
  }
  return result;
}

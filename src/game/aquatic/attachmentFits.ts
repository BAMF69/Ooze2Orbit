// Authored fitting data lives outside the measured catalog. Coordinates are
// body-local rig units, independent of display scale and inherited thickness.
import type { AqCreature } from './creature';
import type { BodyRig, RigPoint, RigSocketId } from './avatarRig';
import type { AnatomyView } from './avatarVisual';

type SwimMouth=readonly [x:number,seam:number,width:number];
type BiteMouth=readonly [x:number,upper:number,lower:number,width:number];
type MouthViews=readonly [front:SwimMouth,frontBite:BiteMouth,side:SwimMouth,sideBite:BiteMouth];
const mouthFits:Record<string,MouthViews>={
  'adaptable:1':[[64,70,7],[64,69,78.8,9],[100,61,5],[100,60,64,5]],
  'adaptable:2':[[64,72,5],[64,71,78.5,7],[101,59,4],[104,58,64,5]],
  'adaptable:3':[[64,70,8],[64,70,75.5,8],[101,59.5,6],[101,60,63,5]],
  'adaptable:4':[[64,69,9],[64,69,78,11],[103,59,5],[102,60,65,6]],
  'aggressive:1':[[64,72,6],[64,72,80.5,12],[100,59,6],[98,62,67,9]],
  'aggressive:2':[[64,71,8],[64,72,85.5,15],[101,60,6],[99,62,71,10]],
  'aggressive:3':[[63.5,71,8],[64,71,88.5,18],[103,60,7],[101,62,73,12]],
  'aggressive:4':[[63,70,9],[64,72,87,17],[103,60,6],[101,61,72,10]],
  'cautious:1':[[64,72,6],[64,71,78.5,12],[100,60,4],[98,62,69,7]],
  'cautious:2':[[64,71,7],[64,71,81.8,13],[101,60,5],[100,62,70,8]],
  'cautious:3':[[63.5,71,7],[64,71,83.8,15],[101,61,4],[100,62,73,8]],
  'cautious:4':[[64,71,7],[64,72,87,17],[101,60,5],[98,63,73,8]],
};

const tailSizes:Record<string,readonly (readonly [number,number])[]>={
  'adaptable:1':[[22,12],[24,13],[22,13]],
  'adaptable:2':[[26,13],[29,16],[20,13]],
  'adaptable:3':[[17,10],[18,10],[17,10]],
  'adaptable:4':[[34,17],[41,18],[30,16]],
  'aggressive:1':[[15,25],[15,29],[14,34]],
  'aggressive:2':[[16,37],[18,43],[24,50]],
  'aggressive:3':[[19,42],[19,38],[20,51]],
  'aggressive:4':[[18,33],[20,42],[21,53]],
  'cautious:1':[[21,13],[19,11],[18,13]],
  'cautious:2':[[14,11],[21,12],[20,17]],
  'cautious:3':[[14,13],[20,14],[23,24]],
  'cautious:4':[[12,9],[19,14],[17,16]],
};
// Angles follow the terminal fin rather than applying the trunk's bend twice.
const tailAngles:Record<string,readonly number[]>={
  'adaptable:1':[0,-1.25,3.14,-1.25,-.4,-2.65,-2.7,-2.65,2.65,1.05,.5,1.05],
  'adaptable:2':[0,-1.25,-2.8,-1.25,-.45,-.6,-.5,-.6,.6,1.1,2.9,.9],
  'adaptable:3':[2.9,.45,.45,.38,-2.4,-2.45,-2.28,-2.35,.45,1.16,2.68,1.16],
  'adaptable:4':[.35,.1,2.85,.1,-.2,-.28,-.42,-.28,1.25,1.05,2.05,1.05],
  'aggressive:1':[-2.48,-1.57,-.63,-1.57,-2.42,3.14,2.75,3.14,2.15,1.57,.93,1.57],
  'aggressive:2':[-2.14,-1.57,-1,-1.57,-1.45,3.14,-1.85,3.14,.88,1.57,2.28,1.57],
  'aggressive:3':[-2.55,-1.57,-.58,-1.57,-1.55,3.14,-1.6,3.14,2.42,1.57,.72,1.57],
  'aggressive:4':[-2.5,-1.57,-.58,-1.57,2.75,3.14,-2.58,3.14,1.95,1.57,1,1.57],
  'cautious:1':[-1.04,-1.57,-2.7,-1.57,.12,-2.8,-2.65,-2.8,2.35,1.57,1,1.57],
  'cautious:2':[3.14,-1.57,-.12,-1.57,2.25,-2.95,-2.7,-2.95,2.1,1.57,.95,1.57],
  'cautious:3':[-2,-1.57,-1.12,-1.57,2.35,-2.95,-2.25,-2.95,2.45,1.57,.69,1.57],
  'cautious:4':[.2,-1.57,2.94,-1.57,2.5,3.14,2.7,3.14,.82,1.57,2.3,1.57],
};
export function attachmentFitData(rig:BodyRig,form:number) {
  const key=`${rig.family}:${form}`;
  return {mouth:mouthFits[key],tailSizes:tailSizes[key],tailAngles:tailAngles[key],tailVisibleFromFront:torrentVisible(rig,form,'front')};
}
export function torrentVisible(rig:BodyRig,form:number,view:AnatomyView):boolean {
  // Adult precursor shells hide the caudal fin head-on.
  return !(rig.family==='cautious'&&form===4&&view==='front');
}
const isMouth=(id:RigSocketId)=>id.startsWith('mouth.');

export function fittedMouthPoint(rig:BodyRig,c:AqCreature,view:AnatomyView,pose:number,id:RigSocketId):RigPoint|undefined {
  if(view==='back'||!isMouth(id))return;
  const fit=mouthFits[`${rig.family}:${c.form}`];
  if(!fit)return;
  const index=view==='front'?0:2;
  const [x,seam,width]=fit[index] as SwimMouth;
  const [biteX,upper,lower,biteWidth]=fit[index+1] as BiteMouth;
  const open=pose===3;
  const w=open?biteWidth:width;
  const corner=id.includes('corner');
  const side=view==='side';
  const horizontal=corner?(id.endsWith('left')?-1:1)*w*.34:0;
  const inset=side&&open?(id==='mouth.lower'?w*.32:w*.16):0;
  const y=open?(id==='mouth.upper'?upper:corner?upper+(lower-upper)*.35:lower):seam+(id==='mouth.upper'?-.65:.65);
  const angle=id==='mouth.upper'?Math.PI:corner?(horizontal<0?.22:-.22):view==='side'&&open?-.19:0;
  return {x:(open?biteX:x)+horizontal-inset,y,angle};
}

export function fittedMouthSize(rig:BodyRig,c:AqCreature,view:AnatomyView,pose:number,id:RigSocketId):readonly [number,number]|undefined {
  const fit=mouthFits[`${rig.family}:${c.form}`];
  if(!fit||view==='back')return;
  const index=view==='front'?0:2;
  const open=pose===3;
  const swim=fit[index] as SwimMouth,bite=fit[index+1] as BiteMouth;
  const width=open?bite[3]:swim[2],gap=open?bite[2]-bite[1]:1.8;
  if(open&&view==='front'&&id==='mouth.lower')return [width,gap*.36];
  const visibleGap=view==='front'&&open?Math.min(gap,12):gap;
  return id.includes('corner')?[width*.17,visibleGap*.33]:[width*(view==='side'&&open?.68:1),visibleGap*.48];
}

export function tailRegion(rig:BodyRig,form:number,view:AnatomyView,pose:number,point:RigPoint) {
  const row=view==='front'?0:view==='side'?1:2;
  const key=`${rig.family}:${form}`, i=row*4+pose;
  const [width,height]=tailSizes[key]?.[row]??[16,14];
  const [dx,dy]=key==='adaptable:4'&&view==='side'?[10,-10]:key==='aggressive:2'&&view==='back'?[0,-4]:[0,0];
  return {x:point.x+dx,y:point.y+dy,width,height,angle:tailAngles[key]?.[i]??point.angle};
}

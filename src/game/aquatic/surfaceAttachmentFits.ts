import type { AqCreature } from './creature';
import type { BodyRig, RigPoint, RigSocketId } from './avatarRig';
import { fittedMouthPoint } from './attachmentFits';
import type { AnatomyView } from './avatarVisual';

// Neutral attachment roots measured in the runtime omnivore reference frames.
// Front/back list the left root of each pair. Side lists the near root.
type SurfaceRoots=readonly [
  shoulderX:number,shoulderY:number,pelvisX:number,pelvisY:number,
  flankX:number,flankY:number,abdomenX:number,abdomenY:number,ventralX:number,ventralY:number,
];
type BodyRoots=Readonly<Record<AnatomyView,SurfaceRoots>>;
const roots:Record<string,BodyRoots>={
  'adaptable:1':{front:[53,73,57,76,54,69,64,73,59,75],side:[81,63,65,63,89,61,75,64,73,65],back:[56,42,58,52,58,38,64,46,59,55]},
  'adaptable:2':{front:[52,68,53,80,54,69,64,76,59,79],side:[82,63,58,66,90,60,75,64,73,65],back:[57,43,58,61,58,39,64,56,59,66]},
  'adaptable:3':{front:[59,77,57,87,58,75,64,79,60,84],side:[84,66,61,68,89,64,75,65,74,68],back:[59,38,59,57,59,42,64,54,60,63]},
  'adaptable:4':{front:[54,57,54,72,56,67,64,70,59,73],side:[80,64,58,62,90,61,71,63,70,65],back:[56,27,57,49,59,29,64,44,60,55]},
  'aggressive:1':{front:[48,70,56,75,52,69,64,74,58,76],side:[83,63,69,62,91,62,75,62,72,65],back:[52,44,57,57,54,42,64,56,58,64]},
  'aggressive:2':{front:[50,73,54,82,48,68,64,78,58,82],side:[78,63,56,64,88,62,70,63,71,66],back:[53,43,56,61,54,42,64,58,59,65]},
  'aggressive:3':{front:[47,68,54,84,48,70,64,79,56,84],side:[80,63,54,64,91,61,68,63,69,68],back:[49,44,57,62,52,43,64,60,57,67]},
  'aggressive:4':{front:[49,71,51,84,47,68,64,80,57,86],side:[75,66,57,62,92,59,67,65,68,68],back:[49,46,52,61,53,42,64,63,57,70]},
  'cautious:1':{front:[47,71,55,78,50,69,64,74,58,77],side:[77,64,53,64,89,61,70,64,67,67],back:[50,46,55,56,55,45,64,58,57,63]},
  'cautious:2':{front:[47,73,46,79,49,69,64,76,57,79],side:[81,66,60,64,90,62,72,65,71,67],back:[46,44,51,62,50,46,64,62,57,64]},
  'cautious:3':{front:[46,74,48,84,47,70,64,82,55,85],side:[76,73,49,76,88,66,64,72,67,75],back:[43,55,49,77,47,57,64,77,56,79]},
  'cautious:4':{front:[46,75,44,84,46,73,64,83,55,87],side:[74,71,51,71,88,63,66,69,68,72],back:[45,62,51,73,49,60,64,72,56,75]},
};

const rootGroups:Partial<Record<RigSocketId,number>>={
  'shoulder.left':0,'shoulder.right':0,'pelvis.left':2,'pelvis.right':2,
  'flank.left':4,'flank.right':4,abdomen:6,'ventral.left':8,'ventral.right':8,
};

const dorsalFits={
  adaptable:{sideInset:0,widthScale:1},
  aggressive:{sideInset:3.6,widthScale:1},
  cautious:{sideInset:2.2,widthScale:.77},
};

export function dorsalFit(rig:BodyRig) {
  return dorsalFits[rig.family];
}

export function surfaceFitData(rig:BodyRig,form:number) {
  return roots[`${rig.family}:${form}`];
}

export function chestPlatesVisible(rig:BodyRig,view:AnatomyView,pose:number):boolean {
  return view!=='front'||pose!==3||rig.family==='adaptable';
}

export function surfacePoint(rig:BodyRig,c:AqCreature,view:AnatomyView,pose:number,id:RigSocketId):RigPoint|undefined {
  const fit=surfaceFitData(rig,c.form)?.[view];
  if(!fit)return;
  if(id==='armor.front'&&view==='front'){
    const lip=pose===3?fittedMouthPoint(rig,c,view,pose,'mouth.lower')?.y:undefined;
    return {x:64,y:Math.max(fit[7]-3,lip===undefined?0:lip+3),angle:0};
  }
  const group=rootGroups[id];
  if(group===undefined)return;
  let x=fit[group],y=fit[group+1];
  if(id.endsWith('.right'))x=view==='side'?x+(group===4?-3:-5):128-x;
  if(view==='front'&&pose===3&&group===0&&rig.family==='aggressive')y+=3;
  // Rear roots follow the local trunk shift from the measured pose path.
  // Keep bilateral offsets on their respective sides of that local centerline.
  if(view==='back'){
    const path=rig.paths['spine.dorsal'].points[c.diet]?.back;
    const neutral=path?.[1],current=path?.[pose];
    if(neutral&&current){
      const i=neutral.reduce((best,p,n)=>Math.abs(p[1]-y)<Math.abs(neutral[best][1]-y)?n:best,0);
      x+=current[i][0]-neutral[i][0];
      y+=current[i][1]-neutral[i][1];
    }
  }
  if(view==='side'){
    const path=rig.paths['spine.dorsal'].points[c.diet]?.side;
    const neutral=path?.[1],current=path?.[pose];
    if(neutral&&current){
      const i=neutral.reduce((best,p,n)=>Math.abs(p[0]-x)<Math.abs(neutral[best][0]-x)?n:best,0);
      // Use a fraction of the local dorsal displacement because these roots
      // sit on flesh below the outline, which flexes less than the ridges.
      y+=(current[i][1]-neutral[i][1])*.4;
    }
  }
  return {x,y,angle:0};
}

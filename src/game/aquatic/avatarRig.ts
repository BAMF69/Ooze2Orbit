import { evolutionProfile } from './evolutionArt';
// Versioned body contract. Coordinates are presentation data, never gameplay or save state.
import frames from './avatarFrames.json';
import type { AqCreature, LookFamily } from './creature';
import type { AnatomyView } from './avatarVisual';

export interface RigPoint { x:number; y:number; angle:number }
type Positions = Partial<Record<AnatomyView,readonly [number,number]>>;
export interface RigSocket {
  label:string; positions?:Positions; source?:'tail.fin';
  angles?:Partial<Record<AnatomyView,number>>;
  poseOffsets?:Partial<Record<AnatomyView,readonly (readonly [number,number,number])[]>>;
}
const socket=(label:string,front:readonly [number,number],side:readonly [number,number],back?:readonly [number,number]):RigSocket=>({
  label,positions:{front,side,...(back?{back}:{})},
});
export const ADAPTABLE_SOCKETS = {
  'mouth.lower':socket('Lower mouth hinge',[64,70],[103,59]),
  'mouth.upper':socket('Upper mouth hinge',[64,68],[103,57]),
  'mouth.corner.left':socket('Left mouth corner',[60,70],[101,59]),
  'mouth.corner.right':socket('Right mouth corner',[68,70],[105,59]),
  'shoulder.left':socket('Left shoulder',[59,78],[77,66],[59,44]),
  'shoulder.right':socket('Right shoulder',[69,78],[77,66],[69,44]),
  'pelvis.left':socket('Left pelvic fin root',[59,90],[77,78],[59,56]),
  'pelvis.right':socket('Right pelvic fin root',[69,90],[77,78],[69,56]),
  'flank.left':socket('Left flank',[60,78],[83,64],[60,46]),
  'flank.right':socket('Right flank',[68,78],[86,64],[68,46]),
  'abdomen':socket('Abdominal muscle',[64,78],[64,68],[64,50]),
  'ventral.left':socket('Left ventral appendage root',[59,91],[70,70],[59,60]),
  'ventral.right':socket('Right ventral appendage root',[69,91],[66,70],[69,60]),
  'armor.front':{label:'Front chest armor',positions:{front:[64,76]}} as RigSocket,
  'tail.fin':{label:'Tail fin junction',source:'tail.fin',angles:{side:.5}} as RigSocket,
};
export type RigSocketId=keyof typeof ADAPTABLE_SOCKETS;
export interface BodyRig {
  version:1; id:string; family:LookFamily; units:128; logicalFrame:384;
  forms:Readonly<Record<number,{label:string;artStatus:'authored'|'shared-provisional';socketOffsets?:Partial<Record<RigSocketId,readonly [number,number]>>}>>;
  sockets:Record<RigSocketId,RigSocket>;
  poseLandmarks:{'tail.fin':Record<string,number[][]>};
  paths:{'spine.dorsal':{label:string;views:readonly AnatomyView[];source:'measured-spines';points:Record<string,Partial<Record<AnatomyView,number[][][]>>>}};
}
export const ADAPTABLE_RIG:BodyRig={
  version:1,id:'aquatic.adaptable.mature.v1',family:'adaptable',units:128,logicalFrame:384,
  forms:{3:{label:'Mature adaptable',artStatus:'authored'},4:{label:'Creature precursor',artStatus:'shared-provisional'}},
  sockets:ADAPTABLE_SOCKETS,poseLandmarks:{'tail.fin':frames.tails},
  paths:{'spine.dorsal':{label:'Dorsal spine: nape to tail root',views:['side','back'],source:'measured-spines',points:frames.spines}},
};
export function bodyRig(family:LookFamily,form:number):BodyRig|undefined {
  return evolutionProfile(family,form)?.rig??(family==='adaptable'&&ADAPTABLE_RIG.forms[form]?ADAPTABLE_RIG:undefined);
}
export function rigSocket(rig:BodyRig,c:AqCreature,view:AnatomyView,pose:number,id:RigSocketId):RigPoint {
  const definition=rig.sockets[id];
  if(!definition)throw Error(`Rig ${rig.id} has no socket ${id}`);
  if(!rig.forms[c.form])throw Error(`Rig ${rig.id} has no form ${c.form}`);
  const row=view==='front'?0:view==='side'?1:2;
  const point=definition.source==='tail.fin'?rig.poseLandmarks['tail.fin'][c.diet]?.[row*4+pose]:definition.positions?.[view];
  if(!point)throw Error(`Socket ${id} is not visible in ${view}`);
  const offset=definition.poseOffsets?.[view]?.[pose]??[0,0,0];
  const growth=rig.forms[c.form].socketOffsets?.[id]??[0,0];
  return {x:point[0]+offset[0]+growth[0],y:point[1]+offset[1]+growth[1],angle:(definition.angles?.[view]??0)+offset[2]};
}

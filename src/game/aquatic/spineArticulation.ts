import { SCUTE_PROFILE, type ScuteProfile } from './attachmentSchema';
// Pose-authored dorsal paths. Arc-length sampling keeps overlapping scutes attached through tight bends.
import { ADAPTABLE_RIG, type BodyRig } from './avatarRig';
import type { Diet } from './creature';
import type { AnatomyView } from './avatarVisual';

type SpineView = 'side' | 'back';
interface Point { x: number; y: number; distance: number }
export interface SpineSection {
  plate: number; section: number; x: number; y: number; angle: number;
  width: number; height: number; cropY: number; cropHeight: number; oy: number;
}
const RESOLUTION = 12;
function curve(points: number[][]): Point[] {
  const result: Point[] = [];
  for (let n = 0; n < points.length - 1; n++) {
    const p0 = points[Math.max(0,n-1)], p1 = points[n];
    const p2 = points[n+1], p3 = points[Math.min(points.length-1,n+2)];
    for (let step = 0; step <= RESOLUTION; step++) {
      if (n > 0 && step === 0) continue;
      const t = step / RESOLUTION, t2 = t*t, t3 = t2*t;
      const coordinate = (axis: number) => .5 * (2*p1[axis] + (-p0[axis]+p2[axis])*t +
        (2*p0[axis]-5*p1[axis]+4*p2[axis]-p3[axis])*t2 + (-p0[axis]+3*p1[axis]-3*p2[axis]+p3[axis])*t3);
      const x = coordinate(0), y = coordinate(1), previous = result.at(-1);
      result.push({x,y,distance:previous ? previous.distance+Math.hypot(x-previous.x,y-previous.y) : 0});
    }
  }
  return result;
}
// Cache finite curves per rig. A new family supplies new points rather than inheriting adaptable coordinates.
const curves=new WeakMap<BodyRig,Map<string,Point[]>>();
function rigPath(rig:BodyRig,diet:Diet,view:SpineView,pose:number):Point[] {
  let cache=curves.get(rig);if(!cache){cache=new Map();curves.set(rig,cache);}
  const key=`${diet}:${view}:${pose}`;let result=cache.get(key);
  if(!result){
    const points=rig.paths['spine.dorsal'].points[diet]?.[view]?.[pose];
    if(!points||points.length<2)throw Error(`Rig ${rig.id} has no dorsal path for ${diet}/${view}/${pose}`);
    result=curve(points);cache.set(key,result);
  }
  return result;
}

export function spineSample(diet: Diet, view: SpineView, pose: number, distance: number, rig:BodyRig=ADAPTABLE_RIG) {
  const path = rigPath(rig,diet,view,pose);
  const d = Math.max(0,Math.min(path.at(-1)!.distance,distance));
  const index = Math.max(1,path.findIndex(point => point.distance >= d));
  const a = path[index-1], b = path[index];
  const t = (d-a.distance)/Math.max(.0001,b.distance-a.distance);
  return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,angle:Math.atan2(b.y-a.y,b.x-a.x)-Math.PI/2};
}

export function spineSections(diet: Diet, view: AnatomyView, pose: number, tier: number, tucked: boolean, profile:ScuteProfile=SCUTE_PROFILE,rig:BodyRig=ADAPTABLE_RIG): SpineSection[] {
  if (view === 'front') return [];
  const count = profile.counts[tier-1];
  const result: SpineSection[] = [];
  const height = profile.height[view] * (tucked ? profile.tuckLength : 1);
  for (let plate = 0; plate < count; plate++) {
    const start = profile.start + plate * profile.spacing;
    const taper = 1 - plate * profile.taper;
    for (let section = 0; section < profile.sections; section++) {
      // Each third bends independently around its own point on the spine; neighbouring crops overlap slightly.
      const oy = (section+.5)/profile.sections;
      const sample = spineSample(diet,view,pose,start+oy*height,rig);
      const cropY = Math.max(0,section/profile.sections-profile.cropOverlap);
      const cropEnd = Math.min(1,(section+1)/profile.sections+profile.cropOverlap);
      result.push({...sample,plate,section,width:profile.width[view]*taper*(tucked?profile.tuckWidth:1),height,
        cropY,cropHeight:cropEnd-cropY,oy});
    }
  }
  return result;
}

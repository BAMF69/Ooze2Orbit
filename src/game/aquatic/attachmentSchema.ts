// Organ definitions reference anatomical names, never body-specific coordinates.
import type { AqPart } from './tuning';
import type { AnatomyView } from './avatarVisual';
import type { RigSocketId } from './avatarRig';
export type Deformation='hinge'|'surface'|'curve';
type Pair=readonly [number,number];
export interface AttachmentLayer {
  id:string;socket:RigSocketId;views:readonly AnatomyView[];minTier?:number;
  size:Pair;sideSize?:Pair;origin?:Pair;backOrigin?:Pair;mirror?:boolean;backMirror?:boolean;
  angle?:number;sideAngle?:number;backAngle?:number;scale?:Pair;tierScale?:readonly number[];
  biteSize?:Pair;sideBiteSize?:Pair;biteAngle?:number;bendAngle?:number;sway?:{amplitude:number;period:number;phase:number};
  chain?:boolean;
  tuckedSize?:Pair;repeat?:{counts:readonly number[];step:Pair;bendStep?:readonly [number,number,number]};
}
export interface ScuteProfile { counts:readonly number[];spacing:number;start:number;taper:number;sections:number;
  height:{side:number;back:number};width:{side:number;back:number};cropOverlap:number;tuckWidth:number;tuckLength:number }
export const SCUTE_PROFILE:ScuteProfile={counts:[2,4,7],spacing:7.1,start:1.5,taper:.065,sections:3,
  height:{side:8.6,back:9},width:{side:5.7,back:6.5},cropOverlap:.003,tuckWidth:.85,tuckLength:.9};
export interface PartAttachment {
  label:string;color:string;deformation:Deformation;atlasRow:number;artwork?:'teeth'|'tail'|'gills'|'muscle';tiered:boolean;
  mount:string;animation:string;artStatus:'dedicated'|'shared-proxy';layers:readonly AttachmentLayer[];
  curve?:{path:'spine.dorsal';views:readonly AnatomyView[];profile:ScuteProfile};
  growthScale?:readonly number[];
  pulse?:{amplitude:number;period:number};
}
const all=['front','side','back'] as const,forward=['front','side'] as const,bilateral=['front','back'] as const;
const fin={size:[12,12] as Pair,sideSize:[13,11] as Pair,origin:[.91,.09] as Pair,backOrigin:[.09,.09] as Pair,tierScale:[.75,1,1.06],tuckedSize:[5,8] as Pair,bendAngle:.10};
const softTissueGrowth=[.72,.9,1,1];
const jaw={size:[6,1] as Pair,biteSize:[9,4] as Pair,origin:[.5,.92] as Pair,tierScale:[.78,.90,1]};
export const PART_ATTACHMENTS:Readonly<Record<AqPart,PartAttachment>>={
  fins:{label:'Fins',color:'#67ded0',deformation:'hinge',atlasRow:0,growthScale:softTissueGrowth,tiered:true,artStatus:'dedicated',
    mount:'Paired shoulder roots. Tier III adds a smaller pair at the pelvic roots; the side view shows the near pair.',
    animation:'Membranes hinge with the swim pose and fold close to the body during a dash.',layers:[
      {...fin,id:'shoulder-left',socket:'shoulder.left',views:all,angle:.10,sideAngle:.22,backAngle:-.12,backMirror:true,sway:{amplitude:.12,period:155,phase:0}},
      {...fin,id:'shoulder-right',socket:'shoulder.right',views:bilateral,angle:-.10,backAngle:.12,mirror:true,backMirror:false,sway:{amplitude:-.12,period:155,phase:0}},
      {...fin,id:'pelvis-left',socket:'pelvis.left',views:all,minTier:3,angle:.10,sideAngle:.22,backAngle:-.12,backMirror:true,sway:{amplitude:.12,period:155,phase:0},scale:[.65,.65]},
      {...fin,id:'pelvis-right',socket:'pelvis.right',views:bilateral,minTier:3,angle:-.10,backAngle:.12,mirror:true,backMirror:false,sway:{amplitude:-.12,period:155,phase:0},scale:[.65,.65]},
    ]},
  jaws:{label:'Jaws',color:'#efc7a0',deformation:'hinge',atlasRow:1,artwork:'teeth',tiered:true,artStatus:'dedicated',
    mount:'Teeth sit along the inner mouth seam. Tier II adds the upper row and Tier III adds corner fangs. Hidden from the rear.',
    animation:'The teeth spread apart with the painted chomp pose. The lower rows hinge at the chin into a V and the upper teeth hang into the opening.',layers:[
      {...jaw,id:'lower',socket:'mouth.lower',views:forward},
      {...jaw,id:'upper',socket:'mouth.upper',views:forward,minTier:2,scale:[1,.85]},
      {...jaw,id:'corner-left',socket:'mouth.corner.left',views:forward,minTier:3},
      {...jaw,id:'corner-right',socket:'mouth.corner.right',views:forward,minTier:3},
    ]},
  plates:{label:'Plates',color:'#e8b35c',deformation:'curve',atlasRow:2,growthScale:softTissueGrowth,tiered:true,artStatus:'dedicated',
    mount:'Side/back: dorsal midline from the nape toward the tail root. Front: overlapping protection down the center of the chest.',
    animation:'Overlapping tapered scutes follow the spine tangent and flex internally through bends; they streamline during dash.',
    curve:{path:'spine.dorsal',views:['side','back'],profile:SCUTE_PROFILE},layers:[
      {id:'chest',socket:'armor.front',views:['front'],size:[6,4],repeat:{counts:[2,3,4],step:[0,2.5],bendStep:[.18,0,.03]}},
    ]},
  gills:{label:'Gills',color:'#f49c9b',deformation:'surface',atlasRow:4,artwork:'gills',growthScale:softTissueGrowth,tiered:false,artStatus:'dedicated',
    mount:'Paired flank surfaces behind the head, on either side of the upper torso. Side view shows the near set of slits.',
    animation:'Remain flush with the flank while the body changes pose. A set of slim recessed gill slits follows the surface.',layers:[
      {id:'left',socket:'flank.left',views:all,size:[4,5],sideSize:[6,7],angle:-.12,sideAngle:.28},
      {id:'right',socket:'flank.right',views:bilateral,size:[4,5],angle:.12,mirror:true},
    ]},
  endurance:{label:'Endurance organ',color:'#ef9980',deformation:'surface',atlasRow:4,artwork:'muscle',growthScale:softTissueGrowth,tiered:false,artStatus:'dedicated',
    mount:'Abdominal muscle surface: underside in front/side views, central trunk in the rear view.',
    animation:'Moves with the trunk without dangling. Ribbed muscle fibers follow the belly and rear trunk.',layers:[
      {id:'muscle',socket:'abdomen',views:all,size:[5,7],sideSize:[10,5],sideAngle:-.08},
    ]},
  torrent:{label:'Torrent tail',color:'#ffc65d',deformation:'hinge',atlasRow:0,artwork:'tail',tiered:false,artStatus:'dedicated',
    mount:'Gold caudal fin fitted over the terminal tail membrane in each pose.',
    animation:'Follows the painted tail through turns and the dash tuck. The gold ridges catch the light. Fits remain provisional outside reviewed poses.',layers:[
      {id:'tail',socket:'tail.fin',views:all,size:[16,14]},
    ]},
  toxicTendrils:{label:'Toxic tendrils',color:'#cf91e9',deformation:'hinge',atlasRow:3,growthScale:softTissueGrowth,tiered:false,artStatus:'dedicated',
    mount:'Paired ventral roots below the torso, behind the main shoulder fins. Purple/green appendages trail away from those roots.',
    animation:'The rooted appendages flex in three linked sections, with more travel toward the ends.',layers:[
      {id:'left',socket:'ventral.left',views:all,size:[5,16],origin:[.71,.04],backOrigin:[.29,.04],angle:.16,sideAngle:.55,backAngle:.12,chain:true,bendAngle:.08,sway:{amplitude:.13,period:235,phase:0}},
      {id:'right',socket:'ventral.right',views:all,size:[5,16],origin:[.71,.04],backOrigin:[.29,.04],angle:-.16,sideAngle:.65,backAngle:-.12,mirror:true,chain:true,bendAngle:.08,sway:{amplitude:.13,period:235,phase:1.8}},
    ]},
  electricOrgan:{label:'Electric organ',color:'#a6f4f4',deformation:'surface',atlasRow:4,growthScale:softTissueGrowth,tiered:false,artStatus:'dedicated',
    mount:'A bioluminescent capsule integrated into the visible upper flank, behind the head and above the abdomen.',
    animation:'Stays on the flank and gently pulses. Reduced motion keeps its brightness steady.',pulse:{amplitude:.23,period:360},layers:[
      {id:'capsule',socket:'flank.left',views:all,size:[4,6],sideSize:[6,6],angle:-.16,sideAngle:-.44},
    ]},
};

// Organ definitions reference anatomical names, never body-specific coordinates.
import type { AqPart } from './tuning';
import type { AnatomyView } from './avatarVisual';
import type { RigSocketId } from './avatarRig';
export type Deformation='hinge'|'surface'|'curve';
type Pair=readonly [number,number];
export interface AttachmentLayer {
  id:string;socket:RigSocketId;views:readonly AnatomyView[];minTier?:number;
  size:Pair;sideSize?:Pair;origin?:Pair;mirror?:boolean;
  angle?:number;sideAngle?:number;scale?:Pair;tierScale?:readonly number[];
  biteSize?:Pair;sideBiteSize?:Pair;biteAngle?:number;bendAngle?:number;sway?:{amplitude:number;period:number;phase:number};
  tuckedSize?:Pair;repeat?:{counts:readonly number[];step:Pair;bendStep?:readonly [number,number,number]};
}
export interface ScuteProfile { counts:readonly number[];spacing:number;start:number;taper:number;sections:number;
  height:{side:number;back:number};width:{side:number;back:number};cropOverlap:number;tuckWidth:number;tuckLength:number }
export const SCUTE_PROFILE:ScuteProfile={counts:[2,4,7],spacing:7.1,start:1.5,taper:.065,sections:3,
  height:{side:8.6,back:9},width:{side:5.7,back:6.5},cropOverlap:.003,tuckWidth:.85,tuckLength:.9};
export interface PartAttachment {
  label:string;color:string;deformation:Deformation;atlasRow:number;tiered:boolean;
  mount:string;animation:string;artStatus:'dedicated'|'shared-proxy';layers:readonly AttachmentLayer[];
  curve?:{path:'spine.dorsal';views:readonly AnatomyView[];profile:ScuteProfile};
  pulse?:{amplitude:number;period:number};
}
const all=['front','side','back'] as const,forward=['front','side'] as const,bilateral=['front','back'] as const;
const fin={size:[9,13] as Pair,origin:[.85,.1] as Pair,tierScale:[.75,1,1],tuckedSize:[4,7] as Pair,bendAngle:.12};
const jaw={size:[8,4] as Pair,sideSize:[9,4] as Pair,tierScale:[.86,1,1.14],biteSize:[8,6] as Pair,sideBiteSize:[9,6] as Pair,biteAngle:.18};
export const PART_ATTACHMENTS:Readonly<Record<AqPart,PartAttachment>>={
  fins:{label:'Fins',color:'#67ded0',deformation:'hinge',atlasRow:0,tiered:true,artStatus:'dedicated',
    mount:'Paired shoulder roots. Tier III adds a smaller pair at the pelvic roots; the side view shows the near pair.',
    animation:'Membranes hinge with the swim pose and fold close to the body during a dash.',layers:[
      {...fin,id:'shoulder-left',socket:'shoulder.left',views:all,angle:.35,sideAngle:-.55},
      {...fin,id:'shoulder-right',socket:'shoulder.right',views:bilateral,angle:-.35,mirror:true},
      {...fin,id:'pelvis-left',socket:'pelvis.left',views:all,minTier:3,angle:.35,sideAngle:-.55,scale:[.65,.65]},
      {...fin,id:'pelvis-right',socket:'pelvis.right',views:bilateral,minTier:3,angle:-.35,mirror:true,scale:[.65,.65]},
    ]},
  jaws:{label:'Jaws',color:'#efc7a0',deformation:'hinge',atlasRow:1,tiered:true,artStatus:'dedicated',
    mount:'Lower mouth hinge; Tier II adds the upper hinge and Tier III adds mouth-corner fangs. Hidden from the rear.',
    animation:'Lower jaw opens on chomp. Upper jaw and corner fangs remain attached to their own mouth landmarks.',layers:[
      {...jaw,id:'lower',socket:'mouth.lower',views:forward},
      {...jaw,id:'upper',socket:'mouth.upper',views:forward,minTier:2,scale:[1,.65],angle:-.12,biteAngle:-.12},
      {...jaw,id:'corner-left',socket:'mouth.corner.left',views:forward,minTier:3,scale:[.3,.7],angle:-.3,biteAngle:-.3},
      {...jaw,id:'corner-right',socket:'mouth.corner.right',views:forward,minTier:3,scale:[.3,.7],angle:.3,biteAngle:.3},
    ]},
  plates:{label:'Plates',color:'#e8b35c',deformation:'curve',atlasRow:2,tiered:true,artStatus:'dedicated',
    mount:'Side/back: dorsal midline from the nape toward the tail root. Front: overlapping protection down the center of the chest.',
    animation:'Overlapping tapered scutes follow the spine tangent and flex internally through bends; they streamline during dash.',
    curve:{path:'spine.dorsal',views:['side','back'],profile:SCUTE_PROFILE},layers:[
      {id:'chest',socket:'armor.front',views:['front'],size:[6,8],repeat:{counts:[2,3,4],step:[0,6],bendStep:[.35,0,.035]}},
    ]},
  gills:{label:'Gills',color:'#f49c9b',deformation:'surface',atlasRow:4,tiered:false,artStatus:'shared-proxy',
    mount:'Paired flank surfaces behind the head, on either side of the upper torso. Side view shows two narrow gill bands.',
    animation:'Remain flush with the flank while the body changes pose. Dedicated gill illustrations are still needed.',layers:[
      {id:'left',socket:'flank.left',views:all,size:[2,6],angle:-.12,sideAngle:-.6},
      {id:'right',socket:'flank.right',views:all,size:[2,6],angle:.12,sideAngle:-.6,mirror:true},
    ]},
  endurance:{label:'Endurance organ',color:'#ef9980',deformation:'surface',atlasRow:4,tiered:false,artStatus:'shared-proxy',
    mount:'Abdominal muscle surface: underside in front/side views, central trunk in the rear view.',
    animation:'Moves with the trunk without dangling. Currently shares capsule artwork; a distinct muscle illustration is pending.',layers:[
      {id:'muscle',socket:'abdomen',views:all,size:[4,6],sideAngle:-.6},
    ]},
  torrent:{label:'Torrent tail',color:'#80bcef',deformation:'hinge',atlasRow:0,tiered:false,artStatus:'shared-proxy',
    mount:'Measured tail-fin junction in each individual pose, including the curled tail above the head in front view.',
    animation:'Follows the tail tip through left/neutral/right bends. Currently reuses a fin membrane illustration.',layers:[
      {id:'tail',socket:'tail.fin',views:all,size:[9,12],origin:[.85,.1]},
    ]},
  toxicTendrils:{label:'Toxic tendrils',color:'#cf91e9',deformation:'hinge',atlasRow:3,tiered:false,artStatus:'dedicated',
    mount:'Paired ventral roots below the torso, behind the main shoulder fins. Purple/green appendages trail away from those roots.',
    animation:'Rooted pendulum sway follows swimming; current motion is a whole-appendage hinge. A multi-joint chain remains future work.',layers:[
      {id:'left',socket:'ventral.left',views:all,size:[5,18],origin:[.5,.1],angle:-.15,bendAngle:.15,sway:{amplitude:.18,period:250,phase:0}},
      {id:'right',socket:'ventral.right',views:all,size:[5,18],origin:[.5,.1],angle:.15,bendAngle:.15,mirror:true,sway:{amplitude:.18,period:250,phase:1.8}},
    ]},
  electricOrgan:{label:'Electric organ',color:'#a6f4f4',deformation:'surface',atlasRow:4,tiered:false,artStatus:'dedicated',
    mount:'A bioluminescent capsule integrated into the visible upper flank, behind the head and above the abdomen.',
    animation:'Stays on the flank and gently pulses. Reduced motion keeps its brightness steady.',pulse:{amplitude:.12,period:400},layers:[
      {id:'capsule',socket:'flank.left',views:all,size:[4,9],angle:-.12,sideAngle:-.6},
    ]},
};

import type { BodyRig } from './avatarRig';
import type { AnatomyView } from './avatarVisual';
import type { Diet } from './creature';
import { tailRegion } from './attachmentFits';

type Rect=readonly [x:number,y:number,w:number,h:number];
interface FrameSource { rects:number[][];offsets:number[][] }
interface TailAtlas { canvas:HTMLCanvasElement;frames:Rect[] }

const VIEWS=['front','side','back'] as const;
const UNITS_TO_PIXELS=3;
const ENLARGEMENT=1.19;
export const torrentTextureKey=(bodyKey:string)=>bodyKey+'-torrent';
const MIN_ALPHA=16;
const atlases=new WeakMap<CanvasImageSource,TailAtlas>();

function finRegion(rig:BodyRig,diet:Diet,form:number,view:AnatomyView,pose:number){
  const frame=VIEWS.indexOf(view)*4+pose;
  const [x,y]=rig.poseLandmarks['tail.fin'][diet][frame];
  const region=tailRegion(rig,form,view,pose,{x,y,angle:rig.sockets['tail.fin'].angles?.[view]??0});
  return {...region,frame};
}

function patchBounds(region:ReturnType<typeof finRegion>):Rect {
  const {x,y,width,height,angle}=region;
  const cos=Math.abs(Math.cos(angle)),sin=Math.abs(Math.sin(angle));
  const rx=(width*cos+height*sin)*.77,ry=(width*sin+height*cos)*.77;
  const left=Math.floor((x-rx)*UNITS_TO_PIXELS),right=Math.ceil((x+rx)*UNITS_TO_PIXELS);
  const top=Math.floor((y-ry)*UNITS_TO_PIXELS),bottom=Math.ceil((y+ry)*UNITS_TO_PIXELS);
  return [left,top,right-left,bottom-top];
}

export function torrentPlacement(rig:BodyRig,diet:Diet,form:number,view:AnatomyView,pose:number){
  const region=finRegion(rig,diet,form,view,pose);
  const [x,y,w,h]=patchBounds(region);
  return {frame:region.frame,x:(x+w/2)/3,y:(y+h/2)/3,width:w/3,height:h/3};
}

// Reuse the actual painted membrane, including its silhouette and surface detail.
// A small per-sheet atlas is shared with previews and follows the source's lifetime.
export function torrentAtlas(image:CanvasImageSource,sheet:FrameSource,rig:BodyRig,form:number,diet:Diet):TailAtlas {
  const cached=atlases.get(image);
  if(cached)return cached;
  const regions=VIEWS.flatMap(view=>[0,1,2,3].map(pose=>finRegion(rig,diet,form,view,pose)));
  const bounds=regions.map(patchBounds);
  const packed:Rect[]=[];
  let rowTop=0;
  for(let row=0;row<3;row++){
    let columnLeft=0,rowHeight=0;
    for(const [,,w,h] of bounds.slice(row*4,row*4+4)){
      packed.push([columnLeft+1,rowTop+1,w,h]);
      columnLeft+=w+2;
      rowHeight=Math.max(rowHeight,h+2);
    }
    rowTop+=rowHeight;
  }
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(...packed.map(([x,,w])=>x+w+1));canvas.height=rowTop;
  const ctx=canvas.getContext('2d')!;
  const patch=document.createElement('canvas');
  bounds.forEach(([left,top,w,h],i)=>{
    patch.width=w;patch.height=h;
    const g=patch.getContext('2d',{willReadFrequently:true})!;
    const [sx,sy,sw,sh]=sheet.rects[i],[ox,oy]=sheet.offsets[i];
    g.drawImage(image,sx,sy,sw,sh,ox-left,oy-top,sw,sh);
    const pixels=g.getImageData(0,0,w,h),data=pixels.data,region=regions[i];
    const cx=region.x*3-left,cy=region.y*3-top;
    const cos=Math.cos(region.angle),sin=Math.sin(region.angle);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const p=(y*w+x)*4,alpha=data[p+3];
      if(alpha<MIN_ALPHA){data[p+3]=0;continue;}
      const dx=x-cx,dy=y-cy,along=(dx*cos+dy*sin)/(region.width*1.5),across=(-dx*sin+dy*cos)/(region.height*1.5);
      // Feather only along the join, leaving the underlying body color intact.
      const edge=Math.max(Math.abs(along),Math.abs(across));
      const mask=Math.max(0,Math.min(1,(1.10-edge)*6,(along+1.12)*7));
      data[p+3]=Math.round(alpha*mask);
      const luminance=(data[p]*.24+data[p+1]*.59+data[p+2]*.17)/255;
      const highlight=.13*Math.exp(-(((along-.1)*4)**2))*(.4+.6*luminance);
      const light=Math.min(1,luminance*.93+highlight+.15);
      data[p]=Math.round(105+150*light);
      data[p+1]=Math.round(52+200*light);
      data[p+2]=Math.round(10+208*light**2.45);
    }
    g.putImageData(pixels,0,0);
    const [x,y]=packed[i];
    const rootX=cx-cos*region.width*1.15,rootY=cy-sin*region.width*1.15;
    ctx.save();
    ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
    ctx.drawImage(patch,x+rootX*(1-ENLARGEMENT),y+rootY*(1-ENLARGEMENT),w*ENLARGEMENT,h*ENLARGEMENT);
    ctx.drawImage(patch,x,y);
    ctx.restore();
  });
  const atlas={canvas,frames:packed};
  atlases.set(image,atlas);
  return atlas;
}

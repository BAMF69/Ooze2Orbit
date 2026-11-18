// Render the small illustrated attachment atlas once. Both renderer backends
// share these frames, and the artwork has no dependency on the body palette.
export const FIT_ART_TEXTURE='aqFittedAttachments';
const CELL=128;
export const FIT_ART_FRAMES=Array.from({length:6},(_,i)=>[i*CELL,0,CELL,CELL] as const);

let atlas:HTMLCanvasElement|undefined;
export function fittedAttachmentAtlas():HTMLCanvasElement {
  if(atlas)return atlas;
  const canvas=document.createElement('canvas');
  canvas.width=CELL*FIT_ART_FRAMES.length;canvas.height=CELL;
  const ctx=canvas.getContext('2d')!;
  for(const [frame,teeth] of [[0,5],[1,4],[2,1],[3,3]] as const){
    ctx.save();ctx.translate(frame*CELL,0);
    const enamel=ctx.createLinearGradient(0,112,0,8);
    enamel.addColorStop(0,'#b99874');enamel.addColorStop(.38,'#f5dcb1');enamel.addColorStop(.9,'#fff6d7');
    for(let i=0;i<teeth;i++){
      const gap=frame===3?8:2;
      const x=8+i*112/teeth+gap*.5,w=112/teeth-gap;
      const tip=frame===3?16+i*12:frame===2?7:frame===0?23+Math.min(i,teeth-1-i)*13:44-i*8;
      const tooth=new Path2D(`M ${x} 119 Q ${x+1} ${tip+33} ${x+w*.65} ${tip} Q ${x+w} ${tip+49} ${x+w} 119 Z`);
      ctx.fillStyle=enamel;ctx.fill(tooth);
      ctx.strokeStyle='#99775c';ctx.lineWidth=1.5;ctx.stroke(tooth);
    }
    ctx.restore();
  }
  ctx.save();
  ctx.translate(4*CELL,0);
  ctx.lineCap='round';
  for(const x of [29,64,99]){
    const slit=new Path2D(`M ${x+4} 22 Q ${x-12} 57 ${x-3} 105`);
    ctx.strokeStyle='#702f37';ctx.lineWidth=11;ctx.stroke(slit);
    ctx.translate(5,1);ctx.strokeStyle='#e8977a';ctx.lineWidth=4;ctx.stroke(slit);ctx.translate(-5,-1);
    ctx.strokeStyle='#372331';ctx.lineWidth=4;ctx.stroke(slit);
  }
  ctx.restore();

  ctx.save();ctx.translate(5*CELL,0);
  const tissue=ctx.createRadialGradient(69,58,8,64,64,62);
  tissue.addColorStop(0,'#ffdb9e');tissue.addColorStop(.54,'#c87b5b');
  tissue.addColorStop(.83,'#814740cc');tissue.addColorStop(1,'#81474000');
  const belly=new Path2D('M10 64 Q22 16 58 11 Q100 7 118 53 Q109 111 64 119 Q26 114 10 64 Z');
  ctx.fillStyle=tissue;ctx.fill(belly);ctx.clip(belly);ctx.lineCap='round';
  for(const x of [33,52,72,91]){
    const fiber=new Path2D(`M ${x-6} 32 Q ${x+14} 65 ${x-2} 96`);
    ctx.lineWidth=7;ctx.strokeStyle='#8b494777';ctx.stroke(fiber);
    ctx.translate(4,0);ctx.lineWidth=3;ctx.strokeStyle='#ffe5b8a0';ctx.stroke(fiber);ctx.translate(-4,0);
  }
  ctx.restore();
  atlas=canvas;return canvas;
}

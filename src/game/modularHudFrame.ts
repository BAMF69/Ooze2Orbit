import components from './hudComponents.json';
import type * as Phaser from 'phaser';
const NS='http://www.w3.org/2000/svg';
export class ModularHudFrame {
 constructor(scene:Phaser.Scene,host:HTMLElement,kind:'strip'|'status'='strip'){
  const decor=document.createElement('div');decor.className=`quiet-hud-frame ${kind}`;decor.setAttribute('aria-hidden','true');host.prepend(decor);
  let previous='';
  const draw=()=>{
   const w=host.clientWidth,h=host.clientHeight,diet=document.body.dataset.overlayDiet??'omnivore',stage=document.body.classList.contains('aquatic-display')?'aquatic':'cell';
   const signature=`${w}:${h}:${diet}:${stage}`;if(!w||!h||signature===previous)return;previous=signature;
   const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.setAttribute('preserveAspectRatio','none');
   const path=document.createElementNS(NS,'path');
   const d=kind==='strip'?`M 20 5 Q ${w*.25} 1 ${w*.5} 5 T ${w-20} 5 Q ${w-5} 5 ${w-5} 22 L ${w-5} ${h-20} Q ${w-5} ${h-5} ${w-22} ${h-5} Q ${w*.72} ${h-1} ${w*.5} ${h-5} T 22 ${h-5} Q 5 ${h-5} 5 ${h-22} L 5 22 Q 5 5 20 5 Z`:
    `M 13 3 Q ${w*.55} 0 ${w-9} 5 Q ${w+2} ${h*.13} ${w*.84} ${h*.29} Q ${w*.7} ${h*.36} ${w*.67} ${h*.51} Q ${w*.64} ${h*.62} ${w*.56} ${h*.69} Q ${w*.49} ${h*.76} ${w*.52} ${h-12} Q ${w*.46} ${h+1} 13 ${h-5} Q 3 ${h-2} 4 ${h-20} L 4 16 Q 3 3 13 3 Z`;
   let outline=d;
   if(kind==='status'){
    const hostRect=host.getBoundingClientRect();
    const rows=[...host.querySelectorAll<HTMLElement>('.aquatic-vital,.dock-resource,.dock-middle')].filter(e=>e.getBoundingClientRect().height>0).map(e=>{const r=e.getBoundingClientRect();return {right:Math.min(w-5,r.right-hostRect.left+7),bottom:r.bottom-hostRect.top+2};}).sort((a,b)=>a.bottom-b.bottom);
    if(rows.length){outline=`M 12 3 Q ${w*.45} 0 ${rows[0].right-6} 4`;
      let previousRight=rows[0].right;
      for(const row of rows){outline+=` Q ${previousRight+3} ${row.bottom-5} ${row.right} ${row.bottom}`;previousRight=row.right;}
      outline+=` Q ${previousRight} ${h-5} ${w*.5} ${h-5} L 12 ${h-5} Q 4 ${h-5} 4 ${h-17} L 4 15 Q 4 3 12 3 Z`;
    }
   }
   path.setAttribute('d',outline);path.setAttribute('fill','var(--hud-cavity)');path.setAttribute('stroke','var(--hud-rim)');path.setAttribute('stroke-width','3');svg.append(path);
   const highlight=path.cloneNode() as SVGPathElement;highlight.setAttribute('fill','none');highlight.setAttribute('stroke','var(--hud-highlight)');highlight.setAttribute('stroke-width','.8');svg.append(highlight);
   const spec=components[`${stage}_${diet}` as keyof typeof components];
   const url=new URL(`assets/art/hud_${stage}_${diet}_components_v2.png`,document.baseURI).href;
   const piece=(bounds:number[],x:number,y:number,width:number,height:number,flip=false)=>{
    const tile=document.createElementNS(NS,'svg');tile.setAttribute('x',String(x));tile.setAttribute('y',String(y));tile.setAttribute('width',String(width));tile.setAttribute('height',String(height));tile.setAttribute('viewBox',bounds.join(' '));tile.setAttribute('preserveAspectRatio','xMidYMid meet');tile.setAttribute('overflow','hidden');
    const image=document.createElementNS(NS,'image');image.setAttribute('href',url);image.setAttribute('width',String(spec.width));image.setAttribute('height',String(spec.height));tile.append(image);
    if(flip){const group=document.createElementNS(NS,'g');group.setAttribute('transform',`translate(${2*x+width},0) scale(-1,1)`);group.append(tile);svg.append(group);}else svg.append(tile);
   };
   if(kind==='strip'){
    path.setAttribute('stroke','none');highlight.remove();
    const cap=h-4,span=w-cap*1.6;
    for(const y of [6,h-6]){
      const cord=document.createElementNS(NS,'path');cord.setAttribute('d',`M ${cap*.7} ${y} Q ${w*.3} ${y-3} ${w*.5} ${y} T ${w-cap*.7} ${y}`);cord.setAttribute('fill','none');cord.setAttribute('stroke','var(--hud-rim)');cord.setAttribute('stroke-width','4');svg.append(cord);
      const railWidth=Math.min(span*.7,170),railHeight=railWidth*spec.rail[3]/spec.rail[2];piece(spec.rail,w/2-railWidth/2,y-railHeight/2,railWidth,railHeight);
    }
    piece(spec.cap,1,2,cap,cap);piece(spec.cap,w-cap-1,2,cap,cap,true);
   }else{
    piece(spec.cap,0,2,22,40);
    const railWidth=Math.min(w*.6,130),rh=railWidth*spec.rail[3]/spec.rail[2];piece(spec.rail,20,1-rh/2,railWidth,rh);
   }
   decor.replaceChildren(svg);
  };
  const observer=new ResizeObserver(draw);observer.observe(host);const mutation=new MutationObserver(draw);mutation.observe(document.body,{attributes:true,attributeFilter:['data-overlay-diet','class']});draw();
  scene.events.once('shutdown',()=>{observer.disconnect();mutation.disconnect();});
 }
}

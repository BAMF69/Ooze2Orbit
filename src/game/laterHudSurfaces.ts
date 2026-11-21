// Painted anatomy stays proportional: only quiet inlays/edge runs expand.
// Live labels, hit targets and game state are native HTML, never baked into the art.
import './laterHudSurfaces.css';

const NS = 'http://www.w3.org/2000/svg';
type Rect = readonly [number, number, number, number];
export type LaterSurface = 'hero' | 'builder' | 'summons' | 'workers' | 'status' | 'window' | 'utility';
const RECTS: Record<LaterSurface, Rect> = {
  hero: [23,46,358,238], builder: [403,63,351,220], summons: [774,54,363,229], workers: [1155,63,361,219],
  status: [27,356,591,418], window: [657,399,848,310], utility: [180,785,716,147],
};
const DIET_RECTS:Record<string,{status:Rect;utility:Rect}>={
  carnivore:{status:[35,184,702,446],utility:[51,697,668,161]},
  omnivore:{status:[794,178,714,452],utility:[807,704,689,153]},
};
const svg = (tag: string, attrs: Record<string,string|number>) => {
  const el = document.createElementNS(NS,tag);
  for (const [k,v] of Object.entries(attrs)) el.setAttribute(k,String(v));
  return el;
};

/** Returns a disposer; scene shutdown must disconnect the one resize observer. */
export function laterSurface(host: HTMLElement, kind: LaterSurface, dietSource?: HTMLElement): () => void {
  const skin = document.createElement('span'); skin.className = `bio-skin bio-skin-${kind}`;
  skin.setAttribute('aria-hidden','true'); host.prepend(skin); host.classList.add('bio-host');
  let signature='';
  const draw = () => {
    const diet=dietSource?.dataset.diet??'herbivore';
    const alternate=(kind==='status'||kind==='utility')?DIET_RECTS[diet]?.[kind]:undefined;
    const file=new URL(`assets/art/${alternate?'hud_creature_diet_surfaces_v1.webp':'hud_creature_civ_surfaces_v1.webp'}`,document.baseURI).href;
    const w=skin.clientWidth,h=skin.clientHeight,key=`${w}:${h}:${diet}`;
    if (!w || !h || signature===key) return; signature=key;
    const out=svg('svg',{viewBox:`0 0 ${w} ${h}`,width:w,height:h,overflow:'visible'});
    const piece=(r:Rect,x:number,y:number,width:number,height:number) => {
      const tile=svg('svg',{x,y,width,height,viewBox:r.join(' '),preserveAspectRatio:'none',overflow:'hidden'});
      tile.append(svg('image',{href:file,width:1536,height:1024})); out.append(tile);
    };
    const strip=(r:Rect,height:number,cap:number) => {
      const end=Math.min(cap*height/r[3],w*.3);
      piece([r[0],r[1],cap,r[3]],0,0,end,height);
      piece([r[0]+cap,r[1],r[2]-cap*2,r[3]],end-.25,0,w-end*2+.5,height);
      piece([r[0]+r[2]-cap,r[1],cap,r[3]],w-end,0,end,height);
    };
    const r=alternate??RECTS[kind];
    if (kind==='status') {
      const scale=Math.min(w/r[2],h/r[3]);
      piece(r,0,0,r[2]*scale,r[3]*scale);
    } else if (kind==='utility') strip(r,h,130);
    else if (kind==='window') {
      const cap=72,scale=Math.min(1,w/360,h/(cap*4)),ex=cap*scale,ey=cap*scale;
      const sx=[r[0],r[0]+cap,r[0]+r[2]-cap],sy=[r[1],r[1]+cap,r[1]+r[3]-cap];
      const sw=[cap,r[2]-cap*2,cap],sh=[cap,r[3]-cap*2,cap];
      const dx=[0,ex,w-ex],dy=[0,ey,h-ey],dw=[ex,w-ex*2,ex],dh=[ey,h-ey*2,ey];
      for(let row=0;row<3;row++)for(let col=0;col<3;col++)piece([sx[col],sy[row],sw[col],sh[row]],dx[col]-.2,dy[row]-.2,dw[col]+.4,dh[row]+.4);
    } else {
      // Crest and base are independent: the crest scales uniformly with available width,
      // while the text capsule extends only across its unadorned middle.
      const baseY=170,baseH=104;
      strip([r[0],baseY,r[2],baseH],h,95);
      const maxScale=Number.parseFloat(getComputedStyle(host).getPropertyValue('--bio-crest-scale'))||.38;
      const crestH=baseY-r[1]+7,scale=Math.min(w/r[2],maxScale),cw=r[2]*scale,ch=crestH*scale;
      piece([r[0],r[1],r[2],crestH],(w-cw)/2,-ch+7,cw,ch);
    }
    skin.replaceChildren(out);
  };
  const observer=new ResizeObserver(draw); observer.observe(host); draw();
  const theme=new MutationObserver(draw);
  if(dietSource)theme.observe(dietSource,{attributes:true,attributeFilter:['data-diet']});
  return () => { observer.disconnect(); theme.disconnect(); skin.remove(); };
}

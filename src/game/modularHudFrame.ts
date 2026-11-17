// Independent transparent landmarks join continuous vector trim at authored attachment ports.
// No legacy frame slices, feather masks, image patterns or tiled connector textures.
import type * as Phaser from 'phaser';
const NS='http://www.w3.org/2000/svg';let sequence=0;
function el<K extends keyof SVGElementTagNameMap>(tag:K,attrs:Record<string,string|number>):SVGElementTagNameMap[K] {
  const n=document.createElementNS(NS,tag);for(const [key,value] of Object.entries(attrs))n.setAttribute(key,String(value));return n;
}
const COMPONENTS={
  herbivore:{key:'verdant',corner:[263,320,691,735],crest:[1277,518,904,1655],dark:'#293209',middle:'#7b8d26',light:'#d5e58e'},
  carnivore:{key:'scarlet',corner:[286,344,720,756],crest:[1327,486,964,1685],dark:'#421722',middle:'#9d3c42',light:'#e8b58e'},
  omnivore:{key:'solar',corner:[267,310,779,780],crest:[1329,534,960,1698],dark:'#453015',middle:'#a77d35',light:'#efd18a'},
} as const;
export class ModularHudFrame {
  constructor(scene:Phaser.Scene,host:HTMLElement) {
    const decor=document.createElement('div');decor.className='modular-hud-frame';decor.setAttribute('aria-hidden','true');host.prepend(decor);
    const id=`organic-component-frame-${++sequence}`;let previous='';
    const draw=()=>{
      const w=host.clientWidth,h=host.clientHeight,diet=document.body.dataset.overlayDiet as keyof typeof COMPONENTS;
      const spec=COMPONENTS[diet]??COMPONENTS.omnivore,signature=`${w}:${h}:${spec.key}`;
      if(w<1||h<1||signature===previous)return;previous=signature;
      const url=new URL(`assets/art/hud_components_${spec.key}_v1.png`,document.baseURI).href;
      const root=el('svg',{viewBox:`0 0 ${w} ${h}`,width:'100%',height:'100%',overflow:'visible'}),defs=el('defs',{});
      const fill=el('linearGradient',{id:`${id}-fill`,x1:0,y1:0,x2:0,y2:1});
      fill.append(el('stop',{offset:0,'stop-color':'var(--diet-top)'}),el('stop',{offset:1,'stop-color':'var(--diet-bottom)'}));defs.append(fill);root.append(defs);
      // The background follows the soft edge. Trim is one long curve per side, never a repeated tile.
      const panel=`M 26 10 C ${w*.28} 6 ${w*.35} 13 ${w*.5} 10 C ${w*.65} 7 ${w*.76} 14 ${w-26} 10 Q ${w-10} 9 ${w-10} 26 L ${w-10} ${h-26} Q ${w-9} ${h-10} ${w-26} ${h-10} C ${w*.7} ${h-6} ${w*.4} ${h-13} 26 ${h-10} Q 10 ${h-9} 10 ${h-26} L 10 26 Q 9 10 26 10 Z`;
      root.append(el('path',{d:panel,fill:`url(#${id}-fill)`}));
      const cornerSize=Math.min(80,Math.max(34,h*.6)),s=cornerSize/887;
      const [cx,cy,hx,vy]=spec.corner,xPort=10+(hx-cx)*s,yPort=10+(vy-cy)*s;
      const crestSize=h<80?58:86,cs=crestSize/887,[mx,my,ml,mr]=spec.crest;
      const leftPort=w/2+(ml-mx)*cs,rightPort=w/2+(mr-mx)*cs;
      const line=(d:string)=>{
        root.append(el('path',{d,fill:'none',stroke:spec.dark,'stroke-width':6,'stroke-linecap':'round','stroke-linejoin':'round'}),el('path',{d,fill:'none',stroke:spec.middle,'stroke-width':3.8,'stroke-linecap':'round'}),el('path',{d,fill:'none',stroke:spec.light,'stroke-width':1,'stroke-linecap':'round','stroke-opacity':.8,transform:'translate(0,-.8)'}));
      };
      line(`M ${xPort-2} 10 C ${w*.23} 2 ${w*.35} 15 ${leftPort+2} 10`);
      line(`M ${rightPort-2} 10 C ${w*.65} 4 ${w*.77} 16 ${w-xPort+2} 10`);
      line(`M ${xPort-2} ${h-10} C ${w*.3} ${h-15} ${w*.68} ${h-3} ${w-xPort+2} ${h-10}`);
      line(`M 10 ${yPort-2} C 5 ${h*.45} 15 ${h*.56} 10 ${h-yPort+2}`);
      line(`M ${w-10} ${yPort-2} C ${w-5} ${h*.43} ${w-15} ${h*.58} ${w-10} ${h-yPort+2}`);
      // Each bridge uses a complete long painted rail, not a tiny repeated texture sample.
      const railUrl=new URL(`assets/art/hud_rail_${spec.key}_v1.png`,document.baseURI).href;
      const railHeight=h<80?28:54;
      const rail=(left:number,right:number,y:number,flipX=false,flipY=false)=>{
        const width=right-left,group=el('g',{transform:`translate(${flipX?right:left} ${y}) scale(${flipX?-1:1} ${flipY?-1:1})`});
        const image=el('svg',{x:0,y:-railHeight*.533,width,height:railHeight,viewBox:'50 140 2070 430',preserveAspectRatio:'none',overflow:'hidden'});
        image.append(el('image',{href:railUrl,width:2172,height:724}));group.append(image);root.append(group);
      };
      rail(xPort-4,leftPort+4,10);rail(rightPort-4,w-xPort+4,10,true);
      rail(xPort-4,w/2+3,h-10,true,true);rail(w/2-3,w-xPort+4,h-10,false,true);
      // The source is a purpose-built sheet of whole objects with transparent margins around each.
      const sprite=(group:SVGGElement,x:number,y:number,width:number,height:number,viewBox:string)=>{
        const tile=el('svg',{x,y,width,height,viewBox,overflow:'hidden'});tile.append(el('image',{href:url,width:1774,height:887}));group.append(tile);
      };
      for(const [flipX,flipY] of [[false,false],[true,false],[true,true],[false,true]]) {
        const group=el('g',{transform:`translate(${flipX?w:0} ${flipY?h:0}) scale(${flipX?-1:1} ${flipY?-1:1})`});
        sprite(group,10-cx*s,10-cy*s,820*s,cornerSize,'0 0 820 887');root.append(group);
      }
      const crest=el('g',{});sprite(crest,w/2-(mx-850)*cs,10-my*cs,924*cs,887*cs,'850 0 924 887');root.append(crest);
      decor.replaceChildren(root);
    };
    const resize=new ResizeObserver(draw);resize.observe(host);const theme=new MutationObserver(draw);theme.observe(document.body,{attributes:true,attributeFilter:['data-overlay-diet']});draw();
    scene.events.once('shutdown',()=>{resize.disconnect();theme.disconnect();decor.remove();});
  }
}

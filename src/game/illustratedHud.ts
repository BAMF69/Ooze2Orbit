// Illustrated surface family for cell and aquatic. Gameplay and live content stay native.
import type * as Phaser from 'phaser';
import './illustratedHud.css';
import surfaceFamily from './illustratedHudSurfaces.json';

const NS = 'http://www.w3.org/2000/svg';
type Rect = readonly [number, number, number, number];
type SurfaceKind = 'strip'|'status'|'chamber'|'tab';
let iconSequence = 0;

/** These extend the game's native illustrated SVG symbols; text and state remain native. */
function symbol(kind: 'plant' | 'meat' | 'dash' | 'pause' | 'fullscreen' | 'defense' | 'mobility' | 'attack' | 'speed' | 'health' | 'stamina' | 'gardener' | 'breach' | 'rise' | 'sink' | 'pace' | 'electric'): SVGSVGElement {
  const id = `cell-proof-${++iconSequence}`;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 48 48'); svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('proof-icon');
  const defs = `<defs><linearGradient id="${id}-leaf" x2=".75" y2="1"><stop stop-color="#d5ee77"/><stop offset=".45" stop-color="#91bc40"/><stop offset="1" stop-color="#416c2b"/></linearGradient><linearGradient id="${id}-meat" x2=".6" y2="1"><stop stop-color="#f9a090"/><stop offset=".5" stop-color="#df6a64"/><stop offset="1" stop-color="#973e51"/></linearGradient></defs>`;
  const paths = {
    plant: `<path fill="url(#${id}-leaf)" d="M8 38C3 17 18 7 41 5C40 26 28 42 8 38Z"/><path stroke="#e9f7a9" stroke-width="1.4" fill="none" d="M8 38L33 12M17 28L16 18M24 21L35 20M12 34L25 34"/><path fill="none" stroke="#315432" stroke-width="2.5" d="M5 44L34 12"/>`,
    meat: `<path fill="#8b3d4b" d="M6 22C4 11 15 6 24 10C28 12 28 16 33 16C46 17 47 29 38 36C31 42 15 46 9 39C4 34 7 28 6 22Z"/><path fill="#efd0ae" d="M6 18C4 7 15 3 24 7C28 9 28 13 33 13C46 14 47 26 38 33C31 39 15 43 9 36C4 31 7 24 6 18Z"/><path fill="url(#${id}-meat)" d="M9 18C8 10 16 7 22 10C26 12 26 17 32 17C41 17 43 24 35 30C29 35 17 39 12 33C8 29 10 23 9 18Z"/><path fill="none" stroke="#783e42" stroke-width="3" d="M14 17L19 24M22 15L27 22M29 20L34 26"/><path fill="none" stroke="#f5b6a1" stroke-width="1.7" d="M12 30Q21 33 27 28M29 12Q27 17 34 20"/><path fill="none" stroke="#d78b78" stroke-width="1.5" d="M13 39Q24 42 35 35"/>`,
    dash: '<path fill="#69d8e5" stroke-width="1.5" d="M6 9L21 24L6 39H15L30 24L15 9ZM23 9L38 24L23 39H32L47 24L32 9Z"/>',
    pause: '<path fill="#f0e5d0" stroke="none" d="M13 10H21V38H13ZM28 10H36V38H28Z"/>',
    fullscreen: '<path fill="none" stroke="#f0e5d0" stroke-width="4" d="M8 19V9H18M30 9H40V19M40 29V39H30M18 39H8V29"/>',
    defense: '<path fill="#88ba5c" d="M24 4L41 11V25Q39 37 24 45Q9 37 7 25V11Z"/><path fill="#4e7d3e" stroke="#c8de8c" stroke-width="1.8" d="M24 10L35 15V25Q33 33 24 38Q15 33 13 25V15Z"/><path fill="#9cc575" stroke="none" d="M24 11V37Q16 32 14 25V16Z"/>',
    mobility: '<path fill="#9ecb6a" d="M6 38Q8 11 39 8Q37 31 6 38Z"/><path fill="#4b8958" d="M12 40Q24 22 44 23Q42 39 12 40Z"/><path fill="none" stroke="#e1eab1" stroke-width="1.5" d="M8 36L32 15M17 37L36 29"/>',
    attack: '<path fill="#e8a08c" d="M7 41Q8 19 17 5L18 27L29 3L27 25L41 7L35 34L24 40Z"/><path fill="none" stroke="#9c5365" stroke-width="2" d="M13 37L18 27M22 36L27 25M30 34L35 23"/>',
    health: '<path fill="#df827d" d="M24 42L7 25C-4 10 14 1 24 13C34 1 52 10 41 25Z"/><path fill="none" stroke="#f8b4a3" stroke-width="2" d="M8 20Q4 10 15 10"/>',
    stamina: '<path fill="#80d5df" d="M27 3L8 27H23L18 45L42 17H27L32 3Z"/>',
    gardener: '<path fill="none" stroke="#bad97d" stroke-width="3" d="M24 42V25"/><path fill="#97bd5e" d="M24 29Q4 30 4 9Q22 7 24 29ZM24 23Q23 4 43 5Q45 22 24 23Z"/>',
    breach: '<path fill="#94dce3" d="M9 26Q18 8 35 14L44 9L42 22L37 21Q21 33 9 26Z"/><path fill="none" stroke="#7bc7d2" stroke-width="2.3" d="M5 39Q10 34 15 39T25 39T35 39T45 39"/><circle cx="32" cy="17" r="1.8" fill="#0b2632"/>',
    rise: '<path fill="none" stroke="#e7e8ce" stroke-width="4" d="M24 40V9M11 22L24 9L37 22"/>',
    sink: '<path fill="none" stroke="#e7e8ce" stroke-width="4" d="M24 8V39M11 26L24 39L37 26"/>',
    pace: '<path fill="none" stroke="#d9cc73" stroke-width="3.5" d="M4 18Q10 12 17 18T30 18T44 18M4 30Q10 24 17 30T30 30T44 30"/>',
    electric: '<path fill="#b9b9ef" d="M28 3L9 27H24L18 45L42 17H27L33 3Z"/><path fill="none" stroke="#9099dd" stroke-width="2" d="M4 11L8 7M39 39L44 35"/>',
    speed: '<path fill="#e7a48f" d="M5 8L32 24L5 40L16 24ZM22 9L45 24L22 39L31 24Z"/>',
  };
  svg.innerHTML = `${defs}<g stroke="#102b31" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">${paths[kind]}</g>`;
  return svg;
}

/** Diet-specific crests grow out of the aquatic frame between its tabs. */
function aquaticTabCrest(): HTMLElement {
  const element=document.createElement('span');element.className='aquatic-shell-detail shell-detail-joint';
  element.setAttribute('aria-hidden','true');
  const id=`shell-crest-${++iconSequence}`;
  const kelp='<path d="M20 97Q10 85 21 66Q29 52 26 37Q24 20 38 4Q31 26 41 39Q51 50 43 66Q36 80 48 97Z"/><path d="M24 91Q8 78 12 60Q17 45 9 29Q31 43 25 65Q20 79 34 92Z"/><path d="M35 94Q54 82 50 62Q44 46 56 30Q50 51 59 68Q64 85 46 98Z"/><path class="shell-engraving" d="M29 90Q24 76 32 57Q39 41 33 25M22 81Q14 67 19 54M43 88Q56 77 53 64"/><ellipse cx="33" cy="81" rx="5" ry="7" fill="#796075" stroke="#33443f"/>';
  const fin='<path d="M17 96Q26 79 20 63Q13 51 12 30Q19 35 24 43L26 5Q35 24 39 42L49 22Q51 41 46 58L59 46Q55 74 45 95Z"/><path class="shell-engraving" d="M30 92Q30 61 28 17M34 92Q39 60 46 34M27 90Q23 65 18 41M39 92Q48 73 53 57"/><path class="shell-ridge" d="M18 97Q31 87 45 96"/>';
  const scutes='<path d="M32 100Q11 87 12 68L32 54L52 68Q53 87 32 100Z"/><path d="M32 78Q13 64 17 46L32 31L47 46Q51 64 32 78Z"/><path d="M32 55Q17 41 23 24L32 4L41 24Q47 41 32 55Z"/><path class="shell-engraving" d="M22 31Q23 39 32 46Q41 39 42 31M21 52Q22 62 32 69Q42 62 43 52M17 76Q21 86 32 92Q43 86 47 76"/><path class="shell-ridge" d="M32 12V42M32 43V64M32 68V87"/>';
  element.innerHTML=`<svg viewBox="0 0 64 104" aria-hidden="true"><defs><linearGradient id="${id}" x1=".1" y1="0" x2=".75" y2="1"><stop stop-color="var(--shell-light)"/><stop offset=".4" stop-color="var(--shell-mid)"/><stop offset="1" stop-color="var(--shell-shadow)"/></linearGradient></defs><g fill="url(#${id})" stroke="var(--shell-ink)" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"><g class="shell-herbivore">${kelp}</g><g class="shell-carnivore">${fin}</g><g class="shell-omnivore">${scutes}</g><path d="M17 96Q32 88 47 96L44 102H20Z"/></g></svg>`;
  return element;
}

export function decorateIllustratedUpgrade(scene: Phaser.Scene, button: HTMLButtonElement, stat: string): void {
  const icon = button.querySelector<HTMLElement>('.upgrade-symbol');
  if (!document.body.matches('.cell-display,.aquatic-display')) {
    if (icon?.dataset.originalSymbol && icon.querySelector('svg')) icon.textContent=icon.dataset.originalSymbol;
    button.querySelector('.upgrade-cost svg')?.remove(); return;
  }
  if (icon && !icon.querySelector('svg') && ['attack','speed','defense','mobility','health'].includes(stat)) { icon.dataset.originalSymbol=icon.textContent??''; icon.replaceChildren(symbol(stat as 'attack'|'speed'|'defense'|'mobility'|'health')); }
  const cost = button.querySelector<HTMLElement>('.upgrade-cost');
  if (cost && !cost.querySelector('svg')) {
    const diet = button.dataset.upgradeDiet;
    cost.prepend(...(diet === 'omnivore' ? [symbol('plant'),symbol('meat')] : [symbol(diet === 'carnivore' ? 'meat' : 'plant')]));
  }
  if (!button.querySelector('.proof-skin')) {
    const observers: ResizeObserver[] = []; addSurface(button, 'chamber', observers,scene);
    scene.events.once('shutdown', () => observers.forEach(observer => observer.disconnect()));
  }
}

function addSurface(host: HTMLElement, type: SurfaceKind, observers: ResizeObserver[], scene?: Phaser.Scene): void {
  const skin = document.createElement('span'); skin.className = `proof-skin proof-skin-${type}`;
  skin.setAttribute('aria-hidden','true'); host.prepend(skin); let signature='';
  const draw=()=>{
    const stage=document.body.classList.contains('aquatic-display')?'aquatic':'cell';
    const diet=host.dataset.formDiet??host.dataset.upgradeDiet??document.body.dataset.overlayDiet??'omnivore';
    const key=`${stage}_${diet}` as keyof typeof surfaceFamily;
    const spec=surfaceFamily[key]??surfaceFamily.cell_omnivore, surface=spec.surfaces[type];
    const w=host.clientWidth,h=host.clientHeight,next=`${w}:${h}:${key}`;
    if(!w||!h||next===signature)return;signature=next;
    const src=surface.rect as unknown as Rect;
    const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.setAttribute('preserveAspectRatio','none');
    const piece=(rect:Rect,x:number,y:number,width:number,height:number)=>{
      const tile=document.createElementNS(NS,'svg');tile.setAttribute('x',String(x));tile.setAttribute('y',String(y));tile.setAttribute('width',String(width));tile.setAttribute('height',String(height));tile.setAttribute('viewBox',rect.join(' '));tile.setAttribute('preserveAspectRatio','none');tile.setAttribute('overflow','hidden');
      const clipId=`surface-clip-${++iconSequence}`,defs=document.createElementNS(NS,'defs'),clip=document.createElementNS(NS,'clipPath'),polygon=document.createElementNS(NS,'polygon');clip.id=clipId;clip.setAttribute('clipPathUnits','userSpaceOnUse');polygon.setAttribute('points',surface.clip);clip.append(polygon);defs.append(clip);tile.append(defs);
      const image=document.createElementNS(NS,'image');image.setAttribute('href',new URL(`assets/art/${spec.file}`,document.baseURI).href);image.setAttribute('width',String(spec.width));image.setAttribute('height',String(spec.height));image.setAttribute('clip-path',`url(#${clipId})`);tile.append(image);svg.append(tile);
    };
    if(type==='status'){
      // Preserve detailed top/foot anatomy; the quiet middle accommodates row height.
      const cap=src[3]*.24,end=Math.min(cap*w/src[2],h*.3);
      piece([src[0],src[1],src[2],cap],0,0,w,end);
      piece([src[0],src[1]+cap-1,src[2],src[3]-cap*2+2],0,end-.25,w,h-end*2+.5);
      piece([src[0],src[1]+src[3]-cap,src[2],cap],0,h-end,w,end);
    }else if(type==='chamber' && host.classList.contains('upgrade-card')){
      // Tall cards need proportional corners; extending a whole capsule end distorts its anatomy.
      const cx=140,cy=src[3]*.28,scale=Math.min(h/src[3],w/(cx*2.6));
      const ex=cx*scale,ey=cy*scale;
      const sx=[src[0],src[0]+cx,src[0]+src[2]-cx],sy=[src[1],src[1]+cy,src[1]+src[3]-cy];
      const sw=[cx,src[2]-cx*2,cx],sh=[cy,src[3]-cy*2,cy];
      const dx=[0,ex,w-ex],dy=[0,ey,h-ey],dw=[ex,w-ex*2,ex],dh=[ey,h-ey*2,ey];
      for(let row=0;row<3;row++)for(let col=0;col<3;col++)piece([sx[col],sy[row],sw[col],sh[row]],dx[col]-.15,dy[row]-.15,dw[col]+.3,dh[row]+.3);
    }else{
      const cap=type==='strip'?250:140,end=Math.min(cap*h/src[3],w*.28);
      piece([src[0],src[1],cap,src[3]],0,0,end,h);
      piece([src[0]+cap-1,src[1],src[2]-cap*2+2,src[3]],end-.3,0,w-end*2+.6,h);
      piece([src[0]+src[2]-cap,src[1],cap,src[3]],w-end,0,end,h);
    }
    skin.replaceChildren(svg);
  };
  const resize=new ResizeObserver(draw);resize.observe(host);observers.push(resize);
  const theme=new MutationObserver(draw);theme.observe(document.body,{attributes:true,attributeFilter:['data-overlay-diet','class']});theme.observe(host,{attributes:true,attributeFilter:['data-form-diet','data-upgrade-diet']});draw();
  scene?.events.once('shutdown',()=>theme.disconnect());
}

export function installIllustratedHud(scene: Phaser.Scene, root: HTMLElement, strip: HTMLElement, status: HTMLElement): { dash: (text: string, available: boolean) => void } | undefined {
  if (!root.matches('.cell-overlay-hud,.aquatic-remaster')) return;
  root.classList.add('illustrated-organic-hud');
  if(root.classList.contains('aquatic-remaster')){
    const tabs=root.querySelector('.dock-tabs');
    for(const position of ['one','two']){const joint=aquaticTabCrest();joint.classList.add(`shell-joint-${position}`);tabs?.append(joint);}
  }
  const observers: ResizeObserver[] = [];
  addSurface(strip, 'strip', observers,scene); addSurface(status, 'status', observers,scene);
  const gardener=status.querySelector<HTMLElement>('.dock-gardener');
  if(gardener)addSurface(gardener,'tab',observers,scene);
  root.querySelectorAll<HTMLElement>('.growth-section').forEach(section => addSurface(section, 'chamber', observers,scene));
  root.querySelectorAll<HTMLButtonElement>('.dock-tabs button').forEach(button => addSurface(button, 'tab', observers,scene));
  for (const kind of ['plant', 'meat'] as const) {
    const row = status.querySelector<HTMLElement>(`.dock-resource.${kind === 'plant' ? 'algae' : 'meat'}`);
    row?.prepend(symbol(kind));
  }
  for(const kind of ['health','stamina'] as const)status.querySelector(`.aquatic-vital.${kind}`)?.prepend(symbol(kind));
  status.querySelector('.dock-gardener')?.prepend(symbol('gardener'));
  const dash = status.querySelector<HTMLElement>('.dock-dash')!;
  const originalText = document.createElement('span'); originalText.className = 'proof-original-dash';
  for (const node of [...dash.childNodes]) if (node.nodeType === Node.TEXT_NODE) originalText.append(node);
  const state = document.createElement('span'); state.className = 'proof-dash-state';
  dash.prepend(symbol('dash'), originalText, state);
  for (const [selector, kind] of [['.organic-pause', 'pause'], ['.organic-fullscreen', 'fullscreen']] as const) {
    const button = root.querySelector<HTMLButtonElement>(selector);
    if (button) { const text = document.createElement('span'); text.className = 'proof-original-system'; text.append(...button.childNodes); button.append(text, symbol(kind)); }
  }
  const decorateTouch = () => {
    const aquatic=root.classList.contains('aquatic-remaster');
    const mapping={dash:'dash',jump:aquatic?'breach':'dash',rise:'rise',sink:'sink',pace:'pace',electric:'electric'} as const;
    document.querySelectorAll<HTMLButtonElement>('.touch-controls [data-touch-action]').forEach(button=>{
      const kind=mapping[button.dataset.touchAction as keyof typeof mapping];
      if(kind&&!button.querySelector('.proof-icon'))button.prepend(symbol(kind));
    });
  };
  const touchObserver = new MutationObserver(decorateTouch); touchObserver.observe(document.body, { childList: true }); decorateTouch();
  scene.events.once('shutdown', () => { observers.forEach(observer => observer.disconnect()); touchObserver.disconnect(); });
  return { dash: (text, available) => { if (state.textContent !== text) state.textContent = text; dash.classList.toggle('proof-locked', !available); } };
}

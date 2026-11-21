// Creature-only presentation. Simulation and modal actions remain in the scene/StageUi.
import type * as Phaser from 'phaser';
import { shell } from '../../shell/app';
import { TouchControls } from '../../shell/touchControls';
import type { StageAction, StageUi } from '../stageUi';
import { laterSurface } from '../laterHudSurfaces';
import './hud.css';

export interface CreatureHudState {
  hp:number; maxHp:number; food:number; air:number; airMax:number; submerged:boolean; gills:boolean;
  cargo:number; diet:string; location:string; generation:number; available:boolean;
  roomIdentity?:string;
  netReady?:boolean; sealedThreats?:number;
}
const node=(tag:string,cls='')=>{const n=document.createElement(tag);n.className=cls;return n;};
const put=(n:HTMLElement,s:string)=>{if(n.textContent!==s)n.textContent=s;};
const SHAPES:Record<string,string>={
  health:'<path fill="#db7c79" d="M16 28 4 16C-3 5 10 0 16 9 22 0 35 5 28 16Z"/>',
  food:'<path fill="#a1bf55" d="M5 27Q0 7 28 4 29 24 5 27Z"/><path fill="none" stroke="#e2e8a4" d="M4 29 24 8M12 20 11 12M17 15 25 16"/>',
  cargo:'<path fill="#ba8c50" d="M7 10h19l3 18H3Z"/><path fill="none" stroke="#f0d8a1" stroke-width="2" d="M11 12V5h10v7M4 17h24M15 15v7h5v-7"/>',
  air:'<circle cx="16" cy="18" r="10" fill="#75bec9"/><circle cx="26" cy="4" r="3" fill="#a5dce1"/>',
  meat:'<path fill="#edc6a6" d="M5 17C1 8 10 3 17 6 21 7 20 11 25 12 34 15 30 23 23 27 14 32 5 28 5 22Z"/><path fill="#ca716c" d="M8 17C4 10 10 6 15 9 20 11 18 14 24 15 29 16 27 22 21 24 14 28 8 25 8 21Z"/><path fill="none" stroke="#f5b6a1" stroke-width="1.6" d="M10 13 15 18M17 12 22 18M11 22Q15 25 21 21"/>',
};
function icon(kind:string):HTMLElement{const n=node('span','creature-meter-icon');n.setAttribute('aria-hidden','true');n.innerHTML=`<svg viewBox="0 0 32 32" stroke="#14272a" stroke-width="1.5" stroke-linejoin="round">${SHAPES[kind]}</svg>`;return n;}
export class CreatureHud {
  private hp=node('strong'); private food=node('strong'); private cargo=node('strong'); private air=node('strong');
  private airChip=node('div','creature-air'); private cargoChip=node('div','creature-cargo');
  private objective=node('div','creature-objective');
  private location=node('div','creature-info-location');
  private breadcrumb=node('div','creature-breadcrumb');
  private utility=node('div','creature-utility'); private commands=node('div','creature-commands');
  private info!:HTMLButtonElement;
  private foodIcon=icon('food');
  private diet='';
  private buttons=new Map<string,HTMLButtonElement>();
  private disposers:(()=>void)[]=[];
  private touch:TouchControls;
  constructor(scene:Phaser.Scene,private ui:StageUi){
    ui.root.classList.add('creature-painted');
    const metrics=node('div','creature-vitals'),life=node('div'),food=node('div');
    life.setAttribute('role','group');life.setAttribute('aria-label','Health');food.setAttribute('role','group');food.setAttribute('aria-label','Food');
    this.airChip.setAttribute('role','group');this.airChip.setAttribute('aria-label','Air remaining');
    life.append(icon('health'),this.hp);food.append(this.foodIcon,this.food);metrics.append(life,food);
    this.cargoChip.append(icon('cargo'),this.cargo);this.airChip.append(icon('air'),this.air);
    const readouts=node('div','creature-readouts');readouts.append(this.breadcrumb,this.cargoChip,this.airChip,this.objective);
    ui.status.append(metrics,readouts);this.disposers.push(laterSurface(ui.status,'status',ui.root));
    ui.footer.append(this.utility,this.commands);
    const details=ui.details.closest('details')!;
    ui.details.before(this.location);
    this.info=this.button('info','Info',()=>{details.open=!details.open;shell.input.clearHeld();});
    this.utility.append(this.info); this.disposers.push(laterSurface(this.info,'utility',ui.root));
    details.addEventListener('toggle',()=>this.info.setAttribute('aria-expanded',String(details.open)));
    this.info.setAttribute('aria-expanded','false');this.info.setAttribute('aria-controls','creature-information');details.id='creature-information';
    this.touch=new TouchControls(shell.input,[
      {label:'Use',description:'Use or study',action:'interact'},
      {label:'Jump',description:'Jump or swim up',action:'jump'},
      {label:'Bite',description:'Bite',action:'attack'},
    ]);
    this.touch.root.classList.add('creature-touch');
    scene.events.on('pause',this.touch.suspend,this.touch);
    scene.events.once('shutdown',()=>{scene.events.off('pause',this.touch.suspend,this.touch);this.touch.destroy();this.disposers.forEach(d=>d());});
  }
  private button(id:string,label:string,run:()=>void):HTMLButtonElement{
    const b=document.createElement('button');b.type='button';b.dataset.action=id;b.textContent=label;
    b.onclick=e=>{if(e.detail>0)b.blur();if(shell.topId==='play')run();};return b;
  }
  actions(actions:readonly StageAction[]):void{
    let added=false;
    for(const a of actions){
      let b=this.buttons.get(a.id);
      if(!b){b=this.button(a.id,a.label,a.run);this.buttons.set(a.id,b);added=true;
        const utility=a.id==='journal'||a.id==='gardener';
        (utility?this.utility:this.commands).append(b);if(utility)this.disposers.push(laterSurface(b,'utility',this.ui.root));
      }
      // Keep the skin subtree intact while labels and state remain live.
      let label=b.querySelector('span.creature-button-label');
      if(!label){for(const child of [...b.childNodes])if(child.nodeType===Node.TEXT_NODE)child.remove();label=node('span','creature-button-label');b.append(label);}
      put(label as HTMLElement,a.label);b.disabled=a.disabled??false;
      b.onclick=e=>{if(e.detail>0)b!.blur();if(shell.topId==='play')a.run();};
    }
    if(added)for(const id of ['journal','gardener','info']){const b=id==='info'?this.info:this.buttons.get(id);if(b)this.utility.append(b);}
  }
  update(s:CreatureHudState):void{
    put(this.hp,`${s.hp} / ${s.maxHp}`);put(this.food,`${s.food}%`);put(this.cargo,`${s.cargo} unbanked`);put(this.air,`${Math.ceil(s.air)}s`);
    this.ui.status.title=`G${s.generation} · ${s.location}`;
    put(this.location,`G${s.generation} · ${s.location}`);
    put(this.breadcrumb,s.roomIdentity??s.location);this.breadcrumb.title=`G${s.generation} · ${s.location}`;
    if(this.diet!==s.diet){
      this.diet=s.diet;this.ui.root.dataset.diet=s.diet;
      const shapes=s.diet==='carnivore'?SHAPES.meat:s.diet==='omnivore'?`<g transform="scale(.7)">${SHAPES.food}</g><g transform="translate(10 10) scale(.7)">${SHAPES.meat}</g>`:SHAPES.food;
      this.foodIcon.innerHTML=`<svg viewBox="0 0 32 32" stroke="#14272a" stroke-width="1.5" stroke-linejoin="round">${shapes}</svg>`;
    }
    this.airChip.hidden=!s.submerged||s.gills;this.airChip.classList.toggle('urgent',s.air<s.airMax*.25);
    put(this.objective,[s.netReady?'Net ready':'',s.sealedThreats!==undefined?`Sealed · ${s.sealedThreats} threats`:''].filter(Boolean).join(' · '));
    this.objective.hidden=!this.objective.textContent;
    this.ui.status.classList.toggle('low-health',s.hp<=s.maxHp*.3);
    this.touch.update(s.available&&!this.ui.detailsOpen);
  }
  suspend():void{this.touch.suspend();}
}

// Offline developer workbench. Not imported by the game; bundled separately with the actual rig/compiler.
import { AQ_PARTS, UNIQUE_PARTS, type AqPart } from '../game/aquatic/tuning';
import { creatureFromLineage, type AqCreature, type Diet, type LookFamily } from '../game/aquatic/creature';
import { chestPlatesVisible, dorsalFit, surfaceFitData } from '../game/aquatic/surfaceAttachmentFits';
import { attachmentFitData, torrentVisible } from '../game/aquatic/attachmentFits';
import { PART_ATTACHMENTS } from '../game/aquatic/attachmentSchema';
import { rigSocket } from '../game/aquatic/avatarRig';
import { drawCanvasAvatar, type AvatarImages } from '../game/aquatic/avatarCanvas';
import type { OrganPlacement } from '../game/aquatic/organPlacements';
import type { AnatomyView } from '../game/aquatic/avatarVisual';
import { evolutionProfile } from '../game/aquatic/evolutionArt';
import { spineSample } from '../game/aquatic/spineArticulation';

const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const selected=new Set<AqPart>(['plates']);
const tiers:Partial<Record<AqPart,number>>={fins:3,jaws:3,plates:3};
const state={diet:'omnivore' as Diet,family:'adaptable' as LookFamily,form:3,focus:'plates' as AqPart,playing:true,clock:0,pose:1,manual:1,
  action:'swim',speed:.5,reduced:false,tucked:false,markers:true,labels:false,bounds:false,view:'all'};
const profile=()=>evolutionProfile(state.family,state.form)!;
let creature:AqCreature=creatureFromLineage(null,'omnivore');
const checkboxes=new Map<AqPart,HTMLInputElement>();
const cards=new Map<AqPart,HTMLElement>();
const surfaces=(['front','side','back'] as const).map(view=>{
  const card=document.createElement('section');card.className='view-card';card.dataset.view=view;
  const title=document.createElement('h2');title.textContent=`${view==='side'?'Right side':view[0].toUpperCase()+view.slice(1)} view`;
  const badge=document.createElement('span');badge.className='view-status';
  const canvas=document.createElement('canvas');canvas.width=canvas.height=768;canvas.dataset.view=view;canvas.setAttribute('aria-label',`${view} avatar inspection`);
  const small=document.createElement('canvas');small.width=small.height=128;small.className='game-size';small.setAttribute('aria-label',`${view} small-size preview`);
  const caption=document.createElement('p');caption.className='size-note';caption.textContent='Small-size check';
  card.append(title,badge,canvas,small,caption);$('views').append(card);return {view,card,badge,canvas,small};
});
function rebuild():void {
  creature={...creatureFromLineage(null,state.diet),form:state.form,
    parts:[...selected].filter(p=>!UNIQUE_PARTS.includes(p)),uniques:[...selected].filter(p=>UNIQUE_PARTS.includes(p)),partTiers:{...tiers}};
  for(const part of AQ_PARTS){checkboxes.get(part)!.checked=selected.has(part);cards.get(part)!.classList.toggle('focused',state.focus===part);}
  const definition=PART_ATTACHMENTS[state.focus];
  $('focus-name').textContent=definition.label;$('focus-name').style.color=definition.color;
  $('mount-description').textContent=definition.mount;$('motion-description').textContent=definition.animation;
  $('focus-status').textContent=`${selected.has(state.focus)?'Visible':'Hidden â€” expected mounts can still be inspected'} Â· ${definition.deformation} attachment${definition.artStatus==='shared-proxy'?' Â· shared artwork':''}`;
  $('capacity').textContent=`${creature.parts.length}/3 normal parts Â· ${creature.uniques.length}/2 river organs${creature.parts.length>3?' Â· diagnostic overcapacity':''}`;
  $('form-note').textContent=profile().label+' Â· '+profile().attachmentStatus+' attachment fits';
  $('rig-name').textContent=profile().rig.id;
}
for(const part of AQ_PARTS){
  const definition=PART_ATTACHMENTS[part],card=document.createElement('article');card.className='part-card';card.dataset.part=part;card.style.setProperty('--part-color',definition.color);
  const head=document.createElement('div');head.className='part-heading';
  const label=document.createElement('label'),checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.dataset.part=part;checkbox.setAttribute('aria-label',`Show ${definition.label}`);
  const name=document.createElement('strong');name.textContent=definition.label;label.append(checkbox,name);checkboxes.set(part,checkbox);
  checkbox.onchange=()=>{if(checkbox.checked)selected.add(part);else selected.delete(part);state.focus=part;rebuild();};
  const solo=document.createElement('button');solo.textContent='Solo';solo.setAttribute('aria-label',`Solo ${definition.label}`);
  solo.onclick=()=>{selected.clear();selected.add(part);state.focus=part;rebuild();};
  head.append(label,solo);card.append(head);
  if(definition.tiered){
    const tier=document.createElement('select');tier.setAttribute('aria-label',`${definition.label} tier`);
    [1,2,3].forEach(n=>{const option=document.createElement('option');option.value=String(n);option.textContent=`Tier ${['I','II','III'][n-1]}`;tier.append(option);});
    tier.value=String(tiers[part]);tier.onchange=()=>{tiers[part]=Number(tier.value);state.focus=part;rebuild();};head.append(tier);
  }
  const mount=document.createElement('p');mount.textContent=definition.mount;card.append(mount);
  const footer=document.createElement('div');footer.className='part-footer';
  const badge=document.createElement('span');badge.className='tag';badge.textContent=definition.artStatus==='dedicated'?definition.deformation:'Shared artwork';
  const inspect=document.createElement('button');inspect.className='quiet';inspect.textContent='Inspect mounts';inspect.setAttribute('aria-label',`Inspect ${definition.label} mounts`);
  inspect.onclick=()=>{state.focus=part;state.markers=true;($('markers') as HTMLInputElement).checked=true;rebuild();};
  footer.append(badge,inspect);card.append(footer);$('parts').append(card);cards.set(part,card);
}
$('show-all').onclick=()=>{AQ_PARTS.forEach(p=>selected.add(p));rebuild();};
$('hide-all').onclick=()=>{selected.clear();rebuild();};
$('reset').onclick=()=>{
  selected.clear();selected.add('plates');tiers.fins=tiers.jaws=tiers.plates=3;
  Object.assign(state,{focus:'plates',diet:'omnivore',family:'adaptable',form:3,action:'swim',reduced:false,playing:true,clock:0,manual:1,pose:1,speed:.5,markers:true,labels:false,bounds:false,view:'all'});
  for(const [id,value] of [['family','adaptable'],['diet','omnivore'],['form','3'],['action','swim'],['speed','0.5'],['view','all']])($<HTMLSelectElement>(id)).value=value;
  for(const key of ['markers','labels','bounds','reduced'] as const)$<HTMLInputElement>(key).checked=state[key];
  for(const part of ['fins','jaws','plates'])document.querySelector<HTMLSelectElement>(`select[aria-label="${PART_ATTACHMENTS[part as AqPart].label} tier"]`)!.value='3';
  surfaces.forEach(s=>s.card.hidden=false);$('views').classList.remove('single');$('play').textContent='Pause';rebuild();
};
$<HTMLSelectElement>('family').onchange=e=>{state.family=(e.target as HTMLSelectElement).value as LookFamily;rebuild();};
($('diet') as HTMLSelectElement).onchange=e=>{state.diet=(e.target as HTMLSelectElement).value as Diet;rebuild();};
($('form') as HTMLSelectElement).onchange=e=>{state.form=Number((e.target as HTMLSelectElement).value);rebuild();};
($('view') as HTMLSelectElement).onchange=e=>{state.view=(e.target as HTMLSelectElement).value;surfaces.forEach(s=>s.card.hidden=state.view!=='all'&&state.view!==s.view);$('views').classList.toggle('single',state.view!=='all');};
($('action') as HTMLSelectElement).onchange=e=>{state.action=(e.target as HTMLSelectElement).value;};
($('speed') as HTMLSelectElement).onchange=e=>{state.speed=Number((e.target as HTMLSelectElement).value);};
$('play').onclick=()=>{if(state.playing)state.manual=state.pose;state.playing=!state.playing;$('play').textContent=state.playing?'Pause':'Resume';};
$('step').onclick=()=>{state.playing=false;state.manual=(state.pose+1)%4;state.action='swim';($('action') as HTMLSelectElement).value='swim';$('play').textContent='Resume';};
for(const key of ['markers','labels','bounds','reduced'] as const)($<HTMLInputElement>(key)).onchange=e=>{state[key]=(e.target as HTMLInputElement).checked;};
function download(name:string,value:unknown):void {
  const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$('export-schema').onclick=()=>download('aquatic-attachment-schema-v1.json',{version:1,rig:profile().rig,fits:{...attachmentFitData(profile().rig,state.form),surfaces:surfaceFitData(profile().rig,state.form),dorsal:dorsalFit(profile().rig)},attachments:PART_ATTACHMENTS});
$('export-setup').onclick=()=>download('avatar-inspection-setup.json',{version:2,rigId:profile().rig.id,...state,parts:[...selected],tiers});

function overlay(ctx:CanvasRenderingContext2D,placements:OrganPlacement[],view:AnatomyView):void {
  const definition=PART_ATTACHMENTS[state.focus],color=definition.color;
  ctx.save();ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=.35;
  if(state.bounds)for(const mount of placements.filter(p=>p.part===state.focus)){
    ctx.save();ctx.translate(mount.x,mount.y);ctx.rotate(mount.angle);ctx.scale(mount.flip?-1:1,1);
    ctx.strokeRect(-mount.ox*mount.width,((mount.cropY??0)-mount.oy)*mount.height,mount.width,(mount.cropHeight??1)*mount.height);
    ctx.restore();
  }
  if(state.markers&&(state.focus!=='torrent'||torrentVisible(profile().rig,state.form,view))){
    const pose=state.tucked||(state.reduced&&state.pose!==3)?1:state.pose;
    const sockets=new Set(definition.layers.filter(l=>l.views.includes(view)&&(l.minTier??1)<=(tiers[state.focus]??1)).map(l=>l.socket));
    for(const id of sockets){
      if(id==='armor.front'&&!chestPlatesVisible(profile().rig,view,pose))continue;
      const point=rigSocket(profile().rig,creature,view,pose,id);
      ctx.beginPath();ctx.arc(point.x,point.y,1.1,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(point.x-2,point.y);ctx.lineTo(point.x+2,point.y);ctx.moveTo(point.x,point.y-2);ctx.lineTo(point.x,point.y+2);ctx.stroke();
      if(state.labels)text(ctx,profile().rig.sockets[id].label,point.x+3,point.y-2,color);
    }
    if(definition.curve?.views.includes(view)&&view!=='front'){
      ctx.beginPath();for(let distance=0;distance<=70;distance++){const p=spineSample(state.diet,view,pose,distance,profile().rig);if(distance===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}ctx.stroke();
      for(const [distance,label] of [[0,'Nape'],[53,'Tail root']] as const){const p=spineSample(state.diet,view,pose,distance,profile().rig);ctx.beginPath();ctx.arc(p.x,p.y,1.1,0,Math.PI*2);ctx.fill();if(state.labels)text(ctx,label,p.x+3,p.y,color);}
    }
  }
  ctx.restore();
}
function text(ctx:CanvasRenderingContext2D,label:string,x:number,y:number,color:string):void {
  ctx.save();ctx.font='3.4px system-ui';ctx.lineWidth=1.1;ctx.strokeStyle='#0d1a24';ctx.strokeText(label,x,y);ctx.fillStyle=color;ctx.fillText(label,x,y);ctx.restore();
}
async function image(src:string):Promise<HTMLImageElement>{const img=new Image();img.src=src;await img.decode();return img;}
async function start():Promise<void>{
  const source=JSON.parse($('avatar-assets').textContent!) as {bodies:Record<string,string>;organs:string};
  const organs=await image(source.organs);
  rebuild();
  let loaded='',pending='',failed='',bodyImage:HTMLImageElement;
  let previous=performance.now();
  const tick=(now:number)=>{
    requestAnimationFrame(tick);
    const active=profile(),file=active.bodies[state.diet].file;
    if(file!==loaded){
      if($('loading').hidden){
        $('loading').hidden=false;
        $('loading').textContent='Loading body sheetâ€¦';
        for(const {canvas,small,badge} of surfaces){
          canvas.getContext('2d')!.clearRect(0,0,canvas.width,canvas.height);
          small.getContext('2d')!.clearRect(0,0,small.width,small.height);
          badge.textContent='';
        }
      }
      if(!pending&&file!==failed){
        pending=file;
        $('loading').textContent='Loading body sheetâ€¦';
        void image(source.bodies[file]).then(body=>{
          bodyImage=body;loaded=file;failed='';
        }).catch(error=>{
          failed=file;$('loading').textContent=String(error);
        }).finally(()=>{pending='';});
      }
      return;
    }
    $('loading').hidden=true;
    document.body.dataset.ready='true';
    $('readout').dataset.sheet=file;
    const images:AvatarImages={organs,body:bodyImage!};
    const dt=Math.max(0,Math.min(80,now-previous));previous=now;if(state.playing&&!state.reduced)state.clock+=dt*state.speed;
    state.tucked=state.action==='dash';
    state.pose=state.action==='chomp'?3:state.reduced||state.action==='idle'||state.tucked?1:state.playing?[0,1,2,1][Math.floor(state.clock/160)%4]:state.manual;
    const poseNames=['Left bend','Neutral','Right bend','Chomp'];
    $('pose-name').textContent=`${poseNames[state.pose]}${state.reduced?' Â· reduced motion':''}${state.tucked?' Â· dash tuck':''}`;
    for(const surface of surfaces){
      if(surface.card.hidden)continue;
      const ctx=surface.canvas.getContext('2d')!;ctx.clearRect(0,0,768,768);ctx.save();ctx.translate(30,30);ctx.scale(708/384,708/384);
      drawCanvasAvatar(ctx,images,creature,surface.view,state.pose,{profile:active,clock:state.clock,tucked:state.tucked,reduced:state.reduced,
        overlay:(context,placements)=>{
          overlay(context,placements,surface.view);
          const logical=new Set(placements.filter(p=>p.part===state.focus).map(p=>p.logicalId));
          surface.canvas.dataset.layers=String(placements.length);surface.canvas.dataset.focusPieces=String(logical.size);surface.canvas.dataset.pose=String(state.pose);
          surface.badge.textContent=logical.size?`${logical.size} attachment${logical.size===1?'':'s'}`:
            !selected.has(state.focus)?'Selected part is hidden':state.focus==='jaws'&&surface.view==='back'?'Hidden from rear':
            state.focus==='torrent'&&!torrentVisible(active.rig,state.form,surface.view)?'Tail hidden by shell':
            state.focus==='plates'&&!chestPlatesVisible(active.rig,surface.view,state.pose)?'Chest hidden by open mouth':'No visible attachment';
        }});
      ctx.restore();const small=surface.small.getContext('2d')!;small.clearRect(0,0,128,128);small.save();small.scale(1/3,1/3);
      drawCanvasAvatar(small,images,creature,surface.view,state.pose,{profile:active,clock:state.clock,tucked:state.tucked,reduced:state.reduced});small.restore();
    }
    $('readout').dataset.selected=[...selected].sort().join(',');$('readout').dataset.focus=state.focus;
  };requestAnimationFrame(tick);
}
void start().catch(error=>{$('loading').textContent=`Could not load inspector: ${String(error)}`;console.error(error);});

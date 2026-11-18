// Body-only maturation review. Source PNGs stay unchanged; previews use the shared renderer.
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const out=resolve(process.argv[2]||'build/evolution-review');mkdirSync(out,{recursive:true});
const browser=await chromium.launch({args:['--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://localhost:5178/tools/evolution_capture.html');await page.waitForLoadState('networkidle');
 const frames=await page.evaluate(async()=>{
  const {EVOLUTION_CATALOG}=await import('/src/game/aquatic/evolutionArt.ts');
  const {drawCanvasAvatar}=await import('/src/game/aquatic/avatarCanvas.ts');
  const {creatureFromLineage}=await import('/src/game/aquatic/creature.ts');
  const result=[];
  for(const profile of Object.values(EVOLUTION_CATALOG.profiles))for(const diet of ['herbivore','omnivore','carnivore']){
   const image=new Image();image.src='/assets/art/'+profile.bodies[diet].file;await image.decode();
   const c={...creatureFromLineage(null,diet),form:profile.form,parts:[],uniques:[]},views={};
   for(const view of ['front','side','back']){
    views[view]=[];
    for(let pose=0;pose<4;pose++){
     const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
     const ctx=canvas.getContext('2d');ctx.scale(2/3,2/3);
     drawCanvasAvatar(ctx,{bodies:{[diet]:image},body:image,organs:image},c,view,pose,{profile});
     views[view].push(canvas.toDataURL('image/png'));
    }
   }
   result.push({family:profile.family,form:profile.form,diet,views});
  }
  return result;
 });
 const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ooze2Orbit · aquatic evolution</title>
 <style>*{box-sizing:border-box}body{margin:0;background:#10202a;color:#f1eadc;font:15px system-ui;padding:24px}h1{font-size:26px;margin:0 0 6px}p{color:#b6cbd3;max-width:1000px}select,button{font:inherit;padding:9px 12px;border:1px solid #527481;background:#254652;color:#fff;border-radius:7px;margin:4px}label{white-space:nowrap}nav{position:sticky;top:0;background:#10202af5;padding:8px 0;z-index:1}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:14px 0 26px}.card{border:1px solid #3b5a68;border-radius:12px;background:radial-gradient(ellipse,#284958,#142c38);text-align:center;padding:8px}.card canvas{display:block;width:min(100%,256px);height:auto;margin:auto}.card canvas.small{width:64px}h2{font-size:19px;margin:24px 0 4px}.muted{color:#a7bec7;font-size:13px}.age{font-size:13px;color:#c4d4d9}button:focus-visible,select:focus-visible{outline:3px solid #e9c369}@media(max-width:700px){body{padding:12px}.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}h1{font-size:22px}.card{padding:4px}nav{position:static}}</style>
 <h1>Ooze2Orbit · aquatic evolution</h1><p>Four distinct forms in each temperament family. Diet changes the palette while preserving the lineage. Form 4 develops support limbs for the transition toward creature stage.</p>
 <nav><label>Diet <select id="diet"><option value="omnivore">Omnivore · gold / teal</option><option value="herbivore">Herbivore · green</option><option value="carnivore">Carnivore · coral</option></select></label><label>View <select id="view"><option>side</option><option>front</option><option>back</option></select></label><button id="pause">Pause swimming</button><button id="step">Next pose</button><button id="chomp">Chomp</button><span class="muted" id="status" role="status"></span></nav><main id="content"></main>
 <p>Body-only review · equipment fitting is deferred. Large views compare anatomy at a common reference scale; small views check readability at 64 px. The in-game renderer retains growth sizing, inherited thickness, equipment and action effects.</p>
 <script>const data=${JSON.stringify(frames)};
 const [diet,view,status,pause,step,chomp,content]=['diet','view','status','pause','step','chomp','content'].map(id=>document.getElementById(id));const families=[['aggressive','Aggressive','Muscular shark lineage · deeper chest, powerful tail and support limbs.'],['adaptable','Adaptable','Slender feline lineage · narrow waist, fine limbs and a flowing ribbon tail.'],['cautious','Cautious','Protective shell lineage · broad hood, layered shell and sturdy paddles.']];
 const ages=['Larval','Adolescent','Mature aquatic','Creature precursor'];let cards=[],paused=false,phase=0,biteUntil=0,last=performance.now(),revision=0,ready=false;
 for(const [family,title,desc] of families){const section=document.createElement('section');section.innerHTML='<h2>'+title+'</h2><div class="muted">'+desc+'</div><div class="grid"></div>';content.append(section);for(let form=1;form<=4;form++){const el=document.createElement('article');el.className='card';el.innerHTML='<strong>Form '+form+'</strong><div class="age">'+ages[form-1]+'</div><canvas width="256" height="256" aria-label="'+family+' form '+form+' animated preview"></canvas><canvas class="small" width="256" height="256" aria-label="Small gameplay-size preview"></canvas>';section.querySelector('.grid').append(el);cards.push({family,form,canvases:[...el.querySelectorAll('canvas')],images:[]});}}
 async function load(){const rev=++revision;ready=false;status.textContent='Loading palette…';const sets=await Promise.all(cards.map(async card=>{const record=data.find(r=>r.family===card.family&&r.form===card.form&&r.diet===diet.value);return Promise.all(record.views[view.value].map(async src=>{const image=new Image();image.src=src;await image.decode();return image}));}));if(rev!==revision)return;cards.forEach((c,i)=>c.images=sets[i]);ready=true;status.textContent='12 forms · '+diet.value+' · '+view.value;}
 diet.onchange=load;view.onchange=load;pause.onclick=()=>{paused=!paused;pause.textContent=paused?'Resume swimming':'Pause swimming'};step.onclick=()=>{paused=true;phase=(Math.floor(phase)+1)%4;biteUntil=0;pause.textContent='Resume swimming'};chomp.onclick=()=>biteUntil=performance.now()+500;
 function tick(now){const dt=Math.min(60,now-last);last=now;if(!paused)phase=(phase+dt/200)%4;const pose=now<biteUntil?3:[0,1,2,1][Math.floor(phase)];if(ready)for(const card of cards)for(const canvas of card.canvases){const ctx=canvas.getContext('2d');ctx.clearRect(0,0,256,256);ctx.drawImage(card.images[pose],0,0);}requestAnimationFrame(tick)}load();requestAnimationFrame(tick);
 </script></html>`;
 writeFileSync(resolve(out,'aquatic-evolution-gallery.html'),html);
 await page.goto('file:///'+resolve(out,'aquatic-evolution-gallery.html').replaceAll('\\','/'));
 await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('12 forms'));
 await page.getByRole('button',{name:'Pause swimming'}).click();
 await page.screenshot({path:resolve(out,'aquatic-evolution-overview.png'),fullPage:true});
 for(const diet of ['herbivore','carnivore'])for(const view of ['front','side','back']){
  await page.selectOption('#diet',diet);await page.selectOption('#view',view);
  await page.waitForFunction(({diet,view})=>document.querySelector('#status').textContent=== '12 forms · '+diet+' · '+view,{diet,view});
 }
 await page.getByRole('button',{name:'Chomp',exact:true}).click();
 await page.getByRole('button',{name:'Next pose',exact:true}).click();
 await page.setViewportSize({width:375,height:812});
 await page.screenshot({path:resolve(out,'aquatic-evolution-phone.png'),fullPage:true});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 if(errors.length||overflow)throw Error(JSON.stringify({errors,overflow}));
 writeFileSync(resolve(out,'evolution-gallery-report.json'),JSON.stringify({profiles:12,sheets:frames.length,frames:frames.length*12,errors,mobileOverflow:overflow},null,2));
 console.log('Evolution gallery: 12 profiles, 36 sheets, 432 frames; desktop and phone passed.');
}finally{await browser.close();}

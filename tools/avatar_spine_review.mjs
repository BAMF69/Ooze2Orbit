// Standalone preview QA: step through the actual authored frames, then capture close side/back comparisons.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const out=resolve(process.argv[2]||'build/avatar-review');
const original=resolve(out,'adaptable-preview.html'), versioned=resolve(out,'adaptable-preview-v2.html');
let html=readFileSync(original,'utf8');
html=html.replace('width:min(100%,240px)','width:min(100%,320px)')
  .replace('<h1>Ooze2Orbit · adaptable anatomy</h1>','<h1>Ooze2Orbit · adaptable anatomy · spine flex v2</h1>')
  .replace('<button id="bite">Chomp</button><span','<button id="bite">Chomp</button><button id="step">Next pose</button><span');
if(!html.includes("document.getElementById('step').onclick"))html=html.replace(
  "document.getElementById('bite').onclick=()=>bite=performance.now()+320;",
  "document.getElementById('bite').onclick=()=>bite=performance.now()+320;document.getElementById('step').onclick=()=>{bite=0;paused=true;t=(Math.floor(t/12)+1)*12;toggle.textContent='Resume swimming'};");
writeFileSync(original,html);writeFileSync(versioned,html);
const browser=await chromium.launch();
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file:///'+versioned.replaceAll('\\','/'));
  await page.getByRole('button',{name:'Pause swimming'}).click();
  const poses=new Set();
  for(let n=0;n<4;n++) {
    await page.getByRole('button',{name:'Next pose'}).click();
    await page.waitForTimeout(80);
    poses.add(await page.locator('canvas').nth(2).evaluate(c=>c.toDataURL()));
  }
  if(poses.size!==3)throw Error('Pose stepping should expose three distinct swim frames.');
  await page.getByRole('button',{name:'Toxic + electric'}).click();
  await page.waitForTimeout(50);
  await page.getByRole('button',{name:'Tier III',exact:true}).click();
  await page.waitForTimeout(50);
  await page.screenshot({path:resolve(out,'adaptable-equipment-preview.png'),fullPage:true});
  await page.evaluate(()=>{
    document.body.innerHTML='<h1>Tier III · articulated spine</h1><p>Side and back · left bend / neutral / right bend · same body and equipment artwork</p><div class="grid" id="detail"></div>';
    const diet=data.find(d=>d.diet==='omnivore');
    for(const view of ['side','back'])for(const [pose,label] of [[0,'Left bend'],[1,'Neutral'],[2,'Right bend']]){
      const item=document.createElement('div');item.className='card';
      const heading=document.createElement('div');heading.className='label';heading.textContent=view+' · '+label;
      const image=document.createElement('img');image.src=diet.views.find(v=>v.view===view).sets[3][pose];
      image.style.cssText='width:100%;max-width:420px;height:auto';item.append(heading,image);document.getElementById('detail').append(item);
    }
  });
  await page.waitForFunction(()=>[...document.images].every(i=>i.complete));
  await page.screenshot({path:resolve(out,'spine-flex-detail.png'),fullPage:true});
  if(errors.length)throw Error(errors.join('\n'));
  console.log('Spine preview verified: three distinct poses, working tier controls, no page errors.');
} finally {await browser.close();}

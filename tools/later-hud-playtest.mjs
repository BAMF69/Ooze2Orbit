// Integration proof for approved creature/civilization HUDs. Uses real scene callbacks and DOM.
// Start with python tools/dev.py run (O2O_DEV_PORT=5192), then node tools/later-hud-playtest.mjs.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const out='build/later-hud';await mkdir(out,{recursive:true});
const offline=process.env.O2O_HUD_OFFLINE==='1';
const runtime=resolve('build/later-hud-runtime');
if(offline){
 const {build}=await import('vite');
 await build({build:{outDir:runtime,rolldownOptions:{input:resolve('tools/later-hud-fixture.html')}}});
}
const gpu=process.platform==='win32'||process.argv.includes('--gpu');
const browser=await chromium.launch({headless:true,args:gpu?['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-angle=vulkan']:[]});
const errors=[],report=[];
const views=[{name:'desktop',width:1440,height:900},{name:'phone',width:375,height:812},{name:'landscape',width:812,height:375}];
async function open(view,stage){
 const page=await browser.newPage({viewport:{width:view.width,height:view.height},hasTouch:view.name!=='desktop'});
 if(offline)await page.route('https://hud.test/**',async route=>{
  const pathname=decodeURIComponent(new URL(route.request().url()).pathname);
  const file=resolve(runtime,'.'+pathname);
  if(!file.startsWith(runtime+sep))return route.fulfill({status:403,body:''});
  const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.json':'application/json','.ttf':'font/ttf','.wav':'audio/wav','.ogg':'audio/ogg','.svg':'image/svg+xml'};
  try{await route.fulfill({status:200,contentType:mime[extname(file)]??'application/octet-stream',body:await readFile(file)});}
  catch{await route.fulfill({status:404,body:`Missing fixture file ${pathname}`});}
 });
 page.on('pageerror',e=>errors.push(`${stage}/${view.name}: ${e.message}`));
 page.on('console',m=>{if(m.type()==='error')errors.push(`${stage}/${view.name}: ${m.text()}`);});
 await page.goto(`${offline?'https://hud.test/tools/later-hud-fixture.html':'http://localhost:5192/'}?data-dir=later-hud-${stage}-${view.name}&creatureSeed=0&avatarFamily=cautious&avatarDiet=herbivore`);
 await page.getByRole('button',{name:'No thanks',exact:true}).click();
 await page.getByRole('button',{name:'Enter the garden',exact:true}).click();
 await page.getByRole('button',{name:stage==='creature'?'Creature':'Civilization',exact:true}).click();
 if(stage==='creature')await page.getByRole('button',{name:'Begin exploring',exact:true}).click();
 await page.evaluate(async stage=>{
  if(window.hudFixture){const{game,shell}=window.hudFixture;window.hudTest={game,shell,scene:game.scene.getScene(stage==='creature'?'creature':'civ')};return;}
  const entry=document.querySelector('script[type=module][src*="/src/main.ts"]').src;
  const {game}=await import(entry),source=await(await fetch(entry)).text();
  const app=source.match(/from\s*["']([^"']*\/shell\/app\.ts[^"']*)["']/)[1];
  const {shell}=await import(app);window.hudTest={game,shell,scene:game.scene.getScene(stage==='creature'?'creature':'civ')};
 },stage);
 await page.waitForTimeout(200);
 await page.evaluate(({stage,touch})=>{
  const {game,shell,scene:c}=window.hudTest;game.loop.sleep();if(touch)shell.input.use('touch');
  if(stage==='creature'){c.close();c.garden.traits.diet='herbivore';c.enter(1,200);c.hp=6;c.hunger=25;c.cargo.samples=['reed sample'];c.draw();}
 },{stage,touch:view.name!=='desktop'});
 if(stage==='civ')await page.locator('[data-action=select-builder]').click();
 await page.evaluate(()=>window.hudTest.game.loop.wake());
 await page.waitForTimeout(150);
 await page.evaluate(()=>window.hudTest.game.loop.sleep());
 await page.waitForTimeout(250);return page;
}
try{
 for(const view of views)for(const stage of ['creature','civ']){
  const page=await open(view,stage);
  await page.evaluate(()=>document.fonts.ready);
  // Remove the transient onboarding/settings notification from approval captures only.
  await page.evaluate(()=>document.querySelector('#toasts')?.replaceChildren());
  const layout=await page.evaluate(stage=>{
   const root=document.querySelector(stage==='creature'?'.creature-painted':'.civ-hd');
   const buttons=[...root.querySelectorAll(stage==='creature'?'.creature-utility button':'.civ-hd-roles button')];
   const rects=buttons.map(b=>({label:b.textContent.trim(),x:b.getBoundingClientRect().x,y:b.getBoundingClientRect().y,w:b.getBoundingClientRect().width,h:b.getBoundingClientRect().height}));
   return {rects,font:getComputedStyle(root).fontFamily,viewport:{w:innerWidth,h:innerHeight},bodyWidth:document.documentElement.scrollWidth};
  },stage);
  report.push({stage,view:view.name,...layout});
  await writeFile(`${out}/report.json`,JSON.stringify({report,errors},null,2));
  await page.screenshot({path:`${out}/${stage}-${view.name}.png`});
  assert.match(layout.font,/Vollkorn/);
  assert.equal(await page.locator(stage==='creature'?'.creature-painted .stage-status>.bio-skin':'.civ-hd-roles .bio-skin').count(),stage==='creature'?1:4,'illustrated surfaces must not silently fall back to generic HUD controls');
  assert.ok(layout.bodyWidth<=view.width+1,'no horizontal page overflow');
  for(const b of layout.rects){assert.ok(b.w>=44&&b.h>=44,`${b.label} target >=44px`);assert.ok(b.x>=0&&b.y>=0&&b.x+b.w<=view.width+1&&b.y+b.h<=view.height+1,`${b.label} safely inside viewport`);}
  await page.screenshot({path:`${out}/${stage}-${view.name}.png`});
  if(stage==='creature'){
   assert.match(await page.locator('.creature-breadcrumb').innerText(),/Room 1 · easy · seed 0/);
   assert.equal(await page.locator('.creature-icon-rack .icon-row-label').first().textContent(),'Equipped');
   assert.equal(await page.locator('.creature-icon-rack .icon-row-label').first().isVisible(),true);
   await page.evaluate(()=>{const c=window.hudTest.scene;c.enter(2,200);c.draw();});
   assert.match(await page.locator('.creature-breadcrumb').innerText(),/Room 2/);
   await page.evaluate(()=>{const c=window.hudTest.scene;c.enter(1,200);c.draw();});
   await page.locator('.creature-utility [data-action=journal]').click();await page.evaluate(()=>window.hudTest.scene.draw());
   assert.match(await page.locator('.creature-expedition .stage-modal-text').innerText(),/LINEAGE JOURNAL/);
   assert.equal(await page.locator('.creature-touch').isVisible(),false,'touch disabled during creature menu');
   await page.evaluate(()=>{const c=window.hudTest.scene;c.close();c.draw();});
   await page.locator('.creature-utility [data-action=info]').click();
   assert.equal(await page.locator('#creature-information').getAttribute('open'),'');
   assert.match(await page.locator('.creature-info-location').innerText(),/Room 1.*easy lever.*seed 0/);
   await page.locator('.creature-utility [data-action=info]').click();
   await page.locator('.creature-utility [data-action=gardener]').focus();
   assert.ok(await page.evaluate(()=>{for(let i=0;i<5;i++)window.hudTest.scene.draw();return document.activeElement?.dataset.action==='gardener';}),'redraw preserves keyboard focus');
   await page.evaluate(()=>{const c=window.hudTest.scene;c.creatureHud.update({hp:1,maxHp:6,food:20,air:2,airMax:10,submerged:true,gills:false,cargo:2,diet:'herbivore',location:'Water',generation:3,available:true,netReady:true,sealedThreats:3});});
   assert.equal(await page.locator('.creature-air').isVisible(),true);
   assert.equal(await page.locator('.creature-air').innerText(),'2s');
   assert.ok(await page.evaluate(()=>{const rows=[...document.querySelector('.creature-readouts').children].filter(n=>!n.hidden).map(n=>n.getBoundingClientRect());return rows.every((r,i)=>!i||r.top>=rows[i-1].bottom);}), 'room, cargo, air and encounter readouts do not overlap');
   await page.evaluate(()=>{const c=window.hudTest.scene;c.creatureHud.update({hp:6,maxHp:6,food:100,air:10,airMax:10,submerged:true,gills:true,cargo:0,diet:'herbivore',location:'Water',generation:3,available:true});});
   assert.equal(await page.locator('.creature-air').isVisible(),false,'gills hide irrelevant air');
   if(view.name==='desktop'){
    await page.evaluate(()=>{const c=window.hudTest.scene;c.garden.traits.fins=false;c.garden.expedition.unlocked.push('fins');c.draw();});
    assert.equal(await page.locator('.creature-icon-rack .icon-row-label').last().textContent(),'Banked');
    assert.equal(await page.locator('.creature-icon-rack .icon-row-label').last().isVisible(),true);
    // Exercise the scene adapter, not manually supplied presentation state: two water regions in a tall, wide room.
    const water=await page.evaluate(()=>{
     const c=window.hudTest.scene,at=c.world.rooms.findIndex(r=>r.id===1),original=c.world.rooms[at];
     c.world.rooms[at]={...original,spec:{...original.spec,geometry:{...c.geom,cols:100,rows:40,width:1600,height:640,floorRow:38,enemyMaxX:1540,
      water:[{x0:100,x1:300,low:288,raised:224},{x0:700,x1:1100,low:480,raised:420}]}}};
     c.garden.expedition.basinRaised=false;c.garden.traits.gills=false;c.enter(1,850,520);c.oxygen=5;c.hurt=99;
     c.update(0,16);const submerged={shown:!document.querySelector('.creature-air').hidden,air:c.oxygen};
     c.body.x=500;c.body.y=520;c.update(0,16);const dry=!document.querySelector('.creature-air').hidden;
     c.body.x=850;c.body.y=485;c.body.h=20;c.draw();const headAbove=!document.querySelector('.creature-air').hidden;
     c.garden.expedition.basinRaised=true;c.body.y=450;c.draw();const raised=!document.querySelector('.creature-air').hidden;
     c.garden.traits.gills=true;c.draw();const gills=!document.querySelector('.creature-air').hidden;
     c.world.rooms[at]=original;c.garden.expedition.basinRaised=false;c.enter(1,200);c.stun=0;c.draw();
     return{submerged,dry,headAbove,raised,gills};
    });
    assert.ok(water.submerged.shown&&water.submerged.air<5,'actual oxygen and HUD agree beyond old room bounds');
    assert.equal(water.dry,false);assert.equal(water.headAbove,false);assert.equal(water.raised,true);assert.equal(water.gills,false);
    for(const key of ['j','f']){
     await page.evaluate(()=>{const c=window.hudTest.scene;c.bite=0;c.stun=0;});await page.keyboard.press(key);
     assert.ok(await page.evaluate(()=>{const c=window.hudTest.scene;c.update(0,16);return c.bite>0;}),`${key.toUpperCase()} still bites after restoring HUD`);
    }
   }
   if(view.name==='phone'){
    await page.evaluate(()=>{const{shell,scene:c,game}=window.hudTest;shell.input.use('touch');c.draw();game.loop.wake();});
    await page.waitForTimeout(100);await page.evaluate(()=>window.hudTest.game.loop.sleep());
    const stick=await page.locator('.creature-touch .touch-stick').boundingBox();assert.ok(stick);
    const cdp=await page.context().newCDPSession(page);
    const before=await page.evaluate(()=>window.hudTest.scene.body.x);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:stick.x+stick.width*.8,y:stick.y+stick.height*.5,id:1}]});
    const moved=await page.evaluate(()=>{const c=window.hudTest.scene;for(let i=0;i<12;i++)c.update(0,1000/60);return c.body.x;});
    assert.ok(moved>before,'touch stick drives actual creature movement');
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert.equal(await page.evaluate(()=>window.hudTest.shell.input.isDown('move_right')),false,'release stops virtual movement');
    await page.evaluate(()=>window.hudTest.shell.pauseGame());
    assert.equal(await page.locator('.creature-touch').isVisible(),false,'pause suspends external touch layer');
    await page.evaluate(()=>{window.hudTest.shell.back();window.hudTest.scene.draw();});
   }
   if(view.name==='desktop')for(const diet of ['carnivore','omnivore']){
    await page.evaluate(diet=>{const c=window.hudTest.scene;c.garden.traits.diet=diet;c.draw();},diet);
    await page.waitForTimeout(80);
    const uri=await page.locator('.creature-painted .stage-status .bio-skin image').first().getAttribute('href');
    assert.match(uri,/hud_creature_diet_surfaces_v1.webp/);
    await page.locator('.creature-painted .stage-status').screenshot({path:`${out}/creature-${diet}-status.png`});
   }
  }else{
   for(const role of ['hero','workers','summons','builder']){
    await page.locator(`[data-action=select-${role}]`).click();assert.equal(await page.locator(`[data-action=select-${role}]`).getAttribute('aria-selected'),'true');
   }
   await page.locator('[data-action=mortar]').click();assert.equal(await page.evaluate(()=>window.hudTest.scene.selectedTower),'mortar');
   await page.locator('[data-action=select-workers]').click();
   const workers=await page.evaluate(()=>window.hudTest.scene.battle.sides[0].gatherers);
   await page.locator('[data-action=gatherer]').click();assert.equal(await page.evaluate(()=>window.hudTest.scene.battle.sides[0].gatherers),workers+1);
  }
  if(view.name==='phone'){
   await page.evaluate(()=>{document.body.style.setProperty('--text-scale','1.25');window.hudTest.scene.draw();});
   await page.evaluate(()=>window.hudTest.game.loop.wake());await page.waitForTimeout(120);await page.evaluate(()=>window.hudTest.game.loop.sleep());
   const large=await page.evaluate(stage=>[...document.querySelectorAll(stage==='creature'?'.creature-utility button':'.civ-hd-roles button')].map(b=>({w:b.clientWidth,scroll:b.scrollWidth,x:b.getBoundingClientRect().x,right:b.getBoundingClientRect().right})),stage);
   for(const b of large){assert.ok(b.w>=44&&b.x>=0&&b.right<=view.width+1);assert.ok(b.scroll<=b.w+1,'large-text tab label fits');}
   await page.screenshot({path:`${out}/${stage}-phone-large-text.png`});
  }
  await page.evaluate(()=>{window.hudTest.scene.scene.stop();window.hudTest.game.loop.wake();});
  await page.waitForFunction(stage=>!document.querySelector(stage==='creature'?'.creature-painted,.creature-touch':'.civ-hd'),stage);
  assert.equal(await page.locator(stage==='creature'?'.creature-painted,.creature-touch':'.civ-hd').count(),0,'scene shutdown removes native overlay and touch controls');
  await page.close();
 }
 assert.deepEqual(errors,[],'no browser errors');
 await writeFile(`${out}/report.json`,JSON.stringify({report,errors},null,2));console.log('LATER_HUD_OK',report.length,'stage/view combinations');
}finally{await writeFile(`${out}/errors.json`,JSON.stringify(errors,null,2));await browser.close();}

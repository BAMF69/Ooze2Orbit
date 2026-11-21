// Development-only browser fixture. Uses an isolated data prefix and the actual renderer.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const out = resolve(process.argv[2] || 'build/avatar-review'); mkdirSync(out,{recursive:true});
const device=process.argv.find(a=>a.startsWith('--device='))?.split('=')[1];
const requestedForm=Number(process.argv.find(a=>a.startsWith('--form='))?.split('=')[1]||3);
const requestedFamily=process.argv.find(a=>a.startsWith('--family='))?.split('=')[1]||'adaptable';
const browser = await chromium.launch({args:['--enable-webgl','--ignore-gpu-blocklist']});
const page = await browser.newPage({viewport:device==='portrait'?{width:375,height:812}:device==='landscape'?{width:812,height:375}:{width:1440,height:900},hasTouch:!!device,isMobile:!!device});
const errors = [];page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.text().startsWith('REVIEW '))console.log(m.text());});
try {
  const origin=process.env.AVATAR_REVIEW_ORIGIN||'http://localhost:5178';
  await page.goto(new URL('/?data-dir=build/avatar-review&stage=aquatic',origin).href);
  await page.waitForFunction(()=>document.querySelector('canvas'));
  await page.waitForFunction(async()=>{
    const urls=performance.getEntriesByType('resource').map(r=>r.name);
    const app=urls.find(u=>/\/src\/shell\/app.ts(?:\?|$)/.test(u));
    const main=urls.find(u=>/\/src\/main.ts(?:\?|$)/.test(u));
    if(!app||!main)return false;
    const {shell}=await import(app); const {game}=await import(main);
    if(!shell.viewport)return false;
    globalThis.review={shell,game};return true;
  });
  await page.evaluate(()=>globalThis.review.shell.startGame('aquatic'));
  await page.waitForFunction(()=>!!globalThis.review.game.scene.getScene('aquatic').me);
  await page.evaluate(({requestedForm,requestedFamily})=>{
    const {game}=globalThis.review;
    const scene=game.scene.getScene('aquatic');globalThis.review.scene=scene;
    scene.entry.close(); scene.entryPhase=null; scene.closeReveal(false);scene.autoplay=false;scene.invincible=true;
    scene.temper={aggressive:.1,cautious:.1,adaptable:.1,[requestedFamily]:.8};
    scene.me={...scene.me,form:requestedForm,parts:['fins','jaws','plates'],uniques:['endurance','torrent'],
      partTiers:{fins:3,jaws:3,plates:3},ups:{attack:6,speed:8,defense:4,mobility:6,health:4}};
    scene.updateLook(false);scene.drawBehind(0);
  },{requestedForm,requestedFamily});
  await page.waitForFunction(async()=>{const {scene}=globalThis.review;const {avatarTexture}=await import('/src/game/aquatic/avatarVisual.ts');const {bodyLook,lookScores}=await import('/src/game/aquatic/creature.ts');const look=bodyLook(lookScores(scene.temper,scene.me,0,0)).row;return scene.children.list.find(o=>o.getData?.('aqPlayerState'))?.texture.key===avatarTexture(scene.me,look);},{},{timeout:60000});
  await page.waitForTimeout(500);
  await page.screenshot({path:resolve(out,'adaptable-desktop.png')});
  if(device){
    await page.screenshot({path:resolve(out,`adaptable-phone-${device}.png`)});
    if(errors.length)throw Error(errors.join('\n'));
    console.log(`Avatar ${device} check captured; no errors.`);
  } else {
  console.log('Review: running state matrix');
  const report = process.argv.includes('--quick') ? {} : await page.evaluate(async()=>{
    const {scene,shell}=globalThis.review;
    const {avatarTexture}=await import('/src/game/aquatic/avatarVisual.ts');
    const {evolutionTextures}=await import('/src/game/aquatic/evolutionTextures.ts');
    const {evolutionSheet}=await import('/src/game/aquatic/evolutionArt.ts');
    scene.scene.pause();
    const initial=structuredClone(scene.me);
    const image=()=>scene.children.list.find(o=>o.getData?.('aqPlayerState'));
    const flush=()=>scene.events.emit('postupdate',0,80);
    const present=async(c,view='back',look='a3')=>{
      scene.scene.resume();
      const sheet=evolutionSheet(c,look);
      await Promise.race([evolutionTextures(scene).load(sheet),new Promise((_,reject)=>setTimeout(()=>reject(Error('Body atlas loading timed out: '+sheet.key)),15000))]);
      scene.scene.pause();
      scene.me=c;scene.avatarSpr.setData('aqBody',c).setVisible(true).play(`aswim:swim:${view}${look}`,true);
      scene.av.airborne=false;scene.av.dashLeft=0;scene.av.vx=0;scene.av.vy=0;scene.playerStunLeft=0;
      for(let i=0;i<5;i++)flush();
      if(image().texture.key!==avatarTexture(c,look))throw Error('Incorrect body atlas: '+image().texture.key+', expected '+sheet.key);
    };
    let combinations=0;console.log('REVIEW family matrix');
    for(const diet of ['herbivore','carnivore','omnivore'])for(const form of [1,2,3,4])for(const look of ['3','c3','a3'])for(const view of ['front','side','back']){
      await present({...initial,diet,form},view,look);combinations++;
    }
    console.log('REVIEW equipment matrix');
    for(const part of ['fins','jaws','plates','gills','endurance','torrent','toxicTendrils','electricOrgan'])for(const tier of [1,2,3])for(const view of ['front','side','back']){
      const unique=part==='endurance'||part==='torrent';
      await present({...initial,parts:unique?[]:[part],uniques:unique?[part]:[],partTiers:{[part]:tier}},view);
      const organs=scene.children.list.filter(o=>o.getData?.('aqOrganOwner')===image()&&o.visible);
      if(!(part==='jaws'&&view==='back')&&!organs.some(o=>o.getData('aqOrgan')===part))throw Error('Missing organ '+part);
      combinations++;
    }
    console.log('REVIEW actions and pause');
    await present({...initial,parts:[],uniques:[]});
    if(scene.children.list.some(o=>o.getData?.('aqOrganOwner')===image()))throw Error('Swapped organs leaked');
    const state=(expected)=>{flush();if(image().getData('aqPlayerState')!==expected)throw Error('Motion priority '+expected);};
    state('idle');scene.av.vx=120;state('swim');
    scene.avatarSpr.setData('aqBiteSerial',900);state('attack');
    scene.av.dashLeft=1;state('dash');scene.av.airborne=true;scene.av.vz=100;state('breach');
    scene.playerStunLeft=1;state('stunned');
    await present(initial);shell.settings.access.reduce_motion=true;
    scene.av.vx=150;flush();if(Number(image().frame.name)%4!==1)throw Error('Reduced motion swims');
    scene.avatarSpr.setData('aqBiteSerial',901);flush();if(Number(image().frame.name)%4!==3)throw Error('Reduced motion lost attack cue');
    await present(initial);shell.settings.access.reduce_motion=false;
    shell.settings.input.scheme='touch';scene.panel.toggle();
    flush();const clock=image().getData('aqSwimAge');
    const snapshot=()=>scene.children.list.filter(o=>o.getData?.('aqOrganOwner')===image()).map(o=>[o.x,o.y,o.rotation,o.alpha]);
    const before=JSON.stringify(snapshot());for(let i=0;i<10;i++)flush();
    if(clock!==image().getData('aqSwimAge')||before!==JSON.stringify(snapshot()))throw Error('Touch menu did not freeze anatomy');
    scene.panel.close();shell.settings.input.scheme='keyboard';
    console.log('REVIEW daughter selections');
    for(const form of [3,4])for(const organs of [['toxicTendrils'],['electricOrgan'],['toxicTendrils','electricOrgan']]){
      await present({...initial,form});
      scene.me={...initial,form,parts:[...organs,...(organs.length===1?['fins','plates']:['fins'])],uniques:['endurance','torrent'],divisionSeed:7};
      scene.beginDivision();scene.division.update(100);scene.chooseDaughter(1);flush();
      if(!scene.sisters.members.some(s=>organs.every(part=>s.body.parts.includes(part))))throw Error('Sister lost new anatomy');
      combinations++;
    }
    scene.me=initial;scene.updateLook(false);scene.drawBehind(0);flush();
    const textures=scene.textures.getTextureKeys().filter(k=>k.startsWith('aqEquipment:')).length;
    return {combinations,motionStates:['idle','swim','attack','dash','breach','stunned'],touchPause:true,reducedMotion:true,
      swaps:true,daughterSelections:6,legacyEquipmentTextures:textures,bodyAtlases:scene.textures.getTextureKeys().filter(k=>k.startsWith('aqBody-')||k.startsWith('aqAdaptable-')).map(key=>{const im=scene.textures.get(key).getSourceImage();return {key,bytes:im.width*im.height*4};})};
  });
  await page.screenshot({path:resolve(out,'adaptable-desktop.png')});
  writeFileSync(resolve(out,'avatar-browser-report.json'),JSON.stringify({...report,errors},null,2));
  console.log('Review: maps and rivers');
  for(const map of [0,1,2]){
    await page.evaluate(map=>{const {scene}=globalThis.review;scene.buildMap(map,'start');scene.drawBehind(0);scene.events.emit('postupdate',0,16);},map);
  }
  await page.evaluate(()=>{const {scene}=globalThis.review;scene.startRiver(1);scene.drawRiver(0);scene.events.emit('postupdate',0,16);});
  await page.waitForTimeout(150);await page.screenshot({path:resolve(out,'adaptable-river.png')});
  console.log('Review: generating interactive gallery');
  const gallery = await page.evaluate(async()=>{
    const {drawAvatarPreview}=await import('/src/game/aquatic/avatarPreview.ts');
    const {scene}=globalThis.review;
    return ['herbivore','omnivore','carnivore'].map(diet=>{
      const views=['front','side','back'].map(view=>{
        const sets=[];
        for(let mode=0;mode<5;mode++){
          const c={...scene.me,diet,parts:mode===0?[]:mode===4?['fins','toxicTendrils','electricOrgan']:['fins','jaws','plates'],
            uniques:mode===0?[]:['endurance','torrent'],partTiers:{fins:Math.min(3,mode),jaws:Math.min(3,mode),plates:Math.min(3,mode)}};
          const frames=[];
          for(let pose=0;pose<4;pose++){
            const canvas=document.createElement('canvas');canvas.width=384;canvas.height=384;
            drawAvatarPreview(canvas.getContext('2d'),scene,c,'a3',view,pose);frames.push(canvas.toDataURL());
          }
          sets.push(frames);
        }
        return {view,sets};
      });return {diet,views};
    });
  });
  const data=JSON.stringify(gallery);
  writeFileSync(resolve(out,'adaptable-preview.html'),`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Ooze2Orbit — adaptable avatar</title>
  <style>body{margin:0;padding:28px;background:#101c27;color:#f2eadb;font:16px system-ui}h1{font-size:26px;margin:0 0 8px}p{color:#afc1cb}button{padding:10px 18px;background:#305b65;color:white;border:1px solid #71a9b0;border-radius:8px;margin:8px 12px 18px 0}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.card{background:#1c303b;border:1px solid #39505b;border-radius:14px;text-align:center;padding:10px}canvas{width:min(100%,320px);height:auto;image-rendering:auto}.small{width:64px}.label{text-transform:capitalize;color:#cbdadf} @media(max-width:650px){body{padding:14px}.grid{gap:5px}canvas{width:100%}.card{padding:4px}.small{width:48px}}</style>
  <h1>Ooze2Orbit · adaptable anatomy · spine flex v2</h1><p>Slender aquatic lineage · mature-body prototype · three independent diet palettes</p><button id="toggle">Pause swimming</button><button id="bite">Chomp</button><button id="step">Next pose</button><span id="modes"></span><div class="grid" id="grid"></div><p>Large views inspect attachment quality. Small views check silhouette readability. Forms 3–4 share this first mature sheet; other families and distinct maturation remain in development.</p>
  <script>const data=${data};let paused=false,bite=0,t=0,mode=3;for(const [i,label] of ['Bare anatomy','Tier I','Tier II','Tier III','Toxic + electric'].entries()){const b=document.createElement('button');b.textContent=label;b.onclick=()=>mode=i;document.getElementById('modes').append(b)}const nodes=[];for(const row of data)for(const v of row.views){const el=document.createElement('div');el.className='card';el.innerHTML='<div class="label">'+row.diet+' · '+v.view+'</div><canvas width="384" height="384"></canvas><br><canvas class="small" width="384" height="384"></canvas>';grid.append(el);const sets=v.sets.map(frames=>frames.map(src=>{const i=new Image();i.src=src;return i}));nodes.push({sets,canvases:el.querySelectorAll('canvas')})}toggle.onclick=()=>{paused=!paused;toggle.textContent=paused?'Resume swimming':'Pause swimming'};document.getElementById('bite').onclick=()=>bite=performance.now()+320;document.getElementById('step').onclick=()=>{bite=0;paused=true;t=(Math.floor(t/12)+1)*12;toggle.textContent='Resume swimming'};function tick(now){if(!paused)t+=1;const frame=now<bite?3:[0,1,2,1][Math.floor(t/12)%4];for(const n of nodes)for(const c of n.canvases){const x=c.getContext('2d');x.clearRect(0,0,384,384);if(n.sets[mode][frame].complete)x.drawImage(n.sets[mode][frame],0,0)}requestAnimationFrame(tick)}requestAnimationFrame(tick);</script>`);
  // Capture the preview at a fixed neutral pose, with both inspection and small-size views.
  await page.goto('file:///'+resolve(out,'adaptable-preview.html').replaceAll('\\','/'));
  await page.waitForTimeout(300);
  await page.getByRole('button',{name:'Pause swimming'}).click();
  await page.screenshot({path:resolve(out,'adaptable-equipment-preview.png'),fullPage:true});
  writeFileSync(resolve(out,'avatar-browser-report.json'),JSON.stringify({...report,errors},null,2));
  if(errors.length)throw new Error(errors.join('\n'));
  console.log('Avatar browser review captured; no page or console errors.');
  }
} finally {await browser.close();}

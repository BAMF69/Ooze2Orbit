// Verify lazy body atlas ownership survives actual scene restart.
import {chromium} from 'playwright';
import {writeFileSync,mkdirSync} from 'node:fs';
const out=process.argv[2]||'build/evolution-cache';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({args:['--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://localhost:5178/?data-dir=build/evolution-cache&stage=aquatic');
 await page.waitForFunction(async()=>{
  const urls=performance.getEntriesByType('resource').map(r=>r.name),app=urls.find(u=>/\/src\/shell\/app.ts(?:\?|$)/.test(u)),main=urls.find(u=>/\/src\/main.ts(?:\?|$)/.test(u));
  if(!app||!main)return false;const {shell}=await import(app),{game}=await import(main);if(!shell.viewport)return false;
  globalThis.cacheReview={shell,game};return true;
 });
 await page.evaluate(()=>cacheReview.shell.startGame('aquatic'));
 await page.waitForFunction(()=>!!cacheReview.game.scene.getScene('aquatic').me);
 const report=[];
 for(let pass=0;pass<2;pass++){
  report.push(await page.evaluate(async()=>{
   const scene=cacheReview.game.scene.getScene('aquatic');scene.entry.close();scene.entryPhase=null;scene.closeReveal(false);scene.autoplay=false;scene.invincible=true;
   const {EVOLUTION_CATALOG}=await import('/src/game/aquatic/evolutionArt.ts'),{evolutionTextures}=await import('/src/game/aquatic/evolutionTextures.ts');
   const loader=evolutionTextures(scene);
   for(const profile of Object.values(EVOLUTION_CATALOG.profiles)){
    await loader.warm(profile);
    const references=new Set(scene.children.list.filter(o=>o.getData?.('aqSource')==='aswim').map(o=>o.texture?.key));
    loader.trim(references);
   }
   const keys=scene.textures.getTextureKeys().filter(k=>!k.endsWith('Source')&&(k.startsWith('aqBody-')||k.startsWith('aqAdaptable-')));
   const bytes=keys.reduce((n,key)=>{const im=scene.textures.get(key).getSourceImage();return n+im.width*im.height*4;},0);
   if(bytes>64*1024*1024)throw Error('Body cache exceeded its soft budget without excess live references: '+bytes);
   return {atlases:keys.length,bytes};
  }));
  if(pass===0){
   await page.evaluate(()=>{const scene=cacheReview.game.scene.getScene('aquatic');cacheReview.previousBody=scene.me;scene.scene.restart();});
   await page.waitForFunction(()=>{const scene=cacheReview.game.scene.getScene('aquatic');return scene.me!==cacheReview.previousBody&&scene.children.list.some(o=>o.getData?.('aqPlayerState'));},{},{timeout:60000});
  }
 }
 if(errors.length)throw Error(errors.join('\n'));
 writeFileSync(out+'/body-cache-report.json',JSON.stringify({passes:report,sceneRestart:true,errors},null,2));
 console.log('Lazy body atlas cache stayed within 64 MiB before and after scene restart.',JSON.stringify(report));
}finally{await browser.close();}

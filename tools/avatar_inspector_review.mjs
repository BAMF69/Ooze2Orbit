// Exercise each independent control in the offline workbench and capture desktop/mobile inspection views.
import {chromium} from 'playwright';
import {resolve} from 'node:path';
import {readFileSync,writeFileSync} from 'node:fs';
const out=resolve(process.argv[2]||'build/avatar-inspector'),browser=await chromium.launch();
const errors=[],requests=[];
try{
  const page=await browser.newPage({viewport:{width:1500,height:1040}});
  page.on('pageerror',e=>{errors.push(e.message);console.log('INSPECTOR ERROR',e.stack)});page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.log('INSPECTOR ERROR',m.text())}});
  page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
  await page.goto('file:///'+resolve(out,'avatar-attachment-inspector.html').replaceAll('\\','/'));
  await page.waitForSelector('body[data-ready=true]');
  const parts=['Fins','Jaws','Plates','Gills','Endurance organ','Torrent tail','Toxic tendrils','Electric organ'];
  const back=page.locator('canvas[data-view=back]'),front=page.locator('canvas[data-view=front]');
  const pieces=async(canvas,n)=>page.waitForFunction(({view,n})=>document.querySelector(`canvas[data-view=${view}]`).dataset.focusPieces===String(n),{view:await canvas.getAttribute('data-view'),n});
  await pieces(back,7);
  const outcomes=[];
  for(const label of parts){
    await page.getByRole('button',{name:`Solo ${label}`,exact:true}).click();
    await page.waitForFunction(()=>document.getElementById('readout').dataset.selected.split(',').length===1);
    await pieces(back,label==='Jaws'?0:label==='Fins'?4:label==='Plates'?7:label==='Gills'||label==='Toxic tendrils'?2:1);
    const description=await page.locator('#mount-description').textContent();
    if(!description.trim())throw Error('Missing mounting description: '+label);
    outcomes.push({part:label,description});
  }
  await page.getByRole('button',{name:'Hide all',exact:true}).click();
  await page.waitForFunction(()=>[...document.querySelectorAll('canvas[data-view]')].every(c=>c.dataset.layers==='0'));
  await page.getByRole('checkbox',{name:'Show Jaws',exact:true}).check();
  await pieces(front,4);await pieces(back,0);
  await page.getByRole('button',{name:'Solo Plates',exact:true}).click();
  for(const [tier,count] of [['1',2],['2',4],['3',7]]){
    await page.getByRole('combobox',{name:'Plates tier',exact:true}).selectOption(tier);await pieces(back,count);
  }
  await page.getByRole('button',{name:'Pause',exact:true}).click();
  const paused=await back.evaluate(c=>c.toDataURL());await page.waitForTimeout(250);
  if(paused!==await back.evaluate(c=>c.toDataURL()))throw Error('Paused inspection changed');
  const initialPose=await back.getAttribute('data-pose');await page.getByRole('button',{name:'Next pose',exact:true}).click();
  await page.waitForFunction(initial=>document.querySelector('canvas[data-view=back]').dataset.pose!==initial,initialPose);
  await page.locator('#action').selectOption('dash');await page.waitForFunction(()=>document.getElementById('pose-name').textContent.includes('dash tuck'));
  await page.locator('#action').selectOption('chomp');await page.getByRole('checkbox',{name:'Reduced motion',exact:true}).check();
  await page.waitForFunction(()=>document.querySelector('canvas[data-view=front]').dataset.pose==='3');
  await page.getByRole('checkbox',{name:'Reduced motion',exact:true}).uncheck();
  for(const diet of ['herbivore','omnivore','carnivore'])await page.locator('#diet').selectOption(diet);
  await page.locator('#form').selectOption('4');
  if(!(await page.locator('#form-note').textContent()).includes('shares'))throw Error('Form 4 provisional art is not identified');
  await page.getByRole('button',{name:'Show all',exact:true}).click();
  await page.waitForFunction(()=>document.getElementById('readout').dataset.selected.split(',').length===8);
  if(!(await page.locator('#capacity').textContent()).includes('overcapacity'))throw Error('Inspection capacity is unclear');
  await page.getByRole('button',{name:'Reset',exact:true}).click();
  await page.getByRole('checkbox',{name:'Mount labels',exact:true}).check();
  await page.getByRole('checkbox',{name:'Selected part bounds',exact:true}).check();
  await page.getByRole('button',{name:'Pause',exact:true}).click();await page.waitForTimeout(80);
  await page.screenshot({path:resolve(out,'avatar-inspector-desktop.png'),fullPage:true});
  await page.getByText('Rig contract and current limitations',{exact:true}).click();
  const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Download rig + attachment schema',exact:true}).click();
  const schemaPath=resolve(out,'aquatic-attachment-schema-v1.json');await(await downloaded).saveAs(schemaPath);
  const schema=JSON.parse(readFileSync(schemaPath,'utf8'));
  if(schema.version!==1||Object.keys(schema.attachments).length!==8||!schema.rig.paths['spine.dorsal'].points.omnivore.back)throw Error('Incomplete schema export');
  const setupDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Download current setup',exact:true}).click();
  await(await setupDownload).saveAs(resolve(out,'avatar-inspection-setup.json'));
  await page.setViewportSize({width:375,height:812});await page.locator('#view').selectOption('back');
  await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(100);
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Mobile horizontal overflow');
  await page.screenshot({path:resolve(out,'avatar-inspector-phone.png')});
  if(requests.length)throw Error('Offline inspector made external requests');if(errors.length)throw Error(errors.join('\n'));
  writeFileSync(resolve(out,'avatar-inspector-report.json'),JSON.stringify({individualParts:outcomes,tiers:true,pause:true,step:true,dash:true,reducedChomp:true,
    diets:3,forms:[3,4],hideAll:true,showAll:true,schemaExport:true,setupExport:true,externalRequests:requests.length,errors},null,2));
  console.log('Attachment inspector passed: 8 solo/toggle controls, tiers, pause/step, actions, diets/forms, overlays, exports and mobile layout.');
}finally{await browser.close();}

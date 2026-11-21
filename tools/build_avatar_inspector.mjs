// Build an offline artifact using the same TypeScript rig/compiler as the game. No server or external assets.
import { build } from 'vite';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'..'),out=resolve(process.argv[2]||resolve(root,'build/avatar-inspector'));
mkdirSync(out,{recursive:true});
const result=await build({configFile:false,root,logLevel:'warn',build:{write:false,minify:true,target:'es2022',
  lib:{entry:resolve(root,'src/dev/avatarInspector.ts'),name:'AvatarInspector',formats:['iife']}}});
const output=Array.isArray(result)?result[0].output:result.output;
const code=output.find(item=>item.type==='chunk').code;
const data=name=>'data:image/png;base64,'+readFileSync(resolve(root,'public/assets/art',name)).toString('base64');
const assets={bodies:Object.fromEntries(['herbivore','omnivore','carnivore'].map(diet=>[diet,data(`aquatic_adaptable_${diet}_motion_v1.png`)])),organs:data('aquatic_player_organs_v1.png')};
const html=readFileSync(resolve(root,'tools/avatar_inspector.html'),'utf8').replace('__ASSET_JSON__',JSON.stringify(assets))
  .replace('__INSPECTOR_SCRIPT__',code.replaceAll('</script','<\\/script'));
const path=resolve(out,'avatar-attachment-inspector.html');writeFileSync(path,html);console.log('Built offline attachment inspector:',path);

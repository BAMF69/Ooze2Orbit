// Load only relevant body variants. A soft 64 MiB atlas budget never evicts referenced bodies.
import * as Phaser from 'phaser';
import type { AqCreature, LookFamily } from './creature';
import { EVOLUTION_CATALOG, evolutionProfile, familyForLook, type EvolutionSheet, type EvolutionProfile } from './evolutionArt';
import { torrentTextureKey } from './torrentArtwork';

const loaders=new WeakMap<Phaser.Scene,EvolutionTextures>();
// Textures survive scene shutdown. Keep ownership/LRU with the texture manager too.
const caches=new WeakMap<Phaser.Textures.TextureManager,{owned:Map<string,{bytes:number;used:number}>;serial:number}>();
const BUDGET=64*1024*1024;
const SHEETS=Object.values(EVOLUTION_CATALOG.profiles).flatMap(profile=>Object.values(profile.bodies));
export function evolutionTextures(scene:Phaser.Scene):EvolutionTextures {
  let loader=loaders.get(scene);
  if(!loader){loader=new EvolutionTextures(scene);loaders.set(scene,loader);}
  return loader;
}
export class EvolutionTextures {
  private pending=new Map<string,Promise<void>>();
  private failed=new Set<string>();
  private cache:{owned:Map<string,{bytes:number;used:number}>;serial:number};
  private warmed=new Set<string>();
  constructor(private scene:Phaser.Scene){
    let cache=caches.get(scene.textures);
    if(!cache){cache={owned:new Map(),serial:0};caches.set(scene.textures,cache);}
    this.cache=cache;
    scene.events.once('shutdown',()=>loaders.delete(scene));
  }
  private prepare(sheet:EvolutionSheet):void {
    const texture=this.scene.textures.get(sheet.key);
    sheet.rects.forEach(([x,y,w,h],i)=>{
      const [ox,oy]=sheet.offsets[i];texture.add(i,0,x,y,w,h)?.setTrim(384,384,ox,oy,w,h);
    });
    texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    const image=texture.getSourceImage() as HTMLImageElement;
    this.cache.owned.set(sheet.key,{bytes:image.width*image.height*4,used:++this.cache.serial});
  }
  load(sheet:EvolutionSheet):Promise<void>{
    if(this.scene.textures.exists(sheet.key)){const item=this.cache.owned.get(sheet.key);if(item)item.used=++this.cache.serial;return Promise.resolve();}
    if(this.pending.has(sheet.key))return this.pending.get(sheet.key)!;
    if(this.failed.has(sheet.key))return Promise.reject(Error(`Body atlas failed to load: ${sheet.file}`));
    const promise=new Promise<void>((resolve,reject)=>{
      const event=`filecomplete-image-${sheet.key}`;
      // The loader registers directly under the final key. A missing source must
      // never be renamed because Phaser returns its shared missing texture.
      const done=()=>{
        this.scene.load.off('loaderror',error);
        this.pending.delete(sheet.key);
        if(!this.scene.textures.exists(sheet.key)){
          this.failed.add(sheet.key);reject(Error(`Body atlas missing after load: ${sheet.file}`));return;
        }
        this.prepare(sheet);resolve();
      };
      const error=(file:{key:string})=>{if(file.key!==sheet.key)return;this.scene.load.off(event,done);this.scene.load.off('loaderror',error);this.pending.delete(sheet.key);this.failed.add(sheet.key);reject(Error(`Body atlas failed: ${sheet.file}`));};
      this.scene.load.once(event,done);this.scene.load.on('loaderror',error);
      this.scene.load.image(sheet.key,`assets/art/${sheet.file}`);
    });
    this.pending.set(sheet.key,promise);
    if(!this.scene.load.isLoading())this.scene.load.start();
    return promise;
  }
  warm(profile:EvolutionProfile):Promise<void>{return Promise.all(Object.values(profile.bodies).map(sheet=>this.load(sheet))).then(()=>{});}
  warmForm(family:LookFamily,form:number):Promise<void>{const profile=evolutionProfile(family,form);return profile?this.warm(profile):Promise.resolve();}
  ensure(c:AqCreature,look:string):string|undefined {
    const family=familyForLook(look),profile=evolutionProfile(family,c.form);
    if(!profile)return undefined;
    const sheet=profile.bodies[c.diet];
    // Diet choices for this form, and the next maturation, are ready before the normal division sequence.
    void this.load(sheet).catch(()=>{});
    for(const group of [profile,evolutionProfile(family,c.form+1)])if(group){
      const id=group.family+':'+group.form;
      if(!this.warmed.has(id)){this.warmed.add(id);void this.warm(group).catch(()=>{});}
    }
    return this.scene.textures.exists(sheet.key)?sheet.key:undefined;
  }
  trim(referenced:ReadonlySet<string>):void {
    // Adopt existing atlases too (including a renderer replaced through development hot reload).
    for(const sheet of SHEETS)if(this.scene.textures.exists(sheet.key)&&!this.cache.owned.has(sheet.key)){
      const image=this.scene.textures.get(sheet.key).getSourceImage() as HTMLImageElement;
      this.cache.owned.set(sheet.key,{bytes:image.width*image.height*4,used:++this.cache.serial});
    }
    for(const key of this.cache.owned.keys())if(!this.scene.textures.exists(key))this.cache.owned.delete(key);
    const bytesFor=(key:string,bodyBytes:number)=>{
      const tailKey=torrentTextureKey(key);
      if(!this.scene.textures.exists(tailKey))return bodyBytes;
      const tail=this.scene.textures.get(tailKey).getSourceImage() as HTMLCanvasElement;
      return bodyBytes+tail.width*tail.height*4;
    };
    let bytes=[...this.cache.owned].reduce((sum,[key,item])=>sum+bytesFor(key,item.bytes),0);
    if(bytes<=BUDGET)return;
    const unused=[...this.cache.owned].filter(([key])=>!referenced.has(key)).sort((a,b)=>a[1].used-b[1].used);
    for(const [key,item] of unused){if(bytes<=BUDGET)break;bytes-=bytesFor(key,item.bytes);this.scene.textures.remove(key);this.cache.owned.delete(key);}
  }
}

import { evolutionTextures, type EvolutionTextures } from './evolutionTextures';
import { evolutionProfile, familyForLook } from './evolutionArt';
import { bodyRig } from './avatarRig';
import { ADAPTABLE_DIETS, illustratedBody, avatarTexture } from './avatarVisual';
import { LandmarkEquipment } from './landmarkEquipment';
import avatarFrames from './avatarFrames.json';
import { playerPose, bodyWidth, type PlayerMotion } from './playerMotion';
import { FOOD_KINDS, foodPulse, murkAlpha } from './ambientMotion';
import { MOTION_RECTS } from './motionFrames';
import { wildlifeFrame } from './wildlifeMotion';
import { predatorFrame, PREDATOR_MOTION, swimRate } from './predatorMotion';
import { prepareWildlifeArt } from './newWildlifeArt';
// Projection remains authoritative: illustrated images follow the original simulation anchors.
import * as Phaser from 'phaser';
import type { AtlasLayout } from '../cell/atlas';
import type { AqCreature, Diet } from './creature';
import { equipmentTexture } from './equipmentArt';
export const AQ_SHEETS = [
  ...['herbivore','carnivore','omnivore'].map(diet=>({key:`aqPlayer-${diet}`,file:`player_${diet}`,cols:4,rows:3})),
  ...['darter','finray','spinefish','shellback'].map(file=>({key:`aqMotion-${file}`,file,cols:4,rows:3})),
  { key:'aqJellyMotion',file:'jellyfish',cols:4,rows:3 },
  { key:'aqEelMotion',file:'eel',cols:4,rows:3 },
  { key:'aqDeepmawMotion',file:'deepmaw',cols:4,rows:3 },
  { key:'aqSharkMotion',file:'shark',cols:4,rows:3 },
  { key:'aqHammerMotion',file:'hammer',cols:4,rows:3 },
  { key: 'aqHeroHD', file: 'hero', cols: 3, rows: 3 },
  { key: 'aqFaunaHD', file: 'fauna', cols: 4, rows: 3 },
  { key: 'aqPredatorsHD', file: 'predators', cols: 3, rows: 3 },
  { key: 'aqPropsHD', file: 'props', cols: 4, rows: 3 },
];
export const dietColumn = (diet: Diet): number => ['herbivore', 'carnivore', 'omnivore'].indexOf(diet);
export function preloadAquaticArt(scene: Phaser.Scene): void {
  if (!evolutionProfile('adaptable',3)) for (const diet of ADAPTABLE_DIETS) if (!scene.textures.exists(`aqAdaptable-${diet}HD`)) scene.load.image(`aqAdaptable-${diet}HDSource`, `assets/art/aquatic_adaptable_${diet}_motion_v1.png`);
  if (!scene.textures.exists('aqOrgansHD')) scene.load.image('aqOrgansHDSource', 'assets/art/aquatic_player_organs_v1.png');
  for (const s of AQ_SHEETS) scene.load.image(`${s.key}Source`, `assets/art/${['jellyfish','eel'].includes(s.file)?`aquatic_${s.file}_motion_v2.png`:(s.file.startsWith('player_')||['deepmaw','shark','hammer','darter','finray','spinefish','shellback'].includes(s.file))?`aquatic_${s.file}_motion_v1.png`:`aquatic_${s.file}_hd_v1.png`}`);
  for (const map of ['pond', 'lake', 'coast']) scene.load.image(`aqWater-${map}`, `assets/art/aquatic_${map}_hd_v1.png`);
}
export function prepareAquaticArt(scene: Phaser.Scene): void {
  prepareWildlifeArt(scene);
  if (!evolutionProfile('adaptable',3)) for (const diet of ADAPTABLE_DIETS) {
    const key = `aqAdaptable-${diet}HD`;
    if (scene.textures.exists(key)) continue;
    const t = scene.textures.get(`${key}Source`);
    scene.textures.renameTexture(`${key}Source`,key);
    avatarFrames.bodies[diet].forEach(([x,y,w,h], i) => {
      const [ox,oy] = avatarFrames.offsets[diet][i];
      t?.add(i,0,x,y,w,h)?.setTrim(384,384,ox,oy,w,h);
    });
    t?.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
  if (!scene.textures.exists('aqOrgansHD')) {
    const t = scene.textures.get('aqOrgansHDSource');
    scene.textures.renameTexture('aqOrgansHDSource','aqOrgansHD');
    avatarFrames.organs.forEach(([x,y,w,h], i) => t?.add(i,0,x,y,w,h));
    t?.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
  for (const s of AQ_SHEETS) {
    if (scene.textures.exists(s.key)) continue;
    const image = scene.textures.get(`${s.key}Source`).getSourceImage() as HTMLImageElement;
    const rects=MOTION_RECTS[s.file];
    if(rects){
      const texture=scene.textures.addImage(s.key,image);
      rects.forEach(([x,y,width,height],i)=>texture?.add(i,0,x,y,width,height)?.setTrim(384,384,(384-width)/2,(384-height)/2,width,height));
      texture?.setFilter(Phaser.Textures.FilterMode.LINEAR);
      continue;
    }
    scene.textures.addSpriteSheet(s.key, image, { frameWidth: Math.floor(image.width / s.cols), frameHeight: Math.floor(image.height / s.rows) })?.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
  for (const map of ['pond', 'lake', 'coast']) scene.textures.get(`aqWater-${map}`).setFilter(Phaser.Textures.FilterMode.LINEAR);
}
const FAUNA: Record<string, number> = { aprey: 0, afin: 1, aspine: 2, ashell: 3 };
const PREDATORS: Record<string, number> = { adeep: 0, ashark: 1, ahammer: 2 };
const PROPS: Record<string, number> = { algae: 0, plankton: 1, meat: 2, meatM: 2, meatL: 2, pod: 3, bloom: 3, rock: 4, weed: 5, log: 6, fins: 7, jaws: 8, plates: 9, gills: 10, endurance: 11, torrent: 11 };
export type AqArtView = 'front' | 'side' | 'back';
export function artView(direction: string): AqArtView { return direction.startsWith('front') ? 'front' : direction.startsWith('side') ? 'side' : 'back'; }
export const viewRow = (view: AqArtView): number => ({ front: 0, side: 1, back: 2 })[view];
interface Painted { anatomy?: LandmarkEquipment; swimAge:number; phase:number; biteSerial:number; biteAge:number; image: Phaser.GameObjects.Image; equipment?: Phaser.GameObjects.Image; shock?: Phaser.GameObjects.Graphics; halo?:Phaser.GameObjects.Ellipse; wake?:Phaser.GameObjects.Graphics; wasAirborne?:boolean; splashAge?:number }
export class AquaticIllustrations {
  private anchors: Phaser.GameObjects.Container;
  private evolution:EvolutionTextures;
  private paintings = new Map<Phaser.GameObjects.Sprite, Painted>();
  private backdrop: Phaser.GameObjects.Image;
  private props: AtlasLayout;
  private murk:Phaser.GameObjects.Graphics;
  private ambientClock=0;
  constructor(private scene: Phaser.Scene, private player: () => AqCreature, private water: () => { map: number; visible: boolean },
    private moving: () => boolean, private reduced: () => boolean, private rate: () => number = () => 1, private murkLeft:()=>number=()=>0,private playerMotion:()=>PlayerMotion=()=>({speed:0,dash:false,airborne:false,rising:false,stunned:false})) {
    this.evolution=evolutionTextures(scene);
    this.murk=scene.add.graphics().setDepth(4000);
    this.anchors = scene.add.container(0, 0).setVisible(false);
    this.backdrop = scene.add.image(0, 0, 'aqWater-pond').setDepth(-9).setOrigin(0);
    this.props = scene.cache.json.get('aprops_layout') as AtlasLayout;
    scene.events.on('postupdate', this.update, this);
    scene.events.once('shutdown', () => { scene.events.off('postupdate', this.update, this); for (const entry of this.paintings.values()) entry.anatomy?.destroy(); this.paintings.clear(); });
  }
  private update(_time: number, delta: number): void {
    if(this.moving())this.ambientClock+=Math.min(delta,80)*this.rate();
    const water = this.water();
    this.backdrop.setTexture(`aqWater-${['pond', 'lake', 'coast'][water.map] ?? 'pond'}`).setVisible(water.visible);
    const w = this.scene.scale.width, h = this.scene.scale.height;
    const cover = Math.max(w / this.backdrop.width, h / this.backdrop.height);
    this.backdrop.setScale(cover).setPosition((w - this.backdrop.displayWidth) / 2, (h - this.backdrop.displayHeight) / 2);
    this.murk.clear().setVisible(water.visible&&this.murkLeft()>0);
    if(water.visible&&this.murkLeft()>0){
      const alpha=murkAlpha(this.murkLeft());
      this.murk.fillStyle(0x263c0b,alpha).fillRect(0,0,w,h);
      for(let n=0;n<7;n++){
        const t=this.reduced()?0:this.ambientClock/6000;
        const x=(.5+.48*Math.sin(n*2.3+t))*w,y=(.5+.45*Math.cos(n*1.7+t))*h;
        for(let layer=3;layer>0;layer--)this.murk.fillStyle(0x719020,alpha*.045).fillEllipse(x,y,w*(.25+layer*.09),h*(.3+layer*.1));
      }
    }
    // Newly spawned pickups and sisters enter the same adapter without separate ownership paths.
    for (const obj of [...this.scene.children.list]) {
      if (!(obj instanceof Phaser.GameObjects.Sprite)) continue;
      const atlas = obj.texture.key;
      if (atlas === 'aparts') { this.anchors.add(obj); continue; }
      if (atlas !== 'aswim' && atlas !== 'aprops' && !(atlas in FAUNA) && !(atlas in PREDATORS)) continue;
      this.paintings.set(obj, { swimAge:0,phase:this.paintings.size*113,biteSerial:0,biteAge:Infinity,image: this.scene.add.image(0, 0, 'aqHeroHD') }); this.anchors.add(obj);
    }
    const usedEquipment = new Set<string>();
    for (const [spr, entry] of this.paintings) {
      if (!spr.scene) { entry.image.destroy(); entry.anatomy?.destroy(); entry.equipment?.destroy(); entry.shock?.destroy(); entry.halo?.destroy(); entry.wake?.destroy(); this.paintings.delete(spr); continue; }
      const atlas = spr.texture.key, direction = spr.anims.currentAnim?.key.split(':')[2] ?? 'back';
      let view = artView(direction), row = viewRow(view);
      const body = spr.getData('aqBody') as AqCreature | undefined;
      let texture = 'aqHeroHD', frame: number|string = row * 3 + dietColumn(body?.diet ?? this.player().diet);
      if (atlas in FAUNA) { texture = 'aqFaunaHD'; frame = row * 4 + FAUNA[atlas]; }
      else if (atlas in PREDATORS) { texture = 'aqPredatorsHD'; frame = row * 3 + PREDATORS[atlas]; }
      else if (atlas === 'aprops') {
        const original = Number(spr.frame.name);
        const kind = this.props.rows.find(r => original >= r.first_frame && original < r.first_frame + r.frames)?.direction ?? direction;
        texture = 'aqPropsHD'; frame = PROPS[kind] ?? 0;
      }
      const species=spr.getData('aqSpecies'), item=spr.getData('aqItem');
      const isPlayer=spr.getData('aqPlayer')===true, motion=this.playerMotion();
      const preliminary=playerPose(motion,entry.biteAge,entry.swimAge,this.reduced(),row);
      const animationRate=atlas==='aswim'?(isPlayer?preliminary.rate:.6):swimRate(spr.getData('aqHunting')===true||spr.getData('aqFleeing')===true,species==='jellyfish');
      if(this.moving())entry.swimAge+=Math.min(delta,80)*this.rate()*animationRate;


      if(item==='toxicTendrils'||item==='electricOrgan'){texture=`aq-${item}`;frame='__BASE';}
      const predator=atlas in PREDATORS;
      if(predator||atlas in FAUNA||atlas==='aswim'){
        const serial=Number(spr.getData('aqBiteSerial')??0);
        if(serial!==entry.biteSerial){entry.biteSerial=serial;entry.biteAge=0;}
        else if(this.moving())entry.biteAge+=Math.min(delta,80)*this.rate();
      }
      if(predator){
        texture=atlas==='adeep'?'aqDeepmawMotion':atlas==='ashark'?'aqSharkMotion':'aqHammerMotion';
        frame=predatorFrame(entry.swimAge,row,entry.biteAge,this.reduced(),entry.phase);
      }
      if(species==='jellyfish'||species==='electricEel'){
        texture=species==='electricEel'?'aqEelMotion':'aqJellyMotion';
        frame=wildlifeFrame(entry.swimAge,row,entry.biteAge,this.reduced(),entry.phase,species==='jellyfish');
      }
      if(atlas in FAUNA&&typeof species==='string'&&['darter','finray','spinefish','shellback'].includes(species)){
        texture=`aqMotion-${species}`;
        frame=predatorFrame(entry.swimAge,row,entry.biteAge,this.reduced(),entry.phase);
      }
      const pose=playerPose(motion,entry.biteAge,entry.swimAge,this.reduced(),row);
      if(atlas==='aswim'){
        if(isPlayer){row=pose.row;view=row===1?'side':row===0?'front':'back';}
        const look=direction.slice(artView(direction).length);
        if(body){
          const ready=this.evolution.ensure(body,look);
          const profile=evolutionProfile(familyForLook(look),body.form);
          texture=ready??(profile?(entry.image.getData('aqAuthoredBody')?entry.image.texture.key:`aqPlayer-${body.diet}`):avatarTexture(body,look));
          if(ready)entry.image.setData('aqAuthoredBody',true);
        } else texture=`aqPlayer-${this.player().diet}`;
        frame=row*4+(isPlayer?pose.column:[0,1,2,1][Math.floor(entry.swimAge/160)%4]);
        if(this.reduced()&&!isPlayer)frame=row*4+1;
      }
      const swim = atlas !== 'aprops' && !this.reduced();
      const phase = entry.swimAge / 180 + entry.phase * .01;
      const wriggle = swim ? Math.sin(phase) * .025 : 0;
      const sync = (image: Phaser.GameObjects.Image, key: string, f: number | string, depth: number) => {
        image.setTexture(key, f).setOrigin(spr.originX,spr.originY).setPosition(spr.x, spr.y).setVisible(spr.visible).setAlpha(spr.alpha)
          .setDisplaySize(Math.abs(spr.displayWidth) * (1 + wriggle), Math.abs(spr.displayHeight) * (1 - wriggle))
          .setRotation(spr.rotation + (swim ? wriggle * .5 : 0)).setFlipX(spr.flipX).setFlipY(spr.flipY).setDepth(depth);
        if (spr.isTinted) image.setTint(spr.tintTopLeft); else image.clearTint();
      };
      sync(entry.image, texture, frame, spr.depth + .01);
      if(item==='weed'||item==='bloom'){
        const sway=this.reduced()?0:Math.sin(this.ambientClock/1500+entry.phase*.01);
        entry.image.setRotation(spr.rotation+sway*.085).setDisplaySize(entry.image.displayWidth*(1+sway*.06),entry.image.displayHeight*(1-sway*.025));
      }
      if(FOOD_KINDS.has(item)){
        const pulse=foodPulse(this.ambientClock,entry.phase*.01,this.reduced());
        entry.image.setDisplaySize(entry.image.displayWidth*pulse,entry.image.displayHeight*pulse);
        entry.halo??=this.scene.add.ellipse(0,0,10,10);
        const meat=String(item).startsWith('meat'),color=meat?0xffb082:0xc9ff78;
        entry.halo.setPosition(spr.x,spr.y+(spr.originY===1?-entry.image.displayHeight*.45:0))
          .setDisplaySize(entry.image.displayWidth*1.45,entry.image.displayHeight*.65)
          .setFillStyle(color,.025+(pulse-1)*.1).setStrokeStyle(1,color,.06+(pulse-1)*.15)
          .setDepth(spr.depth-.01).setVisible(spr.visible).setAlpha(spr.alpha);
      }
      if(['fins','jaws','plates','gills','endurance','torrent','toxicTendrils','electricOrgan'].includes(item)){
        const pulse=this.reduced()?1.05:1.05+.06*Math.sin(this.ambientClock/650+entry.phase);
        entry.image.setDisplaySize(entry.image.displayWidth*pulse,entry.image.displayHeight*pulse);
        entry.image.setY(spr.y+(this.reduced()?0:Math.sin(this.ambientClock/800+entry.phase)*3));
        entry.halo??=this.scene.add.ellipse(0,0,10,10);
        entry.halo.setPosition(entry.image.x,entry.image.y).setDisplaySize(entry.image.displayWidth*1.3,entry.image.displayHeight*1.1)
          .setFillStyle(0xffe5a0,.13).setStrokeStyle(1,0xffefbd,.4).setDepth(spr.depth-.01).setVisible(spr.visible).setAlpha(spr.alpha);
      }
      if(species==='electricEel') {
        const attack={bite:entry.biteAge<220,shock:Number(spr.getData('aqShockLeft')??0)>0};
        if(attack.bite&&!this.reduced())entry.image.displayWidth*=1+.12*Math.sin(Math.PI*entry.biteAge/220);
        entry.shock??=this.scene.add.graphics();
        const g=entry.shock;g.clear().setVisible(spr.visible&&attack.shock).setDepth(spr.depth+.03);
        if(attack.shock){
          const radius=Math.max(entry.image.displayWidth*1.2,40);
          g.lineStyle(this.reduced()?2:3,0xb5faff,.95);
          for(let ray=0;ray<7;ray++){
            const angle=ray*Math.PI*2/7, pulse=this.reduced()?0:Math.sin(entry.biteAge*.035+ray)*.15;
            g.beginPath();
            for(let step=0;step<5;step++){
              const a=angle+(step%2? .16+pulse:-.12),r=radius*(.25+step*.2);
              const x=spr.x+Math.cos(a)*r,y=spr.y+Math.sin(a)*r*.65;
              if(step===0)g.moveTo(x,y);else g.lineTo(x,y);
            }g.strokePath();
          }
          g.lineStyle(1,0xffe278,.7).strokeEllipse(spr.x,spr.y,radius*1.8,radius*1.1);
        }
        entry.image.setData('aqAttack',attack.shock?'shock':attack.bite?'bite':'swim');
      }

      entry.image.setData('aqAnchor',spr).setData('aqSource',atlas).setData('aqSpecies',species??null).setData('aqBiteAge',entry.biteAge).setData('aqSwimRate',animationRate).setData('aqSwimAge',entry.swimAge);
      if(predator&&entry.biteAge<PREDATOR_MOTION.openMs&&!this.reduced()) {
        const pulse=Math.sin(Math.PI*entry.biteAge/PREDATOR_MOTION.openMs)*PREDATOR_MOTION.lunge;
        entry.image.setDisplaySize(entry.image.displayWidth*(1+pulse),entry.image.displayHeight*(1+pulse));
      }
      if (atlas === 'aswim') {
        const c = body ?? { ...this.player(), parts: [], uniques: [] };
        const gearPose=isPlayer?pose.column:Number(frame)%4;
        const width=bodyWidth(c)*(isPlayer?pose.width:1),height=isPlayer?pose.height:1;
        entry.image.setDisplaySize(entry.image.displayWidth*width,entry.image.displayHeight*height)
          .setRotation(entry.image.rotation+(isPlayer?pose.tilt:0));
        const look = direction.slice(artView(direction).length);
        if (illustratedBody(c, look) && texture===avatarTexture(c,look)) {
          entry.equipment?.setVisible(false);
          entry.anatomy ??= new LandmarkEquipment(this.scene);
          entry.anatomy.update(entry.image,c,view,gearPose,entry.swimAge,isPlayer&&pose.state==='dash',this.reduced(),bodyRig(familyForLook(look),c.form));
        } else {
          entry.anatomy?.hide();
          const key = equipmentTexture(this.scene,c,view,look,gearPose,isPlayer&&pose.state==='dash');
          usedEquipment.add(key);
          entry.equipment ??= this.scene.add.image(0,0,key);
          sync(entry.equipment,key,'__BASE',spr.depth+.02);
          entry.equipment.setDisplaySize(entry.equipment.displayWidth*width,entry.equipment.displayHeight*height)
            .setRotation(entry.image.rotation).setX(entry.image.x+(this.reduced()?0:(gearPose===0?-1:gearPose===2?1:0)*entry.image.displayWidth*.025));
        }
        if(isPlayer){
          entry.image.setData('aqPlayerState',pose.state);
          if(this.moving()){
            if(entry.wasAirborne&&!motion.airborne)entry.splashAge=0;
            else entry.splashAge=(entry.splashAge??Infinity)+Math.min(delta,80)*this.rate();
            entry.wasAirborne=motion.airborne;
          }
          entry.wake??=this.scene.add.graphics();const g=entry.wake;
          g.clear().setVisible(spr.visible).setDepth(spr.depth-.01);
          const x=spr.x,y=spr.y,bw=entry.image.displayWidth,bh=entry.image.displayHeight;
          if(!this.reduced()&&(pose.state==='dash'||pose.state==='swim')){
            const strong=pose.state==='dash';g.lineStyle(strong?2:1,0xb2f4ff,strong?.7:.25);
            for(let n=0;n<(strong?7:3);n++){
              const t=((this.ambientClock/(strong?360:1100)+n*.23)%1);
              const side=n%2?1:-1;
              g.strokeCircle(x+side*bw*(.2+n*.035),y+bh*(.3+t*.55),1+t*(strong?3:1.5));
              if(strong)g.lineBetween(x+side*bw*.38,y+bh*.1,x+side*bw*.55,y+bh*(.45+t*.45));
            }
          }
          if(pose.state==='stunned'){
            g.lineStyle(2,0xc8fcff,.8);
            for(let n=0;n<10;n++){
              const a=n*Math.PI/5,t=this.reduced()?0:this.ambientClock/180;
              const r=bw*(.6+.07*Math.sin(t+n));
              g.lineBetween(x+Math.cos(a)*r,y+Math.sin(a)*r,x+Math.cos(a+.15)*r*.8,y+Math.sin(a+.15)*r*.8);
            }
            g.fillStyle(0x205c72,.3).fillEllipse(x,y,bw*1.7,bh*1.5);
          }
          if((entry.splashAge??Infinity)<500){
            const t=(entry.splashAge??0)/500;
            g.lineStyle(3,0xd8fbff,1-t).strokeEllipse(x,y+bh*.3,bw*(1+t),bh*(.2+t*.3));
            if(!this.reduced())for(let n=0;n<8;n++){const a=n*Math.PI/4;g.fillStyle(0xc9f6ff,1-t).fillCircle(x+Math.cos(a)*bw*t,y+bh*.3-Math.sin(a)*bh*t+bh*t*t,2);}
          }
        }

      } else { entry.equipment?.setVisible(false); entry.anatomy?.hide(); }
    }
    for (const obj of this.scene.children.list) {
      if (obj instanceof Phaser.GameObjects.Image || obj instanceof Phaser.GameObjects.Sprite) usedEquipment.add(obj.texture.key);
    }
    this.evolution.trim(new Set([...this.paintings.values()].map(entry=>entry.image.texture.key)));
    const cached = this.scene.textures.getTextureKeys().filter(key => key.startsWith('aqEquipment:'));
    let excess = cached.length - 32;
    for (const key of cached) if (excess > 0 && !usedEquipment.has(key)) { this.scene.textures.remove(key); excess--; }
  }
}

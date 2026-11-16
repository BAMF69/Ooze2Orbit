import { prepareWildlifeArt } from './newWildlifeArt';
// Projection remains authoritative: illustrated images follow the original simulation anchors.
import * as Phaser from 'phaser';
import type { AtlasLayout } from '../cell/atlas';
import type { AqCreature, Diet } from './creature';
import { equipmentTexture } from './equipmentArt';
export const AQ_SHEETS = [
  { key: 'aqHeroHD', file: 'hero', cols: 3, rows: 3 },
  { key: 'aqFaunaHD', file: 'fauna', cols: 4, rows: 3 },
  { key: 'aqPredatorsHD', file: 'predators', cols: 3, rows: 3 },
  { key: 'aqPropsHD', file: 'props', cols: 4, rows: 3 },
];
export const dietColumn = (diet: Diet): number => ['herbivore', 'carnivore', 'omnivore'].indexOf(diet);
export function preloadAquaticArt(scene: Phaser.Scene): void {
  for (const s of AQ_SHEETS) scene.load.image(`${s.key}Source`, `assets/art/aquatic_${s.file}_hd_v1.png`);
  for (const map of ['pond', 'lake', 'coast']) scene.load.image(`aqWater-${map}`, `assets/art/aquatic_${map}_hd_v1.png`);
}
export function prepareAquaticArt(scene: Phaser.Scene): void {
  prepareWildlifeArt(scene);
  for (const s of AQ_SHEETS) {
    if (scene.textures.exists(s.key)) continue;
    const image = scene.textures.get(`${s.key}Source`).getSourceImage() as HTMLImageElement;
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
interface Painted { image: Phaser.GameObjects.Image; equipment?: Phaser.GameObjects.Image }
export class AquaticIllustrations {
  private anchors: Phaser.GameObjects.Container;
  private paintings = new Map<Phaser.GameObjects.Sprite, Painted>();
  private backdrop: Phaser.GameObjects.Image;
  private props: AtlasLayout;
  private swimClock = 0;
  constructor(private scene: Phaser.Scene, private player: () => AqCreature, private water: () => { map: number; visible: boolean },
    private moving: () => boolean, private reduced: () => boolean, private rate: () => number = () => 1) {
    this.anchors = scene.add.container(0, 0).setVisible(false);
    this.backdrop = scene.add.image(0, 0, 'aqWater-pond').setDepth(-9).setOrigin(0);
    this.props = scene.cache.json.get('aprops_layout') as AtlasLayout;
    scene.events.on('postupdate', this.update, this);
    scene.events.once('shutdown', () => { scene.events.off('postupdate', this.update, this); this.paintings.clear(); });
  }
  private update(_time: number, delta: number): void {
    if (this.moving()) this.swimClock += Math.min(delta, 80) * this.rate();
    const water = this.water();
    this.backdrop.setTexture(`aqWater-${['pond', 'lake', 'coast'][water.map] ?? 'pond'}`).setVisible(water.visible);
    const w = this.scene.scale.width, h = this.scene.scale.height;
    const cover = Math.max(w / this.backdrop.width, h / this.backdrop.height);
    this.backdrop.setScale(cover).setPosition((w - this.backdrop.displayWidth) / 2, (h - this.backdrop.displayHeight) / 2);
    // Newly spawned pickups and sisters enter the same adapter without separate ownership paths.
    for (const obj of [...this.scene.children.list]) {
      if (!(obj instanceof Phaser.GameObjects.Sprite)) continue;
      const atlas = obj.texture.key;
      if (atlas === 'aparts') { this.anchors.add(obj); continue; }
      if (atlas !== 'aswim' && atlas !== 'aprops' && !(atlas in FAUNA) && !(atlas in PREDATORS)) continue;
      this.paintings.set(obj, { image: this.scene.add.image(0, 0, 'aqHeroHD') }); this.anchors.add(obj);
    }
    for (const [spr, entry] of this.paintings) {
      if (!spr.scene) { entry.image.destroy(); entry.equipment?.destroy(); this.paintings.delete(spr); continue; }
      const atlas = spr.texture.key, direction = spr.anims.currentAnim?.key.split(':')[2] ?? 'back';
      const view = artView(direction), row = viewRow(view);
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
      if(species==='jellyfish'||species==='electricEel'){texture=`aq-${species}`;frame='__BASE';}
      if(item==='toxicTendrils'||item==='electricOrgan'){texture=`aq-${item}`;frame='__BASE';}
      const swim = atlas !== 'aprops' && !this.reduced();
      const phase = this.swimClock / 180 + this.paintings.size * .01;
      const wriggle = swim ? Math.sin(phase) * .025 : 0;
      const sync = (image: Phaser.GameObjects.Image, key: string, f: number | string, depth: number) => {
        image.setTexture(key, f).setPosition(spr.x, spr.y).setVisible(spr.visible).setAlpha(spr.alpha)
          .setDisplaySize(Math.abs(spr.displayWidth) * (1 + wriggle), Math.abs(spr.displayHeight) * (1 - wriggle))
          .setRotation(spr.rotation + (swim ? wriggle * .5 : 0)).setFlipX(spr.flipX).setFlipY(spr.flipY).setDepth(depth);
        if (spr.isTinted) image.setTint(spr.tintTopLeft); else image.clearTint();
      };
      sync(entry.image, texture, frame, spr.depth + .01);
      if (atlas === 'aswim') {
        const c = body ?? { ...this.player(), parts: [], uniques: [] };
        const key = equipmentTexture(this.scene, c, view, direction.slice(view.length));
        entry.equipment ??= this.scene.add.image(0, 0, key);
        sync(entry.equipment, key, '__BASE', spr.depth + .02);
      } else entry.equipment?.setVisible(false);
    }
  }
}

// Original generated biological illustrations; draw transform remains independent of simulation.
// Objects are pooled by simulation ID; ownership badges are both color and shape coded.
import * as Phaser from "phaser";
import type { I18n } from "../../core/i18n";
import { placementIssue, route, type Battle, type Cell } from "./wars";
import { WAR, TOWERS, type TowerKind } from "./warsTuning";
import type { HdWarsLayout } from "./hdLayout";

export const CIV_ART = { source: "civHDSource", pieces: "civHDPieces", terrain: "civHDTerrain" };
export function preloadCivArt(scene: Phaser.Scene): void {
  scene.load.image(CIV_ART.source, "assets/art/civ_illustrated_hd_v1.png");
  scene.load.image(CIV_ART.terrain, "assets/art/civ_terrain_hd_v1.png");
}
export function prepareCivArt(scene: Phaser.Scene): void {
  if (!scene.textures.exists(CIV_ART.pieces)) {
    const source = scene.textures.get(CIV_ART.source).getSourceImage() as HTMLImageElement;
    scene.textures.addSpriteSheet(CIV_ART.pieces, source, { frameWidth: Math.floor(source.width / 4), frameHeight: Math.floor(source.height / 4) });
  }
  scene.textures.get(CIV_ART.pieces).setFilter(Phaser.Textures.FilterMode.LINEAR);
  scene.textures.get(CIV_ART.terrain).setFilter(Phaser.Textures.FilterMode.LINEAR);
}
export interface CivPaintState { selection: string; cursor: Cell; tower: TowerKind; diet: string; reduced: boolean; target: Cell | null }
const TOWER_FRAME = { thorn: 0, mortar: 1, frost: 2 };
const SHOT_COLOR = { thorn: 0xf5e8bc, mortar: 0xf5bd62, frost: 0x9feaf0 };
const TEAM = [0x81dfd1, 0xf2a189];
export function civPoint(b: HdWarsLayout, side: number, c: Cell): Cell {
  const origin = side === 0 ? b.left : b.right;
  return { x: origin.x + (c.x + 0.5) * b.tile, y: origin.y + (c.y + 0.5) * b.tile };
}
export class CivIllustrations {
  private ground: Phaser.GameObjects.Image;
  private floor: Phaser.GameObjects.Graphics;
  private fx: Phaser.GameObjects.Graphics;
  private images = new Map<string, Phaser.GameObjects.Image>();
  private labels: Phaser.GameObjects.Text[];
  private seen = new Set<string>();
  constructor(private scene: Phaser.Scene, private i18n: I18n) {
    prepareCivArt(scene);
    this.ground = scene.add.image(0, 0, CIV_ART.terrain).setOrigin(0).setDepth(-10);
    this.floor = scene.add.graphics().setDepth(-2); this.fx = scene.add.graphics().setDepth(8);
    this.labels = ["your_maze", "rival_maze"].map(key => scene.add.text(0, 0, this.i18n.t(`civ.hd.${key}`), {
      fontFamily: "system-ui, sans-serif", fontSize: "14px", fontStyle: "bold", color: "#f8e9bd", stroke: "#102c2c", strokeThickness: 4,
    }).setDepth(9).setResolution(2));
    scene.events.once("shutdown", () => this.images.clear());
  }
  private paint(key: string, frame: number, p: Cell, size: number, depth = 4, rotation = 0, alpha = 1, tint = 0xffffff): void {
    let image = this.images.get(key);
    if (!image) { image = this.scene.add.image(p.x, p.y, CIV_ART.pieces, frame); this.images.set(key, image); }
    if (key === "hero" || key.startsWith("unit-")) {
      if (p.x < image.x - .01) image.setFlipX(true);
      else if (p.x > image.x + .01) image.setFlipX(false);
    }
    image.setFrame(frame).setPosition(p.x, p.y).setDisplaySize(size, size).setDepth(depth).setRotation(rotation).setAlpha(alpha).setTint(tint).setVisible(true);
    this.seen.add(key);
  }
  private badge(p: Cell, tile: number, side: number): void {
    const g = this.floor, r = Math.max(2, tile * 0.11), y = p.y + tile * 0.24;
    g.fillStyle(0x0a242b, 0.7).fillEllipse(p.x, p.y + tile * .31, tile * .7, tile * .2);
    g.lineStyle(Math.max(1, tile * .045), TEAM[side]);
    if (side === 0) g.strokeCircle(p.x, y, r);
    else { g.beginPath(); g.moveTo(p.x, y - r); g.lineTo(p.x + r, y); g.lineTo(p.x, y + r); g.lineTo(p.x - r, y); g.closePath(); g.strokePath(); }
  }
  draw(s: Battle, b: HdWarsLayout, state: CivPaintState): void {
    const w = this.scene.scale.width, h = this.scene.scale.height, cover = Math.max(w / this.ground.width, h / this.ground.height);
    this.ground.setScale(cover).setPosition((w - this.ground.displayWidth) / 2, (h - this.ground.displayHeight) / 2);
    const g = this.floor, fx = this.fx; g.clear(); fx.clear(); this.seen.clear();
    g.fillStyle(0x092c32, .21).fillRect(0, 0, w, h);
    if (b.tile <= 0) { this.labels.forEach(label => label.setVisible(false)); this.images.forEach(image => image.setVisible(false)); return; }
    const tile = b.tile, clock = state.reduced ? 0 : s.clock;
    s.sides.forEach((side, n) => {
      const origin = n === 0 ? b.left : b.right, width = tile * WAR.cols, height = tile * WAR.rows;
      g.fillStyle(0x081f24, .92).fillRoundedRect(origin.x - 6, origin.y - 5, width + 12, height + 12, 10);
      g.lineStyle(2, TEAM[n], .8).strokeRoundedRect(origin.x - 6, origin.y - 5, width + 12, height + 12, 10);
      this.labels[n].setVisible(true).setText(this.i18n.t(`civ.hd.${n === 0 ? "your_maze" : "rival_maze"}`)).setPosition(origin.x, origin.y - 25);
      for (let y = 0; y < WAR.rows; y++) for (let x = 0; x < WAR.cols; x++) {
        const px = origin.x + x * tile, py = origin.y + y * tile;
        g.fillStyle((x + y) % 2 ? 0x49634c : 0x405b47, .91).fillRoundedRect(px + 1, py + 1, tile - 2, tile - 2, Math.min(5, tile / 7));
        g.lineStyle(1, 0x8ba176, .18).lineBetween(px + 4, py + 3, px + tile - 4, py + 3);
      }
      const path = route(side.towers);
      g.lineStyle(Math.max(2, tile * .18), 0xc7cf9d, .18);
      for (let j = 1; j < path.length; j++) { const a = civPoint(b, n, path[j - 1]), z = civPoint(b, n, path[j]); g.lineBetween(a.x, a.y, z.x, z.y); }
      // Quiet directional chevrons make the lane understandable without implying a new mechanic.
      g.lineStyle(Math.max(1, tile * .035), 0xe7e4ba, .44);
      for (let j = 1; j < path.length; j += 3) {
        const p = civPoint(b, n, path[j]), before = civPoint(b, n, path[j - 1]), dx = (p.x - before.x) / tile, dy = (p.y - before.y) / tile, r = tile * .07;
        g.lineBetween(p.x - dx * r - dy * r, p.y - dy * r + dx * r, p.x + dx * r, p.y + dy * r);
        g.lineBetween(p.x - dx * r + dy * r, p.y - dy * r - dx * r, p.x + dx * r, p.y + dy * r);
      }
      for (const t of side.towers) {
        const p = civPoint(b, n, t); this.badge(p, tile, n);
        this.paint(`tower-${t.id}`, TOWER_FRAME[t.kind], { x: p.x, y: p.y - tile * .08 }, tile * 1.05, 4 + t.y * .01, 0, t.build > 0 ? .6 : 1);
        if (t.build > 0) {
          fx.lineStyle(2, 0xf1cc79, .9).strokeRect(p.x - tile * .35, p.y - tile * .35, tile * .7, tile * .7);
          fx.fillStyle(0x0d232a).fillRoundedRect(p.x - tile * .35, p.y + tile * .33, tile * .7, 4, 2);
          fx.fillStyle(0xf2d68b).fillRect(p.x - tile * .35, p.y + tile * .33, tile * .7 * (1 - t.build / WAR.buildSeconds), 4);
        }
        if (t.shot) {
          const end = civPoint(b, n, t.shot), color = SHOT_COLOR[t.kind];
          fx.lineStyle(t.kind === "frost" ? 3 : 2, color, .75).lineBetween(p.x, p.y - tile * .15, end.x, end.y);
          fx.fillStyle(color).fillEllipse((p.x + end.x) / 2, (p.y + end.y) / 2 - (t.kind === "mortar" ? tile * .3 : 0), tile * .16, tile * .09);
          fx.lineStyle(2, color, .7).strokeCircle(end.x, end.y, tile * (t.kind === "mortar" ? .34 : .16));
        }
      }
      const home = civPoint(b, n, WAR.exit); this.badge(home, tile * 1.2, n);
      this.paint(`base-${n}`, side.hp > 0 ? 3 : 15, { x: home.x, y: home.y - tile * .07 }, tile * 1.22, 5);
      const worker = civPoint(b, n, { x: 9, y: 6 }), farmer = civPoint(b, n, { x: 8, y: 6 });
      this.paint(`ore-${n}`, 13, { x: worker.x, y: worker.y - tile * .15 }, tile * .65, 3);
      this.paint(`gatherer-${n}`, 11, { x: worker.x - tile * .2 + Math.sin(clock * 2) * tile * .06, y: worker.y + tile * .14 }, tile * .62, 5);
      const builder = civPoint(b, n, { x: 10, y: 6 });
      this.paint(`builder-${n}`, 7, builder, tile * .7, 5, Math.sin(clock * 2.5) * .025);
      if ((side.farmers ?? 0) > 0) {
        this.paint(`food-${n}`, 14, { x: farmer.x, y: farmer.y - tile * .1 }, tile * .65, 3);
        this.paint(`farmer-${n}`, 12, { x: farmer.x - tile * .25, y: farmer.y + tile * .12 }, tile * .65, 5);
      }
    });
    for (const unit of s.units) {
      const p = civPoint(b, unit.target, unit), offset = (unit.id % 3 - 1) * tile * .12, size = tile * (unit.kind === "shell" ? .95 : .78), bob = Math.sin(clock * (unit.kind === "shell" ? 5 : 10) + unit.id) * tile * .025;
      p.y += offset; this.badge(p, tile, unit.target === 0 ? 1 : 0);
      this.paint(`unit-${unit.id}`, unit.kind === "runner" ? 8 : unit.kind === "shell" ? 9 : 10, { x: p.x, y: p.y + bob }, size, 6, state.reduced ? 0 : Math.sin(clock * 5 + unit.id) * .03, 1, unit.slow > 0 ? 0xb5e9ff : 0xffffff);
      fx.fillStyle(0x081d24).fillRoundedRect(p.x - tile * .3, p.y - tile * .4, tile * .6, 4, 2);
      fx.fillStyle(unit.target === 0 ? 0xf8b094 : 0x9ce3cf).fillRect(p.x - tile * .3, p.y - tile * .4, tile * .6 * Math.max(0, unit.hp / unit.maxHp), 4);
    }
    const hp = civPoint(b, 0, s.hero);
    if (!s.hero.respawn) {
      const heroFrame = state.diet === "herbivore" ? 4 : state.diet === "carnivore" ? 5 : 6;
      this.badge(hp, tile * 1.3, 0);
      this.paint("hero", heroFrame, { x: hp.x, y: hp.y - tile * .04 }, tile * 1.1, 7,
        state.reduced ? 0 : s.hero.cooldown > .4 ? -.08 : Math.sin(clock * 4) * .012, 1, s.hero.hurt > WAR.heroRecovery - .2 ? 0xffceb9 : 0xffffff);
      if (s.hero.climb) { fx.lineStyle(2, 0xf4e6b4); fx.lineBetween(hp.x - tile * .3, hp.y + tile * .22, hp.x - tile * .36, hp.y + tile * .36); fx.lineBetween(hp.x + tile * .2, hp.y + tile * .22, hp.x + tile * .27, hp.y + tile * .36); }
      if (s.hero.ability > WAR.abilityCooldown - .45) {
        const phase = (WAR.abilityCooldown - s.hero.ability) / .45;
        fx.lineStyle(3, 0xffe3a4, .65 * (1 - phase)).strokeCircle(hp.x, hp.y, tile * WAR.abilityRange * (state.reduced ? .7 : phase));
      }
    }
    const c = civPoint(b, 0, state.selection === "builder" ? state.cursor : s.hero);
    const issue = state.selection === "builder" ? placementIssue(s, state.cursor, state.tower) : null;
    const color = issue ? 0xf5ad9a : 0xf8e3a4;
    fx.lineStyle(2, color, .95).strokeRoundedRect(c.x - tile * .47, c.y - tile * .47, tile * .94, tile * .94, Math.min(6, tile / 7));
    if (state.selection === "builder") {
      fx.lineStyle(1, color, .23).strokeCircle(c.x, c.y, tile * TOWERS[state.tower].range);
      if (issue) { fx.lineStyle(2, color); fx.lineBetween(c.x - tile * .14, c.y - tile * .14, c.x + tile * .14, c.y + tile * .14); fx.lineBetween(c.x + tile * .14, c.y - tile * .14, c.x - tile * .14, c.y + tile * .14); }
      else this.paint("preview", TOWER_FRAME[state.tower], c, tile, 7, 0, .38);
    }
    if (state.target && state.selection === "hero") { const target = civPoint(b, 0, state.target); fx.lineStyle(2, 0xece4ad, .75).strokeCircle(target.x, target.y, tile * .2); }
    for (const [key, image] of this.images) if (!this.seen.has(key)) { image.destroy(); this.images.delete(key); }
  }
}

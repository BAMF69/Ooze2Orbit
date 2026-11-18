import { illustratedBody, avatarTexture } from './avatarVisual';
import { evolutionTextures } from './evolutionTextures';
import { familyForLook } from './evolutionArt';
import { drawAvatarPreview } from './avatarPreview';
import { dietColumn } from './illustrated';
import { equipmentTexture, paintAquaticEquipment } from './equipmentArt';
// Aquatic body previews and choices use the same split choreography as the cell stage.
import * as Phaser from "phaser";
import type { I18n } from "../../core/i18n";
import { Mitosis } from "../cell/mitosis";
import { bodyLook, lookScores, type AqCreature } from "./creature";
import type { AqDaughter } from "./division";
import { AQ } from "./tuning";
import { cellUi, node, preview } from "../cell/responsiveUi";

export interface AqLookContext { temper: { aggressive: number; cautious: number; adaptable: number }; kills: number; breaches: number }

export class AqDivisionPicker {
  private animation: Mitosis;
  private revision=0;
  private previewTextures: string[] = [];
  private objects: Phaser.GameObjects.GameObject[] = [];
  private borders: Phaser.GameObjects.Rectangle[] = [];
  private offers: readonly AqDaughter[] = [];
  private context!: AqLookContext;
  private index = 0;
  private native: HTMLDivElement;
  private nativeButtons: HTMLButtonElement[] = [];
  private cleaners: (() => void)[] = [];
  isOpen = false;
  get isAnimating(): boolean { return this.animation.isPlaying; }
  get isActive(): boolean { return this.isOpen || this.isAnimating; }

  constructor(private scene: Phaser.Scene, private i18n: I18n, private onChoose: (index: number) => void) {
    this.native = cellUi(scene, "cell-modal"); this.native.hidden = true;
    this.animation = new Mitosis(scene, i18n, AQ.mitosis, AQ.division,
      { grow: "aq.division_grow", split: "aq.division_split" });
  }

  start(parent: AqCreature, offers: readonly AqDaughter[], context: AqLookContext, reduced: boolean): void {
    this.close(); this.offers = offers; this.context = context; this.index = 0;
    const revision=this.revision;
    void Promise.all([parent,...offers.map(o=>o.creature)].map(c=>evolutionTextures(this.scene).warmForm(familyForLook(this.look(c)),c.form))).then(()=>{
      if(this.revision===revision&&this.isOpen)this.showNative();
    }).catch(()=>{});
    this.animation.startCustom(() => this.body(parent, AQ.mitosis.depth + 2),
      () => offers.map(d => this.body(d.creature, AQ.mitosis.depth + 2)), reduced);
  }

  update(dt: number): void { if (this.animation.update(dt)) this.showMenu(); }
  move(step: number): void { this.index = (this.index + step + this.offers.length) % this.offers.length; this.highlight(); }
  confirm(): number { return this.index; }
  close(): void {
    this.revision++;
    this.cleaners.forEach(f => f()); this.cleaners = []; this.native.replaceChildren(); this.native.hidden = true; this.nativeButtons = [];
    this.animation.close(); this.objects.forEach(o => o.destroy());
    this.previewTextures.forEach(key => this.scene.textures.remove(key)); this.previewTextures = [];
    this.objects = []; this.borders = []; this.offers = []; this.isOpen = false;
  }

  private look(c: AqCreature): string { return bodyLook(lookScores(this.context.temper, c, this.context.kills, this.context.breaches)).row; }

  private body(c: AqCreature, depth: number): Phaser.GameObjects.Sprite[] {
    if (illustratedBody(c,this.look(c))&&this.scene.textures.exists(avatarTexture(c,this.look(c)))) {
      const key = `aqDivisionPreview:${this.previewTextures.length}`;
      const t = this.scene.textures.createCanvas(key,384,384);
      if (!t) throw new Error('Cannot create aquatic division preview');
      drawAvatarPreview(t.context,this.scene,c,this.look(c)); t.refresh();
      this.previewTextures.push(key);
      const body = this.scene.add.sprite(0,0,key).setScrollFactor(0).setDepth(depth);
      body.setData('artScale',38/384); return [body];
    }
    const body = this.scene.add.sprite(0, 0, "aqHeroHD", 6 + dietColumn(c.diet)).setScrollFactor(0).setDepth(depth);
    const equipment = this.scene.add.sprite(0, 0, equipmentTexture(this.scene, c, "back", this.look(c))).setScrollFactor(0).setDepth(depth + 1);
    for (const spr of [body, equipment]) spr.setData("artScale", 38 / spr.width);
    return [body, equipment];
  }

  private showMenu(): void {
    this.isOpen = true;
    this.showNative(); return;
  }

  private showNative(): void {
    this.cleaners.forEach(clean=>clean());this.cleaners=[];this.native.replaceChildren();
    this.native.hidden = false; const panel = node("section", "", "cell-dialog"), cards = node("div", "", "cell-cards");
    panel.append(node("h2", this.i18n.t("aq.division_title")), cards, node("p", this.i18n.t("aq.division_controls")));
    this.nativeButtons = this.offers.map((d, index) => {
      const b = node("button", "", `cell-card ${d.creature.diet}`);
      if (illustratedBody(d.creature,this.look(d.creature))&&this.scene.textures.exists(avatarTexture(d.creature,this.look(d.creature)))) {
        const canvas = node('canvas'); canvas.width = 384; canvas.height = 384;
        canvas.className = 'cell-preview'; canvas.setAttribute('aria-hidden','true'); b.append(canvas);
        const ctx = canvas.getContext('2d');
        if (ctx) drawAvatarPreview(ctx,this.scene,d.creature,this.look(d.creature));
      } else {
      this.cleaners.push(preview(this.scene, b, [{ texture: "aqHeroHD", first: 6 + dietColumn(d.creature.diet) }], ctx => paintAquaticEquipment(ctx, d.creature, "back", this.look(d.creature))));
      }
      b.append(node("strong", `${index + 1}. ${this.i18n.t(`diet.${d.creature.diet}`)}`), node("span", `${d.stat} +${d.gain} (level ${d.creature.ups[d.stat]})`), node("span", d.cause), node("span", this.i18n.t("aq.division_inherits")));
      b.onclick = () => { if (this.isOpen) this.onChoose(index); }; cards.append(b); return b;
    });
    this.native.append(panel); this.highlight();
  }

  private highlight(): void { this.borders.forEach((b, i) => b.setStrokeStyle(i === this.index ? 3 : 1, i === this.index ? 0xffd27f : 0x64818a)); this.nativeButtons.forEach((b, n) => b.setAttribute("aria-pressed", String(n === this.index))); }
}

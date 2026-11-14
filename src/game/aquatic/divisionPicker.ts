// Aquatic body previews and choices use the same split choreography as the cell stage.
import * as Phaser from "phaser";
import type { I18n } from "../../core/i18n";
import { animKey, firstFrame, type AtlasLayout } from "../cell/atlas";
import { Mitosis } from "../cell/mitosis";
import { bodyLook, lookScores, type AqCreature } from "./creature";
import type { AqDaughter } from "./division";
import { AQ } from "./tuning";
import { cellUi, node, preview } from "../cell/responsiveUi";

export interface AqLookContext { temper: { aggressive: number; cautious: number; adaptable: number }; kills: number; breaches: number }

export class AqDivisionPicker {
  private animation: Mitosis;
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
    this.animation.startCustom(() => this.body(parent, AQ.mitosis.depth + 2),
      () => offers.map(d => this.body(d.creature, AQ.mitosis.depth + 2)), reduced);
  }

  update(dt: number): void { if (this.animation.update(dt)) this.showMenu(); }
  move(step: number): void { this.index = (this.index + step + this.offers.length) % this.offers.length; this.highlight(); }
  confirm(): number { return this.index; }
  close(): void {
    this.cleaners.forEach(f => f()); this.cleaners = []; this.native.replaceChildren(); this.native.hidden = true; this.nativeButtons = [];
    this.animation.close(); this.objects.forEach(o => o.destroy());
    this.objects = []; this.borders = []; this.offers = []; this.isOpen = false;
  }

  private body(c: AqCreature, depth: number): Phaser.GameObjects.Sprite[] {
    const look = bodyLook(lookScores(this.context.temper, c, this.context.kills, this.context.breaches));
    const body = this.scene.add.sprite(0, 0, "aswim").play(animKey("aswim", "swim", `back${look.row}`))
      .setScrollFactor(0).setDepth(depth);
    const layout = this.scene.cache.json.get("aparts_layout") as AtlasLayout;
    const layers = [...c.parts, ...c.uniques].map(part => this.scene.add.sprite(0, 0, "aparts", firstFrame(layout, "on", part))
      .setScrollFactor(0).setDepth(depth + 1));
    return [body, ...layers];
  }

  private showMenu(): void {
    this.isOpen = true;
    this.showNative(); return;
  }

  private showNative(): void {
    this.native.hidden = false; const panel = node("section", "", "cell-dialog"), cards = node("div", "", "cell-cards");
    panel.append(node("h2", this.i18n.t("aq.division_title")), cards, node("p", this.i18n.t("aq.division_controls")));
    const bodyLayout = this.scene.cache.json.get("aswim_layout") as AtlasLayout, parts = this.scene.cache.json.get("aparts_layout") as AtlasLayout;
    this.nativeButtons = this.offers.map((d, index) => {
      const look = bodyLook(lookScores(this.context.temper, d.creature, this.context.kills, this.context.breaches));
      const b = node("button", "", `cell-card ${d.creature.diet}`);
      this.cleaners.push(preview(this.scene, b, [{ texture: "aswim", first: firstFrame(bodyLayout, "swim", `back${look.row}`), animated: true }, ...[...d.creature.parts, ...d.creature.uniques].map(p => ({ texture: "aparts", first: firstFrame(parts, "on", p) }))]));
      b.append(node("strong", `${index + 1}. ${this.i18n.t(`diet.${d.creature.diet}`)}`), node("span", `${d.stat} +${d.gain} (level ${d.creature.ups[d.stat]})`), node("span", d.cause), node("span", this.i18n.t("aq.division_inherits")));
      b.onclick = () => { if (this.isOpen) this.onChoose(index); }; cards.append(b); return b;
    });
    this.native.append(panel); this.highlight();
  }

  private highlight(): void { this.borders.forEach((b, i) => b.setStrokeStyle(i === this.index ? 3 : 1, i === this.index ? 0xffd27f : 0x64818a)); this.nativeButtons.forEach((b, n) => b.setAttribute("aria-pressed", String(n === this.index))); }
}

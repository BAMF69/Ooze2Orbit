// Full-pond native overlay: four growth sections plus persistent parts/perk symbols.
// Authored: Written with Codex for Ooze2Orbit. Cell damage still loses food; no health pool is invented.
import type * as Phaser from "phaser";
import type { I18n } from "../../core/i18n";
import { evolveNeed, slots, type Creature } from "./rules";
import type { PartKind } from "./tuning";
import { PERKS, PERK_NAMES, perkLevel, perkDescription } from "./perks";
import { cellUi, node } from "./responsiveUi";
import { uiIcon, type UiIcon } from "../uiIcons";
import { DIET_COLORS, growthSections } from "./growthMeter";
export class CellHud {
  private main = node("div", "", "cell-status-main");
  private details = node("div");
  private toastText = node("div", "", "cell-toast");
  private toastLeft = 0;
  private growth = node("div", "", "cell-growth");
  private growthCaption = node("div", "", "cell-growth-caption");
  private sections: { root: HTMLDivElement; fill: HTMLSpanElement }[] = [];
  private rack = node("div", "", "cell-icon-rack");
  private iconNote = node("div", "", "cell-icon-note");
  private rackKey = "";
  private colors = ["", "", "", ""];
  constructor(scene: Phaser.Scene, private i18n: I18n, _partFrame: (p: PartKind) => number, onUpgrade: () => void = () => {}) {
    const root = cellUi(scene, "cell-status cell-overlay-hud"), more = node("details"); more.append(node("summary", i18n.t("cell.ui.details")), this.details);
    const upgrade = node("button", i18n.t("cell.ui.upgrades"), "cell-upgrade-open"); upgrade.onclick = onUpgrade;
    this.toastText.setAttribute("role", "status"); this.iconNote.hidden = true;
    const segments = node("div", "", "cell-growth-segments");
    for (let form = 1; form <= 4; form++) {
      const section = node("div", "", "growth-section"), label = node("span", i18n.t("cell.ui.form_label", { form }), "growth-label"), track = node("div", "", "growth-track"), fill = node("span");
      track.setAttribute("role", "progressbar"); track.setAttribute("aria-label", label.textContent!); track.setAttribute("aria-valuemin", "0"); track.setAttribute("aria-valuemax", "100");
      track.append(fill); section.append(label, track); segments.append(section); this.sections.push({ root: section, fill });
    }
    this.growth.append(this.growthCaption, segments);
    root.append(this.main, more, upgrade, this.toastText, this.growth, this.rack, this.iconNote);
    const hints = node("div", "", "cell-control-hints");
    hints.append(node("span", i18n.t("cell.controls.keyboard_hint"), "keyboard-hint"), node("span", i18n.t("cell.controls.controller_hint"), "controller-hint"), node("span", i18n.t("cell.controls.touch_hint"), "touch-hint")); root.append(hints);
  }
  update(c: Creature, dt: number, jetCooldown = 0): void {
    this.toastLeft = Math.max(0, this.toastLeft - dt); this.toastText.hidden = !this.toastLeft;
    const need = evolveNeed(c), full = !Number.isFinite(need);
    this.main.textContent = `${this.i18n.t("cell.ui.form_label", { form: c.form })} · ${this.i18n.t(`diet.${c.diet}`)}\n${this.i18n.t("cell.hud_plant", { n: Math.floor(c.points.algae) })} · ${this.i18n.t("cell.hud_meat", { n: Math.floor(c.points.meat) })}`;
    this.growthCaption.textContent = full ? this.i18n.t("cell.ui.fully_grown") : this.i18n.t("cell.hud_form", { form: c.form, food: Math.floor(c.food), need });
    this.colors[c.form - 1] = DIET_COLORS[c.diet];
    growthSections(c).forEach((value, i) => {
      const { root, fill } = this.sections[i]; root.style.setProperty("--growth-color", this.colors[i] || DIET_COLORS[c.diet]);
      root.classList.toggle("current", i === c.form - 1); root.classList.toggle("complete", value === 1);
      fill.style.width = `${value * 100}%`; fill.parentElement!.setAttribute("aria-valuenow", String(Math.round(value * 100)));
    });
    this.details.textContent = [this.i18n.t("cell.ui.parts", { used: c.parts.length, slots: slots(c), parts: c.parts.length ? c.parts.map(p => this.i18n.t(`part.${p}`)).join(", ") : this.i18n.t("cell.ui.empty_parts") }),
      ...PERKS.filter(p => perkLevel(c, p) > 0).map(p => `${PERK_NAMES[p]} ${perkLevel(c, p)}`)].join(" · ");
    this.icons(c, jetCooldown);
  }
  private icons(c: Creature, cooldown: number): void {
    const key = JSON.stringify([c.parts, c.perks, slots(c)]);
    if (key !== this.rackKey) {
      this.rackKey = key; this.rack.replaceChildren();
      const row = node("div", "", "cell-icon-row");
      row.append(node("span", this.i18n.t("cell.ui.equipment"), "icon-row-label"));
      const add = (id: UiIcon, label: string, badge = "") => {
        const b = node("button", "", `cell-ability-icon ${id}`); b.dataset.icon = id; b.title = label; b.setAttribute("aria-label", label);
        b.append(uiIcon(id)); if (badge) b.append(node("span", badge, "icon-rank"));
        b.onclick = () => { this.iconNote.hidden = !this.iconNote.hidden && this.iconNote.textContent === b.title; this.iconNote.textContent = b.title; }; row.append(b);
      };
      for (const p of c.parts) add(p, `${this.i18n.t(`part.${p}`)} · ${this.i18n.t(`part.${p}_hint`)}`);
      if (!c.parts.length) row.append(node("span", this.i18n.t("cell.ui.empty_parts"), "empty-icons"));
      this.rack.append(row);
      const perkRow = node("div", "", "cell-icon-row"); perkRow.append(node("span", this.i18n.t("cell.ui.perks"), "icon-row-label"));
      for (const p of PERKS) if (perkLevel(c, p) > 0) {
        const b = node("button", "", `cell-ability-icon ${p}`); b.dataset.icon = p; b.title = `${PERK_NAMES[p]} · ${perkDescription(c, p)}`; b.setAttribute("aria-label", b.title);
        b.append(uiIcon(p), node("span", String(perkLevel(c, p)), "icon-rank")); b.onclick = () => { this.iconNote.textContent = b.title; this.iconNote.hidden = false; }; perkRow.append(b);
      }
      if (perkRow.children.length > 1) this.rack.append(perkRow);
    }
    const jet = this.rack.querySelector<HTMLButtonElement>('[data-icon="jetBurst"]');
    if (jet) { jet.classList.toggle("cooling", cooldown > 0); jet.querySelector(".icon-rank")!.textContent = cooldown > 0 ? `${Math.ceil(cooldown)}s` : String(perkLevel(c, "jetBurst")); }
  }
  toast(key: string, args: Record<string, string | number> = {}): void { this.toastText.textContent = this.i18n.t(key, args); this.toastText.hidden = false; this.toastLeft = 2.2; }
}

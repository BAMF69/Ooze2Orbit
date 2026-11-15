// Purpose: Persistent native civilization HUD; only text, meters and visibility change per frame.
// Lifecycle: scene owns this overlay. Menus leave the mazes visible; Details is a scene pause gate.
import type * as Phaser from "phaser";
import type { I18n } from "../../core/i18n";
import { foodIncome, income, towerCost, type Battle } from "./wars";
import { SENDS, TOWERS, WAR, type SendKind, type TowerKind } from "./warsTuning";
import { civTheme, type CivTemperament } from "./theme";
import "./controls.css";

export type CivSelection = "hero" | "builder" | "summons" | "workers";
export type CivMenu = "towers" | "workers" | "summons" | "hero";
export interface CivHudCallbacks {
  select(role: CivSelection): void; togglePatrol(): void; bite(): void; pulse(): void;
  chooseTower(kind: TowerKind): void; train(kind: "gatherer" | "builder" | "farmer"): void;
  send(kind: SendKind): void; lever(): void; closeMenu(): void;
  rematch(): void; space(): void;
}
export interface CivHudState {
  selection: CivSelection; patrol: boolean; menu: CivMenu | null; scheme: string;
  inherited: { strength: number; maxHp: number; climb: boolean }; pauseMenus: boolean;
  temperament: CivTemperament; commandFocus: boolean; selectedTower?: TowerKind; notice?: string; diet?: string; saveReady?: boolean;
}
interface Card { button: HTMLButtonElement; title: HTMLElement; effect: HTMLElement; cost: HTMLElement; }
const node = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = "") => {
  const n = document.createElement(tag); n.className = cls; return n;
};
const put = (n: HTMLElement, value: string) => { if (n.textContent !== value) n.textContent = value; };
const SHAPES: Record<string, string> = {
  hero: '<path d="M9 18Q4 14 8 8Q13 3 21 8L27 12 22 16Q20 22 15 23L10 27 8 23 11 20Z"/><path d="m19 9 2 2M11 16l5 2"/>',
  builder: '<path d="m7 6 12 12M4 10l6-6 5 1-10 10Z"/><path d="m17 17 9 9-4 4-9-9Z"/>',
  summons: '<path d="M4 22q0-13 7-11 4-11 8-2 9-1 9 12l-4 4-6-2-6 3-5-3Z"/><path d="m11 15 1 1m9-2 1 1M14 20h5"/>',
  thorn: '<path d="m9 28 2-12-6-4 8 1L10 4l7 7 6-8-2 12 7-1-8 8v6Z"/>',
  mortar: '<path d="m7 28 2-14 7 3 7-3 3 14ZM8 11q8-14 16 0l-8 7Z"/>',
  frost: '<path d="m10 28 3-13-6-5 7 1 2-8 3 8 7-1-6 6 2 12Z"/><path d="m5 21 4-2m15 0 4 2"/>',
  gatherer: '<path d="M9 27 6 14h20l-3 13ZM12 14q-3-12 4-9 7-3 4 9"/><path d="m11 19 2 5m7-5-1 5"/>',
  farmer: '<path d="M16 28V7M16 18Q4 18 5 9q11 0 11 9Zm0-4Q27 14 27 5q-11 0-11 9Z"/>',
  runner: '<path d="m4 22 7-8 8-4 8 4-6 3-6 2-3 8m7-8 3 8M8 10l6-5"/>',
  shell: '<path d="M4 23Q3 6 16 5q13 1 12 18ZM7 23v5m17-5v5M16 5v18M7 11l9 5 9-5"/>',
  swarm: '<path d="M3 13q5-9 10 0l-5 6ZM18 13q5-9 10 0l-5 6ZM10 24q5-9 10 0l-5 6Z"/>',
  lever: '<path d="M4 26q3-8 8-6l5-12 6 3-6 12 10 3ZM16 8q1-8 7-5t0 8"/>',
  patrol: '<path d="M5 16A11 11 0 0 1 24 8l3-4v10H17m10 4A11 11 0 0 1 8 7M5 18v10h10"/>',
  bite: '<path d="M5 8q11-7 22 0l-4 17H9ZM8 8l4 8 4-8 4 8 4-8M10 24l6-6 6 6"/>',
  pulse: '<path d="m16 3 3 9 10 4-10 3-3 10-4-10-9-3 9-4Z"/>',
  close: '<path d="m9 9 14 14M23 9 9 23"/>',
  ore: '<path d="m4 20 5-13 12-3 8 11-6 13H10Zm5-13 7 10 5-13M4 20l12-3 7 11m-7-11 13-2"/>',
  food: '<path d="M16 28Q2 22 5 11q8-3 11 5 3-8 11-5 3 11-11 17Zm0-12V4m0 4 8-4"/>',
};
const ART_FRAME: Record<string, number> = { thorn: 0, mortar: 1, frost: 2, hero: 5, builder: 7, runner: 8, shell: 9, swarm: 10, summons: 8, gatherer: 11, farmer: 12, ore: 13, food: 14 };
function symbol(kind: string): HTMLElement {
  const host = node("span", "civ-hd-icon"); host.setAttribute("aria-hidden", "true");
  const frame = ART_FRAME[kind];
  if (frame !== undefined) {
    host.classList.add("civ-hd-art-icon");
    host.style.backgroundPosition = `${frame % 4 * 100 / 3}% ${Math.floor(frame / 4) * 100 / 3}%`;
    return host;
  }
  host.innerHTML = `<svg viewBox="0 0 32 32" fill="currentColor" fill-opacity=".22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${SHAPES[kind] ?? SHAPES.hero}</svg>`;
  return host;
}
export class CivHud {
  readonly root = node("div", "stage-ui-layer civ-controls civ-hd");
  private header = node("div", "civ-hd-header");
  private resources = node("div", "civ-hd-resources");
  private ore = node("strong"); private food = node("strong"); private payday = node("small");
  private oreFlow = node("small"); private foodFlow = node("small");
  private base = this.meter("civ-hd-base own"); private rival = this.meter("civ-hd-base rival");
  private economy = this.meter("civ-hd-economy");
  private wave = node("div", "civ-hd-wave");
  private waveTitle = node("strong"); private waveBody = node("small");
  private details = node("details", "civ-hd-details");
  private detailText = node("div", "civ-hd-detail-text");
  private dock = node("div", "civ-hd-dock");
  private roles = node("div", "civ-hd-roles");
  private selectionText = node("div", "civ-hd-selection");
  private notice = node("div", "civ-hd-notice");
  private menu = node("section", "civ-hd-menu");
  private menuTitle = node("strong"); private menuMode = node("small");
  private menuSections = new Map<CivMenu, HTMLDivElement>();
  private result = node("section", "stage-modal civ-hd-result");
  private resultTitle = node("h2"); private resultBody = node("p");
  private resultSpace: HTMLButtonElement;
  private roleButtons = new Map<CivSelection, HTMLButtonElement>();
  private actionButtons = new Map<string, HTMLButtonElement>();
  private cards = new Map<string, Card>();
  private lastDetails = "";
  private locale = "";
  private themeKey = "";
  constructor(scene: Phaser.Scene, private i18n: I18n, cb: CivHudCallbacks) {
    this.root.style.setProperty("--civ-art", `url("${new URL("assets/art/civ_illustrated_hd_v1.png", document.baseURI).href}")`);
    const summary = node("summary"); put(summary, this.t("details")); this.details.append(summary, this.detailText);
    this.details.addEventListener("toggle", () => this.root.dispatchEvent(new Event("civ-detail-toggle")));
    const ore = node("div", "civ-hd-resource ore"), food = node("div", "civ-hd-resource food");
    const oreCopy = node("div"), foodCopy = node("div"); oreCopy.append(this.ore, this.oreFlow); foodCopy.append(this.food, this.foodFlow);
    ore.append(symbol("ore"), oreCopy); food.append(symbol("food"), foodCopy); this.resources.append(ore, food, this.payday);
    const settlements = node("div", "civ-hd-settlements"); settlements.append(this.base.root, this.rival.root);
    const pressure = node("div", "civ-hd-pressure"); this.wave.append(this.waveTitle, this.waveBody); pressure.append(this.wave, this.economy.root);
    this.header.append(this.resources, settlements, pressure);
    this.roles.setAttribute("role", "tablist"); this.roles.setAttribute("aria-label", this.t("commands"));
    for (const role of ["hero", "builder", "summons", "workers"] as CivSelection[]) {
      const b = this.button(`select-${role}`, role === "workers" ? "farmer" : role, () => cb.select(role));
      b.setAttribute("role", "tab"); b.id = `civ-tab-${role}`; b.setAttribute("aria-controls", "civ-command-page");
      this.roleButtons.set(role, b); this.roles.append(b);
    }
    this.dock.append(this.roles, this.menu, this.selectionText, this.notice);
    this.menu.id = "civ-command-page"; this.menu.setAttribute("role", "tabpanel"); this.menu.setAttribute("aria-label", this.t("commands"));
    const menuHead = node("div", "civ-hd-menu-head"), close = this.button("close", "close", () => cb.closeMenu());
    put(close.lastElementChild as HTMLElement, this.t("close")); menuHead.append(this.menuTitle, this.menuMode, close); this.menu.append(menuHead);
    for (const kind of ["towers", "workers", "summons", "hero"] as CivMenu[]) {
      const section = node("div", "civ-hd-cards"); this.menuSections.set(kind, section); this.menu.append(section);
    }
    for (const kind of Object.keys(TOWERS) as TowerKind[]) this.card("towers", kind, kind, () => cb.chooseTower(kind));
    for (const kind of ["gatherer", "builder", "farmer"] as const) this.card("workers", kind, kind, () => cb.train(kind));
    this.card("workers", "lever", "lever", () => cb.lever());
    for (const kind of Object.keys(SENDS) as SendKind[]) this.card("summons", kind, kind, () => cb.send(kind));
    const heroGroup = node("div", "civ-hd-context-group"); this.menuSections.get("hero")!.append(heroGroup);
    for (const [id, run] of [["patrol-hero", () => cb.togglePatrol()], ["bite", () => cb.bite()], ["pulse", () => cb.pulse()]] as const) {
      const b = this.button(id, id === "patrol-hero" ? "patrol" : id, run); heroGroup.append(b); this.actionButtons.set(id, b);
    }
    this.result.hidden = true; this.result.setAttribute("role", "dialog"); this.result.setAttribute("aria-label", this.t("result"));
    const resultPanel = node("div", "civ-hd-result-panel"), resultButtons = node("div", "civ-hd-result-actions");
    const rematch = this.button("rematch", "patrol", () => cb.rematch()); put(rematch.lastElementChild as HTMLElement, this.t("rematch"));
    this.resultSpace = this.button("space", "summons", () => cb.space()); put(this.resultSpace.lastElementChild as HTMLElement, this.t("continue_space"));
    resultButtons.append(rematch, this.resultSpace); resultPanel.append(this.resultTitle, this.resultBody, resultButtons); this.result.append(resultPanel);
    this.notice.setAttribute("role", "status"); this.root.append(this.header, this.details, this.dock, this.result);
    document.body.append(this.root); scene.events.once("shutdown", () => this.destroy());
  }
  private t(key: string, args: Record<string, unknown> = {}): string { return this.i18n.t(`civ.hd.${key}`, args); }
  private button(id: string, icon: string, run: () => void): HTMLButtonElement {
    const b = node("button", "civ-hd-button"); b.type = "button"; b.dataset.action = id;
    const label = node("span", "civ-hd-button-label"); put(label, this.t(icon)); b.append(symbol(icon), label);
    b.onclick = e => { if (e.detail > 0) b.blur(); run(); }; return b;
  }
  private meter(cls: string) {
    const root = node("div", cls), label = node("span"), track = node("progress"); track.max = 1; root.append(label, track); return { root, label, track };
  }
  private card(menu: CivMenu, id: string, icon: string, run: () => void): void {
    const button = this.button(id, icon, run); button.classList.add("civ-hd-card");
    const title = button.lastElementChild as HTMLElement, effect = node("span", "civ-hd-card-effect"), cost = node("strong", "civ-hd-card-cost");
    button.append(effect, cost); this.menuSections.get(menu)!.append(button); this.cards.set(id, { button, title, effect, cost });
  }
  private paintCard(id: string, title: string, effect: string, cost: string, disabled: boolean, selected = false): void {
    const c = this.cards.get(id)!; put(c.title, title); put(c.effect, effect); put(c.cost, cost);
    c.button.disabled = disabled; c.button.classList.toggle("unaffordable", disabled); c.button.setAttribute("aria-pressed", String(selected));
    c.button.title = `${title}. ${effect}. ${cost}`;
  }
  get detailsOpen(): boolean { return this.details.open; }
  get bounds(): { top: number; bottom: number; right?: number } {
    const top = this.header.getBoundingClientRect().bottom + 10;
    const dock = this.dock.getBoundingClientRect();
    const lateral = window.innerHeight <= 480 && window.innerWidth > window.innerHeight;
    return { top, bottom: lateral ? window.innerHeight - 12 : dock.top - 10,
      ...(lateral ? { right: dock.left - 12 } : {}) };
  }

  update(b: Battle, state: CivHudState): void {
    if (this.locale !== this.i18n.locale) {
      this.locale = this.i18n.locale;
      put(this.details.querySelector("summary")!, this.t("details"));
      this.menu.setAttribute("aria-label", this.t("commands")); this.result.setAttribute("aria-label", this.t("result"));
      const labels: Record<string, string> = { "choose-builder": "choose_tower", "choose-summons": "open_summons", "workers-builder": "workers", "workers-summons": "workers", bite: "bite", close: "back", rematch: "rematch", space: "continue_space" };
      for (const [id, key] of Object.entries(labels)) {
        const label = this.root.querySelector<HTMLElement>(`[data-action="${id}"] > .civ-hd-button-label`);
        if (label) put(label, this.t(key));
      }
    }
    const themeKey = JSON.stringify(state.temperament);
    if (themeKey !== this.themeKey) {
      this.themeKey = themeKey;
      for (const [key, value] of Object.entries(civTheme(state.temperament))) this.root.style.setProperty(`--civ-${key}`, value);
    }
    const page = state.menu ?? "hero";
    this.dock.classList.toggle("stage-modal", state.commandFocus && state.scheme === "controller");
    this.menu.setAttribute("aria-labelledby", `civ-tab-${state.selection}`);
    this.roles.setAttribute("aria-label", this.t("commands"));
    const side = b.sides[0], ended = b.status !== "playing", selection = state.selectedTower ?? "thorn";
    const orePayday = income(b, 0) * (b.lever === "ore" ? WAR.oreMult : 1);
    put(this.ore, this.t("ore_amount", { n: Math.floor(side.ore) })); put(this.food, this.t("food_amount", { n: Math.floor(side.food) }));
    put(this.oreFlow, this.t("per_payday", { n: orePayday.toFixed(1) })); put(this.foodFlow, this.t("per_payday", { n: foodIncome(b, 0) }));
    put(this.payday, this.t("payday", { n: Math.ceil(WAR.tick - b.incomeClock) }));
    put(this.base.label, this.t("your_base", { hp: side.hp, max: WAR.baseHp })); this.base.track.value = side.hp / WAR.baseHp;
    put(this.rival.label, this.t("rival_base", { hp: b.sides[1].hp, max: WAR.baseHp })); this.rival.track.value = b.sides[1].hp / WAR.baseHp;
    const next = b.wave + 1, kind: SendKind = next % 3 === 0 ? "shell" : next % 2 === 0 ? "swarm" : "runner";
    put(this.waveTitle, this.t("next_wave", { n: next, seconds: Math.ceil(b.waveClock) }));
    put(this.waveBody, this.t("wave_kind", { n: 2 + Math.floor(next / 3) + (b.rival === "raider" ? 1 : 0), kind: this.t(kind), brood: kind === "swarm" ? this.t("brood_bodies") : "" }));
    const need = income(b, 1) * WAR.incomeRatio;
    put(this.economy.label, this.t("income_goal", { own: income(b, 0).toFixed(1), need: need.toFixed(1) })); this.economy.track.value = Math.min(1, income(b, 0) / need);
    for (const meter of [this.base, this.rival, this.economy]) meter.track.setAttribute("aria-label", meter.label.textContent!);
    for (const [role, button] of this.roleButtons) {
      put(button.lastElementChild as HTMLElement, `${state.scheme === "keyboard" ? `${["hero", "builder", "summons", "workers"].indexOf(role) + 1} ` : ""}${this.t(role)}`);
      if (role === "hero") {
        const frame = state.diet === "herbivore" ? 4 : state.diet === "carnivore" ? 5 : 6;
        (button.firstElementChild as HTMLElement).style.backgroundPosition = `${frame % 4 * 100 / 3}% ${Math.floor(frame / 4) * 100 / 3}%`;
      }
      button.setAttribute("aria-pressed", String(role === state.selection)); button.setAttribute("aria-selected", String(role === state.selection)); button.disabled = ended || this.detailsOpen;
    }
    for (const role of ["hero"]) {
      const p = this.actionButtons.get(`patrol-${role}`)!; put(p.lastElementChild as HTMLElement, this.t(state.patrol ? "patrol_on" : "patrol_off")); p.setAttribute("aria-pressed", String(state.patrol)); p.disabled = ended;
    }
    this.actionButtons.get("bite")!.disabled = ended || b.hero.respawn > 0;
    this.actionButtons.get("pulse")!.disabled = ended || b.hero.respawn > 0 || b.hero.ability > 0;
    put(this.actionButtons.get("pulse")!.lastElementChild as HTMLElement, b.hero.ability ? this.t("pulse_cooldown", { n: Math.ceil(b.hero.ability) }) : this.t("pulse"));
    const heritage = state.diet ? this.i18n.t(`diet.${state.diet}`) : "";
    put(this.selectionText, state.selection === "hero" ? this.t(b.hero.respawn ? "hero_recovery" : "hero_status", { hp: b.hero.hp, max: b.hero.maxHp, seconds: Math.ceil(b.hero.respawn), heritage })
      : state.selection === "builder" ? this.t("selected_tower", { tower: this.t(selection), cost: towerCost(b, selection) }) : state.selection === "workers" ? this.t("workers_hint") : this.t("summons_hint"));
    put(this.notice, state.notice ?? this.t(state.selection === "builder" ? "build_hint" : state.selection === "hero" ? "hero_hint" : "send_hint"));
    this.notice.hidden = ended;
    this.menu.hidden = ended;
    for (const [menu, section] of this.menuSections) section.hidden = menu !== page;
    put(this.menuTitle, this.t(page === "towers" ? "builder" : page)); put(this.menuMode, this.t("live"));
    const back = this.menu.querySelector<HTMLButtonElement>('[data-action="close"]')!;
    back.hidden = page === "hero";
    put(back.lastElementChild as HTMLElement, this.t("back"));
    for (const tower of Object.keys(TOWERS) as TowerKind[]) {
      const spec = TOWERS[tower], cost = towerCost(b, tower);
      this.paintCard(tower, this.t(tower), this.t(`tower_${tower}`, { damage: spec.damage, range: spec.range, seconds: spec.cooldown, slow: spec.slow }), this.t("ore_cost", { n: cost }), ended || side.ore < cost, tower === selection);
    }
    for (const worker of ["gatherer", "builder", "farmer"] as const) {
      const cost = worker === "gatherer" ? WAR.gatherCost : worker === "farmer" ? WAR.farmerCost : WAR.builderCost;
      const count = worker === "gatherer" ? side.gatherers : worker === "farmer" ? side.farmers ?? 0 : side.builders;
      this.paintCard(worker, this.t(worker), this.t(`worker_${worker}`, { ore: WAR.gatherIncome, food: worker === "farmer" ? WAR.farmerFood : WAR.gatherFood, n: count, max: WAR.maxWorkers }), this.t("ore_cost", { n: cost }), ended || side.ore < cost || count >= WAR.maxWorkers);
    }
    this.paintCard("lever", this.t(b.lever === "ore" ? "rich_ore" : "rocky_ground"), this.t(b.lever === "ore" ? "rich_ore_effect" : "rocky_effect"), this.t("switch_terrain"), ended);
    for (const send of Object.keys(SENDS) as SendKind[]) {
      const spec = SENDS[send]; this.paintCard(send, this.t(send), this.t(`send_${send}`, { hp: spec.hp, damage: spec.damage, income: spec.income, armor: spec.armor }), this.t("send_cost", { ore: spec.ore, food: spec.food }), ended || side.ore < spec.ore || side.food < spec.food || b.units.length + (send === "swarm" ? 3 : 1) > WAR.unitLimit);
    }
    const detail = [this.t("objective"), this.t("income_detail", { own: income(b, 0).toFixed(1), rival: income(b, 1).toFixed(1), factor: WAR.incomeRatio, seconds: WAR.tick }),
      this.t("hero_inheritance", { strength: state.inherited.strength, damage: WAR.heroDamage + b.hero.strength, vitality: state.inherited.maxHp, hp: b.hero.maxHp, climb: this.t(state.inherited.climb ? "climb_yes" : "climb_no") }),
      this.t("hero_ability", { damage: WAR.heroDamage * 2 + b.hero.strength, range: WAR.abilityRange, seconds: WAR.abilityCooldown, recovery: WAR.heroRespawn, cost: WAR.killOre }),
      this.t("workers_detail", { gatherers: side.gatherers, builders: side.builders, farmers: side.farmers ?? 0, food: foodIncome(b, 0), ore: orePayday.toFixed(1) }),
      this.t("construction_detail", { seconds: WAR.buildSeconds, builders: side.builders, queued: side.towers.filter(t => t.build > 0).length }),
      this.t("heritage_detail", { sends: b.tally.sends, defenses: b.tally.defenses, length: b.tally.longest, hits: b.tally.heroHits, kills: b.tally.kills }), this.t("patrol_effect"),
      ...Object.entries(TOWERS).map(([kind, spec]) => `${this.t(kind)}: ${this.t(`tower_${kind}`, { damage: spec.damage, range: spec.range, seconds: spec.cooldown, slow: spec.slow })}. ${this.t("ore_cost", { n: towerCost(b, kind as TowerKind) })}`),
      ...Object.entries(SENDS).map(([kind, spec]) => `${this.t(kind)}: ${this.t(`send_${kind}`, { hp: spec.hp, damage: spec.damage, income: spec.income, armor: spec.armor })}. ${this.t("send_cost", { ore: spec.ore, food: spec.food })}`), this.t("no_upgrades"),
      this.t(state.scheme === "controller" ? "controls_controller" : state.scheme === "touch" ? "controls_touch" : "controls_keyboard")].join("\n\n");
    if (detail !== this.lastDetails) { put(this.detailText, detail); this.lastDetails = detail; }
    this.result.hidden = !ended;
    put(this.resultTitle, this.t(b.status === "fallen" ? "fallen" : b.status === "base" ? "victory_base" : "victory_income"));
    put(this.resultBody, this.t(b.status === "fallen" ? "fallen_body" : state.saveReady === false ? "notice.save_failed" : "victory_body")); this.resultSpace.hidden = b.status === "fallen"; this.resultSpace.disabled = state.saveReady === false;
    this.dock.inert = ended || this.detailsOpen; this.menu.inert = this.detailsOpen; this.header.inert = ended;
  }
  destroy(): void { this.root.remove(); }
}

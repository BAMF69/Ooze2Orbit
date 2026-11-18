// Purpose: Active civilization adapter: fullscreen illustrated battlefield and persistent strategy HUD.
// Simulation, inherited hero stats and lineage/space records stay engine-free in civ/wars.ts.
import * as Phaser from "phaser";
import { shell } from "../shell/app";
import { Log } from "../core/log";
import { writeStage } from "../core/lineage";
import { revealFrom } from "./aquatic/reveal";
import { newBattle, place, placementIssue, train, send, setLever, heroAttack, moveHero, stepBattle, warsRecord, type Battle, type Cell } from "./civ/wars";
import { WAR, SENDS, type TowerKind } from "./civ/warsTuning";
import { followHeroOrder, heroRoute, newHeroOrders, patrolHero } from "./civ/heroOrders";
import { hdCellAt, hdWarsLayout, type HdWarsLayout } from "./civ/hdLayout";
import { OrderGesture } from "./civ/pointerOrders";
import { CivHud, type CivMenu, type CivSelection } from "./civ/hud";
import { CivIllustrations, preloadCivArt } from "./civ/illustrated";
import type { CivTemperament } from "./civ/theme";
import { PresentationPause } from "./civ/presentationPause";

export class CivScene extends Phaser.Scene {
  private battle!: Battle;
  private screenUi!: CivHud;
  private paintings!: CivIllustrations;
  private selection: CivSelection = "hero";
  private selectedTower: TowerKind = "thorn";
  private menu: CivMenu | null = null;
  private patrol = false;
  private orders = newHeroOrders();
  private buildCursor: Cell = { x: 4, y: 3 };
  private target: Cell | null = null;
  private written = false;
  private rival: Battle["rival"] = "raider";
  private inherited = { strength: 2, maxHp: 0, climb: false };
  private commandFocus = false;
  private temperament: CivTemperament = { cautious: 34, aggressive: 33, adaptable: 33 };
  private diet = "omnivore";
  private noticeKey = "hero";
  private noticeArgs: Record<string, unknown> = {};
  private get notice(): string { return shell.i18n.t(`civ.hd.notice.${this.noticeKey}`, this.noticeArgs); }
  private gesture = new OrderGesture();
  private pauseClocks!: PresentationPause;
  private lastScheme = "";
  constructor() { super("civ"); }
  preload(): void { preloadCivArt(this); }
  create(): void {
    this.selection = "hero"; this.selectedTower = "thorn"; this.menu = null; this.patrol = false;
    this.orders = newHeroOrders(); this.buildCursor = { x: 4, y: 3 }; this.target = null; this.written = false;
    const saved = shell.saves.load("lineage").envelope?.data as { species?: { stages?: { creature?: { hero?: { strength?: unknown; vitality?: unknown; climb?: unknown } } } }[] } | undefined;
    const hero = saved?.species?.[0]?.stages?.creature?.hero;
    this.inherited = { strength: typeof hero?.strength === "number" && Number.isFinite(hero.strength) ? hero.strength : 2,
      maxHp: typeof hero?.vitality === "number" && Number.isFinite(hero.vitality) ? hero.vitality : 0, climb: hero?.climb === true };
    const reveal = revealFrom(saved, 4, "civ"); this.diet = reveal.diet;
    this.temperament = { cautious: reveal.rows.find(r => r.kind === "cautious")!.pct, aggressive: reveal.rows.find(r => r.kind === "aggressive")!.pct, adaptable: reveal.rows.find(r => r.kind === "adaptable")!.pct };
    this.rival = reveal.rows.find(r => r.kind === "aggressive")!.pct > reveal.rows.find(r => r.kind === "cautious")!.pct ? "warden" : "raider";
    this.battle = newBattle(this.inherited, this.rival); this.pauseClocks = new PresentationPause(this);
    const action = (run: () => void) => () => { if (this.canAct()) { run(); this.draw(); } };
    this.screenUi = new CivHud(this, shell.i18n, {
      select: role => action(() => this.select(role))(),
      togglePatrol: action(() => this.togglePatrol()),
      bite: action(() => { this.patrol = false; heroAttack(this.battle); }),
      pulse: action(() => { this.patrol = false; heroAttack(this.battle, true); }),
      chooseTower: kind => action(() => { this.selectedTower = kind; this.commandFocus = false; this.clearInput(); (document.activeElement as HTMLElement | null)?.blur(); this.say("builder"); })(),
      train: kind => action(() => { const ok = train(this.battle, kind); this.say(ok ? "trained" : "worker_blocked", { name: this.label(kind) }); this.clearInput(); })(),
      send: kind => action(() => { const ok = send(this.battle, kind); this.say(ok ? "sent" : "send_blocked", { name: this.label(kind), n: SENDS[kind].income }); this.clearInput(); })(),
      lever: action(() => { setLever(this.battle); this.say(`lever_${this.battle.lever}`); this.clearInput(); }),
      closeMenu: action(() => this.closeCommands()),
      rematch: () => { if (shell.topId === "play" && this.battle.status !== "playing") this.rematch(); },
      space: () => { if (shell.topId === "play" && this.battle.status !== "playing" && this.battle.status !== "fallen" && this.written) shell.startGame("space"); },
    });
    this.screenUi.root.addEventListener("civ-detail-toggle", () => { this.clearInput(); this.pauseClocks.set(this.screenUi.detailsOpen); this.draw(); });
    this.paintings = new CivIllustrations(this, shell.i18n); this.say("hero"); this.lastScheme = shell.input.scheme;
    this.bindOrders(); this.draw();
    Log.info("civ", `Illustrated tower wars begins; inherited hero ${JSON.stringify(this.inherited)}`);
    this.events.once("shutdown", () => { this.clearInput(); this.pauseClocks.set(false); });
  }
  private label(key: string): string { return shell.i18n.t(`civ.hd.${key}`); }
  private say(key: string, args: Record<string, unknown> = {}): void { this.noticeKey = key; this.noticeArgs = args; }
  private canAct(): boolean { return shell.topId === "play" && this.battle.status === "playing" && !this.screenUi?.detailsOpen; }
  private clearInput(): void { this.gesture.cancel(); shell.input.clearHeld(); }
  private closeCommands(): void {
    this.menu = null; this.selection = "hero"; this.commandFocus = false; this.clearInput(); (document.activeElement as HTMLElement | null)?.blur();
  }
  private openMenu(section: CivMenu): void {
    this.menu = section; this.commandFocus = section !== "hero";
    if (section === "towers") this.selection = "builder";
    else if (section === "workers") this.selection = "workers";
    else if (section === "summons") this.selection = "summons";
    this.clearInput();
  }
  private select(selection: CivSelection): void {
    this.closeCommands(); this.selection = selection;
    if (selection !== "hero") { this.target = null; this.openMenu(selection === "builder" ? "towers" : selection === "workers" ? "workers" : "summons"); }
    this.say(selection);
  }
  private togglePatrol(): void {
    this.patrol = !this.patrol; this.target = null; this.orders = newHeroOrders(); this.clearInput(); this.say(this.patrol ? "patrol_on" : "patrol_off");
  }
  private build(): void {
    const issue = placementIssue(this.battle, this.buildCursor, this.selectedTower);
    if (issue) { if (issue !== "ended") this.say(issue); return; }
    place(this.battle, this.buildCursor, this.selectedTower); this.say("build", { name: this.label(this.selectedTower) });
  }
  private layout(): HdWarsLayout {
    const rect = this.game.canvas.getBoundingClientRect(), bounds = this.screenUi.bounds, style = getComputedStyle(this.screenUi.root);
    const factor = this.scale.width / Math.max(1, rect.width), left = (parseFloat(style.getPropertyValue("--safe-left")) || 0) * factor,
      right = (parseFloat(style.getPropertyValue("--safe-right")) || 0) * factor;
    const availableWidth = bounds.right === undefined ? this.scale.width - left - right : (bounds.right - rect.left) * factor - left;
    const board = hdWarsLayout(availableWidth, this.scale.height, (bounds.top - rect.top) * factor, (bounds.bottom - rect.top) * factor);
    board.left.x += left; board.right.x += left; return board;
  }
  private gestureKey(): string { return JSON.stringify([this.layout(), this.selection, this.selectedTower, this.menu, shell.input.scheme]); }
  private bindOrders(): void {
    const canvas = this.game.canvas, oldAction = canvas.style.touchAction, oldRendering = canvas.style.imageRendering;
    canvas.style.touchAction = "none"; canvas.style.imageRendering = "auto";
    const bindings: (() => void)[] = [];
    const on = (target: EventTarget, type: string, listener: (event: Event) => void) => { target.addEventListener(type, listener); bindings.push(() => target.removeEventListener(type, listener)); };
    const logical = (e: PointerEvent): Cell => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * this.scale.width / r.width, y: (e.clientY - r.top) * this.scale.height / r.height }; };
    on(canvas, "pointerdown", event => {
      const e = event as PointerEvent; if (e.button !== 0 || !this.canAct()) { this.gesture.cancel(); return; }
      this.gesture.begin(e.pointerId, e.clientX, e.clientY, this.gestureKey()); canvas.setPointerCapture(e.pointerId);
    });
    on(window, "pointerdown", event => { if (event.target !== canvas) this.gesture.cancel(); });
    on(window, "pointermove", event => {
      const e = event as PointerEvent; this.gesture.move(e.pointerId, e.clientX, e.clientY);
      if (e.target === canvas && e.pointerType !== "touch" && !e.buttons && this.canAct() && this.selection === "builder") {
        const c = logical(e), cell = hdCellAt(this.layout(), c.x, c.y); if (cell) this.buildCursor = cell;
      }
    });
    on(canvas, "pointerup", event => {
      const e = event as PointerEvent;
      if (!this.canAct() || !this.gesture.finish(e.pointerId, e.clientX, e.clientY, this.gestureKey())) return;
      const p = logical(e), c = hdCellAt(this.layout(), p.x, p.y); if (!c) return;
      if (this.selection === "builder") { this.buildCursor = c; this.build(); }
      else if (this.selection === "hero") {
        if (!heroRoute(this.battle, c).length) { this.say("unreachable"); return; }
        this.patrol = false; this.orders = newHeroOrders(); this.target = c;
      }
      this.draw();
    });
    for (const type of ["pointercancel", "lostpointercapture"]) on(canvas, type, () => this.gesture.cancel());
    on(window, "blur", () => this.clearInput()); on(window, "resize", () => this.clearInput());
    on(document, "visibilitychange", () => { if (document.hidden) this.clearInput(); });
    on(window, "keydown", event => {
      const e = event as KeyboardEvent;
      if (!this.canAct() || e.repeat || e.altKey || e.ctrlKey || e.metaKey || shell.input.capturing || (e.target as HTMLElement | null)?.closest("input,textarea,select,[contenteditable=true]")) return;
      const role: Record<string, CivSelection> = { Digit1: "hero", Digit2: "builder", Digit3: "summons", Digit4: "workers" };
      if (role[e.code]) { e.preventDefault(); this.select(role[e.code]); this.draw(); }
    });
    this.events.on("pause", this.clearInput, this); this.events.on("resume", this.clearInput, this);
    this.events.once("shutdown", () => { bindings.forEach(remove => remove()); canvas.style.touchAction = oldAction; canvas.style.imageRendering = oldRendering; this.events.off("pause", this.clearInput, this); this.events.off("resume", this.clearInput, this); });
  }
  private rematch(): void {
    this.battle = newBattle(this.inherited, this.rival); this.written = false; this.target = null; this.patrol = false;
    this.orders = newHeroOrders(); this.buildCursor = { x: 4, y: 3 }; this.selectedTower = "thorn"; this.selection = "hero";
    this.closeCommands(); this.say("hero"); this.draw();
  }
  update(_time: number, delta: number): void {
    if (shell.topId !== "play") { this.gesture.cancel(); return; }
    const s = this.battle, i = shell.input;
    if (i.scheme !== this.lastScheme) { this.clearInput(); this.lastScheme = i.scheme; }
    this.pauseClocks.set(this.screenUi.detailsOpen);
    if (s.status !== "playing") {
      if (!this.written && s.status !== "fallen") this.record();
      if (i.takePress("interact")) { this.rematch(); return; }
      if (i.takePress("ui_accept") && s.status !== "fallen" && this.written) { shell.startGame("space"); return; }
      this.draw(); return;
    }
    if (this.screenUi.detailsOpen) { this.gesture.cancel(); this.draw(); return; }
    const groups: CivSelection[] = ["hero", "builder", "summons", "workers"];
    if (i.takePress("dash")) this.select(groups[(groups.indexOf(this.selection) + 1) % 4]);
    if (i.takePress("lens")) this.select(groups[(groups.indexOf(this.selection) + 3) % 4]);
    const dt = Math.min(delta / 1000, .05) * shell.settings.access.game_speed;
    if (!this.commandFocus || i.scheme !== "controller") {
      const attack = i.takePress("attack") || i.takePress("sink"), pulse = i.takePress("jump");
      if (this.selection === "hero") {
        const dx = Number(i.isDown("move_right")) - Number(i.isDown("move_left")), dy = Number(i.isDown("move_down")) - Number(i.isDown("move_up"));
        if (dx || dy) { this.patrol = false; this.target = null; this.orders = newHeroOrders(); moveHero(s, dx, dy, dt); }
        else if (this.target && followHeroOrder(s, this.target, dt, this.orders)) this.target = null;
        if (attack || pulse) { this.patrol = false; if (attack) heroAttack(s); if (pulse) heroAttack(s, true); }
        if (i.takePress("interact")) this.openMenu("hero");
      } else if (this.selection === "builder") {
        const dx = Number(i.takePress("move_right")) - Number(i.takePress("move_left")), dy = Number(i.takePress("move_down")) - Number(i.takePress("move_up"));
        this.buildCursor = { x: Math.max(1, Math.min(WAR.cols - 2, this.buildCursor.x + dx)), y: Math.max(0, Math.min(WAR.rows - 1, this.buildCursor.y + dy)) };
        if (i.takePress("interact") || pulse) this.build(); if (attack) this.openMenu("towers");
      } else if (this.selection === "summons" && (i.takePress("interact") || pulse)) this.openMenu("summons");
    } else i.clearPresses();
    if (this.patrol) patrolHero(s, dt, this.orders);
    const message = s.message; stepBattle(s, dt);
    if (s.message !== message) {
      if (s.message.startsWith("Wave ")) this.say("wave", { n: s.wave, name: this.label(s.wave % 3 === 0 ? "shell" : s.wave % 2 === 0 ? "swarm" : "runner") });
      else if (s.message.startsWith("Hero wounded")) this.say("wounded");
      else if (s.message.startsWith("Hero kill")) this.say("kill");
    }
    if (s.status !== "playing") this.clearInput(); this.draw();
  }
  private record(): void {
    try {
      const record = warsRecord(this.battle), previous = shell.saves.load("lineage").envelope?.data;
      const next = writeStage(previous, "civ", record.causes, record.block);
      shell.saves.save("lineage", next as unknown as Parameters<typeof shell.saves.save>[1]); this.written = true;
      Log.info("civ", `Victory ${String(record.block.victory)} recorded`);
    } catch (error) { this.say("save_failed"); Log.warn("civ", String(error)); }
  }
  private draw(): void {
    this.screenUi.update(this.battle, { selection: this.selection, patrol: this.patrol, menu: this.menu, scheme: shell.input.scheme,
      temperament: this.temperament, commandFocus: this.commandFocus, inherited: this.inherited, pauseMenus: false, selectedTower: this.selectedTower, notice: this.notice, diet: this.diet, saveReady: this.written });
    this.paintings?.draw(this.battle, this.layout(), { selection: this.selection, cursor: this.buildCursor, tower: this.selectedTower, diet: this.diet,
      reduced: shell.settings.access.reduce_motion, target: this.target });
  }
}

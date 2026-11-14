// ---------------------------------------------------------------------------
// Purpose: Civilization Toy 2 battlefield adapter and action-based command bar.
// Usage: 1 hero, 2 builder, 3 summons; matching native buttons. Optional obstacle-aware patrol.
// Notes: PROTOTYPE: existing original creature/city sprites; engine-free rules in civ/wars.ts.
// Authored: Written with Codex (GPT-6).
// ---------------------------------------------------------------------------
import * as Phaser from "phaser";
import { shell } from "../shell/app";
import { Log } from "../core/log";
import { writeStage } from "../core/lineage";
import { newBattle, place, train, send, setLever, income, foodIncome, route, heroAttack, moveHero, stepBattle, warsRecord, cellOf, type Battle, type Cell } from "./civ/wars";
import { WAR, TOWERS, SENDS, type TowerKind, type SendKind } from "./civ/warsTuning";
import { towerCost } from "./civ/wars";
import { revealFrom } from "./aquatic/reveal";
import { warsLayout } from "./civ/layout";
import { StageUi, type StageAction } from "./stageUi";
import { followHeroOrder, heroRoute, newHeroOrders, patrolHero } from "./civ/heroOrders";
import "./civ/controls.css";
type Selection = "hero" | "builder" | "summons";
const COMMANDS = ["thorn", "mortar", "frost", "runner", "shell", "swarm", "gatherer", "builder", "lever", "hero"] as const;
const COLORS = { thorn: 0xe6c891, mortar: 0xe7ac81, frost: 0x8dd5ed };
export class CivScene extends Phaser.Scene {
  private battle!: Battle;
  private gfx!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Text;
  private info!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private result!: Phaser.GameObjects.Text;
  private buttons: Phaser.GameObjects.Text[] = [];
  private sprites = new Map<string, Phaser.GameObjects.Sprite>();
  private command = 0;
  private selection: Selection = "hero";
  private patrol = false;
  private orders = newHeroOrders();
  private buildCursor: Cell = { x: 4, y: 3 };
  private target: Cell | null = null;
  private written = false;
  private rival: Battle["rival"] = "raider";
  private screenUi!: StageUi;
  private commandsOpen = false;
  private workersOpen = false;
  private boardLabels: Phaser.GameObjects.Text[] = [];
  private inherited = { strength: 2, maxHp: 0, climb: false };
  constructor() { super("civ"); }
  preload(): void {
    this.load.spritesheet("warPieces", "assets/art/civ_pieces.png", { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet("warHero", "assets/art/creature_walker.png", { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet("warBeast", "assets/art/creature_foes.png", { frameWidth: 32, frameHeight: 32 });
  }
  create(): void {
    this.gfx = this.add.graphics(); this.sprites.clear(); this.buttons = []; this.command = 0; this.selection = "hero"; this.patrol = false; this.orders = newHeroOrders(); this.buildCursor = { x: 4, y: 3 }; this.target = null; this.written = false;
    const text = (x: number, y: number, size: number) => this.add.text(x, y, "", { fontFamily: "monospace", fontSize: size + "px", color: "#e4edd7", wordWrap: { width: 615 } }).setResolution(2).setDepth(10);
    this.hud = text(12, 25, 11); this.info = text(12, 68, 10); this.hint = text(12, 334, 9);
    this.result = text(80, 130, 14).setWordWrapWidth(480).setDepth(30).setVisible(false);
    const saved = shell.saves.load("lineage").envelope?.data as { species?: { stages?: { creature?: { hero?: { strength?: unknown; vitality?: unknown; climb?: unknown } } } }[] } | undefined;
    const hero = saved?.species?.[0]?.stages?.creature?.hero;
    this.inherited = { strength: typeof hero?.strength === "number" && Number.isFinite(hero.strength) ? hero.strength : 2, maxHp: typeof hero?.vitality === "number" && Number.isFinite(hero.vitality) ? hero.vitality : 0, climb: hero?.climb === true };
    const reveal = revealFrom(saved, 3, "civ");
    this.rival = reveal.rows.find(r => r.kind === "aggressive")!.pct > reveal.rows.find(r => r.kind === "cautious")!.pct ? "warden" : "raider";
    this.battle = newBattle(this.inherited, this.rival);
    this.screenUi = new StageUi(this); this.commandsOpen = false; this.workersOpen = false;
    this.screenUi.root.classList.add("civ-controls");
    const shortcuts = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.altKey || event.metaKey || shell.topId !== "play" || shell.input.capturing || this.battle.status !== "playing" || this.screenUi.detailsOpen) return;
      if ((event.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable=true]")) return;
      const shortcuts: Record<string, Selection> = { Digit1: "hero", Digit2: "builder", Digit3: "summons" };
      const group = shortcuts[event.code];
      if (group) { event.preventDefault(); this.select(group); this.draw(); }
    };
    window.addEventListener("keydown", shortcuts);
    this.events.once("shutdown", () => window.removeEventListener("keydown", shortcuts));
    this.boardLabels = ["Your maze", "Rival maze"].map(s => this.add.text(0, 0, s, { fontFamily: "sans-serif", fontSize: "14px", color: "#e4edd7" }).setDepth(10).setResolution(2));
    COMMANDS.forEach((_cmd, n) => {
      const b = text(13 + n % 5 * 124, 279 + Math.floor(n / 5) * 29, 10).setWordWrapWidth(119).setInteractive({ useHandCursor: true });
      this.buttons.push(b);
    });
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (shell.topId !== "play" || this.battle.status !== "playing" || this.screenUi.detailsOpen) return;
      const board = this.layout();
      const c = { x: Math.floor((p.x - board.left.x) / board.tile), y: Math.floor((p.y - board.left.y) / board.tile) };
      if (c.x < 0 || c.x >= WAR.cols || c.y < 0 || c.y >= WAR.rows) return;
      if (this.selection === "builder") { this.buildCursor = c; place(this.battle, c, COMMANDS[this.command] as TowerKind); }
      else if (this.selection === "hero") {
        if (!heroRoute(this.battle, c).length) { this.battle.message = "The hero cannot reach that cell. Choose an open route."; return; }
        this.patrol = false; this.orders = newHeroOrders(); this.target = c;
      }
    });
    Log.info("civ", `Tower wars begins; inherited hero ${JSON.stringify(this.inherited)}`); this.draw();
  }
  private closeCommands(): void {
    this.commandsOpen = false; this.workersOpen = false; this.screenUi.root.classList.remove("civ-menu-open"); this.screenUi.modal.classList.remove("civ-live-menu"); this.screenUi.hide(); shell.input.clearHeld();
    (document.activeElement as HTMLElement | null)?.blur();
  }
  private select(selection: Selection, open = true): void {
    this.selection = selection; this.closeCommands();
    if (selection !== "hero") { this.target = null; this.commandsOpen = open; }
    this.battle.message = selection === "hero" ? "Tap your maze to move."
      : selection === "builder" ? "Choose a tower, then tap an empty cell."
      : "Choose creatures to send through the rival maze.";
  }
  private togglePatrol(): void {
    this.patrol = !this.patrol; this.target = null; this.orders = newHeroOrders();
    shell.input.clearHeld();
    this.battle.message = this.patrol ? "Hero patrols and fights automatically." : "Hero awaits your orders.";
  }
  update(_time: number, delta: number): void {
    if (shell.topId !== "play") return;
    const s = this.battle, i = shell.input, dt = Math.min(delta / 1000, 0.05);
    if (s.status !== "playing") {
      if (!this.written && s.status !== "fallen") this.record();
      if (i.takePress("interact")) {
        this.battle = newBattle(this.inherited, this.rival); this.written = false; this.target = null;
        this.patrol = false; this.orders = newHeroOrders(); this.selection = "hero"; this.command = 0;
        this.buildCursor = { x: 4, y: 3 }; this.closeCommands(); this.result.setVisible(false);
      }
      else if (i.takePress("ui_accept") && s.status !== "fallen" && this.written) { shell.startGame("space"); return; }
      this.draw(); return;
    }
    if (this.screenUi.detailsOpen) { this.draw(); return; }
    // Existing remappable cycle actions now select three roles, rather than ten unrelated tools.
    if (i.takePress("dash")) { const groups: Selection[] = ["hero", "builder", "summons"]; this.select(groups[(groups.indexOf(this.selection) + 1) % 3]); }
    if (i.takePress("lens")) { const groups: Selection[] = ["hero", "builder", "summons"]; this.select(groups[(groups.indexOf(this.selection) + 2) % 3]); }
    const choosing = this.commandsOpen;
    if (!choosing) {
    const attack = i.takePress("attack") || i.takePress("sink"), pulse = i.takePress("jump");
    if (this.selection === "hero") {
      let dx = Number(i.isDown("move_right")) - Number(i.isDown("move_left")), dy = Number(i.isDown("move_down")) - Number(i.isDown("move_up"));
      if (dx || dy) { this.patrol = false; this.target = null; this.orders = newHeroOrders(); moveHero(s, dx, dy, dt); }
      else if (this.target && followHeroOrder(s, this.target, dt, this.orders)) this.target = null;
      if (attack || pulse) { this.patrol = false; if (attack) heroAttack(s); if (pulse) heroAttack(s, true); }
      if (i.takePress("interact")) { this.commandsOpen = true; i.clearHeld(); }
    } else if (this.selection === "builder") {
      const dx = Number(i.takePress("move_right")) - Number(i.takePress("move_left")), dy = Number(i.takePress("move_down")) - Number(i.takePress("move_up"));
      this.buildCursor = { x: Math.max(1, Math.min(WAR.cols - 2, this.buildCursor.x + dx)), y: Math.max(0, Math.min(WAR.rows - 1, this.buildCursor.y + dy)) };
      if (i.takePress("interact") || pulse) place(s, this.buildCursor, COMMANDS[this.command] as TowerKind);
      if (attack) { this.commandsOpen = true; i.clearHeld(); }
    } else if (i.takePress("interact") || pulse) { this.commandsOpen = true; i.clearHeld(); }
    } else i.clearPresses();
    if (this.patrol) patrolHero(s, dt, this.orders);
    stepBattle(s, dt);
    if (s.status !== "playing") i.clearPresses();
    this.draw();
  }
  private record(): void {
    try {
      const r = warsRecord(this.battle), prev = shell.saves.load("lineage").envelope?.data;
      const next = writeStage(prev, "civ", r.causes, r.block);
      shell.saves.save("lineage", next as unknown as Parameters<typeof shell.saves.save>[1]); this.written = true;
      Log.info("civ", `Victory ${String(r.block.victory)} recorded`);
    } catch (err) { this.battle.message = "Victory earned; save failed. Remain here to retry saving."; Log.warn("civ", String(err)); }
  }
  private sprite(key: string, texture: string, frame: number, x: number, y: number, scale = 0.8, tint = 0xffffff): void {
    let spr = this.sprites.get(key); if (!spr) { spr = this.add.sprite(x, y, texture).setDepth(4); this.sprites.set(key, spr); }
    spr.setFrame(frame).setPosition(x, y).setScale(scale * this.layout().tile / 24).setTint(tint).setVisible(true);
  }
  private layout() {
    const canvas = this.game.canvas.getBoundingClientRect(), style = getComputedStyle(this.screenUi.root);
    const safeBottom = parseFloat(style.getPropertyValue("--safe-bottom")) || 0;
    const menuHeight = parseFloat(style.getPropertyValue("--civ-menu-height")) || 104;
    const dockOffset = parseFloat(style.getPropertyValue("--civ-dock-offset")) || 112;
    const dockTop = this.commandsOpen ? window.innerHeight - safeBottom - dockOffset - menuHeight
      : this.screenUi.message.getBoundingClientRect().top || window.innerHeight - safeBottom - 180;
    const available = Math.max(90, (dockTop - canvas.top - 8) * this.scale.height / Math.max(1, canvas.height));
    return warsLayout(this.scale.width, Math.min(this.scale.height, available), 0);
  }
  private point(side: number, c: Cell): Cell { const b = this.layout(), origin = side === 0 ? b.left : b.right; return { x: origin.x + (c.x + 0.5) * b.tile, y: origin.y + (c.y + 0.5) * b.tile }; }
  private draw(): void {
    const s = this.battle, g = this.gfx; g.clear(); this.sprites.forEach(spr => spr.setVisible(false));
    g.fillStyle(0x10232a).fillRect(0, 0, this.scale.width, this.scale.height);
    const board = this.layout();
    const tickFrame = Math.floor(s.clock * 6) % 4;
    s.sides.forEach((side, n) => {
      const origin = n === 0 ? board.left : board.right;
      this.boardLabels[n].setPosition(origin.x, origin.y - 20);
      for (let y = 0; y < WAR.rows; y++) for (let x = 0; x < WAR.cols; x++) g.fillStyle((x + y) % 2 ? 0x344735 : 0x2c3e31).fillRect(origin.x + x * board.tile, origin.y + y * board.tile, board.tile - 1, board.tile - 1);
      const path = route(side.towers); g.lineStyle(2, n === 0 ? 0x83ac83 : 0xc08b88, 0.55);
      for (let j = 1; j < path.length; j++) { const a = this.point(n, path[j - 1]), b = this.point(n, path[j]); g.lineBetween(a.x, a.y, b.x, b.y); }
      for (const t of side.towers) {
        const p = this.point(n, t); this.sprite(`t${t.id}`, "warPieces", TOWERS[t.kind].frame + tickFrame, p.x, p.y - 2, 0.78, t.build > 0 ? 0x777777 : COLORS[t.kind]);
        if (t.build > 0) g.fillStyle(0xeac974).fillRect(p.x - 10, p.y + 8, 20 * (1 - t.build / WAR.buildSeconds), 2);
        if (t.shot) { const end = this.point(n, t.shot); g.lineStyle(2, COLORS[t.kind]).lineBetween(p.x, p.y, end.x, end.y); }
      }
      const home = this.point(n, WAR.exit); this.sprite(`base${n}`, "warPieces", 12 + tickFrame, home.x, home.y, 1.05, n === 0 ? 0xa5e5c2 : 0xf09e9e);
      const worker = this.point(n, { x: 9, y: 6 }); this.sprite(`worker${n}`, "warPieces", 4 + tickFrame, worker.x - Math.sin(s.clock) * 12, worker.y, 0.65);
      const builder = this.point(n, { x: 10, y: 6 }); this.sprite(`builder${n}`, "warPieces", tickFrame, builder.x, builder.y, 0.65);
    });
    for (const u of s.units) {
      const p = this.point(u.target, u);
      p.y += (u.id % 3 - 1) * 5; // Visible ranks keep simultaneous brood bodies from hiding one another.
      this.sprite(`u${u.id}`, "warBeast", tickFrame, p.x, p.y, u.kind === "shell" ? 0.9 : 0.65, u.target === 0 ? 0xffa8a8 : 0xa8e5ca);
      g.fillStyle(0x102025).fillRect(p.x - 8, p.y - 11, 16, 2); g.fillStyle(u.slow > 0 ? 0x91d5eb : 0xdbcf80).fillRect(p.x - 8, p.y - 11, 16 * Math.max(0, u.hp / u.maxHp), 2);
    }
    const h = this.point(0, s.hero);
    if (s.hero.ability > WAR.abilityCooldown - 0.45) g.lineStyle(2, 0xf0d87c, 0.75).strokeCircle(h.x, h.y, (WAR.abilityCooldown - s.hero.ability) * 120 + 6);
    if (!s.hero.respawn) this.sprite("hero", "warHero", (s.hero.cooldown > 0 ? 12 : 4) + tickFrame, h.x, h.y, 0.9, s.hero.climb ? 0x9ee9ae : 0xffe39a);
    const cursor = this.point(0, this.selection === "builder" ? this.buildCursor : cellOf(s.hero)), cursorSize = board.tile - 2;
    g.lineStyle(2, 0xf4d881).strokeRect(cursor.x - cursorSize / 2, cursor.y - cursorSize / 2, cursorSize, cursorSize);
    this.hud.setText(`YOUR BASE ${s.sides[0].hp}/${WAR.baseHp}   RIVAL ${s.sides[1].hp}/${WAR.baseHp}   |   Ore ${Math.floor(s.sides[0].ore)}  Food ${Math.floor(s.sides[0].food)}\nIncome ${income(s, 0).toFixed(1)} vs ${income(s, 1).toFixed(1)}  /  need ${(income(s, 1) * WAR.incomeRatio).toFixed(1)}   Payday ${Math.ceil(WAR.tick - s.incomeClock)}s`);
    const next = s.wave + 1, kind = next % 3 === 0 ? "shell" : next % 2 === 0 ? "swarm" : "runner";
    this.info.setText(`Wave ${next} in ${Math.ceil(s.waveClock)}s: ${2 + Math.floor(next / 3) + (s.rival === "raider" ? 1 : 0)} ${SENDS[kind].name}${kind === "swarm" ? " broods (3 each)" : ""}\nSends ${s.tally.sends}  Defense ${s.tally.defenses}  Maze ${s.tally.longest}  Hero hits ${s.tally.heroHits} | ${s.lever === "ore" ? "RICH ORE" : "ROCKY GROUND"}\nYour maze: workers ${s.sides[0].gatherers}G/${s.sides[0].builders}B/${s.sides[0].farmers ?? 0}F · Food/payday ${foodIncome(s, 0)}   Hero ${s.hero.respawn ? `returns ${Math.ceil(s.hero.respawn)}s` : `${s.hero.hp}/${s.hero.maxHp} HP`}   Rival: ${s.rival}`);
    this.buttons.forEach((b, n) => {
      const cmd = COMMANDS[n]; let label: string;
      if (n < 3) label = `${TOWERS[cmd as TowerKind].name}\n${towerCost(s, cmd as TowerKind)} ore · ${cmd === "mortar" ? "splash" : cmd === "frost" ? "slow" : "single"}`;
      else if (n < 6) { const spec = SENDS[cmd as SendKind]; label = `${spec.name}${cmd === "swarm" ? " x3" : cmd === "shell" ? " armor" : " fast"}\n${spec.ore} ore ${spec.food} food`; }
      else label = cmd === "gatherer" ? `Gatherer ${WAR.gatherCost} ore\n+income and food` : cmd === "builder" ? `Builder ${WAR.builderCost} ore\nFaster construction` : cmd === "lever" ? "Gardener: switch\nOre / rocky ground" : `Hero: Pulse\nSpace CD ${Math.ceil(s.hero.ability)}s`;
      b.setText(`${this.command === n ? ">" : " "}${label}`).setColor(this.command === n ? "#ffe299" : "#d5e0ce");
    });
    this.hint.setText(`${s.message}\nWASD move · Q/U tool · E act · J bite · Space pulse · Click tools / your grid`);
    // Destroy departed sprites; keeping every wave's invisible sprites would grow memory indefinitely.
    for (const [key, spr] of this.sprites) if (!spr.visible) { spr.destroy(); this.sprites.delete(key); }
    if (s.status !== "playing") {
      g.fillStyle(0x0a1720, 0.98).fillRect(60, 112, 520, 160);
      this.result.setVisible(true).setText(`${s.status === "fallen" ? "THE SETTLEMENT FELL" : s.status === "base" ? "VICTORY: RIVAL BASE DESTROYED" : "VICTORY: ECONOMIC SUPREMACY"}\n\n${s.status === "fallen" ? "The Gardener survives. Rebuild and try another strategy." : "Your battle choices become your spacefaring technology heritage."}\n\nE: rematch${s.status !== "fallen" ? "    Enter: begin space stage" : ""}`);
    }
    this.hud.setVisible(false); this.info.setVisible(false); this.hint.setVisible(false); this.result.setVisible(false); this.buttons.forEach(b => b.setVisible(false));
    this.screenUi.setStatus(`Base ${s.sides[0].hp} · Rival ${s.sides[1].hp} · Ore ${Math.floor(s.sides[0].ore)} · Food ${Math.floor(s.sides[0].food)}\nWave ${next} in ${Math.ceil(s.waveClock)}s · Income ${income(s, 0).toFixed(1)} / ${(income(s, 1) * 5).toFixed(1)} needed`, this.hud.text + "\n" + this.info.text);
    const help = this.selection === "builder" ? `${TOWERS[COMMANDS[this.command] as TowerKind].name} · ${towerCost(s, COMMANDS[this.command] as TowerKind)} ore${shell.input.scheme === "keyboard" ? " · E at cursor" : ""}`
      : this.selection === "hero" ? `Hero ${s.hero.respawn ? `returns in ${Math.ceil(s.hero.respawn)}s` : `${s.hero.hp}/${s.hero.maxHp} HP`} · ${this.patrol ? "AUTO PATROL" : "Manual"}` : "Summons: open menu to send creatures";
    this.screenUi.setMessage(help + "\n" + s.message);
    const blocked = this.screenUi.detailsOpen || s.status !== "playing";
    const roleActions: StageAction[] = (["hero", "builder", "summons"] as Selection[]).map((role, n) => ({
      id: `select-${role}`, label: `${shell.input.scheme === "keyboard" ? `${n + 1} ` : ""}${role === "hero" ? "Hero" : role === "builder" ? "Builder" : "Summons"}`,
      disabled: blocked, run: () => this.select(role),
    }));
    const context: StageAction[] = this.selection === "hero" ? [
      { id: "bite", label: "Bite", disabled: blocked || s.hero.respawn > 0, run: () => { this.patrol = false; heroAttack(s); } },
      { id: "pulse", label: s.hero.ability > 0 ? `Pulse ${Math.ceil(s.hero.ability)}s` : "Pulse", disabled: blocked || s.hero.respawn > 0 || s.hero.ability > 0, run: () => { this.patrol = false; heroAttack(s, true); } },
    ] : [
      { id: "choose", label: this.selection === "builder" ? "Choose tower" : "Open summons", disabled: blocked, run: () => { this.workersOpen = false; this.commandsOpen = true; shell.input.clearHeld(); } },
      { id: "economy", label: "Workers / terrain", disabled: blocked, run: () => { this.selection = "builder"; this.workersOpen = true; this.commandsOpen = true; shell.input.clearHeld(); } },
    ];
    this.screenUi.actions([...roleActions, { id: "patrol", label: `Patrol: ${this.patrol ? "ON" : "OFF"}`, disabled: blocked, run: () => this.togglePatrol() }, ...context]);
    this.screenUi.footer.querySelectorAll<HTMLButtonElement>("button").forEach(b => {
      if (b.dataset.action?.startsWith("select-")) b.setAttribute("aria-pressed", String(b.dataset.action === `select-${this.selection}`));
      if (b.dataset.action === "patrol") b.setAttribute("aria-pressed", String(this.patrol));
    });
    if (s.status !== "playing") this.screenUi.show(this.result.text, [{ id: "rematch", label: "Rematch", run: () => shell.input.inject("interact") }, ...(s.status !== "fallen" ? [{ id: "space", label: "Continue to space", run: () => shell.input.inject("ui_accept") }] : [])]);
    else if (this.commandsOpen) {
      const choices: StageAction[] = this.selection === "builder" && !this.workersOpen ? [
        ...([0, 1, 2] as const).map(n => ({ id: COMMANDS[n], label: this.buttons[n].text, run: () => { this.command = n; this.closeCommands(); } })),
        { id: "workers", label: "Workers / terrain", run: () => { this.workersOpen = true; shell.input.clearHeld(); } },
      ] : this.selection === "builder" ? [
        { id: "farmer", label: `Farmer · ${WAR.farmerCost} ore\n+${WAR.farmerFood} food/payday · ${s.sides[0].farmers ?? 0}/${WAR.maxWorkers}`, run: () => { train(s, "farmer"); shell.input.clearHeld(); } },
        { id: "gatherer", label: `Gatherer · ${WAR.gatherCost} ore\n+${WAR.gatherIncome} ore / +${WAR.gatherFood} food`, run: () => { train(s, "gatherer"); shell.input.clearHeld(); } },
        { id: "builder", label: `Builder · ${WAR.builderCost} ore\nFaster construction`, run: () => { train(s, "builder"); shell.input.clearHeld(); } },
        { id: "lever", label: s.lever === "ore" ? "Rich ore: +60% ore\nSwitch terrain" : "Rocky: −35% towers\nSwitch terrain", run: () => { setLever(s); shell.input.clearHeld(); } },
      ] : this.selection === "summons" ? [3, 4, 5].map(n => ({ id: COMMANDS[n], label: this.buttons[n].text, run: () => { send(s, COMMANDS[n] as SendKind); shell.input.clearHeld(); } })) : [
        { id: "auto-patrol", label: `Automatic patrol: ${this.patrol ? "ON" : "OFF"}`, run: () => this.togglePatrol() },
      ];
      this.screenUi.show(`${this.selection === "builder" ? this.workersOpen ? "Workers / terrain" : "Tower builder" : this.selection === "summons" ? "Summon creatures" : "Hero orders"} · Battle continues`, [...choices,
        { id: "close", label: "Close", run: () => this.closeCommands() }]);
      this.screenUi.footer.inert = false;
    } else this.screenUi.hide();
    const liveMenu = this.commandsOpen && s.status === "playing";
    this.screenUi.root.classList.toggle("civ-menu-open", liveMenu);
    this.screenUi.modal.classList.toggle("civ-live-menu", liveMenu);
    this.screenUi.modal.setAttribute("role", liveMenu ? "region" : "dialog");
    this.screenUi.modal.setAttribute("aria-label", liveMenu ? "Civilization commands" : "Battle result");
  }
}
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// SpaceScene.ts
// Purpose : The space stage, Toy (docs/stages/05-space.md): you captain a ship and a small fleet. Fit the flagship
//           in a hangar (your ship with its slots, parts as icons), recruit allied escorts that fly and fight on
//           their own, jump through wormholes between systems, fight T0|▼|'s patrols wave after wave, and come back
//           to find T0|▼| has learned what you used, so you refit. Three wins in a row at the Lattice summon the
//           Mothership; destroying it wins the stage, and you can keep playing.
// Usage   : the shell starts it as "space" (main menu "Space stage (prototype)", or winning the civilization stage).
//           URL: ?stage=space; &autoplay plays itself (smoke; &hold keeps it in the hangar); &world=tidereach starts
//           at the allies' world; &boss starts at the Lattice with the Mothership arriving; &debug logs.
//           Flying: A/D turn, W thrust, S reverse, Z/C strafe, X brake, Space or J fire guns (turrets and missiles
//           fire on their own), E land (far from the planet: the autopilot flies you there), [ and ] jump to the
//           previous / next system, U star map (click a system, then Enter or click it again).
//           Hangar: click an icon to buy it, click a slot to empty it; or WASD pick, E buy, Q remove; H other hull;
//           Enter launch.
// Notes   : PROTOTYPE. The rules are pure and tested in src/game/space/ (fit, adapt, combat, campaign); the panels
//           are drawn by space/panels.ts; this file flies the ship, draws space and turns input into rules.
//           Not yet: fleet orders, fuel, missions, the outer gardens, saving mid-campaign.
// Authored: Written with Claude (Fable 5.2, claude-fable-5-2)
// ---------------------------------------------------------------------------
import * as Phaser from "phaser";
import { writeStage, type TemperamentKind } from "../core/lineage";
import { Log } from "../core/log";
import { shell } from "../shell/app";
import { revealFrom, type Reveal } from "./aquatic/reveal";
import { animKey, animSpecs, type AtlasLayout } from "./cell/atlas";
import { cellSfx, type CellSfx } from "./cell/sfx";
import { LineagePanel } from "./lineagePanel";
import { T0 } from "./space/adapt";
import {
  SYSTEMS, afterBattle, bossDue, escortSpecs, finished, install, launch, neighbour, nextWave, pilotFight, pilotRecruit, pilotRefit, pilotWantsShop,
  pilotWorld, recruit, routeTo, spaceRecord, starSystem, startCampaign, swapHull, travel, uninstall, worldOf, type Campaign, type Outcome, type SystemId,
} from "./space/campaign";
import { IDLE, approachControls, newBattle, pilotControls, reinforce, step, type Battle, type Controls } from "./space/combat";
import { fitProblems, shipStats } from "./space/fit";
import { MAP_PICK, drawEnd, drawHangar, drawMap, drawReadout, hangarItems, hullAtlas, type HangarAct, type HangarButton, type Pen } from "./space/panels";
import { SPACE } from "./space/tuning";

const LOG = "space";
const W = 640, H = 360, CX = W / 2, CY = H / 2;
const ATLASES = ["space_ships", "space_allies", "space_t0", "space_props", "space_parts"] as const;
const SHOT_COL = { kinetic: 0xe8dcc0, beam: 0x80f0e0, spore: 0xa0e060 } as const;
const TILE_COLS = 6; // the hangar palette's row length (space/panels.ts)
const JUMP_KEYS: Record<string, 1 | -1> = { BracketRight: 1, Period: 1, BracketLeft: -1, Comma: -1 };
type Mode = "hangar" | "flight" | "map" | "jump" | "end";

export class SpaceScene extends Phaser.Scene {
  private c!: Campaign;
  private b!: Battle;
  private mode: Mode = "hangar";
  private temper: Record<TemperamentKind, number> = { cautious: 0.4, aggressive: 0.3, adaptable: 0.3 };
  private reveal: Reveal | null = null;
  private lineage!: LineagePanel;
  private sfx!: CellSfx;
  private world!: Phaser.GameObjects.Graphics; // stars, shots, radar: redrawn every frame
  private fx!: Phaser.GameObjects.Graphics; // the wormhole, over the ships
  private ui!: Phaser.GameObjects.Graphics; // panels and the HUD: redrawn when dirty
  private texts: Phaser.GameObjects.Text[] = [];
  private icons: Phaser.GameObjects.Sprite[] = []; // the panels' sprites (ship, part icons): redrawn with the panel
  private buttons: HangarButton[] = [];
  private youS!: Phaser.GameObjects.Sprite;
  private planetS!: Phaser.GameObjects.Sprite;
  private foeS = new Map<number, Phaser.GameObjects.Sprite>();
  private allyS = new Map<number, Phaser.GameObjects.Sprite>();
  private toastT!: Phaser.GameObjects.Text;
  private toastLeft = 0;
  private notes: string[] = []; // what the last battle changed (shown in the hangar)
  private sel = 0; // hangar: the picked palette item
  private mapSel: SystemId = "driftfield";
  private dirty = true;
  private hudT = 0;
  private held = new Set<string>(); // raw keys the shell has no action for: Z, C (strafe), X (brake)
  private route: SystemId[] = []; // the jumps still to make
  private jumpTo: SystemId = "hearth";
  private jumpT = 0;
  private jumped = false; // this hop has crossed over (the system changed at the wormhole's middle)
  private waveLeft = 0; // seconds until the next T0|▼| wave arrives here (0: none coming)
  private bossWave = false; // the wave being fought is the Mothership's
  private victoryShown = false;
  private autoLand = false; // the autopilot is flying to the planet
  private autoplay = false;
  private hold = false; // ?hold: the autoplay pilot stays in the hangar (for a screenshot)
  private pilotT = 0;
  private pilotGoal: "fight" | "shop" = "fight";
  private pilotCheck = false; // the pilot thinks about shopping once after each win
  private stars: { x: number; y: number; p: number }[] = [];
  private onKey = (e: KeyboardEvent) => {
    this.held.add(e.code);
    if (shell.topId !== "play" || e.repeat || this.lineage.isOpen || this.autoplay) return;
    if (this.mode === "hangar" && e.code === "KeyH") this.hangar({ kind: "hull" });
    if (this.mode === "flight" && JUMP_KEYS[e.code]) this.jumpBeside(JUMP_KEYS[e.code]);
  };
  private onKeyUp = (e: KeyboardEvent) => { this.held.delete(e.code); };

  constructor() {
    super("space");
  }

  preload(): void {
    for (const a of ATLASES) {
      this.load.spritesheet(a, `assets/art/${a}.png`, { frameWidth: 32, frameHeight: 32 });
      this.load.json(`${a}_layout`, `assets/art/${a}.json`);
    }
  }

  create(): void {
    const params = new URLSearchParams(location.search);
    this.autoplay = params.has("autoplay");
    this.hold = params.has("hold");
    if (params.has("debug")) Log.enableChannel(LOG);
    this.sfx = cellSfx();
    for (const a of ATLASES) {
      const layout = this.cache.json.get(`${a}_layout`) as AtlasLayout | undefined;
      if (!layout) throw new Error(`missing atlas layout ${a}_layout (build assets_src/sprites/${a}.py)`);
      const rate = a === "space_parts" ? 2 : a === "space_props" ? 1 : 8;
      for (const s of animSpecs(a, layout)) if (!this.anims.exists(s.key)) this.anims.create({ key: s.key, frames: this.anims.generateFrameNumbers(a, { start: s.start, end: s.end }), frameRate: rate, repeat: -1 });
    }
    const handIn = this.readLineage();
    this.c = startCampaign({ temper: this.temper, civ: handIn.civ, harshness: handIn.harshness });
    if (params.get("world") === "tidereach") this.c = { ...this.c, system: "tidereach" }; // debug: start at the allies' world
    if (params.has("boss")) this.c = { ...this.c, system: "lattice", latticeStreak: SPACE.boss.streak }; // debug: the Mothership arrives
    this.notes = [];
    this.foeS.clear(); this.allyS.clear(); this.held.clear();
    this.texts = []; this.icons = []; this.route = [];
    this.sel = 0; this.waveLeft = 0; this.victoryShown = false; this.autoLand = false; this.pilotGoal = "fight"; this.pilotCheck = false;
    this.stars = Array.from({ length: 90 }, (_, i) => ({ x: (i * 197) % W, y: (i * 113 + (i % 7) * 31) % H, p: 0.15 + (i % 3) * 0.2 }));
    this.world = this.add.graphics().setDepth(0);
    this.planetS = this.add.sprite(0, 0, "space_props").setScale(3).setDepth(1);
    this.youS = this.add.sprite(CX, CY, "space_ships").setDepth(5);
    this.fx = this.add.graphics().setDepth(30);
    this.ui = this.add.graphics().setDepth(50);
    this.toastT = this.add.text(CX - 30, 26, "", { fontFamily: "monospace", fontSize: "10px", color: "#fff6c8", align: "center", wordWrap: { width: 380 }, backgroundColor: "#000000b0", padding: { x: 6, y: 3 } })
      .setOrigin(0.5, 0).setDepth(100).setResolution(2).setVisible(false);
    this.b = this.battleHere(1, worldOf(this.c.system) ? { x: 0, y: 110 } : undefined);
    this.setMode(worldOf(this.c.system) ? "hangar" : "flight");
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => this.click(p.x, p.y));
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => this.hover(p.x, p.y));
    window.addEventListener("keydown", this.onKey);
    window.addEventListener("keyup", this.onKeyUp);
    this.events.once("shutdown", () => { window.removeEventListener("keydown", this.onKey); window.removeEventListener("keyup", this.onKeyUp); });
    this.lineage = new LineagePanel(this);
    if (!this.autoplay) this.lineage.show(this.reveal ?? revealFrom(null, 3, "space"), "Enter or E: take the helm");
    Log.info(LOG, `START home ${this.c.makers.home}, ally ${this.c.makers.ally}, harshness ${this.c.harshness.toFixed(2)}, parts ${this.c.fit.parts.join(",")}, salvage ${this.c.credits}`);
  }

  /** The lineage sets the home species' temperament; the civilization block and harshness set the start. */
  private readLineage(): { civ: Record<string, unknown> | null; harshness: number } {
    try {
      const saved = shell.saves.load("lineage").envelope?.data ?? null;
      const rv = revealFrom(saved, 3, "space");
      this.reveal = rv;
      if (!rv.fromSave) return { civ: null, harshness: 0 };
      for (const row of rv.rows) this.temper[row.kind] = row.pct / 100;
      const l = saved as { gardener?: { harshness?: number }; species?: { stages?: { civ?: Record<string, unknown> } }[] };
      const h = l.gardener?.harshness;
      return { civ: l.species?.[0]?.stages?.civ ?? null, harshness: typeof h === "number" && Number.isFinite(h) ? h : 0 };
    } catch (err) {
      Log.warn(LOG, `could not read the lineage: ${err instanceof Error ? err.message : String(err)}`);
      return { civ: null, harshness: 0 };
    }
  }

  private stats() { return shipStats(this.c.fit, this.c.makers, this.c.learned); }
  /** A battle in the system you are in: the flagship (carrying its damage), the fleet, and whatever wave waits. */
  private battleHere(hullFrac: number, at?: { x: number; y: number }): Battle {
    this.bossWave = bossDue(this.c);
    this.waveLeft = 0;
    return newBattle(this.stats(), nextWave(this.c), this.c.learned, hullFrac, at, escortSpecs(this.c), this.c.fit.hull);
  }

  private toast(s: string, secs = 4): void {
    this.toastT.setText(s).setVisible(true);
    this.toastLeft = secs;
  }

  private clearShips(): void {
    for (const s of [...this.foeS.values(), ...this.allyS.values()]) s.destroy();
    this.foeS.clear(); this.allyS.clear();
  }

  private setMode(m: Mode): void {
    this.mode = m;
    this.dirty = true;
    shell.input.clearPresses(); // a key pressed in one mode must not fire in the next (Enter in flight, then the map)
    const flying = m === "flight" || m === "map" || m === "jump";
    this.youS.setVisible(flying).setScale(1).setAlpha(1);
    if (m !== "jump") this.fx.clear();
    if (!flying) { this.clearShips(); this.world.clear(); this.planetS.setVisible(false); this.autoLand = false; }
  }

  // ---- the campaign's moves ---------------------------------------------------------------------------------
  private hangar(a: HangarAct): void {
    if (a.kind === "launch") { this.launch(); return; }
    const d = a.kind === "hull" ? swapHull(this.c) : a.kind === "add" ? install(this.c, a.part) : a.kind === "recruit" ? recruit(this.c, a.escort) : uninstall(this.c, a.part);
    this.sfx.play(d.ok ? (a.kind === "recruit" ? "evolve" : "upgrade") : "deny");
    this.toast(d.ok ? d.why : `Cannot: ${d.why}`, 2);
    if (d.ok && a.kind === "recruit") Log.info(LOG, `RECRUIT ${a.escort}: fleet ${d.c.fleet.join(",")}`);
    this.c = d.c;
    this.dirty = true;
  }

  private launch(): void {
    const problems = fitProblems(this.c.fit);
    if (problems.length) { this.sfx.play("deny"); this.toast(`Cannot launch: ${problems.join(", ")}`, 3); return; }
    const before = this.c.refits;
    this.c = launch(this.c);
    if (this.c.refits > before) Log.info(LOG, `REFIT ${this.c.refits}: ${this.c.fit.hull} ${this.c.fit.parts.join(",")}`);
    this.b = this.battleHere(1, { x: 0, y: 110 });
    this.setMode("flight");
    this.sfx.play("evolve");
    this.toast(`In orbit over ${worldOf(this.c.system)?.name ?? "nothing"}.  ] next system   U: star map`, 4);
  }

  private land(): void {
    this.sfx.play("part");
    this.sel = 0;
    this.setMode("hangar");
    Log.info(LOG, `LAND ${this.c.system}`);
  }

  // ---- jumping (BAMF69 2026-11-10: no map needed, a wormhole to fly through) --------------------------------
  /** [ and ]: jump to the system before / after this one along the map. */
  private jumpBeside(dir: 1 | -1): void {
    const to = neighbour(this.c.system, dir);
    if (to) this.startJump(to);
    else { this.sfx.play("deny"); this.toast(dir > 0 ? "No system further out: the Lattice is the last" : "No system further back: this is home", 2); }
  }

  /** Jump to any system: through each system on the way, one wormhole per hop. A patrol on the way stops the trip. */
  private startJump(to: SystemId): void {
    this.route = routeTo(this.c.system, to);
    if (this.route.length) this.beginHop();
  }

  private beginHop(): void {
    this.jumpTo = this.route.shift() as SystemId;
    this.jumpT = 0;
    this.jumped = false;
    this.autoLand = false;
    this.setMode("jump");
    this.sfx.play("evolve");
    this.toastT.setVisible(false);
  }

  /** The wormhole's middle: leave this system (breaking off a fight still running) and arrive in the next. */
  private arrive(to: SystemId): void {
    if (this.b.hostile && !this.b.over) this.endBattle("fled");
    const frac = this.b.you.hull / this.b.you.hullMax;
    this.c = travel(this.c, to);
    this.clearShips();
    this.b = this.battleHere(frac);
    Log.info(LOG, `JUMP ${to}: patrol ${this.b.foes.map((f) => f.kind).join(",") || "none"}, fleet ${this.c.fleet.join(",") || "none"}, hull ${Math.round(frac * 100)} %`);
  }

  private jumpStep(dt: number): void {
    const secs = shell.settings.access.reduce_motion ? 0.4 : SPACE.jump.secs;
    this.jumpT += dt;
    const p = Math.min(1, this.jumpT / secs);
    if (p >= 0.5 && !this.jumped) { this.jumped = true; this.arrive(this.jumpTo); }
    if (p < 1) return;
    if (this.route.length && !this.b.foes.length) { this.beginHop(); return; } // on through a quiet system
    this.route = [];
    const n = this.b.foes.length, here = starSystem(this.c.system);
    this.setMode("flight");
    this.pilotT = 0;
    this.toast(this.bossWave ? `${here.name}: ${T0}'s Mothership is here` : n ? `${here.name}: ${T0} patrol ahead (${n} ships)` : `${here.name}, a friendly world.  E: land`, 4);
  }

  /** The wormhole: rings rushing past and a spiral, strongest at the middle of the jump, when the system changes. */
  private drawWormhole(): void {
    const g = this.fx, still = shell.settings.access.reduce_motion;
    const p = Math.min(1, this.jumpT / (still ? 0.4 : SPACE.jump.secs)), amp = Math.sin(Math.PI * p);
    g.clear();
    g.fillStyle(0x0a0420, 0.9 * amp * amp).fillRect(0, 0, W, H); // the dark of the tunnel hides the change of system
    this.youS.setScale(1 - 0.6 * amp).setAlpha(1 - 0.5 * amp);
    if (still) return; // reduce motion: a plain fade
    for (let k = 0; k < 10; k++) {
      const r = (k / 10 + p * 2.2) % 1;
      g.lineStyle(2, k % 2 ? 0x80f0ff : 0xa080ff, (1 - r) * amp).strokeCircle(CX, CY, 14 + r * r * 330);
    }
    for (let i = 0; i < 48; i++) { // the spiral
      const a = i * 0.42 + p * 14, rad = 10 + i * 6.5;
      g.fillStyle(0xe0f8ff, amp * (1 - i / 48)).fillRect(CX + Math.cos(a) * rad, CY + Math.sin(a) * rad, 2, 2);
    }
  }

  // ---- battles ------------------------------------------------------------------------------------------------
  /** A wave is over (won, lost, or you jumped away): T0|▼| adapts, and the player is told what it learned. */
  private endBattle(outcome: Outcome): void {
    const r = afterBattle(this.c, outcome, this.b.dealt, this.b.salvage, this.b.lostEscorts, this.bossWave && outcome === "won");
    this.c = r.c;
    this.notes = r.notes;
    this.b.hostile = false; // this wave is settled
    this.toast(r.notes.join("\n"), 7);
    Log.info(LOG, `BATTLE ${outcome} (${this.c.wins} wins, ${this.c.losses} lost, streak ${this.c.latticeStreak}): ${r.notes.join("; ")}`);
    if (outcome === "lost") {
      this.cameras.main.shake(400, 0.015);
      this.sfx.play("pop");
      this.route = [];
      this.b = this.battleHere(1, { x: 0, y: 110 });
      this.sel = 0;
      this.pilotGoal = "fight";
      this.setMode("hangar");
      return;
    }
    if (outcome !== "won") return;
    this.b.allies.forEach((s, i) => (s.escort = i)); // the fleet that is left, renumbered
    this.b.lostEscorts = [];
    for (const s of this.allyS.values()) s.destroy();
    this.allyS.clear();
    this.waveLeft = SPACE.wave.secs; // T0|▼| sends another: stay and fight on, or jump away
    this.pilotCheck = true;
    if (finished(this.c) && !this.victoryShown) this.finish();
  }

  /** The countdown ran out: the next wave arrives where you are (at the Lattice, maybe the Mothership). */
  private sendWave(): void {
    this.bossWave = bossDue(this.c);
    const wave = nextWave(this.c);
    reinforce(this.b, wave, this.c.learned);
    this.waveLeft = 0;
    this.sfx.play(this.bossWave ? "pop" : "bump");
    if (this.bossWave) this.cameras.main.shake(500, 0.01);
    this.toast(this.bossWave ? `${T0}'s Mothership arrives` : `Another ${T0} patrol arrives (${wave.length} ships)`, 4);
    Log.info(LOG, `WAVE ${this.c.system}: ${wave.join(",")}`);
  }

  /** The Mothership is down: the stage is won. Written into the lineage; the player may keep flying. */
  private finish(): void {
    const r = spaceRecord(this.c);
    this.victoryShown = true;
    this.setMode("end");
    this.toastT.setVisible(false);
    this.sfx.play("evolve");
    try {
      const prev = shell.saves.load("lineage").envelope?.data ?? null;
      shell.saves.save("lineage", writeStage(prev, "space", r.causes, r.block) as unknown as Parameters<typeof shell.saves.save>[1]);
      Log.info(LOG, `LINEAGE written (space): ${r.causes.length} causes`);
    } catch (err) {
      Log.error(LOG, `could not write the lineage: ${err instanceof Error ? err.message : String(err)}`);
    }
    Log.info(LOG, `STAGE_WON ${this.c.wins} wins, ${this.c.battles} battles, ${this.c.refits} refits, fleet ${this.c.fleet.length}, escorts lost ${this.c.escortsLost}`);
  }

  // ---- input ------------------------------------------------------------------------------------------------
  private buttonAt(x: number, y: number): HangarButton | undefined {
    if (shell.topId !== "play" || this.mode !== "hangar" || this.lineage.isOpen) return undefined;
    return this.buttons.find((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);
  }
  private click(x: number, y: number): void {
    if (this.mode === "map" && shell.topId === "play") { this.mapClick(x, y); return; }
    const hit = this.buttonAt(x, y);
    if (hit?.hover !== undefined) this.sel = hit.hover;
    if (hit?.act) this.hangar(hit.act);
  }
  /** Pointing at a palette icon shows what it is before you buy it. */
  private hover(x: number, y: number): void {
    const hit = this.buttonAt(x, y);
    if (hit?.hover !== undefined && hit.hover !== this.sel) { this.sel = hit.hover; this.dirty = true; }
  }

  /** The star map: a click picks a system; a click on the picked one (a double click) jumps there. */
  private mapClick(x: number, y: number): void {
    const s = SYSTEMS.find((o) => Math.hypot(o.x - x, o.y - y) < MAP_PICK);
    if (!s || s.id === this.c.system) return;
    if (s.id === this.mapSel) { this.startJump(s.id); return; }
    this.mapSel = s.id;
    this.sfx.play("choose");
    this.dirty = true;
  }

  private hangarKeys(): void {
    const inp = shell.input, items = hangarItems(this.c), n = Math.max(1, items.length);
    const move = (d: number) => { this.sel = (((this.sel + d) % n) + n) % n; this.dirty = true; };
    if (inp.takePress("ui_right") || inp.takePress("move_right")) move(1);
    if (inp.takePress("ui_left") || inp.takePress("move_left")) move(-1);
    if ((inp.takePress("ui_down") || inp.takePress("move_down")) && this.sel + TILE_COLS < n) move(TILE_COLS);
    if ((inp.takePress("ui_up") || inp.takePress("move_up")) && this.sel - TILE_COLS >= 0) move(-TILE_COLS);
    const it = items[this.sel];
    if (inp.takePress("interact") && it) this.hangar(it.kind === "part" ? { kind: "add", part: it.id } : { kind: "recruit", escort: it.id });
    if (inp.takePress("dash") && it?.kind === "part") this.hangar({ kind: "remove", part: it.id });
    if (inp.takePress("ui_accept")) this.launch();
  }

  private openMap(): void {
    this.mapSel = neighbour(this.c.system, 1) ?? starSystem(this.c.system).links[0];
    this.setMode("map");
  }

  private mapKeys(): void {
    const inp = shell.input, others = SYSTEMS.map((s) => s.id).filter((id) => id !== this.c.system);
    const i = Math.max(0, others.indexOf(this.mapSel));
    if (inp.takePress("ui_right") || inp.takePress("move_right")) { this.mapSel = others[(i + 1) % others.length]; this.dirty = true; }
    if (inp.takePress("ui_left") || inp.takePress("move_left")) { this.mapSel = others[(i + others.length - 1) % others.length]; this.dirty = true; }
    if (inp.takePress("lens")) this.setMode("flight");
    else if (inp.takePress("ui_accept") && this.mapSel !== this.c.system) this.startJump(this.mapSel);
  }

  private flightControls(): Controls {
    const inp = shell.input, down = (a: string, b: string) => inp.isDown(a) || inp.isDown(b);
    return {
      turn: (down("move_right", "ui_right") ? 1 : 0) - (down("move_left", "ui_left") ? 1 : 0),
      thrust: (down("move_up", "ui_up") ? 1 : 0) - (down("move_down", "ui_down") ? 1 : 0), // W forward, S reverse thrusters
      strafe: (this.held.has("KeyC") ? 1 : 0) - (this.held.has("KeyZ") ? 1 : 0), // side thrusters
      brake: this.held.has("KeyX"),
      fire: down("jump", "attack"),
    };
  }

  private nearPlanet(): boolean {
    return !!worldOf(this.c.system) && Math.hypot(this.b.you.x, this.b.you.y) < SPACE.landRange;
  }

  /** E: land if you are over the planet; otherwise the autopilot flies you there (BAMF69 2026-11-10). */
  private pressLand(): void {
    const world = worldOf(this.c.system);
    if (!world) { this.sfx.play("deny"); this.toast("No friendly world in this system", 2); return; }
    if (this.nearPlanet()) { this.land(); return; }
    this.autoLand = true;
    this.toast(`Autopilot: landing on ${world.name}  (any flight key cancels)`, 3);
  }

  /** The landing autopilot's turn: fly to the planet, stop over it, land. Returns its controls, or null once landed. */
  private autoLandControls(): Controls | null {
    const you = this.b.you;
    if (this.nearPlanet() && Math.hypot(you.vx, you.vy) < 60) { this.land(); return null; }
    return approachControls(you, 0, 0, SPACE.landRange * 0.6);
  }

  // ---- flying -----------------------------------------------------------------------------------------------
  private fly(c: Controls, dt: number): void {
    for (const e of step(this.b, c, dt)) {
      if (e.kind === "kill") { this.sfx.play("pop"); this.cameras.main.shake(e.foe === "mothership" ? 600 : 120, e.foe === "mothership" ? 0.02 : 0.006); }
      else if (e.kind === "hurt") { this.sfx.play("bump"); this.cameras.main.shake(90, e.shield ? 0.002 : 0.006); }
      else if (e.kind === "allylost") { this.sfx.play("pop"); this.cameras.main.shake(200, 0.008); this.toast(`Your ${SPACE.escorts[this.c.fleet[e.escort]]?.name ?? "escort"} is destroyed`, 3); }
      else if (e.kind === "spawn") this.toast("The Mothership launches a Shard", 2);
      else if (e.kind === "won") this.endBattle("won");
      else if (e.kind === "lost") this.endBattle("lost");
      else if (e.kind === "giveup") Log.debug(LOG, `T0 ship ${e.id} gives up the chase`);
    }
    if (this.mode === "flight" && this.waveLeft > 0 && (this.waveLeft -= dt) <= 0) this.sendWave();
  }

  private bar(x: number, y: number, r: number, f: number, col: number): void {
    const w = Math.max(24, r * 2);
    this.world.fillStyle(0x000000, 0.7).fillRect(x - w / 2, y - r - 8, w, 3).fillStyle(col, 1).fillRect(x - w / 2, y - r - 8, w * Math.max(0, f), 3);
  }

  private drawSpace(): void {
    const g = this.world, you = this.b.you;
    const sx = (x: number) => x - you.x + CX, sy = (y: number) => y - you.y + CY;
    const warp = this.mode === "jump" && !shell.settings.access.reduce_motion ? Math.sin(Math.PI * Math.min(1, this.jumpT / SPACE.jump.secs)) : 0;
    g.clear();
    g.fillStyle(0x05070d, 1).fillRect(0, 0, W, H);
    for (const s of this.stars) { // parallax: far stars drift slower; in a wormhole they streak away from the centre
      const x = (((s.x - you.x * s.p) % W) + W) % W, y = (((s.y - you.y * s.p) % H) + H) % H;
      if (warp > 0.05) g.lineStyle(1, 0xc8d8ff, 0.3 + s.p).lineBetween(x, y, x + (x - CX) * warp * 0.5, y + (y - CY) * warp * 0.5);
      else g.fillStyle(0xc8d8ff, 0.3 + s.p).fillRect(x, y, s.p > 0.5 ? 2 : 1, 1);
    }
    const world = worldOf(this.c.system);
    this.planetS.setVisible(!!world).setPosition(sx(0), sy(0));
    if (world) { const key = animKey("space_props", world.sprite, "up"); if (this.planetS.anims.currentAnim?.key !== key) this.planetS.play(key); }
    this.youS.setPosition(CX, CY).setRotation(you.a + Math.PI / 2);
    const key = animKey("space_ships", this.c.fit.hull, "up");
    if (this.youS.anims.currentAnim?.key !== key) this.youS.play(key);
    const allies = new Set<number>();
    for (const a of this.b.allies) { // your escorts: they fly themselves
      allies.add(a.escort);
      let s = this.allyS.get(a.escort);
      if (!s) { s = this.add.sprite(0, 0, hullAtlas(a.hullId)).play(animKey(hullAtlas(a.hullId), a.hullId, "up")).setDepth(4).setScale(a.hullId === "seedpod" ? 0.8 : 1); this.allyS.set(a.escort, s); }
      const x = sx(a.x), y = sy(a.y);
      s.setPosition(x, y).setRotation(a.a + Math.PI / 2);
      if (a.hull < a.hullMax) this.bar(x, y, a.r, a.hull / a.hullMax, 0x60d0c0);
    }
    for (const [id, s] of this.allyS) if (!allies.has(id)) { s.destroy(); this.allyS.delete(id); }
    const seen = new Set<number>();
    for (const f of this.b.foes) {
      seen.add(f.id);
      let s = this.foeS.get(f.id);
      if (!s) { s = this.add.sprite(0, 0, "space_t0").play(animKey("space_t0", f.kind, "up")).setDepth(f.kind === "mothership" ? 3 : 4).setScale(f.kind === "mothership" ? 3 : 1); this.foeS.set(f.id, s); }
      const x = sx(f.x), y = sy(f.y);
      s.setPosition(x, y).setRotation(f.a + Math.PI / 2).setTint(f.mode === "hunt" ? 0xffffff : 0x8090a8); // dim: pausing or resting
      if (f.hull < f.hullMax || f.kind === "mothership") this.bar(x, y, f.r + (f.kind === "mothership" ? 14 : 0), f.hull / f.hullMax, 0xff5040);
      if (x < 0 || x > W || y < 0 || y > H) this.edgeArrow(x, y, f.kind === "mothership" ? 0xff80ff : 0xff3020); // every threat readable before it arrives
    }
    for (const [id, s] of this.foeS) if (!seen.has(id)) { s.destroy(); this.foeS.delete(id); }
    for (const s of this.b.shots) {
      const big = s.homing ? 4 : s.family === "spore" ? 5 : 3;
      g.fillStyle(s.family ? SHOT_COL[s.family] : 0xff4030, 1).fillRect(sx(s.x) - big / 2, sy(s.y) - big / 2, big, big);
      if (s.homing) g.fillStyle(0x60a030, 0.7).fillRect(sx(s.x - s.vx * 0.04) - 1, sy(s.y - s.vy * 0.04) - 1, 2, 2); // a missile's trail
    }
    if (world && (sx(0) < 0 || sx(0) > W || sy(0) < 0 || sy(0) > H)) this.edgeArrow(sx(0), sy(0), 0x60c0a0);
    // your hull and shield, always on screen
    g.fillStyle(0x000000, 0.7).fillRect(10, H - 24, 124, 16);
    g.fillStyle(0xd0a050, 1).fillRect(12, H - 22, 120 * Math.max(0, you.hull / you.hullMax), 5);
    if (this.b.stats.shield > 0) g.fillStyle(0x60d0e0, 1).fillRect(12, H - 15, 120 * (you.shield / this.b.stats.shield), 5);
  }

  private edgeArrow(x: number, y: number, col: number): void {
    const a = Math.atan2(y - CY, x - CX), k = Math.min((CX - 14) / Math.abs(Math.cos(a) || 1e-6), (CY - 14) / Math.abs(Math.sin(a) || 1e-6));
    const ex = CX + Math.cos(a) * k, ey = CY + Math.sin(a) * k;
    this.world.fillStyle(col, 0.9).fillTriangle(ex + Math.cos(a) * 7, ey + Math.sin(a) * 7, ex + Math.cos(a + 2.4) * 6, ey + Math.sin(a + 2.4) * 6, ex + Math.cos(a - 2.4) * 6, ey + Math.sin(a - 2.4) * 6);
  }

  // ---- panels and HUD ---------------------------------------------------------------------------------------
  private pen(): Pen {
    return {
      g: this.ui,
      text: (x, y, s, size = 10, color = "#e8f0e0", originX = 0) => {
        const t = this.add.text(x, y, s, { fontFamily: "monospace", fontSize: `${size}px`, color }).setOrigin(originX, 0).setResolution(2).setDepth(60);
        this.texts.push(t);
        return t;
      },
      sprite: (x, y, atlas, pose, scale = 1, alpha = 1) => {
        this.icons.push(this.add.sprite(x, y, atlas).play(animKey(atlas, pose, "up")).setScale(scale).setAlpha(alpha).setDepth(55));
      },
    };
  }

  /** The line under the ship: what you can do right now. */
  private hint(): string {
    const world = worldOf(this.c.system);
    if (this.mode === "jump") return `Jumping to ${starSystem(this.jumped ? this.c.system : this.jumpTo).name}...`;
    if (this.autoLand) return `Autopilot: landing on ${world?.name}`;
    if (this.nearPlanet()) return `E: land on ${world?.name}   [ ]: jump   U: map`;
    if (world) return `E: autopilot to ${world.name}   [ ]: jump   U: map`;
    if (this.b.foes.length) return "Space: fire   S: reverse   Z C: strafe   X: brake   [ ]: jump away";
    if (this.waveLeft > 0) return `${bossDue(this.c) ? "The Mothership" : `Next ${T0} wave`} in ${Math.ceil(this.waveLeft)} s   [ ]: jump   U: map`;
    return "[ ]: jump   U: map";
  }

  private redraw(): void {
    for (const t of this.texts) t.destroy();
    for (const s of this.icons) s.destroy();
    this.texts = []; this.icons = []; this.buttons = [];
    this.ui.clear();
    const p = this.pen();
    if (this.mode === "hangar") this.buttons = drawHangar(p, this.c, this.sel, this.notes);
    else if (this.mode === "end") drawEnd(p, this.c, spaceRecord(this.c).causes.map((x) => x.cause));
    else {
      const b = this.b, c = this.c;
      const streak = c.system === "lattice" ? `   Streak ${Math.min(c.latticeStreak, SPACE.boss.streak)}/${SPACE.boss.streak}` : "";
      p.text(124, 8, `${starSystem(c.system).name}   Salvage ${c.credits}${b.salvage && b.hostile ? ` (+${b.salvage})` : ""}   Wins ${c.wins}${streak}${c.fleet.length ? `   Escorts ${b.allies.length}` : ""}`, 10, "#fff6c8");
      this.ui.fillStyle(0x000000, 0.55).fillRect(W - 168, 4, 164, 80);
      drawReadout(p, W - 162, 8, c, true);
      p.text(140, H - 22, this.hint(), 10, this.waveLeft > 0 && !b.foes.length ? "#ffb090" : "#c8d0c8");
      if (this.mode === "map") drawMap(p, c, this.mapSel);
    }
  }

  // ---- autoplay (smoke) -------------------------------------------------------------------------------------
  /**
   * Refits and recruits at whichever world sells what T0|▼| knows least, fights wave after wave (the Driftfield,
   * then the Lattice once it has a wing), breaks off when hurt, lands with the landing autopilot.
   */
  private pilot(dt: number): void {
    this.pilotT += dt;
    if (this.mode === "hangar") {
      if (this.pilotT < 1.2 || this.hold) return;
      const refit = pilotRefit(this.c);
      if (refit.note) { this.c = refit.c; Log.info(LOG, `PILOT ${refit.note}`); }
      const hired = pilotRecruit(this.c);
      if (hired.note) { this.c = hired.c; Log.info(LOG, `PILOT ${hired.note}`); }
      this.launch();
      this.pilotGoal = "fight";
      this.pilotT = 0;
      return;
    }
    if (this.mode !== "flight") return;
    const frac = this.b.you.hull / this.b.you.hullMax;
    if (this.b.foes.length) {
      this.fly(pilotControls(this.b), dt);
      if (this.mode === "flight" && frac < 0.25) { this.pilotGoal = "shop"; this.startJump(pilotWorld(this.c)); }
      return;
    }
    const auto = this.autoLand ? this.autoLandControls() : IDLE;
    if (!auto) return; // landed
    this.fly(auto, dt);
    if (this.pilotT < 1 || this.mode !== "flight" || this.autoLand) return;
    this.pilotT = 0;
    if (this.pilotGoal === "shop") {
      const shop = pilotWorld(this.c);
      if (this.c.system === shop) this.pressLand(); else this.startJump(shop);
      return;
    }
    const target = pilotFight(this.c);
    if (this.c.system !== target) { this.startJump(target); return; }
    if (this.pilotCheck) { this.pilotCheck = false; if (pilotWantsShop(this.c, frac)) this.pilotGoal = "shop"; } // else: wait for the next wave
  }

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 0.05);
    const playing = shell.topId === "play";
    this.sfx.update(shell.settings.audio);
    if (this.toastLeft > 0 && (this.toastLeft -= dt) <= 0) this.toastT.setVisible(false);
    const inp = shell.input;
    if (this.mode === "jump") this.jumpStep(dt);
    else if (this.mode === "end") {
      if ((playing && inp.takePress("ui_accept")) || this.autoplay) { this.setMode("flight"); this.toast(`${T0} still sends patrols. Fly on.`, 4); } // keep playing
    } else if (this.autoplay) this.pilot(dt);
    else if (!playing) return;
    else if (this.lineage.isOpen) {
      if (inp.takePress("ui_accept") || inp.takePress("interact")) { this.lineage.hide(); inp.clearPresses(); this.dirty = true; }
    } else if (this.mode === "hangar") this.hangarKeys();
    else if (this.mode === "map") this.mapKeys();
    else {
      let c = this.flightControls();
      if (this.autoLand) {
        if (c.turn || c.thrust || c.strafe || c.brake) { this.autoLand = false; this.toast("Autopilot off", 1.5); }
        else { const auto = this.autoLandControls(); if (auto) c = auto; }
      }
      if (this.mode === "flight") {
        this.fly(c, dt);
        if (this.mode === "flight") {
          if (inp.takePress("lens")) this.openMap();
          else if (inp.takePress("interact")) this.pressLand();
        }
      }
    }
    if (this.mode === "flight" || this.mode === "map" || this.mode === "jump") {
      this.drawSpace();
      if (this.mode === "jump") this.drawWormhole();
      if ((this.hudT += dt) > 0.2) { this.hudT = 0; this.dirty = true; } // the HUD's numbers, five times a second
    }
    if (this.dirty) { this.dirty = false; this.redraw(); }
  }
}

// ---------------------------------------------------------------------------
// SpaceScene.ts
// Purpose : The space stage, Toy 1 (docs/stages/05-space.md): you captain one ship. Fit it in the hangar on Hearth,
//           jump to a system T0|▼| patrols, fight in real time, and come home to find T0|▼| has learned what you
//           used, so you refit. Five patrols destroyed ends the Toy.
// Usage   : the shell starts it as "space" (main menu "Space stage (prototype)", or winning the civilization stage).
//           URL: ?stage=space; &autoplay plays itself (smoke; &hold keeps it in the hangar); &debug logs.
//           Flying: A/D turn, W thrust, S brake, Space or J fire, E land (near Hearth), U star map.
//           Hangar: W/S pick a part, D fit, A remove, H other hull, Enter launch (or click).
// Notes   : PROTOTYPE (Toy 1). The rules are pure and tested in src/game/space/ (fit, adapt, combat, campaign); the
//           panels are drawn by space/panels.ts; this file flies the ship, draws space and turns input into rules.
//           Not yet: a fleet, fuel, missions, the outer gardens, saving mid-campaign.
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
  afterBattle, finished, install, launch, patrolFor, pilotRefit, spaceRecord, starSystem, startCampaign, swapHull, uninstall,
  type Campaign, type Outcome, type SystemId,
} from "./space/campaign";
import { newBattle, pilotControls, step, type Battle, type Controls } from "./space/combat";
import { PART_IDS, fitProblems, shipStats } from "./space/fit";
import { drawEnd, drawHangar, drawMap, drawReadout, type HangarAct, type HangarButton, type Pen } from "./space/panels";
import { SPACE } from "./space/tuning";

const LOG = "space";
const W = 640, H = 360, CX = W / 2, CY = H / 2;
const ATLASES = ["space_ships", "space_t0", "space_props"] as const;
const SHOT_COL = { kinetic: 0xe8dcc0, beam: 0x80f0e0, spore: 0xa0e060 } as const;
type Mode = "hangar" | "flight" | "map" | "end";

export class SpaceScene extends Phaser.Scene {
  private c!: Campaign;
  private b!: Battle;
  private mode: Mode = "hangar";
  private temper: Record<TemperamentKind, number> = { cautious: 0.4, aggressive: 0.3, adaptable: 0.3 };
  private reveal: Reveal | null = null;
  private lineage!: LineagePanel;
  private sfx!: CellSfx;
  private world!: Phaser.GameObjects.Graphics; // stars, shots, radar: redrawn every frame
  private ui!: Phaser.GameObjects.Graphics; // panels and the HUD: redrawn when dirty
  private texts: Phaser.GameObjects.Text[] = [];
  private buttons: HangarButton[] = [];
  private youS!: Phaser.GameObjects.Sprite;
  private planetS!: Phaser.GameObjects.Sprite;
  private foeS = new Map<number, Phaser.GameObjects.Sprite>();
  private toastT!: Phaser.GameObjects.Text;
  private toastLeft = 0;
  private notes: string[] = []; // what the last battle changed (shown in the hangar)
  private sel = 0; // hangar: the picked part row
  private mapSel: SystemId = "driftfield";
  private dirty = true;
  private hudT = 0;
  private autoplay = false;
  private hold = false; // ?hold: the autoplay pilot stays in the hangar (for a screenshot)
  private pilotT = 0;
  private stars: { x: number; y: number; p: number }[] = [];
  private onKey = (e: KeyboardEvent) => {
    if (shell.topId === "play" && this.mode === "hangar" && !this.lineage.isOpen && e.key.toLowerCase() === "h") this.hangar({ kind: "hull" });
  };

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
      for (const s of animSpecs(a, layout)) if (!this.anims.exists(s.key)) this.anims.create({ key: s.key, frames: this.anims.generateFrameNumbers(a, { start: s.start, end: s.end }), frameRate: 8, repeat: -1 });
    }
    const handIn = this.readLineage();
    this.c = startCampaign({ temper: this.temper, civ: handIn.civ, harshness: handIn.harshness });
    this.notes = [];
    this.foeS.clear();
    this.texts = [];
    this.stars = Array.from({ length: 90 }, (_, i) => ({ x: (i * 197) % W, y: (i * 113 + (i % 7) * 31) % H, p: 0.15 + (i % 3) * 0.2 }));
    this.world = this.add.graphics().setDepth(0);
    this.planetS = this.add.sprite(0, 0, "space_props").play(animKey("space_props", "hearth", "up")).setScale(3).setDepth(1);
    this.planetS.anims.msPerFrame = 900;
    this.youS = this.add.sprite(CX, CY, "space_ships").setDepth(5);
    this.ui = this.add.graphics().setDepth(50);
    this.toastT = this.add.text(CX - 30, 26, "", { fontFamily: "monospace", fontSize: "10px", color: "#fff6c8", align: "center", wordWrap: { width: 380 }, backgroundColor: "#000000b0", padding: { x: 6, y: 3 } })
      .setOrigin(0.5, 0).setDepth(100).setResolution(2).setVisible(false);
    this.b = this.quietHearth();
    this.setMode("hangar");
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => this.click(p.x, p.y));
    window.addEventListener("keydown", this.onKey);
    this.events.once("shutdown", () => window.removeEventListener("keydown", this.onKey));
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
  private quietHearth(): Battle { return newBattle(this.stats(), [], this.c.learned, 1, { x: 0, y: 110 }); }

  private toast(s: string, secs = 4): void {
    this.toastT.setText(s).setVisible(true);
    this.toastLeft = secs;
  }

  private setMode(m: Mode): void {
    this.mode = m;
    this.dirty = true;
    shell.input.clearPresses(); // a key pressed in one mode must not fire in the next (Enter in flight, then the map)
    const flying = m === "flight" || m === "map";
    this.youS.setVisible(flying || m === "hangar");
    if (!flying) { for (const s of this.foeS.values()) s.destroy(); this.foeS.clear(); this.world.clear(); this.planetS.setVisible(false); }
  }

  // ---- the campaign's moves ---------------------------------------------------------------------------------
  private hangar(a: HangarAct): void {
    if (a.kind === "select") { this.sel = PART_IDS.indexOf(a.part); this.dirty = true; return; }
    if (a.kind === "launch") { this.launch(); return; }
    const d = a.kind === "hull" ? swapHull(this.c) : a.kind === "add" ? install(this.c, a.part) : uninstall(this.c, a.part);
    this.sfx.play(d.ok ? "upgrade" : "deny");
    if (!d.ok) this.toast(`Cannot: ${d.why}`, 2);
    this.c = d.c;
    this.dirty = true;
  }

  private launch(): void {
    const problems = fitProblems(this.c.fit);
    if (problems.length) { this.sfx.play("deny"); this.toast(`Cannot launch: ${problems.join(", ")}`, 3); return; }
    const before = this.c.refits;
    this.c = launch(this.c);
    if (this.c.refits > before) Log.info(LOG, `REFIT ${this.c.refits}: ${this.c.fit.hull} ${this.c.fit.parts.join(",")}`);
    this.b = this.quietHearth();
    this.mapSel = "driftfield";
    this.setMode("flight");
    this.sfx.play("evolve");
    this.toast("In orbit over Hearth.  U: star map   E: land", 4);
  }

  private land(): void {
    this.sfx.play("part");
    this.setMode("hangar");
  }

  private jump(to: SystemId): void {
    if (this.b.hostile && !this.b.over) this.endBattle("fled");
    const frac = this.b.you.hull / this.b.you.hullMax;
    this.c = { ...this.c, system: to };
    const patrol = patrolFor(to, this.c.wins);
    this.b = to === "hearth" ? newBattle(this.stats(), [], this.c.learned, frac) : newBattle(this.stats(), patrol, this.c.learned, frac);
    this.mapSel = starSystem(to).links[0];
    this.setMode("flight");
    this.cameras.main.flash(250, 200, 230, 255);
    this.sfx.play("evolve");
    this.toast(patrol.length ? `${starSystem(to).name}: ${T0} patrol ahead (${patrol.map((k) => SPACE.t0[k].name).join(", ")})` : `${starSystem(to).name}. E near the planet: land`, 4);
    Log.info(LOG, `JUMP ${to}: patrol ${patrol.join(",") || "none"}, hull ${Math.round(frac * 100)} %`);
  }

  /** A battle is over (won, lost, or you jumped away): T0|▼| adapts, and the player is told what it learned. */
  private endBattle(outcome: Outcome): void {
    const r = afterBattle(this.c, outcome, this.b.dealt, this.b.salvage);
    this.c = r.c;
    this.notes = r.notes;
    this.b.hostile = false; // this patrol is settled
    this.toast(r.notes.join("\n"), 7);
    Log.info(LOG, `BATTLE ${outcome} (${this.c.wins} wins, ${this.c.losses} lost): ${r.notes.join("; ")}`);
    if (outcome === "lost") {
      this.cameras.main.shake(400, 0.015);
      this.sfx.play("pop");
      this.b = this.quietHearth();
      this.setMode("hangar");
    } else if (finished(this.c)) this.finish();
  }

  private finish(): void {
    const r = spaceRecord(this.c);
    this.setMode("end");
    this.youS.setVisible(false);
    this.toastT.setVisible(false);
    this.sfx.play("evolve");
    try {
      const prev = shell.saves.load("lineage").envelope?.data ?? null;
      shell.saves.save("lineage", writeStage(prev, "space", r.causes, r.block) as unknown as Parameters<typeof shell.saves.save>[1]);
      Log.info(LOG, `LINEAGE written (space): ${r.causes.length} causes`);
    } catch (err) {
      Log.error(LOG, `could not write the lineage: ${err instanceof Error ? err.message : String(err)}`);
    }
    Log.info(LOG, `TOY_COMPLETE ${this.c.wins} wins, ${this.c.battles} battles, ${this.c.refits} refits`);
  }

  // ---- input ------------------------------------------------------------------------------------------------
  private click(x: number, y: number): void {
    if (shell.topId !== "play" || this.mode !== "hangar" || this.lineage.isOpen) return;
    const hit = this.buttons.find((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);
    if (hit) this.hangar(hit.act);
  }

  private hangarKeys(): void {
    const inp = shell.input, n = PART_IDS.length;
    if (inp.takePress("ui_down") || inp.takePress("move_down")) { this.sel = (this.sel + 1) % n; this.dirty = true; }
    if (inp.takePress("ui_up") || inp.takePress("move_up")) { this.sel = (this.sel + n - 1) % n; this.dirty = true; }
    if (inp.takePress("ui_right") || inp.takePress("move_right")) this.hangar({ kind: "add", part: PART_IDS[this.sel] });
    if (inp.takePress("ui_left") || inp.takePress("move_left")) this.hangar({ kind: "remove", part: PART_IDS[this.sel] });
    if (inp.takePress("ui_accept")) this.launch();
  }

  private mapKeys(): void {
    const inp = shell.input, links = starSystem(this.c.system).links;
    const i = Math.max(0, links.indexOf(this.mapSel));
    if (inp.takePress("ui_right") || inp.takePress("move_right")) { this.mapSel = links[(i + 1) % links.length]; this.dirty = true; }
    if (inp.takePress("ui_left") || inp.takePress("move_left")) { this.mapSel = links[(i + links.length - 1) % links.length]; this.dirty = true; }
    if (inp.takePress("lens")) this.setMode("flight");
    else if (inp.takePress("ui_accept")) this.jump(this.mapSel);
  }

  private flightControls(): Controls {
    const inp = shell.input, down = (a: string, b: string) => inp.isDown(a) || inp.isDown(b);
    return {
      turn: (down("move_right", "ui_right") ? 1 : 0) - (down("move_left", "ui_left") ? 1 : 0),
      thrust: down("move_up", "ui_up"), brake: down("move_down", "ui_down"), fire: down("jump", "attack"),
    };
  }

  private nearPlanet(): boolean {
    return this.c.system === "hearth" && Math.hypot(this.b.you.x, this.b.you.y) < SPACE.landRange;
  }

  // ---- flying -----------------------------------------------------------------------------------------------
  private fly(c: Controls, dt: number): void {
    for (const e of step(this.b, c, dt)) {
      if (e.kind === "kill") { this.sfx.play("pop"); this.cameras.main.shake(120, 0.006); }
      else if (e.kind === "hurt") { this.sfx.play("bump"); this.cameras.main.shake(90, e.shield ? 0.002 : 0.006); }
      else if (e.kind === "won") this.endBattle("won");
      else if (e.kind === "lost") this.endBattle("lost");
      else if (e.kind === "giveup") Log.debug(LOG, `T0 ship ${e.id} gives up the chase`);
    }
  }

  private drawSpace(): void {
    const g = this.world, you = this.b.you;
    const sx = (x: number) => x - you.x + CX, sy = (y: number) => y - you.y + CY;
    g.clear();
    g.fillStyle(0x05070d, 1).fillRect(0, 0, W, H);
    for (const s of this.stars) { // parallax: far stars drift slower
      const x = (((s.x - you.x * s.p) % W) + W) % W, y = (((s.y - you.y * s.p) % H) + H) % H;
      g.fillStyle(0xc8d8ff, 0.3 + s.p).fillRect(x, y, s.p > 0.5 ? 2 : 1, 1);
    }
    const home = this.c.system === "hearth";
    this.planetS.setVisible(home).setPosition(sx(0), sy(0));
    this.youS.setPosition(CX, CY).setRotation(you.a + Math.PI / 2).setScale(1);
    const key = animKey("space_ships", this.c.fit.hull, "up");
    if (this.youS.anims.currentAnim?.key !== key) this.youS.play(key);
    const seen = new Set<number>();
    for (const f of this.b.foes) {
      seen.add(f.id);
      let s = this.foeS.get(f.id);
      if (!s) { s = this.add.sprite(0, 0, "space_t0").play(animKey("space_t0", f.kind, "up")).setDepth(4); this.foeS.set(f.id, s); }
      const x = sx(f.x), y = sy(f.y);
      s.setPosition(x, y).setRotation(f.a + Math.PI / 2).setTint(f.mode === "hunt" ? 0xffffff : 0x8090a8); // dim: pausing or resting
      if (f.hull < f.hullMax) g.fillStyle(0x000000, 0.7).fillRect(x - 12, y - f.r - 8, 24, 3).fillStyle(0xff5040, 1).fillRect(x - 12, y - f.r - 8, 24 * (f.hull / f.hullMax), 3);
      if (x < 0 || x > W || y < 0 || y > H) this.edgeArrow(x, y, 0xff3020); // every threat readable before it arrives
    }
    for (const [id, s] of this.foeS) if (!seen.has(id)) { s.destroy(); this.foeS.delete(id); }
    for (const s of this.b.shots) {
      const big = s.family === "spore" ? 5 : 3;
      g.fillStyle(s.family ? SHOT_COL[s.family] : 0xff4030, 1).fillRect(sx(s.x) - big / 2, sy(s.y) - big / 2, big, big);
    }
    if (home && (sx(0) < 0 || sx(0) > W || sy(0) < 0 || sy(0) > H)) this.edgeArrow(sx(0), sy(0), 0x60c0a0);
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
    };
  }

  private redraw(): void {
    for (const t of this.texts) t.destroy();
    this.texts = [];
    this.buttons = [];
    this.ui.clear();
    const p = this.pen();
    if (this.mode === "hangar") {
      this.buttons = drawHangar(p, this.c, this.sel, this.notes);
      const key = animKey("space_ships", this.c.fit.hull, "up");
      if (this.youS.anims.currentAnim?.key !== key) this.youS.play(key);
      this.youS.setPosition(44, 52).setRotation(0).setScale(2).setDepth(55);
    } else if (this.mode === "end") drawEnd(p, this.c, spaceRecord(this.c).causes.map((x) => x.cause));
    else {
      this.youS.setDepth(5);
      const b = this.b;
      p.text(124, 8, `${starSystem(this.c.system).name}   Salvage ${this.c.credits}${b.salvage && b.hostile ? ` (+${b.salvage} aboard)` : ""}   Wins ${this.c.wins}/${SPACE.winsToFinish}`, 10, "#fff6c8");
      this.ui.fillStyle(0x000000, 0.55).fillRect(W - 168, 4, 164, 80);
      drawReadout(p, W - 162, 8, this.c, true);
      p.text(140, H - 22, this.nearPlanet() ? "E: land on Hearth" : b.foes.length ? "Space: fire   U: star map (jumping away breaks off)" : "U: star map", 10, "#c8d0c8");
      if (this.mode === "map") drawMap(p, this.c, this.mapSel);
    }
  }

  // ---- autoplay (smoke) -------------------------------------------------------------------------------------
  /** Refits when T0|▼| knows its weapon, launches, fights the Driftfield patrol, breaks off when hurt, comes home. */
  private pilot(dt: number): void {
    this.pilotT += dt;
    if (this.mode === "hangar") {
      if (this.pilotT < 1.2 || this.hold) return;
      const r = pilotRefit(this.c);
      if (r.note) { this.c = r.c; Log.info(LOG, `PILOT ${r.note}`); }
      this.launch();
      this.jump("driftfield");
      this.pilotT = 0;
    } else if (this.b.foes.length) {
      this.fly(pilotControls(this.b), dt);
      if (this.mode === "flight" && this.b.you.hull < this.b.you.hullMax * 0.25) { this.jump("hearth"); this.land(); this.pilotT = 0; }
      else this.pilotT = 0;
    } else {
      this.fly({ turn: 0, thrust: false, brake: true, fire: false }, dt);
      if (this.pilotT > 2 && this.mode === "flight") { if (this.c.system !== "hearth") this.jump("hearth"); this.land(); this.pilotT = 0; }
    }
  }

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 0.05);
    const playing = shell.topId === "play";
    this.sfx.update(shell.settings.audio);
    if (this.toastLeft > 0 && (this.toastLeft -= dt) <= 0) this.toastT.setVisible(false);
    const inp = shell.input;
    if (this.mode === "end") {
      if (playing && inp.takePress("ui_accept")) { shell.quitToTitle(); shell.toast("space.toy_done"); }
    } else if (this.autoplay) this.pilot(dt);
    else if (!playing) return;
    else if (this.lineage.isOpen) {
      if (inp.takePress("ui_accept") || inp.takePress("interact")) { this.lineage.hide(); inp.clearPresses(); this.dirty = true; }
    } else if (this.mode === "hangar") this.hangarKeys();
    else if (this.mode === "map") this.mapKeys();
    else {
      this.fly(this.flightControls(), dt);
      if (this.mode === "flight") {
        if (inp.takePress("lens")) this.setMode("map");
        else if (inp.takePress("interact") && this.nearPlanet()) this.land();
      }
    }
    if (this.mode === "flight" || this.mode === "map") {
      this.drawSpace();
      if ((this.hudT += dt) > 0.2) { this.hudT = 0; this.dirty = true; } // the HUD's numbers, five times a second
    }
    if (this.dirty) { this.dirty = false; this.redraw(); }
  }
}

// ---------------------------------------------------------------------------
// CreatureScene.ts
// Purpose : The creature stage, Toy 1 (docs/stages/03-creature.md): the world map (god mode: pick a place, drain or
//           refill the lake) and Fernwood (avatar mode: a sidescroller of five obstacles, each passable by fighting,
//           a puzzle or stealth), then a summary of how you passed each one and what it built.
// Usage   : the shell starts it as "creature" (main menu "Creature stage (prototype)"). URL: ?stage=creature;
//           ?level starts in Fernwood, ?drained with the lake drained, ?autoplay walks it (smoke), ?debug logs.
// Notes   : PROTOTYPE (Toy 1). Rules are pure and tested: creature/physics.ts, level.ts, ways.ts, sight.ts,
//           worldMap.ts; drawing: creature/draw.ts; numbers: creature/tuning.ts. Not yet: saving, writing the
//           lineage, stats, the air and sea branches.
//           Controls: A/D move, hold Shift sprint, Space jump, hold S crouch (creep), F (or J) bite, E use (levers);
//           map: A/D choose, Enter go,
//           E drain / refill the lake.
//
// Pseudocode (level frame):
//   input -> crouch / stand (only with room) -> step the body -> boulders (push, ride, plates open gates)
//   -> bite (brambles, the tree, foes) -> E: levers (drop a log, lower the rope bridge) -> foes (patrol, see, chase,
//   bite; the brute hears) -> hazards (thorns, water) -> parts -> checkpoints -> route zones and obstacle exits
//   -> the finish -> summary
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import * as Phaser from "phaser";
import { Log } from "../core/log";
import { shell } from "../shell/app";
import { animKey, animSpecs, type AtlasLayout } from "./cell/atlas";
import { cellSfx, type CellSfx } from "./cell/sfx";
import { drawBackdrop, drawCone, drawTiles, drawWorldMap } from "./creature/draw";
import { biteDamage, bossStep, hurtBoss, newBossMind, type BossMind } from "./creature/boss";
import { GROUND, Tile, buildLevel, inRect, newLevelState, solidAt, tileAt, tileKey, type Level, type LevelId, type LevelState, type Obstacle, type Way } from "./creature/level";
import { boxHits, canStand, newBody, stepBody, type Body } from "./creature/physics";
import { noise, sees, sightRange, woken } from "./creature/sight";
import { CR } from "./creature/tuning";
import { WAY_TEMPER, bossHit, enterZone, foeEvent, newRun, passExit, resetUnpassed, summary, usedPart, type LevelRun, type Verdict } from "./creature/ways";
import { canEnter, clearLevel, farthestOpen, lakeLine, newMap, toggleLake, type WorldMap } from "./creature/worldMap";

const LOG = "creature";
const STEP_UP = 10; // px: walk up onto a boulder this little above your feet (one settled in its dip)
const BOULDER_CY = 18; // the stone's centre row in its 32 px cell (creature_props.py)
const MAX_DT = 0.05;
const T = CR.tile;
const FILES = { cwalk: ["creature_walker", 32], cfoes: ["creature_foes", 32], cprops: ["creature_props", 32], cboss: ["creature_boss", 64] } as const;
type Atlas = keyof typeof FILES;
type Part = "claws" | "camo";
type Intent = { dir: number; jump: boolean; crouch: boolean; bite: boolean; use: boolean; sprint: boolean };

interface Foe {
  id: string;
  kind: "stalker" | "brute" | "boss";
  body: Body;
  spr: Phaser.GameObjects.Sprite;
  hp: number;
  mode: "patrol" | "chase" | "sleep" | "down";
  facing: number;
  from: number; // px: where it may go
  to: number;
  home: { x: number; y: number };
  loseT: number;
  biteCd: number;
  stunT: number;
  noise: number;
  trapped: boolean;
  mind?: BossMind; // the boss only (creature/boss.ts)
}

interface Boulder { id: string; body: Body; spr: Phaser.GameObjects.Sprite; home: { x: number; y: number } }
interface Lever { x: number; y: number; does: { log: string } | { bridge: string }; on: boolean; spr: Phaser.GameObjects.Sprite }
interface Log_ { id: string; x: number; hangY: number; groundY: number; y: number; state: "hang" | "fall" | "down"; t: number; spr: Phaser.GameObjects.Sprite; caught: boolean; rock: boolean }
interface Pickup { part: Part; x: number; y: number; spr: Phaser.GameObjects.Sprite; taken: boolean }

const HINT: Record<string, string> = {
  barrier: "Three ways: smash the brambles (F)  |  push the boulder onto the plate  |  creep the root tunnel (hold S)",
  guard: "Three ways: bite it (F)  |  drop the log on it (E at the lever)  |  stay unseen: crouch in the tall grass (S)",
  lake: "Three ways: bite the dead tree into a bridge (F)  |  the lever lowers a rope bridge  |  creep under the thorns (S)",
  basin: "Three ways: bite the dead tree into a bridge (F)  |  the lever lowers a rope bridge  |  creep past the sleeping brute (S)",
};
HINT.boss = "Three ways: bite it while it is stunned from charging a wall (F)  |  drop the rocks on it (E at the levers)  |  ambush it from behind before it sees you (S in the grass)";
const WAY_WORD: Record<Verdict, string> = { fight: "fought through", puzzle: "solved it", stealth: "sneaked past", rushed: "ran past" };

export class CreatureScene extends Phaser.Scene {
  private mode: "map" | "level" | "summary" = "map";
  private autoplay = false;
  private pushPilot = false; // ?pilot=push: the smoke pilot pushes boulders (checks the dip and the plate)
  private world!: WorldMap;
  private sel = 1;
  private t = 0;
  private sfx!: CellSfx;
  // map
  private mapGfx!: Phaser.GameObjects.Graphics;
  private mapIcon!: Phaser.GameObjects.Sprite;
  private mapTexts: Phaser.GameObjects.Text[] = [];
  // level
  private lv!: Level;
  private st!: LevelState;
  private run!: LevelRun;
  private me!: Body;
  private meSpr!: Phaser.GameObjects.Sprite;
  private facing = 1;
  private crouched = false;
  private sprinting = false;
  private hearts: number = CR.hearts;
  private hurtT = 0;
  private biteCd = 0;
  private biteT = 0;
  private part: Part | null = null;
  private checkpoint = { x: 0, y: 0 };
  private foes: Foe[] = [];
  private boulders: Boulder[] = [];
  private levers: Lever[] = [];
  private logs: Log_[] = [];
  private pickups: Pickup[] = [];
  private flags: { x: number; y: number }[] = [];
  private finishX = 0;
  private brambleHp: Record<string, number> = {};
  private treeHp: Record<string, number> = {}; // bites left per dead tree
  private levelId: LevelId = "fernwood";
  private levelObjs: Phaser.GameObjects.GameObject[] = [];
  private tileG!: Phaser.GameObjects.Graphics;
  private grassG!: Phaser.GameObjects.Graphics;
  private fxG!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private toastT!: Phaser.GameObjects.Text;
  private toastLeft = 0;
  private tracker!: Phaser.GameObjects.Text;
  private panel!: Phaser.GameObjects.Text;
  private panelBg!: Phaser.GameObjects.Graphics;
  private pilotStuck = 0;
  private pilotJumped = false;

  constructor() {
    super("creature");
  }

  preload(): void {
    for (const [key, [file, cell]] of Object.entries(FILES)) {
      this.load.spritesheet(key, `assets/art/${file}.png`, { frameWidth: cell, frameHeight: cell });
      this.load.json(`${key}_layout`, `assets/art/${file}.json`);
    }
  }

  create(): void {
    const params = new URLSearchParams(location.search);
    this.autoplay = params.has("autoplay");
    this.pushPilot = params.get("pilot") === "push";
    if (params.has("debug")) Log.enableChannel(LOG);
    this.sfx = cellSfx();
    for (const key of Object.keys(FILES) as Atlas[]) this.makeAnims(key);
    this.world = newMap();
    if (params.has("drained")) this.world = toggleLake(this.world);
    this.mapGfx = this.add.graphics().setDepth(-40);
    this.mapIcon = this.add.sprite(0, 0, "cwalk").setDepth(10);
    this.panelBg = this.add.graphics().setScrollFactor(0).setDepth(2000);
    const text = (x: number, y: number, size: number, color = "#e8f0e0") =>
      this.add.text(x, y, "", { fontFamily: "monospace", fontSize: `${size}px`, color, wordWrap: { width: 600 } }).setScrollFactor(0).setDepth(2001).setResolution(2);
    this.hud = text(8, 26, 11);
    this.tracker = text(632, 8, 10).setOrigin(1, 0).setAlign("right");
    this.hint = text(320, 346, 10, "#fff2c0").setOrigin(0.5, 1).setAlign("center");
    this.toastT = text(320, 70, 12, "#fff6c8").setOrigin(0.5, 0).setAlign("center");
    this.panel = text(80, 40, 12).setWordWrapWidth(480);
    const ask = params.get("level"); // ?level or ?level=mirefen|ridge|den: straight into a level
    const id: LevelId = ask === "mirefen" || ask === "ridge" || ask === "den" ? ask : "fernwood";
    if (params.has("level") || this.autoplay) this.startLevel(id);
    else this.showMap();
  }

  private makeAnims(key: Atlas): void {
    const layout = this.cache.json.get(`${key}_layout`) as AtlasLayout | undefined;
    if (!layout) throw new Error(`missing atlas layout ${key}_layout (build it with tools/art/pixel_sprite.py)`);
    for (const a of animSpecs(key, layout)) {
      if (this.anims.exists(a.key)) continue;
      this.anims.create({ key: a.key, frames: this.anims.generateFrameNumbers(key, { start: a.start, end: a.end }), frameRate: 8, repeat: -1 });
    }
  }

  private toast(s: string, secs = 3): void {
    this.toastT.setText(s).setVisible(true);
    this.toastLeft = secs;
  }

  // ---- the world map (god mode) ---------------------------------------------------------------------------
  private showMap(): void {
    this.mode = "map";
    this.clearLevel();
    this.cameras.main.setScroll(0, 0).removeBounds();
    this.mapGfx.setVisible(true);
    this.mapIcon.setVisible(true).play(animKey("cwalk", "idle", "right"));
    for (const t of this.mapTexts) t.destroy();
    this.mapTexts = this.world.nodes.map((n) => this.add.text(n.x, n.y + 14, n.name, { fontFamily: "monospace", fontSize: "10px", color: "#f0e8d0", backgroundColor: "#00000080", padding: { x: 3, y: 1 } })
      .setOrigin(0.5, 0).setDepth(5).setResolution(2));
    this.hud.setText("");
    this.tracker.setText("");
    this.hint.setText("World map: you are the Gardener.   A/D choose a place   Enter go there   E drain or refill the lake");
    this.panelBg.clear();
    this.panel.setText("");
    this.toast(lakeLine(this.world), 6);
    Log.info(LOG, `MAP open (lake ${this.world.drained ? "drained" : "full"}, harshness ${this.world.harshness.toFixed(2)})`);
  }

  private mapFrame(playing: boolean): void {
    const inp = shell.input;
    if (playing) {
      if (inp.takePress("move_left") || inp.takePress("ui_left")) this.sel = Math.max(0, this.sel - 1);
      if (inp.takePress("move_right") || inp.takePress("ui_right")) {
        const next = this.sel + 1;
        if (next <= farthestOpen(this.world)) this.sel = next;
        else if (next < this.world.nodes.length) { // locked: beat the place before it first
          this.sfx.play("deny");
          this.toast(`${this.world.nodes[next].name} is locked: beat ${this.world.nodes[this.sel].name} first.`, 2.5);
        }
      }
      if (inp.takePress("interact")) {
        this.world = toggleLake(this.world);
        this.sfx.play("evolve");
        this.toast(lakeLine(this.world), 6);
        Log.info(LOG, `GARDENER lake ${this.world.drained ? "drained" : "refilled"} (harshness ${this.world.harshness.toFixed(2)})`);
      }
      if (inp.takePress("ui_accept") || inp.takePress("jump")) {
        const n = this.world.nodes[this.sel];
        if (canEnter(this.world, n.id)) { this.startLevel(n.id as LevelId); return; }
        this.sfx.play("deny");
        this.toast(!n.level ? `${n.name}: where your lineage came ashore.` : !n.built ? `${n.name}: not built in this Toy yet.` : `${n.name}: clear the level before it first.`, 3);
      }
    }
    const n = this.world.nodes[this.sel];
    drawWorldMap(this.mapGfx, this.world, n.id, this.t);
    this.mapIcon.setPosition(n.x, n.y - 16 + Math.sin(this.t * 4) * 2);
    const done = this.world.cleared.filter((c) => c !== "tidepools").length;
    const cleared = this.world.cleared.includes("den") ? "The Old Horn is beaten: the creature stage Toy is complete. Replay any level another way."
      : done ? `${done} of 4 cleared. Replay a level another way, or drain the lake first.` : "";
    this.hud.setText(`Lake: ${this.world.drained ? "drained" : "full"}   Harshness ${Math.round(this.world.harshness * 100)} %\n${cleared}`);
  }

  // ---- the level (avatar mode) ----------------------------------------------------------------------------
  private clearLevel(): void {
    for (const o of this.levelObjs) o.destroy();
    this.levelObjs = [];
    this.foes = []; this.boulders = []; this.levers = []; this.logs = []; this.pickups = []; this.flags = [];
  }

  private keep<O extends Phaser.GameObjects.GameObject>(o: O): O {
    this.levelObjs.push(o);
    return o;
  }

  private startLevel(id: LevelId): void {
    this.levelId = id;
    this.clearLevel();
    for (const t of this.mapTexts) t.destroy();
    this.mapTexts = [];
    this.mapGfx.setVisible(false).clear();
    this.mapIcon.setVisible(false);
    this.panelBg.clear();
    this.panel.setText("");
    this.mode = "level";
    this.lv = buildLevel(id, this.world.drained);
    this.st = newLevelState();
    this.run = newRun(this.lv);
    this.brambleHp = {};
    this.treeHp = {};
    for (const g of drawBackdrop(this, this.lv.w * T, this.lv.theme)) this.keep(g);
    this.tileG = this.keep(this.add.graphics().setDepth(0));
    this.grassG = this.keep(this.add.graphics().setDepth(60));
    this.fxG = this.keep(this.add.graphics().setDepth(55));
    const feet = (e: { x: number; y: number }) => ({ x: e.x * T + T / 2, y: (e.y + 1) * T - 0.001 });
    for (const e of this.lv.entities) {
      if (e.kind === "start") { const p = feet(e); this.checkpoint = p; }
      else if (e.kind === "checkpoint") { const p = feet(e); this.flags.push(p); this.keep(this.add.sprite(p.x, p.y - 16, "cprops").play(animKey("cprops", "flag", "side")).setDepth(5)); }
      else if (e.kind === "finish") { this.finishX = e.x * T; this.keep(this.add.sprite(e.x * T + 8, (e.y + 1) * T - 16, "cprops").play(animKey("cprops", "flag", "side")).setDepth(5).setTint(0xa0ffa0).setScale(1.4)); }
      else if (e.kind === "boulder") {
        const p = feet(e);
        const b = newBody(p.x, p.y, CR.boulder.size, CR.boulder.size);
        this.boulders.push({ id: e.id, body: b, home: p, spr: this.keep(this.add.sprite(p.x, p.y, "cprops").play(animKey("cprops", "boulder", "side")).setDepth(20).setOrigin(0.5, BOULDER_CY / 32)) });
      } else if (e.kind === "lever") {
        const p = feet(e);
        this.levers.push({ x: p.x, y: p.y, does: e.does, on: false, spr: this.keep(this.add.sprite(p.x, p.y - 15, "cprops").play(animKey("cprops", "lever_off", "side")).setDepth(20)) });
      } else if (e.kind === "log") {
        const y = e.hangY * T;
        this.logs.push({ id: e.id, x: e.x * T + T / 2, hangY: y, groundY: (e.groundY + 1) * T, y, state: "hang", t: 0, caught: false, rock: !!e.rock,
          spr: this.keep(this.add.sprite(e.x * T + T / 2, y, "cprops").play(animKey("cprops", e.rock ? "boulder" : "log", "side")).setDepth(25)) });
      } else if (e.kind === "part") {
        this.pickups.push({ part: e.part, x: e.x * T + T / 2, y: (e.y + 1) * T - 12, taken: false, spr: this.keep(this.add.sprite(e.x * T + T / 2, (e.y + 1) * T - 12, "cprops").play(animKey("cprops", e.part, "side")).setDepth(30).setScale(0.75)) });
      } else if (e.kind === "stalker" || e.kind === "brute") {
        const p = feet(e);
        const isS = e.kind === "stalker";
        const from = isS ? e.from * T : this.lv.obstacles.find((o) => o.foe === e.id)!.zones.stealth!.x0 * T;
        const to = isS ? (e.to + 1) * T : (this.lv.obstacles.find((o) => o.foe === e.id)!.zones.stealth!.x1 + 1) * T;
        const spr = this.keep(this.add.sprite(p.x, p.y, "cfoes").setDepth(30).setOrigin(0.5, 0.94));
        this.foes.push({ id: e.id, kind: e.kind, body: newBody(p.x, p.y, isS ? 16 : 26, isS ? 18 : 16), spr, hp: isS ? CR.foes.stalker.hp : CR.foes.brute.hp,
          mode: isS ? "patrol" : "sleep", facing: -1, from, to, home: p, loseT: 0, biteCd: 0, stunT: 0, noise: 0, trapped: false });
      } else if (e.kind === "boss") {
        const p = feet(e);
        const spr = this.keep(this.add.sprite(p.x, p.y, "cboss").setDepth(30).setOrigin(0.5, 0.94));
        this.foes.push({ id: e.id, kind: "boss", body: newBody(p.x, p.y, 40, 30), spr, hp: CR.boss.hp, mode: "patrol", facing: -1,
          from: e.from * T, to: (e.to + 1) * T, home: p, loseT: 0, biteCd: 0, stunT: 0, noise: 0, trapped: false, mind: newBossMind() });
      }
    }
    this.me = newBody(this.checkpoint.x, this.checkpoint.y);
    this.meSpr = this.keep(this.add.sprite(this.me.x, this.me.y, "cwalk").setDepth(40).setOrigin(0.5, 0.94));
    this.hearts = CR.hearts;
    this.part = null;
    this.crouched = false;
    drawTiles(this.tileG, this.grassG, this.lv, this.st);
    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.lv.w * T, this.scale.height);
    cam.setScroll(0, 0);
    this.toast(id === "den" ? "The Old Horn's Den. Beat it your way: fight it, drop the rocks on it, or ambush it unseen."
      : `${this.lv.name}${this.lv.drained ? " (the lake is drained)" : ""}: five obstacles, three ways past each. Reach the green flag.`, 5);
    Log.info(LOG, `LEVEL ${this.lv.name} start (drained ${this.lv.drained})`);
  }

  private solid = (tx: number, ty: number) => solidAt(this.lv, this.st, tx, ty);

  private readIntent(playing: boolean): Intent {
    if (this.autoplay) return this.pilot();
    if (!playing) return { dir: 0, jump: false, crouch: false, bite: false, use: false, sprint: false };
    const inp = shell.input;
    const right = inp.isDown("move_right") || inp.isDown("ui_right"), left = inp.isDown("move_left") || inp.isDown("ui_left");
    return {
      dir: (right ? 1 : 0) - (left ? 1 : 0),
      jump: inp.takePress("jump") || inp.takePress("move_up"),
      crouch: inp.isDown("move_down") || inp.isDown("ui_down"),
      // F bites: it is the aquatic "swim down" key (unused on land; BAMF69 2026-11-09 "change bite to F"); J still works
      bite: inp.takePress("sink") || inp.takePress("attack"),
      sprint: inp.isDown("pace"), // Shift (the aquatic pace key): sprint
      use: inp.takePress("interact"),
    };
  }

  private levelFrame(dt: number, playing: boolean): void {
    const it = this.readIntent(playing);
    // crouch, and stand up only where there is room
    if (it.crouch && !this.crouched) { this.crouched = true; this.me.h = CR.body.crouchH; }
    else if (!it.crouch && this.crouched && canStand(this.me, this.solid)) { this.crouched = false; this.me.h = CR.body.h; }
    if (it.dir) this.facing = it.dir;
    const inMud = tileAt(this.lv, Math.floor(this.me.x / T), Math.floor(this.me.y / T) + 0) === Tile.Mud || tileAt(this.lv, Math.floor(this.me.x / T), Math.floor((this.me.y + 1) / T)) === Tile.Mud;
    this.sprinting = it.sprint && !this.crouched && it.dir !== 0;
    const speed = (this.crouched ? CR.move.crouchSpeed : this.sprinting ? CR.move.sprintSpeed : CR.move.runSpeed) * (inMud ? CR.move.mudMult : 1);
    const prevY = this.me.y;
    stepBody(this.me, { dir: it.dir, jump: it.jump && !this.crouched, speed }, dt, this.solid);
    this.boulderFrame(dt, it.dir, prevY);
    this.biteCd = Math.max(0, this.biteCd - dt);
    this.biteT = Math.max(0, this.biteT - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    if (it.bite && this.biteCd <= 0) this.bite();
    if (it.use) this.use();
    this.foesFrame(dt, it.dir !== 0);
    this.logsFrame(dt);
    this.hazards();
    this.pickupsFrame();
    for (const f of this.flags) if (this.me.x >= f.x && f.x > this.checkpoint.x) { this.checkpoint = { ...f }; this.toast("Checkpoint", 1.5); this.sfx.play("choose"); }
    this.routes();
    this.drawLevel();
    if (this.autoplay && Math.floor(this.t / 2) !== Math.floor((this.t - dt) / 2)) { // where the pilot is (smoke debugging)
      Log.debug(LOG, `PILOT x ${(this.me.x / T).toFixed(1)} y ${(this.me.y / T).toFixed(1)} ground ${this.me.onGround} crouch ${this.crouched} vx ${Math.round(this.me.vx)} boulders ${this.boulders.map((b) => (b.body.x / T).toFixed(1)).join(",")}`);
    }
    if (this.me.x >= this.finishX) this.finishLevel();
  }

  /** Boulders: they fall, you push them by walking into them on the ground, you can stand on them; plates open gates. */
  private boulderFrame(dt: number, dir: number, prevY: number): void {
    const me = this.me;
    for (const b of this.boulders) {
      const bb = b.body;
      const overlapX = Math.abs(me.x - bb.x) < (me.w + bb.w) / 2;
      const top = bb.y - bb.h;
      let pushDir = 0;
      if ((!this.autoplay || this.pushPilot) && overlapX && me.y > top && me.y - me.h < bb.y) { // the smoke pilot ignores boulders unless ?pilot=push
        if (prevY <= top + STEP_UP && me.vy >= 0) { me.y = top - 0.001; me.vy = 0; me.onGround = true; } // ride on top (and step up onto a parked one)
        else {
          const side = me.x < bb.x ? -1 : 1;
          if (dir === -side && me.onGround) pushDir = dir;
          const out = bb.x + side * ((me.w + bb.w) / 2 + 0.01); // never inside the stone...
          if (!boxHits(out, me.y, me.w, me.h, this.solid)) me.x = out;
          else { // ...unless that is a wall: then the stone gives way instead
            const bx = me.x - side * ((me.w + bb.w) / 2 + 0.01);
            if (!boxHits(bx, bb.y, bb.w, bb.h, this.solid)) bb.x = bx;
          }
        }
      }
      stepBody(bb, { dir: pushDir, jump: false, speed: CR.boulder.push }, dt, this.solid);
      b.spr.setPosition(bb.x, bb.y - bb.h / 2).setRotation(b.spr.rotation + (bb.vx * dt) / (bb.w / 2)); // rolls around its centre
    }
    for (const e of this.lv.entities) {
      if (e.kind !== "plate") continue;
      const px = e.x * T + T; // the plate fills a two-tile dip
      const pressed = this.boulders.some((b) => Math.abs(b.body.x - px) < T * 0.9 && b.body.onGround && Math.abs(b.body.y - (e.y + 1) * T) < 4);
      const was = this.st.open.has(e.gate);
      if (pressed !== was) {
        if (pressed) this.st.open.add(e.gate); else this.st.open.delete(e.gate);
        drawTiles(this.tileG, this.grassG, this.lv, this.st);
        this.sfx.play(pressed ? "upgrade" : "deny");
        if (pressed) this.toast("The boulder holds the plate down: the upper gate opens", 3);
        Log.info(LOG, `PLATE ${e.gate} ${pressed ? "down" : "up"}`);
      }
    }
  }

  /** J: bite whatever is in front (brambles, the dead tree, a foe). Claws make it hit twice as hard. */
  private bite(): void {
    this.biteCd = CR.bite.cooldownS;
    this.biteT = 0.25;
    this.sfx.play("chomp_you");
    const dmg = CR.bite.damage * (this.part === "claws" ? CR.bite.clawsMult : 1);
    const fx = this.me.x + this.facing * (this.me.w / 2 + CR.bite.reach / 2);
    let hit = false;
    const tx = Math.floor(fx / T);
    for (let ty = Math.floor((this.me.y - this.me.h) / T); ty <= Math.floor((this.me.y - 1) / T); ty++) {
      const t = tileAt(this.lv, tx, ty);
      if (t === Tile.Bramble && this.solid(tx, ty)) {
        const k = tileKey(tx, ty);
        this.brambleHp[k] = (this.brambleHp[k] ?? CR.bramble.hp) - dmg;
        hit = true;
        if (this.brambleHp[k] <= 0) this.breakBrambles(tx, ty);
      }
    }
    const treeX = [Math.floor((this.me.x + this.facing * 10) / T), tx].find((x) => tileAt(this.lv, x, GROUND - 1) === Tile.Tree);
    const tree = treeX === undefined ? undefined : this.lv.links[tileKey(treeX, GROUND - 1)];
    if (tree && !this.st.open.has(tree)) {
      this.treeHp[tree] = (this.treeHp[tree] ?? CR.tree.hp) - dmg;
      hit = true;
      this.cameras.main.shake(80, 0.004);
      if (this.treeHp[tree] <= 0) {
        this.st.open.add(tree); // felled: its bridge is now solid
        drawTiles(this.tileG, this.grassG, this.lv, this.st);
        this.sfx.play("pop");
        this.toast("The dead tree crashes across the water: a bridge", 3);
        Log.info(LOG, "TREE down: a bridge");
      }
    }
    for (const f of this.foes) {
      if (f.mode === "down" || Math.abs(f.body.x - fx) > f.body.w / 2 + CR.bite.reach || Math.abs((f.body.y - f.body.h / 2) - (this.me.y - this.me.h / 2)) > 20) continue;
      if (f.kind === "boss") { this.biteBoss(f, dmg); hit = true; continue; }
      f.hp -= dmg;
      f.stunT = f.kind === "stalker" ? CR.foes.stalker.stunS : CR.foes.brute.stunS;
      f.body.vx = this.facing * 140;
      hit = true;
      this.wake(f);
      if (f.hp <= 0) {
        f.mode = "down";
        this.run = foeEvent(this.run, this.obstacleOf(f.id)!.id, "beaten");
        this.sfx.play("pop");
        this.toast(`You beat the ${f.kind}`, 2);
        Log.info(LOG, `FOE ${f.id} beaten`);
      }
    }
    if (hit && this.part === "claws") this.run = usedPart(this.run, "claws");
  }

  /** A bramble tile breaks, and the rest of its plug with it (one plug is the fight way through a wall). */
  private breakBrambles(tx: number, ty: number): void {
    const todo = [[tx, ty]];
    while (todo.length) {
      const [x, y] = todo.pop()!;
      const k = tileKey(x, y);
      if (this.st.broken.has(k) || tileAt(this.lv, x, y) !== Tile.Bramble) continue;
      this.st.broken.add(k);
      todo.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    drawTiles(this.tileG, this.grassG, this.lv, this.st);
    this.sfx.play("pop");
    Log.info(LOG, `BRAMBLES smashed at ${tx},${ty}`);
  }

  /** E: pull a lever within reach. */
  private use(): void {
    const lever = this.levers.find((l) => !l.on && Math.abs(l.x - this.me.x) < T * 1.5 && Math.abs(l.y - this.me.y) < T * 1.5);
    if (!lever) return;
    lever.on = true;
    lever.spr.play(animKey("cprops", "lever_on", "side"));
    this.sfx.play("choose");
    if ("bridge" in lever.does) {
      this.st.open.add(lever.does.bridge);
      drawTiles(this.tileG, this.grassG, this.lv, this.st);
      this.toast("The lever lowers a rope bridge across the water", 3);
      Log.info(LOG, `LEVER ${lever.does.bridge} lowered`);
    } else {
      const log = this.logs.find((l) => "log" in lever.does && l.id === lever.does.log);
      if (log && log.state === "hang") { log.state = "fall"; log.t = 0; Log.info(LOG, `LEVER drops ${log.id}`); }
    }
  }

  private logsFrame(dt: number): void {
    for (const log of this.logs) {
      if (log.state === "fall") {
        log.t += dt;
        const k = Math.min(1, log.t / CR.trap.fallS);
        log.y = log.hangY + (log.groundY - 14 - log.hangY) * k * k;
        if (k >= 1) {
          log.state = "down"; log.t = 0;
          this.cameras.main.shake(120, 0.006);
          this.sfx.play("bump");
          for (const f of this.foes) {
            if (f.kind === "boss" && f.mind && f.mind.mode !== "down" && Math.abs(f.body.x - log.x) < CR.trap.radius + f.body.w / 2) {
              this.damageBoss(f, CR.boss.rockDamage, "puzzle", true);
              this.toast(`The rock smashes onto the Old Horn! (-${CR.boss.rockDamage})`, 2.5);
              continue;
            }
            if (f.kind !== "stalker" || f.mode === "down" || Math.abs(f.body.x - log.x) > CR.trap.radius) continue;
            f.mode = "down"; f.trapped = true; log.caught = true;
            this.run = foeEvent(this.run, this.obstacleOf(f.id)!.id, "trapped");
            this.toast("The log pins the stalker down", 2.5);
            Log.info(LOG, `TRAP ${f.id} caught`);
          }
          if (Math.abs(this.me.x - log.x) < CR.trap.radius * 0.6) this.hurt(Math.sign(this.me.x - log.x) || 1);
          if (!log.caught && !log.rock) this.toast("Missed. The vine hauls the log back up...", 2.5);
        }
      } else if (log.state === "down" && !log.caught) {
        log.t += dt;
        if (log.t > CR.trap.resetS) { // it swings back up: try again
          log.state = "hang"; log.y = log.hangY;
          const lever = this.levers.find((l) => "log" in l.does && l.does.log === log.id);
          if (lever) { lever.on = false; lever.spr.play(animKey("cprops", "lever_off", "side")); }
        }
      }
      log.spr.setPosition(log.x, log.y);
    }
  }

  private obstacleOf(foeId: string): Obstacle | undefined {
    return this.lv.obstacles.find((o) => o.foe === foeId);
  }

  private wake(f: Foe): void {
    if (f.mode === "down") return;
    if (f.mode !== "chase") {
      f.mode = "chase";
      f.loseT = 0;
      this.run = foeEvent(this.run, this.obstacleOf(f.id)!.id, "woke");
      this.toast(f.kind === "stalker" ? "The stalker has seen you!" : "The brute wakes up!", 2);
      this.sfx.play("warn_behind");
      Log.info(LOG, `FOE ${f.id} noticed you`);
    }
  }

  /** Foes: stalkers patrol and hunt by sight; the brute sleeps until it hears you. Both bite. */
  private foesFrame(dt: number, moving: boolean): void {
    const inGrass = tileAt(this.lv, Math.floor(this.me.x / T), Math.floor((this.me.y - 2) / T)) === Tile.Grass;
    const hiding = { inGrass, crouched: this.crouched, camo: this.part === "camo" };
    for (const f of this.foes) {
      f.biteCd = Math.max(0, f.biteCd - dt);
      f.stunT = Math.max(0, f.stunT - dt);
      if (f.kind === "boss") { this.bossFrame(f, dt, hiding); continue; }
      let dir = 0, speed = 0;
      if (f.mode === "down") { /* lies there */ }
      else if (f.mode === "sleep") {
        const d = Math.hypot(this.me.x - f.body.x, this.me.y - f.body.y);
        f.noise = noise(f.noise, d, moving, this.crouched, dt, this.sprinting);
        if (woken(f.noise)) this.wake(f);
      } else if (f.mode === "patrol") {
        speed = CR.foes.stalker.patrol;
        if (f.body.x <= f.from) f.facing = 1;
        if (f.body.x >= f.to) f.facing = -1;
        dir = f.facing;
        const eye = { x: f.body.x + f.facing * 6, y: f.body.y - f.body.h + 4, facing: f.facing };
        const seen = sees(eye, { x: this.me.x, y: this.me.y - this.me.h / 2 }, hiding);
        if (seen) this.wake(f);
        else if (hiding.camo && sees(eye, { x: this.me.x, y: this.me.y - this.me.h / 2 }, { ...hiding, camo: false })) this.run = usedPart(this.run, "camo");
      } else if (f.mode === "chase") {
        const s = f.kind === "stalker" ? CR.foes.stalker : CR.foes.brute;
        speed = s.chase;
        f.facing = Math.sign(this.me.x - f.body.x) || f.facing;
        dir = f.stunT > 0 ? 0 : f.facing;
        const near = Math.abs(this.me.x - f.body.x) < 18 && Math.abs(this.me.y - f.body.y) < 24;
        if (near && f.biteCd <= 0 && f.stunT <= 0) { f.biteCd = s.biteCdS; this.sfx.play(f.kind === "stalker" ? "chomp_spinefish" : "chomp_shellback"); this.hurt(f.facing); }
        if (f.kind === "stalker") {
          const eye = { x: f.body.x, y: f.body.y - f.body.h, facing: f.facing };
          f.loseT = sees(eye, { x: this.me.x, y: this.me.y - this.me.h / 2 }, hiding) ? 0 : f.loseT + dt;
          if (f.loseT > CR.foes.stalker.loseS) { f.mode = "patrol"; Log.debug(LOG, `FOE ${f.id} lost you`); }
        }
      }
      if (f.stunT > 0) f.body.vx *= 0.9;
      stepBody(f.body, { dir, jump: false, speed }, dt, this.solid);
      f.body.x = Phaser.Math.Clamp(f.body.x, f.from - T, f.to + T); // each foe keeps to its own stretch
      const row = f.kind === "stalker" ? (f.mode === "down" ? "down" : f.mode === "chase" ? "alert" : "walk") : (f.mode === "down" ? "down" : f.mode === "sleep" ? "sleep" : "walk");
      const k = animKey("cfoes", f.kind, row);
      if (f.spr.anims.currentAnim?.key !== k) f.spr.play(k);
      f.spr.setPosition(f.body.x, f.body.y).setFlipX(f.facing < 0).setTint(f.stunT > 0 ? 0xff8080 : 0xffffff);
    }
  }

  /** The Old Horn: roam, see you, paw (windup), charge until a wall stuns it; bites and charges hurt (boss.ts). */
  private bossFrame(f: Foe, dt: number, hiding: { inGrass: boolean; crouched: boolean; camo: boolean }): void {
    const m0 = f.mind!;
    const you = { x: this.me.x, y: this.me.y - this.me.h / 2 };
    const seesYou = m0.mode !== "down" && sees({ x: f.body.x + f.facing * 16, y: f.body.y - 22, facing: f.facing }, you, hiding, CR.boss.sight / CR.foes.stalker.sight);
    if (m0.mode === "roam" && seesYou) f.facing = Math.sign(this.me.x - f.body.x) || f.facing; // turns to face you before the charge
    let dir = 0, speed = 0;
    if (m0.mode === "roam") {
      speed = CR.boss.roam;
      if (f.body.x <= f.from + T) f.facing = 1;
      if (f.body.x >= f.to - T) f.facing = -1;
      dir = f.facing;
    } else if (m0.mode === "charge") { speed = CR.boss.charge; dir = f.facing; }
    const res = stepBody(f.body, { dir, jump: false, speed }, dt, this.solid);
    const atEdge = f.body.x <= f.from || f.body.x >= f.to;
    f.body.x = Phaser.Math.Clamp(f.body.x, f.from, f.to);
    const m = bossStep(m0, { sees: seesYou, hitWall: m0.mode === "charge" && (res.wall !== 0 || atEdge), dt });
    if (m.mode === "windup" && m0.mode !== "windup") { this.toast("The Old Horn lowers its horns...", 1.5); this.sfx.play("warn_behind"); }
    if (m.mode === "stunned" && m0.mode === "charge") { this.cameras.main.shake(200, 0.01); this.sfx.play("bump"); this.toast("It slams into the wall: stunned! Bite it now (F)", 2); }
    f.mind = m;
    // contact: a charge tramples you; otherwise it gores you now and then
    const touching = m.mode !== "down" && m.mode !== "stunned" && Math.abs(this.me.x - f.body.x) < f.body.w / 2 + 6 && Math.abs(this.me.y - f.body.y) < 30;
    if (touching && (m.mode === "charge" || f.biteCd <= 0)) {
      f.biteCd = CR.boss.biteCdS;
      this.sfx.play("chomp_hammer");
      this.hurt(Math.sign(this.me.x - f.body.x) || f.facing);
      if (m.mode === "charge") this.me.vx = (Math.sign(this.me.x - f.body.x) || f.facing) * CR.boss.knock;
    }
    const row = m.mode === "down" ? "down" : m.mode;
    const k = animKey("cboss", "boss", row);
    if (f.spr.anims.currentAnim?.key !== k) f.spr.play(k);
    f.spr.setPosition(f.body.x, f.body.y).setFlipX(f.facing < 0).setTint(m.mode === "windup" && Math.floor(this.t * 10) % 2 ? 0xff9080 : 0xffffff);
  }

  /** Your bite on the boss: doubled while it is stunned (fight), tripled from behind while it has not seen you (stealth). */
  private biteBoss(f: Foe, dmg: number): void {
    const behind = Math.sign(this.me.x - f.body.x) !== f.facing;
    const d = biteDamage(f.mind!, dmg, behind);
    if (d.way === "stealth") this.toast(`Ambush! (-${d.amount})`, 1.5);
    this.damageBoss(f, d.amount, d.way, false);
  }

  private damageBoss(f: Foe, amount: number, way: Way, stun: boolean): void {
    const before = f.mind!;
    f.mind = hurtBoss(before, amount, stun);
    this.run = bossHit(this.run, this.obstacleOf(f.id)!.id, way, amount);
    Log.info(LOG, `BOSS -${amount} (${way}), ${f.mind.hp} left`);
    if (f.mind.mode === "down" && before.mode !== "down") {
      this.run = foeEvent(this.run, this.obstacleOf(f.id)!.id, "beaten");
      this.st.open.add("gate_boss");
      drawTiles(this.tileG, this.grassG, this.lv, this.st);
      this.sfx.play("evolve");
      this.cameras.main.shake(300, 0.012);
      this.toast("The Old Horn falls! The way out of the den opens.", 3.5);
      Log.info(LOG, "BOSS beaten");
    }
  }

  private hurt(fromDir: number): void {
    if (this.hurtT > 0) return;
    this.hearts--;
    this.hurtT = CR.hurtS;
    this.me.vx = fromDir * CR.knock.x;
    this.me.vy = -CR.knock.y;
    this.me.onGround = false;
    this.cameras.main.shake(140, 0.006);
    Log.info(LOG, `HURT (${this.hearts} left)`);
    if (this.hearts <= 0) this.fallBack();
  }

  /** Out of hearts, or into the water: back to the last checkpoint, and the part you carried is lost. */
  private fallBack(why = "You were beaten"): void {
    const lost = this.part;
    this.part = null;
    this.hearts = CR.hearts;
    this.hurtT = CR.hurtS;
    Object.assign(this.me, { x: this.checkpoint.x, y: this.checkpoint.y, vx: 0, vy: 0, h: CR.body.h });
    this.crouched = false;
    this.run = resetUnpassed(this.run);
    for (const f of this.foes) {
      if (f.mode === "down") continue;
      Object.assign(f.body, { x: f.home.x, y: f.home.y, vx: 0, vy: 0 });
      if (f.mind && f.mind.mode !== "down") f.mind = { ...f.mind, mode: "roam", t: 0, aware: 0 }; // keeps its wounds
      f.mode = f.kind === "brute" ? "sleep" : "patrol";
      f.noise = 0;
    }
    this.cameras.main.flash(300, 0, 0, 0);
    this.toast(`${why}: back to the checkpoint${lost ? `, and you lost your ${lost}` : ""}.`, 3.5);
    this.sfx.play("deny");
    Log.info(LOG, `FALLBACK (${why}); lost part ${lost ?? "none"}`);
  }

  private hazards(): void {
    const x0 = Math.floor((this.me.x - this.me.w / 2) / T), x1 = Math.floor((this.me.x + this.me.w / 2 - 0.01) / T);
    const footRow = Math.floor((this.me.y + 1) / T), headRow = Math.floor((this.me.y - this.me.h - 1) / T);
    for (let x = x0; x <= x1; x++) {
      if (tileAt(this.lv, x, footRow) === Tile.Thorn && this.me.onGround) { this.hurt(this.facing > 0 ? -1 : 1); break; }
      if (tileAt(this.lv, x, headRow) === Tile.Thorn && this.me.vy < 0 && !this.crouched) { this.hurt(-this.facing); break; }
    }
    if (tileAt(this.lv, Math.floor(this.me.x / T), Math.floor((this.me.y - 4) / T)) === Tile.Water) this.fallBack("The cold water swept you away");
  }

  private pickupsFrame(): void {
    for (const p of this.pickups) {
      if (p.taken) continue;
      p.spr.setY(p.y + Math.sin(this.t * 3) * 2);
      if (Math.abs(p.x - this.me.x) < 14 && Math.abs(p.y - (this.me.y - this.me.h / 2)) < 18) {
        p.taken = true;
        p.spr.setVisible(false);
        this.part = p.part;
        this.sfx.play("part");
        this.toast(p.part === "claws" ? "Claws: your bite hits twice as hard (fighting)" : "Camouflage: foes see you half as far (stealth)", 3.5);
        Log.info(LOG, `PART ${p.part}`);
      }
    }
  }

  /** Which route zone you are in, and obstacles you have passed. */
  private routes(): void {
    const tx = Math.floor(this.me.x / T), ty = Math.floor((this.me.y - this.me.h / 2) / T);
    for (const o of this.lv.obstacles) {
      for (const [way, r] of Object.entries(o.zones) as [Way, NonNullable<Obstacle["zones"][Way]>][]) {
        if (inRect(r, tx, ty) && this.run.obstacles[o.id].zone !== way) { this.run = enterZone(this.run, o.id, way); Log.debug(LOG, `ZONE ${o.id} ${way}`); }
      }
      if (tx >= o.exit && this.run.obstacles[o.id].verdict === null) {
        this.run = passExit(this.run, o.id);
        const v = this.run.obstacles[o.id].verdict!;
        this.toast(`${o.name}: ${WAY_WORD[v]}${v === "rushed" ? "" : ` (${WAY_TEMPER[v]})`}`, 2.5);
        this.sfx.play(v === "rushed" ? "deny" : "upgrade");
        Log.info(LOG, `PASSED ${o.id}: ${v}`);
      }
    }
  }

  /** The obstacle you are at (for the hint line). */
  private currentObstacle(): Obstacle | undefined {
    const tx = this.me.x / T;
    return this.lv.obstacles.find((o) => tx >= o.x0 && tx < o.exit && this.run.obstacles[o.id].verdict === null);
  }

  private drawLevel(): void {
    const me = this.me;
    const pose = this.biteT > 0 ? "bite" : this.crouched ? "crouch" : !me.onGround ? "jump" : Math.abs(me.vx) > 8 ? "walk" : "idle";
    const k = animKey("cwalk", pose, "right");
    if (this.meSpr.anims.currentAnim?.key !== k) this.meSpr.play(k);
    const inGrass = tileAt(this.lv, Math.floor(me.x / T), Math.floor((me.y - 2) / T)) === Tile.Grass;
    this.meSpr.setPosition(me.x, me.y).setFlipX(this.facing < 0)
      .setAlpha(this.hurtT > 0 && Math.floor(this.t * 12) % 2 ? 0.4 : this.crouched && (inGrass || this.part === "camo") ? 0.6 : 1)
      .setTint(this.part === "camo" ? 0xa0d090 : this.part === "claws" ? 0xffc0a0 : 0xffffff);
    // sight cones: what each stalker sees is what you avoid (stealth must be readable)
    this.fxG.clear();
    const hiding = { inGrass, crouched: this.crouched, camo: this.part === "camo" };
    for (const f of this.foes) {
      if (f.kind === "boss" && f.mind && (f.mind.mode === "roam" || f.mind.mode === "windup")) {
        drawCone(this.fxG, f.body.x + f.facing * 16, f.body.y - 22, f.facing, CR.boss.sight, f.mind.mode === "windup");
      }
      if (f.kind !== "stalker" || f.mode === "down") continue;
      drawCone(this.fxG, f.body.x + f.facing * 6, f.body.y - f.body.h + 4, f.facing, CR.foes.stalker.sight, f.mode === "chase");
    }
    for (const f of this.foes) { // a brute's wake meter, over its head
      if (f.kind !== "brute" || f.mode !== "sleep" || f.noise <= 0.05) continue;
      const w = 24 * Math.min(1, f.noise / CR.foes.brute.wakeNoise);
      this.fxG.fillStyle(0x000000, 0.6).fillRect(f.body.x - 13, f.body.y - 30, 26, 4).fillStyle(0xffb040, 1).fillRect(f.body.x - 12, f.body.y - 29, w, 2);
    }
    const cam = this.cameras.main;
    const want = me.x + this.facing * CR.camera.lookAhead - this.scale.width / 2;
    cam.scrollX += (want - cam.scrollX) * Math.min(1, CR.camera.lerp * (1 / 60));
    // HUD
    const hearts = "♥".repeat(Math.max(0, this.hearts)) + "♡".repeat(Math.max(0, CR.hearts - this.hearts));
    const range = sightRange(hiding);
    this.hud.setText(`${hearts}   Part: ${this.part ?? "none"}${this.crouched ? `   Creeping${range === 0 ? " (hidden)" : ""}` : ""}`);
    const boss = this.foes.find((f) => f.kind === "boss");
    if (boss?.mind) { // the boss's health, and how you have hurt it so far
      const d = this.run.obstacles.oldhorn?.dmg;
      const bar = "#".repeat(Math.ceil((boss.mind.hp / CR.boss.hp) * 20)).padEnd(20, ".");
      this.tracker.setText(`The Old Horn  [${bar}]\n${d ? `fight ${d.fight}  puzzle ${d.puzzle}  stealth ${d.stealth}` : ""}`);
    } else {
      this.tracker.setText(this.lv.obstacles.map((o) => {
        const v = this.run.obstacles[o.id].verdict;
        return `${o.name}: ${v ? WAY_WORD[v] : "..."}`;
      }).join("\n"));
    }
    const o = this.currentObstacle();
    const hintKey = !o ? "" : o.boss ? "boss" : o.foe?.startsWith("stalker") ? "guard" : o.zones.stealth && o.zones.puzzle?.y0 === 8 ? (this.lv.drained ? "basin" : "lake") : "barrier";
    this.hint.setText(hintKey ? HINT[hintKey] : "A/D move  Shift sprint  Space jump  hold S creep  F bite  E use");
  }

  private finishLevel(): void {
    this.mode = "summary";
    for (const o of this.lv.obstacles) if (this.run.obstacles[o.id].verdict === null) this.run = passExit(this.run, o.id);
    const s = summary(this.run, this.lv.name);
    this.world = clearLevel(this.world, this.levelId);
    const bossRun = this.run.obstacles.oldhorn;
    const rows = this.lv.obstacles.map((o) => {
      const v = this.run.obstacles[o.id].verdict!;
      return `  ${o.name.padEnd(20)} ${WAY_WORD[v].padEnd(14)} ${v === "rushed" ? "(nothing built)" : `+${Math.round(CR.temperPerObstacle * 100)} % ${WAY_TEMPER[v]}`}`;
    });
    const shift = (Object.entries(s.shift) as [string, number][]).filter(([, v]) => v > 0).map(([k, v]) => `${k} +${Math.round(v * 100)} %`).join(", ") || "nothing (you ran past everything)";
    this.panelBg.clear().fillStyle(0x0a0e14, 0.9).fillRect(60, 30, 520, 280).lineStyle(2, 0xe0c890, 1).strokeRect(60, 30, 520, 280);
    const verdictWord: Record<Verdict, string> = { fight: "fighting", puzzle: "puzzles", stealth: "stealth", rushed: "luck" };
    this.panel.setText([
      `${this.lv.name} cleared`, "",
      ...rows, "",
      bossRun?.dmg ? `You beat the Old Horn mostly by ${verdictWord[bossRun.verdict ?? "rushed"]} (damage: fight ${bossRun.dmg.fight}, puzzle ${bossRun.dmg.puzzle}, stealth ${bossRun.dmg.stealth}).` : s.cause + ".",
      ...(bossRun?.dmg ? ["The creature stage Toy is complete."] : []),
      `Your lineage leans: ${shift}`,
      s.partsLine ?? "Parts used: none",
      "", bossRun?.dmg ? "Enter: evolve into the civilization stage" : "Enter: back to the world map (replay it another way, or drain the lake first)",
    ].join("\n"));
    this.hint.setText("");
    this.tracker.setText(""); // the panel says it all
    this.hud.setText("");
    this.sfx.play("evolve");
    Log.info(LOG, `FINISH ${s.cause}; shift ${shift}; ${s.partsLine ?? "no parts"}`);
  }

  /** The Old Horn is beaten: the lineage goes on to the civilization stage (not built yet: back to the title). */
  private evolveToCiv(): void {
    Log.info(LOG, "EVOLVE into the civilization stage (not built yet)");
    shell.quitToTitle();
    shell.toast("cr.civ_soon");
  }

  // ---- autoplay (smoke) -----------------------------------------------------------------------------------
  /**
   * Walks right; bites brambles and any foe close by; when something else blocks it, it creeps (crouch), and once
   * crouched with room to stand it stands up and hops out. Crude on purpose: it proves the whole level runs.
   */
  private pilot(): Intent {
    const me = this.me;
    const blocked = boxHits(me.x + 3, me.y, me.w, me.h, this.solid);
    const fx = Math.floor((me.x + me.w / 2 + 4) / T);
    const front = [Math.floor((me.y - 2) / T), Math.floor((me.y - 12) / T)].some((ty) => tileAt(this.lv, fx, ty) === Tile.Bramble && this.solid(fx, ty));
    const foeNear = this.foes.some((f) => f.mode !== "down" && Math.abs(f.body.x - me.x) < 28 && Math.abs(f.body.y - me.y) < 24);
    this.pilotStuck = blocked ? this.pilotStuck + 1 / 60 : 0;
    let crouch = this.crouched, jump = false;
    if (this.pilotJumped) { // decided to stand and hop out: no crouching until it has jumped
      crouch = false;
      if (!this.crouched && me.onGround) { jump = true; this.pilotJumped = false; this.pilotStuck = 0; }
    } else if (blocked && !front && this.pilotStuck > 0.15) {
      if (!this.crouched) crouch = true;
      else if (canStand(me, this.solid)) this.pilotJumped = true;
    } else if (!blocked && this.crouched && canStand(me, this.solid) && Math.random() < 0.02) crouch = false;
    return { dir: 1, jump, crouch, bite: front || foeNear, use: false, sprint: false };
  }

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, MAX_DT) * shell.settings.access.game_speed;
    const playing = shell.topId === "play";
    this.t += dt;
    this.sfx.update(shell.settings.audio);
    if (this.toastLeft > 0 && (this.toastLeft -= dt) <= 0) this.toastT.setVisible(false);
    if (this.mode === "map") this.mapFrame(playing);
    else if (this.mode === "level") this.levelFrame(dt, playing);
    else if (playing && (shell.input.takePress("ui_accept") || shell.input.takePress("jump"))) {
      if (this.levelId === "den") this.evolveToCiv(); // the boss is beaten: on to stage 4 (BAMF69 2026-11-09)
      else this.showMap();
    }
    else if (this.autoplay && this.t > 1e9) this.showMap();
  }
}

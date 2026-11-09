// ---------------------------------------------------------------------------
// AquaticScene.ts
// Purpose : The aquatic stage Toy (docs/stages/02-aquatic.md), v3 (BAMF69 2026-11-08): three maps, one per form
//           (pond -> lake -> ocean), joined by two high-speed river runs (minigames with a part found nowhere else).
//           Swim seen from behind your creature, seabed to surface (R/F), dash (Shift), jump (Space: breach); eat by
//           your lineage's diet for plant and meat points (every bite heals 1), buy five stats up to 10 (E), grow
//           through three forms, ram creatures for meat and parts; fish fight fish too (deepmaws hunt everything,
//           darter schools swarm); your species turns shark-like as it grows aggressive; the lens (U) sets the
//           water temperature while your kin evolve. Reaching the next form opens the map's river mouth: breach in
//           its light to leap into the river. v4: stamina (Shift toggles cruise / full speed; dash Q and breach cost
//           half), part icons with what they do, river parts in their own slots, the admin panel (` key).
// Usage   : Started by the shell ("aquatic"): main menu "Aquatic stage (prototype)", or
//           dev.py smoke --drive play:N --query "stage=aquatic&autoplay". URL options: ?autoplay (a pilot swims,
//           buys, uses the lens and steers rivers), ?pilot=fight | breach | still, ?map=lake | ocean (start there),
//           ?river=1 | 2 (start in that river run), ?lens, ?temp=N, ?seed=N, ?threat (=front), ?look=0|1..3|c1..c3|a1..a3 (force a body look), ?parts=fins,jaws,... (start with them), ?form=N,
//           ?admin (open the admin panel; the ` key toggles it), ?swarm (a darter school starts beside you, coming for you),
//           ?debug.
// Notes   : PROTOTYPE (Toy tier). The world is top-down (x, y, heading) plus height z; view.ts projects it from
//           behind the avatar. A river run maps (x across, s down) onto the plane as (x, -s). Numbers: aquatic/
//           tuning.ts (AQ, KINDS, MAPS, RIVERS). Pure rules (tested): aquatic/{view, avatar, creature, critters,
//           river, population, reveal}.ts. The deepmaw reuses the cell stage's gulper mind (cell/predator.ts).
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
//
// Pseudocode
//   create: read the lineage (reveal, diet, starting stats) -> build map 0 (or ?map / ?river)
//   buildMap(i): palette, specks, plants, scenery, creatures scaled by the map, kin, the river mouth
//   update: reveal -> wait;  lens -> temperature, generations;  river -> riverFrame;  swim -> swimFrame
//   swimFrame: steer, jump (at the open mouth: into the river), dash -> eat -> creatures (flee, chase, swarm, the
//              deepmaw's mind; fish fight fish) -> contacts (your ram vs their bite) -> deaths drop meat and parts
//   riverFrame: carried down; dodge rocks and logs, eat, grab the unique part -> at the end: the next map

import * as Phaser from "phaser";
import { Log } from "../core/log";
import { effectiveShake } from "../core/settings";
import { shell } from "../shell/app";
import { animKey, animSpecs, firstFrame, type AtlasLayout } from "./cell/atlas";
import type { TemperamentKind } from "../core/lineage";
import { AdminPanel, type Destination } from "./aquatic/adminPanel";
import { PLAYER_ID, ate, newBrain, think, type GulperBrain, type Seen } from "./cell/predator";
import { cellSfx, type CellSfx } from "./cell/sfx";
import { keepInside, swim } from "./cell/steer";
import { dash, jump, newAvatar, steerAvatar, type Avatar, type Water } from "./aquatic/avatar";
import {
  addPart, buyUpgrade, bodyLook, lookScores, canAbility, canGoFast, outOfBreath, creatureFromLineage, dieAndCarryOn, eatFood, foodToEvolve, heal, has, maxHp,
  maxStamina, movement, paceSpeed, ramDamage, size as bodySize, slots, spendAbility, stepStamina, takeHit,
  type AqCreature, type FoodKind, type Pace,
} from "./aquatic/creature";
import { critterIntent, schoolTarget } from "./aquatic/critters";
import { seabedContact } from "./aquatic/seabed";
import { newSharkBrain, sharkBit, sharkThink, type SharkBrain } from "./aquatic/sharks";
import { AquaticHud } from "./aquatic/hud";
import { describeBody, describeWater, waterEffects, type WaterEffects } from "./aquatic/gardener";
import { average, bodyWord, mulberry32, newPopulation, nextGeneration, type Population } from "./aquatic/population";
import { revealFrom } from "./aquatic/reveal";
import { RUN_SLOT, packRun, unpackRun, type AqRun } from "./aquatic/runSave";
import { hitAt, makeRiver, newRiverBody, riverJump, riverStep, type RiverBody, type RiverRun, type RiverThing } from "./aquatic/river";
import {
  AQ, AQ_KINDS, AQ_PAID_WITH, AQ_PARTS, AQ_STATS, KINDS, MAPS, RIVERS, SHARKS, SHARK_MIND, UNIQUE_PARTS, type AqKind, type AqPart, type AqStat, type KindTuning,
  type MapSpec, type SharkPlacement, type SharkSpec,
} from "./aquatic/tuning";
import { AqUpgradePanel } from "./aquatic/upgradePanel";
import { cameraBehind, hiddenThreat, project, viewOf, wrapAngle, type Camera } from "./aquatic/view";

const LOG = "aquatic";
const LINEAGE_SLOT = "lineage";
const MAX_DT = 0.1;
const ANIM_FPS = 7;
const LENS_ZOOM = 0.3;
const ARROWS = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
const RIVER_PALETTE = { top: 0x0e2a24, fog: 0x163a30, floor: 0x3a5a40, speck: 0x6a8a5a, ripple: 0xb0d8c0 };

type Atlas = "aswim" | "aprey" | "afin" | "aspine" | "ashell" | "adeep" | "aprops" | "ashark" | "ahammer" | "aparts";
const FILES: Record<Atlas, [string, number]> = {
  aswim: ["aquatic_swimmer", 32], aprey: ["aquatic_prey", 32], afin: ["aquatic_finray", 32], aspine: ["aquatic_spinefish", 32],
  ashell: ["aquatic_shellback", 32], adeep: ["aquatic_predator", 64], aprops: ["aquatic_props", 32],
  ashark: ["aquatic_shark", 64], ahammer: ["aquatic_hammer", 64], aparts: ["aquatic_partlayers", 32],
};
const px = (a: Atlas) => FILES[a][1];
const isPart = (k: string): k is AqPart => (AQ_PARTS as readonly string[]).includes(k);

interface Critter {
  id: number;
  kind: AqKind | "kin";
  x: number; y: number; z: number; vx: number; vy: number; vz: number;
  heading: number;
  turnIn: number;
  hp: number;
  spr: Phaser.GameObjects.Sprite;
  atlas: Atlas;
  size: number;
  thickness: number; // kin only
  school: number; // darters: which school (-1 for others)
  brain?: GulperBrain; // deepmaws
  biteCd: number;
  hitCd: number;
  provokedLeft: number; // s it keeps biting back after you rammed it
  respawnIn: number; // > 0 while dead
}

type ItemKind = "algae" | "plankton" | "meat" | "meatM" | "meatL" | "pod" | "bloom" | "rock" | "weed" | "log" | AqPart;
const FOOD_ITEMS: readonly string[] = ["algae", "plankton", "meat", "meatM", "meatL", "pod"];
interface Item {
  kind: ItemKind;
  x: number; y: number; z: number;
  life: number; // s left (Infinity for plants and scenery)
  spr: Phaser.GameObjects.Sprite;
  size: number;
  hp?: number; // a kelp bloom: rams break it open
  hitCd?: number;
}

interface RiverObj {
  t: RiverThing | { kind: "bank"; s: number; x: number; z: number; r: number };
  spr: Phaser.GameObjects.Sprite;
  gone: boolean;
}

/** A shark (2026-11-08): its own mind (sharks.ts) and numbers (SHARKS), not a KINDS creature. */
interface Shark {
  x: number; y: number; z: number; vx: number; vy: number; vz: number;
  heading: number;
  turnIn: number;
  spr: Phaser.GameObjects.Sprite;
  atlas: "ashark" | "ahammer"; // the large shark is a hammerhead (2026-11-08)
  spec: SharkSpec;
  rules: SharkPlacement;
  brain: SharkBrain;
  hp: number;
  biteCd: number;
  hitCd: number;
  respawnIn: number;
}

interface School {
  target: Critter | "you" | null; // a school sometimes swarms you, too
  centre: { x: number; y: number; z: number }; // where its darters are (they keep together)
  left: number;
  cooldown: number;
}

type Mode = "reveal" | "swim" | "lens" | "river" | "cutscene";
type Pilot = { s: { turn: number; push: number; rise: number }; doJump: boolean; doDash: boolean };

/** Each biter has its own chomp (2026-11-09); river rocks and logs thud. */
function chompFor(by: string): string {
  if (by.startsWith("shark (large")) return "chomp_hammer";
  if (by.startsWith("shark")) return "chomp_shark";
  if (by === "darters") return "chomp_darter";
  if (by === "spinefish" || by === "shellback") return `chomp_${by}`;
  if (by === "deepmaw") return "chomp";
  return "bump";
}

export class AquaticScene extends Phaser.Scene {
  private rng!: () => number;
  private av!: Avatar;
  private me!: AqCreature;
  private avatarSpr!: Phaser.GameObjects.Sprite;
  private thickness = 0.5;
  private climate: WaterEffects = waterEffects(AQ.population.neutralTemp); // what the water does now (gardener.ts)
  private critters: Critter[] = [];
  private kin: Critter[] = [];
  private items: Item[] = [];
  private schools: School[] = [];
  private specks: { x: number; y: number }[] = [];
  private bg!: Phaser.GameObjects.Graphics;
  private skyBg!: Phaser.GameObjects.Graphics;
  private lensBg!: Phaser.GameObjects.Graphics;
  private floor!: Phaser.GameObjects.Graphics;
  private hud!: AquaticHud;
  private panel!: AqUpgradePanel;
  private sfx!: CellSfx;
  private mode: Mode = "reveal";
  private mapIndex = 0;
  private map: MapSpec = MAPS[0];
  private water: Water = { ...AQ.water };
  private mouth = { x: 0, y: 0 };
  private run: RiverRun | null = null;
  private riverIndex = 0;
  private rb: RiverBody | null = null;
  private riverObjs: RiverObj[] = [];
  private riverHitCd = 0;
  private pop!: Population;
  private causes: string[] = [];
  private tempC: number = AQ.lens.tempStart;
  private genLeft: number = AQ.population.generationS;
  private regrowIn = 0;
  private warnCd = 0;
  private huntToastCd = 0;
  private cantEatCd = 0;
  private mouthToastCd = 0;
  private flashLeft = 0;
  private deaths = 0;
  private kills = 0;
  private look = "0"; // the body look's atlas suffix: 0, 1..3 (shark), c1..c3 (armoured), a1..a3 (streamlined)
  private lookName = "plain 0";
  private forceLook: string | null = null; // ?look=2 or ?look=c3 or ?look=a1: show that look (captures, tuning)
  private allowSave = false; // autosave the run (off for autoplay and debug starts, so tests never touch your save)
  private saveIn = 0;
  private breaches = 0; // breaches this stage: they make the body more streamlined (adaptable)
  private sharks: Shark[] = [];
  private partLayers: Partial<Record<AqPart, Phaser.GameObjects.Sprite>> = {};
  private partsLayout!: AtlasLayout;
  private nextId = 1;
  private autoplay = false;
  private pilotKind: "" | "fight" | "breach" | "still" = "";
  private pilotT = 0;
  private openLensAtStart = false;
  private openAdminAtStart = false; // ?admin: open the admin panel after the reveal (captures)
  private palette = MAPS[0].palette;
  private fogTints: number[] = [];
  private admin!: AdminPanel;
  private temper: Record<TemperamentKind, number> = { cautious: 0, aggressive: 0, adaptable: 0 };
  private wantFast = false; // Shift toggles cruise / full speed (stamina)
  private pace: Pace = "still";
  private tiredToastCd = 0;
  private invincible = false; // admin: no damage taken
  private slowLeft = 0; // s of seaweed tangle left
  private weedToastCd = 0;
  private bumpCd = 0;
  private kickCd = 0; // river: Space kicks you up (free, on a short cooldown)
  private partSeen = false; // river: the gold part has come into view (the twinkle played)
  private fx!: Phaser.GameObjects.Graphics; // sparkles over the river's gold part
  private cut: { kind: "toRiver" | "fromRiver"; t: number; done: () => void; title: string; palette: MapSpec["palette"] } | null = null;
  private cutGfx!: Phaser.GameObjects.Graphics;
  private cutTitle!: Phaser.GameObjects.Text;
  private decals: { x: number; y: number; w: number; aspect: number; color: number; alpha: number }[] = [];
  private propsLayout!: AtlasLayout;
  private onAdminKey = (e: KeyboardEvent) => { if (e.code === "Backquote" && shell.topId === "play") this.admin.toggle(); };

  constructor() {
    super("aquatic");
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
    const pk = params.get("pilot");
    this.pilotKind = pk === "fight" || pk === "breach" || pk === "still" ? pk : "";
    this.openLensAtStart = params.has("lens");
    this.openAdminAtStart = params.has("admin");
    const lk = params.get("look");
    this.forceLook = lk && /^(0|[123]|[ca][123])$/.test(lk) ? lk : null;
    const seed = Number(params.get("seed") ?? 7);
    this.rng = mulberry32(Number.isFinite(seed) ? seed : 7);
    const temp = Number(params.get("temp"));
    this.tempC = params.has("temp") && Number.isFinite(temp) ? Phaser.Math.Clamp(temp, AQ.lens.tempMin, AQ.lens.tempMax) : AQ.lens.tempStart;
    if (params.has("debug")) Log.enableChannel(LOG);
    Object.assign(this, { critters: [], kin: [], items: [], specks: [], causes: [], riverObjs: [], schools: [] });
    this.mode = "reveal";
    this.genLeft = AQ.population.generationS;
    this.deaths = 0;
    this.kills = 0;
    this.pilotT = 0;
    this.run = null;
    this.rb = null;

    for (const key of Object.keys(FILES) as Atlas[]) this.makeAnims(key);
    this.bg = this.add.graphics().setDepth(-10);
    this.skyBg = this.add.graphics().setDepth(-10).setVisible(false);
    this.lensBg = this.add.graphics().setDepth(-10).setVisible(false);
    this.floor = this.add.graphics().setDepth(-5);
    this.fx = this.add.graphics().setDepth(2290); // under the gold part (2300), over the scenery
    this.cutGfx = this.add.graphics().setDepth(2490).setVisible(false);
    this.cutTitle = this.add.text(this.scale.width / 2, this.scale.height * 0.2, "", { fontFamily: "monospace", fontSize: "18px", color: "#fff6c8" })
      .setOrigin(0.5).setDepth(2700).setResolution(2).setVisible(false);
    this.cut = null;
    this.drawSky();
    this.av = newAvatar(0, 0, 60, -Math.PI / 2);
    this.avatarSpr = this.add.sprite(0, 0, "aswim").setDepth(2500);
    this.partsLayout = this.cache.json.get("aparts_layout") as AtlasLayout;
    this.partLayers = {};
    for (const p of AQ_PARTS) this.partLayers[p] = this.add.sprite(0, 0, "aparts", firstFrame(this.partsLayout, "on", p)).setDepth(2501).setVisible(false);
    this.breaches = 0;
    this.pop = newPopulation(AQ.population, this.rng);
    this.thickness = average(this.pop);

    this.sfx = cellSfx();
    this.hud = new AquaticHud(this, shell.i18n);
    this.panel = new AqUpgradePanel(this, shell.i18n, (stat) => this.tryBuy(stat));
    this.propsLayout = this.cache.json.get("aprops_layout") as AtlasLayout;
    this.admin = new AdminPanel(this, {
      setTemperament: (k, v) => this.adminTemper(k, v),
      goTo: (d) => this.adminGoTo(d),
      setForm: (n) => { this.me = { ...this.me, form: n }; this.me = { ...this.me, hp: maxHp(this.me) }; Log.info(LOG, `ADMIN form ${n}`); },
      addPoints: () => { this.me = { ...this.me, points: { algae: this.me.points.algae + 50, meat: this.me.points.meat + 50 } }; },
      toggleInvincible: () => { this.invincible = !this.invincible; Log.info(LOG, `ADMIN invincible ${this.invincible}`); },
    });
    window.addEventListener("keydown", this.onAdminKey);
    this.events.once("shutdown", () => { window.removeEventListener("keydown", this.onAdminKey); this.sfx.loop("hunt", "music/hunt.wav", false); this.sfx.loop("calm", "music/calm.wav", false); this.saveRun(); });
    this.wantFast = false;
    this.readLineage();
    // debug starts: ?map=lake | ocean, ?river=1 | 2 (you are at least the form that map is for)
    const askMap = MAPS.findIndex((m) => m.id === params.get("map"));
    const askRiver = Number(params.get("river"));
    const startMap = askRiver === 1 || askRiver === 2 ? askRiver - 1 : Math.max(0, askMap);
    if (startMap > 0 || askRiver) this.me = { ...this.me, form: Math.min(3, startMap + (askRiver ? 2 : 1)) };
    const askForm = Number(params.get("form")); // ?form=2: start that big (captures, the river mouth)
    if (askForm >= 1 && askForm <= 3) this.me = { ...this.me, form: Math.floor(askForm) };
    this.me = { ...this.me, hp: maxHp(this.me) };
    for (const p of (params.get("parts") ?? "").split(",")) if (isPart(p)) this.me = addPart(this.me, p).creature; // ?parts=fins,jaws (captures)
    this.allowSave = !this.autoplay && !params.has("map") && !params.has("river") && !params.has("form");
    const resumed = shell.takeContinue() || params.has("continue") ? this.loadRun() : null; // menu "Continue" (or ?continue): the saved run (2026-11-09)
    this.buildMap(resumed ? resumed.map : Math.max(0, askMap), "start");
    if (resumed) { this.closeReveal(); this.hud.toast(shell.i18n.t("aq.welcome_back", { form: this.me.form }), 5); }
    if (askRiver === 1 || askRiver === 2) this.startRiver(askRiver - 1);
    if (params.has("threat")) { // a deepmaw right behind you (?threat) or ahead, facing you (?threat=front)
      const d = this.critters.find((c) => c.kind === "deepmaw");
      const ahead = params.get("threat") === "front";
      if (d) Object.assign(d, { x: this.av.x, y: this.av.y + (ahead ? -220 : 260), z: this.av.z, heading: ahead ? Math.PI / 2 : -Math.PI / 2 });
    }
    if (params.has("swarm") && this.schools[0]) { // ?swarm: school 0 starts beside you and comes for you (checks the swarm)
      for (const c of this.critters) if (c.school === 0) Object.assign(c, { x: this.av.x + 140 + this.rng() * 60, y: this.av.y + (this.rng() - 0.5) * 80, z: this.av.z + 60 });
      Object.assign(this.schools[0], { target: "you", left: AQ.schools.swarmS, cooldown: 0 });
    }
    if (this.openLensAtStart && !this.autoplay) this.closeReveal();
  }

  // ---- setup --------------------------------------------------------------------------
  private makeAnims(key: Atlas): void {
    const layout = this.cache.json.get(`${key}_layout`) as AtlasLayout | undefined;
    if (!layout) throw new Error(`missing atlas layout ${key}_layout (public/assets/art; build it with tools/art/pixel_sprite.py)`);
    for (const a of animSpecs(key, layout)) {
      if (this.anims.exists(a.key)) continue;
      this.anims.create({ key: a.key, frames: this.anims.generateFrameNumbers(key, { start: a.start, end: a.end }), frameRate: ANIM_FPS, repeat: -1 });
    }
  }

  private lerpColor(a: number, b: number, t: number): number {
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(a), Phaser.Display.Color.ValueToColor(b), 100, Math.round(Phaser.Math.Clamp(t, 0, 1) * 100));
    return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
  }

  private bands(g: Phaser.GameObjects.Graphics, top: [number, number], bottom: [number, number], gamma: number): void {
    const { width: w, height: h } = this.scale;
    const hz = h * AQ.camera.horizon;
    const n = 24;
    for (let i = 0; i < n; i++) g.fillStyle(this.lerpColor(top[0], top[1], i / (n - 1)), 1).fillRect(0, (hz / n) * i, w, hz / n + 1);
    for (let i = 0; i < n; i++) g.fillStyle(this.lerpColor(bottom[0], bottom[1], (i / (n - 1)) ** gamma), 1).fillRect(0, hz + ((h - hz) / n) * i, w, (h - hz) / n + 1);
  }

  /** The water of this map or river: its own colours (pond teal, lake deep blue-green, ocean blue over sand). */
  private setPalette(p: MapSpec["palette"]): void {
    this.palette = p;
    this.bg.clear();
    this.bands(this.bg, [p.top, p.fog], [p.fog, p.floor], 0.7);
    this.fogTints = Array.from({ length: 17 }, (_, i) => this.lerpColor(0xffffff, p.fog, i / 16));
  }

  private drawSky(): void {
    this.bands(this.skyBg, [0x1a2a44, 0x6a7a8a], [0x3a6a74, 0x1c4652], 1);
  }

  private spot(minFromYou = 0): { x: number; y: number } {
    const w = this.map.width;
    for (let i = 0; i < 30; i++) {
      const x = 40 + this.rng() * (w - 80), y = 40 + this.rng() * (w - 80);
      if (Math.hypot(x - this.av.x, y - this.av.y) >= minFromYou) return { x, y };
    }
    return { x: 40 + this.rng() * (w - 80), y: 40 + this.rng() * (w - 80) };
  }

  /** A kind's numbers in this map: tougher and bigger in the lake and the ocean, its depth band scaled to the water. */
  private K(kind: AqKind): KindTuning {
    const k = KINDS[kind], m = this.map.mult, zs = this.map.surface / AQ.water.surface;
    const hunter = kind === "deepmaw" || kind === "spinefish", w = this.climate; // the water: warm hunters are faster and keener
    return { ...k, hp: k.hp * m.hp, bite: k.bite * m.bite, size: k.size * m.size, zMin: k.zMin * zs, zMax: k.zMax * zs,
      speed: k.speed * (hunter ? w.hunterSpeed : w.preySpeed), aggro: k.aggro * (hunter ? w.hunterSight : 1) };
  }

  private clearMap(): void {
    for (const c of [...this.critters, ...this.kin]) c.spr.destroy();
    for (const it of this.items) it.spr.destroy();
    for (const sh of this.sharks) sh.spr.destroy();
    this.critters = []; this.kin = []; this.items = []; this.specks = []; this.sharks = [];
  }

  private addShark(rules: SharkPlacement): Shark {
    const spec = SHARKS[rules.kind];
    const at = this.spot(900);
    const atlas = rules.kind === "large" ? "ahammer" : "ashark";
    const spr = this.add.sprite(0, 0, atlas).play(animKey(atlas, "swim", "side")).setVisible(false);
    return { ...at, atlas, z: this.map.surface * (0.3 + this.rng() * 0.4), vx: 0, vy: 0, vz: 0, heading: this.rng() * Math.PI * 2, turnIn: 1,
      spr, spec, rules, brain: newSharkBrain(), hp: spec.hp, biteCd: 0, hitCd: 0, respawnIn: 0 };
  }

  /** Build map i. Arriving from a river you splash in near the shore; the river mouth out is on the far side. */
  private buildMap(i: number, arrival: "start" | "river"): void {
    this.clearMap();
    this.mapIndex = i;
    this.map = MAPS[i];
    this.water = { ...AQ.water, surface: this.map.surface };
    this.setPalette(this.map.palette);
    const w = this.map.width;
    this.mouth = { x: w * 0.88, y: w * 0.12 };
    if (arrival === "start") Object.assign(this.av, { x: w / 2, y: w / 2, z: Math.min(60, this.map.surface - 20), heading: -Math.PI / 2 });
    else Object.assign(this.av, { x: w * 0.14, y: w * 0.86, z: this.map.surface - 10, heading: -Math.PI / 4 });
    Object.assign(this.av, { vx: 0, vy: 0, vz: 0, airborne: false, dashLeft: 0 });
    for (let n = 0; n < Math.round(900 * (w / 1800) ** 2); n++) this.specks.push({ x: this.rng() * w, y: this.rng() * w });
    for (let n = 0; n < this.map.rocks; n++) this.addItem("rock", { ...this.spot(), z: 0 });
    for (let n = 0; n < this.map.weeds; n++) this.addItem("weed", { ...this.spot(), z: 0 });
    for (let n = 0; n < this.map.algae; n++) this.addItem("algae", { ...this.spot(), z: 0 });
    for (let n = 0; n < this.map.plankton; n++) this.addItem("plankton", { ...this.spot(), z: this.planktonZ() });
    for (let n = 0; n < this.map.blooms; n++) this.addItem("bloom", { ...this.spot(200), z: 0 });
    this.makeDecals();
    for (const kind of AQ_KINDS) for (let n = 0; n < this.map.counts[kind]; n++) this.critters.push(this.addCritter(kind, n));
    for (let n = 0; n < AQ.population.size; n++) this.kin.push(this.addCritter("kin", n));
    for (const pl of this.map.sharks) for (let n = 0; n < pl.count; n++) this.sharks.push(this.addShark(pl));
    this.kin.forEach((k, n) => (k.thickness = this.pop.thickness[n] ?? 0.5));
    this.schools = Array.from({ length: AQ.schools.count }, () => ({ target: null, left: 0, cooldown: this.schoolWait(), centre: { x: 0, y: 0, z: 0 } }));
    // a school starts together: its darters gather around one spot
    this.schools.forEach((_, i) => {
      const at = this.spot(300);
      for (const c of this.critters) if (c.school === i) Object.assign(c, { x: at.x + (this.rng() - 0.5) * 120, y: at.y + (this.rng() - 0.5) * 120 });
    });
    const counts = AQ_KINDS.map((k) => `${k} ${this.map.counts[k]}`).join(", ");
    Log.info(LOG, `MAP ${this.map.id} (${w} px, depth ${this.map.surface}): ${counts}; you are form ${this.me.form}`);
    this.saveRun();
  }

  private schoolWait(): number {
    const [a, b] = AQ.schools.everyS;
    return a + this.rng() * (b - a);
  }

  private planktonZ(): number {
    return this.map.surface - 10 - this.rng() * 40;
  }

  private addItem(kind: ItemKind, at: { x: number; y: number; z: number }, life = Infinity): Item {
    const spr = this.propSprite(kind);
    const sizes: Record<string, number> = AQ.size;
    const it: Item = { kind, x: at.x, y: at.y, z: at.z, life, spr, size: sizes[kind] ?? AQ.size.orb, hp: kind === "bloom" ? AQ.bloom.hp * this.map.mult.hp : undefined, hitCd: 0 };
    this.items.push(it);
    return it;
  }

  private propSprite(kind: ItemKind): Phaser.GameObjects.Sprite {
    const row = kind === "meatM" || kind === "meatL" ? "meat" : kind; // bigger chunks are bigger meat sprites
    const pose = kind === "rock" ? "still" : kind === "weed" || kind === "bloom" ? "sway" : isPart(kind) ? "bob" : "drift";
    const onFloor = kind === "rock" || kind === "weed" || kind === "algae" || kind === "bloom";
    const spr = this.add.sprite(0, 0, "aprops").setOrigin(0.5, onFloor ? 1 : 0.5).play(animKey("aprops", pose, row)).setVisible(false);
    spr.anims.setProgress(this.rng());
    return spr;
  }

  private addCritter(kind: AqKind | "kin", n: number): Critter {
    const k = kind === "kin" ? null : this.K(kind);
    const atlas: Atlas = k ? k.atlas : "aswim";
    const at = this.spot(kind === "deepmaw" ? 700 : 250);
    const z = k ? k.zMin + this.rng() * (k.zMax - k.zMin) : 30 + this.rng() * (this.map.surface - 80);
    const spr = this.add.sprite(0, 0, atlas).play(animKey(atlas, "swim", kind === "kin" ? "side0" : "side")).setVisible(false);
    spr.anims.setProgress(this.rng());
    return {
      id: this.nextId++, kind, x: at.x, y: at.y, z, vx: 0, vy: 0, vz: 0, heading: this.rng() * Math.PI * 2, turnIn: this.rng() * 2,
      hp: k ? k.hp : 1, spr, atlas, size: k ? k.size : AQ.size.kin, thickness: 0.5, school: kind === "darter" ? n % AQ.schools.count : -1,
      brain: kind === "deepmaw" ? newBrain(this.rng() * AQ.deepmaw.brain.thinkS) : undefined,
      biteCd: 0, hitCd: 0, provokedLeft: 0, respawnIn: 0,
    };
  }

  // ---- the lineage: the reveal (Toy 2), diet, starting stats, how aggressive it already is ----------------
  private readLineage(): void {
    let saved: unknown = null;
    try {
      const r = shell.saves.load(LINEAGE_SLOT);
      saved = r.envelope?.data ?? null;
      if (r.source === "none" && !r.envelope) Log.info(LOG, "no lineage save yet: the default lineage");
      else if (r.problems.length) Log.warn(LOG, `lineage save: ${r.problems.join("; ")}`);
    } catch (err) {
      Log.warn(LOG, `could not read the lineage save: ${err instanceof Error ? err.message : String(err)}`);
    }
    const reveal = revealFrom(saved);
    if (reveal.problems.length) Log.warn(LOG, `lineage not used (${reveal.problems.join("; ")}): starting from the default`);
    const cell = reveal.fromSave ? (saved as { species: { stages?: { cell?: unknown } }[] }).species[0]?.stages?.cell ?? null : null;
    this.me = creatureFromLineage(cell, reveal.diet); // the stats start where the cell stage left them
    for (const r of reveal.rows) this.temper[r.kind] = r.pct / 100;
    this.updateLook(false);
    Log.info(LOG, `REVEAL ${reveal.fromSave ? "from save" : "default"}: ${reveal.rows.map((r) => `${r.kind} ${r.pct} %`).join(", ")}; diet ${this.me.diet}; look ${this.look}`);
    this.mode = "reveal";
    this.hud.showReveal(reveal);
  }

  private closeReveal(): void {
    this.hud.hidePanel();
    this.mode = this.run ? "river" : "swim";
    this.hud.toast(shell.i18n.t(this.run ? "aq.river_start" : "aq.intro_v2"), 8);
    if (this.openLensAtStart && !this.run) this.openLens();
    if (this.openAdminAtStart && !this.admin.isOpen) this.admin.toggle();
  }

  // ---- the lens (Toy 3) ------------------------------------------------------------------------
  private openLens(): void {
    this.mode = "lens";
    this.panel.close();
    this.hud.clearToast();
    this.renderLensPanel();
    Log.info(LOG, `LENS open: water ${this.tempC} °C, generation ${this.pop.generation}`);
  }

  private closeLens(): void {
    this.mode = "swim";
    this.hud.hidePanel();
    this.lensBg.setVisible(false);
    this.hud.notice(shell.i18n.t("aq.water_now", { t: Math.round(this.tempC), what: describeWater(this.tempC) }), 6);
  }

  private renderLensPanel(): void {
    this.hud.showLens(this.tempC, AQ.lens.tempMin, AQ.lens.tempMax, this.kin.map((k) => k.thickness), this.causes, this.pop.generation, [
      shell.i18n.t("aq.lens_water_now", { what: describeWater(this.tempC) }),
      shell.i18n.t("aq.lens_body_now", { what: describeBody(this.thickness) }),
    ]);
  }

  private setTemp(step: number): void {
    const t = Phaser.Math.Clamp(this.tempC + step, AQ.lens.tempMin, AQ.lens.tempMax);
    if (t === this.tempC) return;
    this.tempC = t;
    this.sfx.play("choose");
    this.renderLensPanel();
  }

  /** Body and water (BAMF69 2026-11-09 "why should the player care?"): your body is your kin's, the water acts now. */
  private syncGardener(): void {
    this.climate = waterEffects(this.tempC);
    if (this.me.thickness === this.thickness) return;
    const frac = this.me.hp / maxHp(this.me); // a new body keeps the same share of its health
    this.me = { ...this.me, thickness: this.thickness };
    this.me = { ...this.me, hp: Math.max(1, frac * maxHp(this.me)) };
  }

  /**
   * The top banner and the music, every frame. A shark on you: its banner (it smells blood when you are under half
   * health and it will not stop) and the hunt music, loud; otherwise the calm loop. With no shark: the evolve, or
   * the open river mouth (2026-11-09: "leave a message at the top of the screen telling the player").
   */
  private musicAndBanner(): void {
    const swim = this.mode === "swim" && !this.hud.blackedOut;
    const on = swim ? this.sharks.filter((sh) => sh.respawnIn <= 0 && sh.brain.mode === "hunt") : [];
    const blood = on.some((sh) => sh.rules.relentlessLow) && this.me.hp / maxHp(this.me) < 0.5;
    if (on.length) this.hud.banner(shell.i18n.t(blood ? "aq.shark_blood" : "aq.shark_hunts"), "danger");
    else if (swim && this.evolveReady()) this.hud.banner(shell.i18n.t("aq.evolve_ready"), "good");
    else if (swim && this.mouthOpen()) this.hud.banner(shell.i18n.t("aq.next_map"), "good");
    else this.hud.banner(null);
    this.sfx.loop("hunt", "music/hunt.wav", on.length > 0, AQ.music.huntLevel);
    this.sfx.loop("calm", "music/calm.wav", on.length === 0, AQ.music.calmLevel);
  }

  /** Form 4 is the last; your lineage leaves the water (into the creature stage) only from the coast, even if it got there earlier. */
  private evolveReady(): boolean {
    return this.me.form >= AQ.forms.size.length && this.map.exitForm === null && !this.run;
  }

  /** Form 4 reached before the coast: say where the evolve waits. */
  private finalFormAway(): boolean {
    return this.me.form >= AQ.forms.size.length && !this.evolveReady();
  }

  private evolveOut(): void {
    Log.info(LOG, "EVOLVE into the creature stage");
    this.saveRun(true); // no Continue for a lineage that left the water
    this.allowSave = false;
    shell.stopGame();
    shell.startGame("creature"); // stage 3 exists now (docs/stages/03-creature.md)
  }

  // ---- pick up where you left off (2026-11-09) ----------------------------------------------------------------
  /** The run in the save slot, applied over the fresh start (lineage, debug starts); null when there is none. */
  private loadRun(): AqRun | null {
    try {
      const r = unpackRun(shell.saves.load(RUN_SLOT).envelope?.data);
      if (r.problems.length) Log.warn(LOG, `saved run: ${r.problems.join("; ")}`);
      if (!r.run) return null;
      const run = r.run;
      this.me = run.me;
      this.me = { ...this.me, hp: Math.min(this.me.hp, maxHp(this.me)), stamina: Math.min(this.me.stamina, maxStamina(this.me)) };
      this.thickness = run.me.thickness ?? average(run.pop);
      Object.assign(this, { tempC: run.tempC, pop: run.pop, causes: run.causes, kills: run.kills, deaths: run.deaths, breaches: run.breaches });
      this.temper = { ...run.temper };
      this.allowSave = true;
      Log.info(LOG, `CONTINUE map ${MAPS[run.map].id}, form ${run.me.form}, generation ${run.pop.generation}`);
      return run;
    } catch (err) {
      Log.warn(LOG, `could not read the saved run: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  /** Autosave: on a new map, each generation, every AQ.save.everyS, after a death and on leaving. Never mid-river. */
  private saveRun(finished = false): void {
    if (!this.allowSave || (this.run && !finished)) return;
    try {
      const data = finished ? { kind: "aquatic_run", v: 1, finished: true } : packRun({
        map: this.mapIndex, me: { ...this.me, thickness: this.thickness }, tempC: this.tempC, pop: this.pop, causes: this.causes,
        temper: this.temper, kills: this.kills, deaths: this.deaths, breaches: this.breaches,
      });
      shell.saves.save(RUN_SLOT, data as Parameters<typeof shell.saves.save>[1]);
      Log.debug(LOG, `SAVED run (${finished ? "finished" : MAPS[this.mapIndex].id})`);
    } catch (err) {
      Log.warn(LOG, `could not save the run: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private passGeneration(): void {
    const g = nextGeneration(this.pop, this.tempC, AQ.population, this.rng);
    this.pop = g.population;
    this.kin.forEach((k, i) => (k.thickness = this.pop.thickness[i] ?? k.thickness));
    this.thickness = g.after;
    this.causes.push(g.cause);
    this.genLeft = AQ.population.generationS;
    this.sfx.play("evolve");
    Log.info(LOG, `GENERATION ${this.pop.generation}: ${g.cause}`);
    this.saveRun();
    if (this.mode === "lens") this.renderLensPanel();
    else this.hud.notice(`${g.cause} ${shell.i18n.t("aq.body_now", { what: describeBody(g.after) })}`, 9); // at the bottom (2026-11-08)
  }

  // ---- the frame --------------------------------------------------------------------------------
  update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, MAX_DT) * shell.settings.access.game_speed;
    const playing = shell.topId === "play"; // presses made on the menus wait until the play screen is up
    const inp = shell.input;
    this.hud.tick(dt);
    this.sfx.update(shell.settings.audio);
    this.updateLook();
    this.syncGardener();
    this.musicAndBanner();
    if (this.hud.blackedOut) { // a death: the world waits behind the black, then fades in on the relative
      if (this.run) this.drawRiver(0);
      else this.drawBehind(0);
      return;
    }
    if (this.admin.isOpen) { // the world waits while the admin panel is open
      if (playing) this.admin.input({ up: inp.takePress("ui_up"), down: inp.takePress("ui_down"), left: inp.takePress("ui_left"), right: inp.takePress("ui_right"), accept: inp.takePress("ui_accept") }, this.adminState());
      this.admin.render(this.adminState());
      if (this.mode === "lens") this.drawLens();
      else if (this.run) this.drawRiver(0);
      else this.drawBehind(0);
      return;
    }

    if (this.mode === "reveal") {
      if (this.autoplay ? (this.pilotT += dt) > 1.5 : playing && (inp.takePress("ui_accept") || inp.takePress("interact"))) this.closeReveal();
      if (this.run) this.drawRiver(dt);
      else this.drawBehind(dt);
      return;
    }
    if (this.mode === "cutscene") { this.cutsceneFrame(dt, playing); return; }
    if (this.mode === "river") { this.riverFrame(dt, playing); return; }
    if (this.mode === "lens") {
      if (this.autoplay) this.pilotLens(dt);
      else if (playing) {
        if (inp.takePress("ui_left") || inp.takePress("move_left")) this.setTemp(-AQ.lens.tempStep);
        if (inp.takePress("ui_right") || inp.takePress("move_right")) this.setTemp(AQ.lens.tempStep);
        if (inp.takePress("ui_accept")) this.passGeneration();
        if (inp.takePress("lens")) this.closeLens();
      }
      if (this.mode === "lens") this.drawLens();
      else this.drawBehind(dt);
      return;
    }

    if (playing && !this.autoplay) {
      if (inp.takePress("lens")) { this.openLens(); this.drawLens(); return; }
      this.panelInput();
      if (this.evolveReady() && !this.panel.isOpen && inp.takePress("ui_accept")) { this.evolveOut(); return; }
    }
    this.steer(dt, playing);
    if (this.mode !== "swim") return; // the river took you
    this.seabed(dt);
    this.eat();
    this.moveCritters(dt);
    this.moveSharks(dt);
    this.contacts();
    this.sharkContacts();
    this.tickItems(dt);
    this.tickTimers(dt);
    this.panel.render(this.me);
    this.drawBehind(dt);
  }

  private adminState() {
    return { temperament: { ...this.temper }, form: this.me.form, look: this.lookName, invincible: this.invincible };
  }

  /** Admin: set a temperament (not saved); aggressive drives the shark look at once. */
  private adminTemper(k: TemperamentKind, v: number): void {
    this.temper[k] = v;
    Log.info(LOG, `ADMIN ${k} ${Math.round(v * 100)} %`);
  }

  /** Admin: go to a map or a river run (you become at least the form it is for). */
  private adminGoTo(d: Destination): void {
    if (this.run) { for (const o of this.riverObjs) o.spr.destroy(); this.riverObjs = []; this.run = null; this.rb = null; }
    const map = d === "pond" || d === "river1" ? 0 : d === "lake" || d === "river2" ? 1 : 2;
    const form = d === "pond" ? 1 : d === "river1" || d === "lake" ? 2 : 3;
    this.me = { ...this.me, form: Math.max(this.me.form, form) };
    this.me = { ...this.me, hp: maxHp(this.me), stamina: maxStamina(this.me) };
    this.mode = "swim";
    this.lensBg.setVisible(false);
    this.hud.hidePanel();
    this.buildMap(map, "start");
    if (d === "river1" || d === "river2") this.startRiver(d === "river1" ? 0 : 1);
    this.admin.toggle();
    Log.info(LOG, `ADMIN go to ${d}`);
  }

  /**
   * The body follows the temperaments (2026-11-08): the strongest picks the family (shark, armoured, streamlined),
   * its strength the step. A change is announced (pillar 2: see why it changed).
   */
  private updateLook(announce = true): void {
    const scores = lookScores(this.temper, this.me, this.kills, this.breaches);
    const b = bodyLook(scores);
    const row = this.forceLook ?? b.row;
    if (row !== this.look && announce) {
      this.hud.toast(shell.i18n.t(row === "0" ? "aq.look_plain" : `aq.look_${b.family}`), 5);
      Log.info(LOG, `LOOK ${this.look} -> ${row} (${b.family} ${b.tier}: aggressive ${scores.aggressive.toFixed(2)}, cautious ${scores.cautious.toFixed(2)}, adaptable ${scores.adaptable.toFixed(2)})`);
    }
    this.look = row;
    this.lookName = row === "0" ? "plain 0" : `${b.family} ${b.tier}`;
  }

  private panelInput(): void {
    const inp = shell.input;
    if (inp.takePress("interact")) this.panel.toggle(); // E, as in the cell stage
    if (!this.panel.isOpen) return;
    if (inp.takePress("ui_up")) this.panel.move(-1);
    if (inp.takePress("ui_down")) this.panel.move(1);
    if (inp.takePress("ui_accept")) this.tryBuy(this.panel.selected);
  }

  private tryBuy(stat: AqStat): void {
    const r = buyUpgrade(this.me, stat);
    if (!r.ok) {
      this.sfx.play("deny");
      this.hud.toast(r.reason === "max" ? shell.i18n.t("up.max") : shell.i18n.t(`up.need_${AQ_PAID_WITH[stat]}`));
      return;
    }
    this.me = r.creature;
    this.sfx.play("upgrade");
    this.hud.toast(shell.i18n.t("up.bought", { stat: shell.i18n.t(`up.${stat}`), lvl: this.me.ups[stat] }));
    Log.info(LOG, `UPGRADE ${stat} -> ${this.me.ups[stat]}`);
  }

  // ---- you ----------------------------------------------------------------------------------------
  private readInput(playing: boolean, dt: number): Pilot {
    if (this.autoplay) return this.mode === "river" ? this.pilotRiver() : this.pilot(dt);
    if (!playing) return { s: { turn: 0, push: 0, rise: 0 }, doJump: false, doDash: false };
    const inp = shell.input;
    const arrows = !this.panel.isOpen; // the panel borrows the arrow keys
    const down = (a: string) => inp.isDown(`move_${a}`) || (arrows && inp.isDown(`ui_${a}`));
    return {
      s: {
        turn: (down("right") ? 1 : 0) - (down("left") ? 1 : 0),
        push: down("up") ? 1 : down("down") ? -1 : 0,
        rise: (inp.isDown("rise") ? 1 : 0) - (inp.isDown("sink") ? 1 : 0),
      },
      doJump: inp.takePress("jump"),
      doDash: inp.takePress("dash"),
    };
  }

  /** Shift: cruise <-> full speed. Full speed needs at least AQ.stamina.minFast stamina to start. */
  private togglePace(): void {
    if (!this.wantFast && !canGoFast(this.me)) { this.tired("aq.out_of_breath"); return; }
    this.wantFast = !this.wantFast;
  }

  /** Not enough stamina for a dash or a breach (they need half). */
  private tired(key = "aq.tired"): void {
    this.sfx.play("deny");
    if (this.tiredToastCd > 0) return;
    this.tiredToastCd = 3;
    this.hud.toast(shell.i18n.t(key), 2);
  }

  private mouthOpen(): boolean {
    return this.map.exitForm !== null && this.me.form >= this.map.exitForm;
  }

  private steer(dt: number, playing: boolean): void {
    const p = this.readInput(playing, dt);
    if (playing && !this.autoplay && shell.input.takePress("pace")) this.togglePace();
    if (this.wantFast && this.me.stamina <= 0) this.wantFast = false; // at 0 you drop to cruise on your own
    const sp = paceSpeed(this.me, this.wantFast, p.s.push > 0);
    this.pace = sp.pace;
    this.me = stepStamina(this.me, sp.pace, dt, this.climate.staminaRegen);
    const full = movement(this.me);
    const m = { ...full, maxSpeed: full.maxSpeed * sp.mult * (this.slowLeft > 0 ? AQ.seabed.weedSlow : 1) };
    const breachNow = !this.av.airborne && this.av.z >= this.water.surface - this.water.breachBand;
    if (p.doJump && breachNow && !canAbility(this.me)) { this.tired(); p.doJump = false; }
    if (p.doJump) {
      const j = jump(this.av, this.water);
      if (j === "breach") { this.me = spendAbility(this.me); this.breaches++; }
      if (j === "breach") {
        this.sfx.play("evolve");
        Log.info(LOG, "BREACH");
        const atMouth = Math.hypot(this.av.x - this.mouth.x, this.av.y - this.mouth.y) < AQ.mouth.radius;
        if (atMouth && this.mouthOpen()) { const i = this.mapIndex; this.playCutscene("toRiver", () => this.startRiver(i)); return; }
        if (atMouth && this.map.exitForm !== null) this.hud.toast(shell.i18n.t("aq.mouth_grow", { n: this.map.exitForm }), 3);
        else this.hud.toast(shell.i18n.t("aq.breach"), 1.2);
      } else if (j === "kick") this.sfx.play("choose");
    }
    if (p.doDash && this.av.dashCd <= 0 && !this.av.airborne) {
      if (!canAbility(this.me)) this.tired();
      else if (dash(this.av, full)) { this.me = spendAbility(this.me); this.sfx.play("bump"); Log.debug(LOG, "DASH"); }
    }
    if (steerAvatar(this.av, p.s, dt, m, this.water) === "splash") {
      this.sfx.play("pop");
      this.cameras.main.shake(140, (6 * effectiveShake(shell.settings)) / this.scale.width);
    }
    keepInside(this.av, 20, this.map.width, this.map.width);
    this.avatarSpr.setRotation(-p.s.turn * 0.12);
  }

  /** Rocks push you off (no damage); seaweed tangles you and slows you for a moment (BAMF69 2026-11-08). */
  private seabed(dt: number): void {
    this.slowLeft = Math.max(0, this.slowLeft - dt);
    this.weedToastCd = Math.max(0, this.weedToastCd - dt);
    this.bumpCd = Math.max(0, this.bumpCd - dt);
    if (this.av.airborne) return;
    const e = seabedContact({ x: this.av.x, y: this.av.y, z: this.av.z, size: bodySize(this.me) }, this.items, AQ.seabed);
    if (e.push) {
      const n = { x: e.push.x / AQ.seabed.rockBounce, y: e.push.y / AQ.seabed.rockBounce };
      const vn = this.av.vx * n.x + this.av.vy * n.y;
      if (vn < 0) { this.av.vx -= n.x * vn * 2; this.av.vy -= n.y * vn * 2; } // bounce: reflect the part going into it
      this.av.vx += n.x * AQ.seabed.rockBounce * dt * 4;
      this.av.vy += n.y * AQ.seabed.rockBounce * dt * 4;
      if (vn < -40 && this.bumpCd <= 0) { this.bumpCd = 0.4; this.sfx.play("bump"); }
    }
    if (e.tangled) {
      if (this.slowLeft <= 0 && this.weedToastCd <= 0) { this.hud.toast(shell.i18n.t("aq.tangled"), 1.5); this.weedToastCd = 6; }
      this.slowLeft = AQ.seabed.weedSlowS;
    }
  }

  /** The seabed's look, one per map (BAMF69 2026-11-08): pond mud and pebbles, lake stone slabs and gravel, coast sand ripples. */
  private makeDecals(): void {
    const W = this.map.width;
    const add = (n: number, wMin: number, wMax: number, aspect: number, colors: number[], alpha: number) => {
      for (let i = 0; i < n; i++) {
        this.decals.push({ x: this.rng() * W, y: this.rng() * W, w: wMin + this.rng() * (wMax - wMin), aspect, color: colors[Math.floor(this.rng() * colors.length)], alpha: alpha * (0.6 + 0.4 * this.rng()) });
      }
    };
    this.decals = [];
    const k = (W / 1800) ** 2;
    if (this.map.id === "pond") {
      add(Math.round(220 * k), 60, 150, 1, [0x2a3a26, 0x34442a, 0x1e2e24], 0.45); // dark mud patches
      add(Math.round(320 * k), 5, 10, 1, [0x6a6450, 0x7a7058, 0x5a5a48], 0.8); // pebbles
    } else if (this.map.id === "lake") {
      add(Math.round(180 * k), 70, 170, 0.8, [0x1a2a34, 0x22323c, 0x14222c], 0.55); // dark stone slabs
      add(Math.round(420 * k), 4, 9, 1, [0x4a5a64, 0x3a4a54, 0x5a6a70], 0.75); // gravel
    } else {
      add(Math.round(320 * k), 120, 240, 0.18, [0x7a7a5a, 0x8a8a66, 0x6a6a50], 0.5); // sand ripples
      add(Math.round(140 * k), 5, 9, 1, [0xc8bc98, 0xb0a888, 0xd8ccb0], 0.85); // shells
    }
  }

  private eat(): void {
    const reach = AQ.eatRadius + bodySize(this.me) * 0.3;
    for (const it of this.items) {
      if (!it.spr.active || it.kind === "rock" || it.kind === "weed" || it.kind === "log") continue;
      if (it.kind === "bloom") { this.hitBloom(it); continue; }
      if (Math.hypot(it.x - this.av.x, it.y - this.av.y, it.z - this.av.z) > reach) continue;
      if (isPart(it.kind)) { this.pickPart(it.kind); it.spr.destroy(); continue; }
      if (this.eatThing(it.kind)) it.spr.destroy();
    }
    this.items = this.items.filter((i) => i.spr.active);
  }

  /** A great kelp bloom: ram it (swim into it fast, or dash) to break it; it spills big plant pods. */
  private hitBloom(it: Item): void {
    it.hitCd = Math.max(0, (it.hitCd ?? 0) - 1 / 60);
    const dx = it.x - this.av.x, dy = it.y - this.av.y;
    const d = Math.hypot(dx, dy);
    if (d > it.size * 0.4 + bodySize(this.me) * 0.4 || this.av.z > it.size || (it.hitCd ?? 0) > 0) return;
    const into = (this.av.vx * dx + this.av.vy * dy) / Math.max(1, d);
    if (into < AQ.stats.rammingSpeed && this.av.dashLeft <= 0) return;
    it.hitCd = AQ.bloom.hitCdS;
    it.hp = (it.hp ?? 0) - ramDamage(this.me) * (this.av.dashLeft > 0 ? AQ.stats.dashRamMult : 1);
    this.av.vx -= (dx / Math.max(1, d)) * 120;
    this.av.vy -= (dy / Math.max(1, d)) * 120;
    it.spr.setTint(0xfff0a0);
    this.sfx.play("bump");
    if ((it.hp ?? 0) > 0) return;
    it.spr.destroy();
    for (let i = 0; i < AQ.bloom.pods; i++) {
      const a = (i / AQ.bloom.pods) * Math.PI * 2;
      this.addItem("pod", { x: it.x + Math.cos(a) * 40, y: it.y + Math.sin(a) * 40, z: 15 + this.rng() * 40 }, 40);
    }
    this.sfx.play("pop");
    this.hud.toast(shell.i18n.t("aq.bloom_open"), 3);
    Log.info(LOG, "BLOOM broken open");
  }

  /** Eat a food kind by your diet; false when you cannot (it stays). */
  private eatThing(kind: string): boolean {
    const food: FoodKind = kind.startsWith("meat") ? "meat" : "algae";
    const values: Record<string, number> = AQ.food;
    const r = eatFood(this.me, food, values[kind] ?? AQ.food.algae);
    if (!r.eaten) { this.cantEat(); return false; }
    this.gotFood(r);
    this.sfx.play(food === "meat" ? "eat_meat" : "eat_algae");
    Log.debug(LOG, `EAT ${kind} (food ${Math.floor(this.me.food)})`);
    return true;
  }

  private gotFood(r: { creature: AqCreature; evolved: boolean }): void {
    this.me = r.creature;
    if (!r.evolved) return;
    this.sfx.play("evolve");
    const open = this.map.exitForm !== null && this.me.form >= this.map.exitForm && this.mode === "swim";
    const key = this.evolveReady() ? "aq.evolved_last" : this.finalFormAway() ? "aq.evolved_last_away" : open ? "aq.evolved_mouth" : "aq.evolved";
    this.hud.toast(shell.i18n.t(key, { n: this.me.form, slots: slots(this.me) }), 6);
    Log.info(LOG, `EVOLVE form ${this.me.form}${open ? " (the river mouth opens)" : ""}`);
  }

  private pickPart(p: AqPart): void {
    const r = addPart(this.me, p);
    this.me = r.creature;
    this.sfx.play("part");
    const name = shell.i18n.t(`aq.part_${p}`);
    if (r.kind === "added") this.hud.toast(shell.i18n.t("aq.got_part", { part: name }));
    else if (r.kind === "replaced") this.hud.toast(shell.i18n.t("aq.swapped_part", { part: name, lost: shell.i18n.t(`aq.part_${r.lost}`) }));
    else this.hud.toast(shell.i18n.t("aq.dup_part", { part: name }));
    Log.info(LOG, `PART ${p} (${r.kind}); parts ${this.me.parts.join(", ") || "none"}`);
  }

  private cantEat(): void {
    if (this.cantEatCd > 0) return;
    this.cantEatCd = 4;
    this.hud.toast(shell.i18n.t("aq.cant_eat", { diet: this.me.diet }));
  }

  // ---- the lake's creatures --------------------------------------------------------------------
  private wanderDir(c: Critter, dt: number): { x: number; y: number } {
    c.turnIn -= dt;
    if (c.turnIn <= 0) {
      c.heading += (this.rng() - 0.5) * 2;
      c.turnIn = 1 + this.rng() * 2;
    }
    return { x: Math.cos(c.heading), y: Math.sin(c.heading) };
  }

  private swimTo(c: Critter, dir: { x: number; y: number }, targetZ: number, speed: number, dt: number): void {
    swim(c, dir.x * 0.75, dir.y * 0.75, dt, { accel: 260, maxSpeed: speed, drag: 1.3 });
    keepInside(c, 20, this.map.width, this.map.width);
    c.vz += Phaser.Math.Clamp((targetZ - c.z) / 15, -1, 1) * 120 * dt;
    c.vz *= Math.exp(-2 * dt);
    c.z = Phaser.Math.Clamp(c.z + c.vz * dt, AQ.water.floorZ, this.map.surface - 4);
    if (Math.hypot(c.vx, c.vy) > 6) c.heading = Math.atan2(c.vy, c.vx);
  }

  private alive = (c: Critter) => c.respawnIn <= 0;

  private moveCritters(dt: number): void {
    const you = { x: this.av.x, y: this.av.y, z: this.av.z };
    this.updateSchools(dt);
    // the deepmaw sees you and every other fish (BAMF69 2026-11-08: fish fight fish)
    const fish: Seen[] = this.critters.filter((c) => this.alive(c) && c.kind !== "deepmaw").map((c) => ({ id: c.id, x: c.x, y: c.y }));
    for (const c of this.critters) {
      c.biteCd = Math.max(0, c.biteCd - dt);
      c.hitCd = Math.max(0, c.hitCd - dt);
      c.provokedLeft = Math.max(0, c.provokedLeft - dt);
      if (!this.alive(c)) {
        if ((c.respawnIn -= dt) <= 0) this.respawn(c);
        continue;
      }
      if (c.brain) { this.deepmawThink(c, dt, [{ id: PLAYER_ID, x: you.x, y: you.y }, ...fish]); continue; }
      const k = this.K(c.kind as AqKind);
      const school = c.school >= 0 ? this.schools[c.school] : null;
      if (school?.target) { // swarming: straight at the target in 3D (v3 circled overhead: too slow to change depth)
        const t = school.target === "you" ? { ...you, size: bodySize(this.me) } : school.target;
        this.pursue(c, t, k.speed * 1.3, dt);
        if (c.biteCd <= 0 && Math.hypot(t.x - c.x, t.y - c.y, t.z - c.z) < (k.size + t.size) * 0.55) {
          c.biteCd = AQ.schools.biteCdS;
          if (school.target === "you") {
            this.takeDamage(AQ.schools.bite * this.map.mult.bite, "darters");
            if (this.me.hp < maxHp(this.me) * AQ.schools.breakOffAt) { // they break off: a chance to recover (2026-11-08)
              school.target = null;
              school.cooldown = AQ.schools.breakOffRestS;
              for (const m of this.critters) if (m.school === c.school) { m.heading += Math.PI; m.turnIn = 2; }
              Log.info(LOG, `SWARM school ${c.school} breaks off (you are low)`);
            }
          } else this.hurt(school.target, AQ.schools.bite, "darters");
        }
        continue;
      }
      let wander = this.wanderDir(c, dt);
      if (school) { // keep with the school: drift toward its centre when straying (a school, not scattered fish)
        const dx = school.centre.x - c.x, dy = school.centre.y - c.y, d = Math.hypot(dx, dy);
        if (d > AQ.schools.spread) wander = { x: wander.x * 0.3 + (dx / d) * 0.7, y: wander.y * 0.3 + (dy / d) * 0.7 };
      }
      const it = critterIntent(k, c, you, c.provokedLeft > 0, wander);
      this.swimTo(c, it.dir, school && it.mode === "wander" ? school.centre.z : it.targetZ, k.speed * it.speedMult, dt);
    }
    for (const k of this.kin) this.swimTo(k, this.wanderDir(k, dt), k.z, AQ.population.kinSpeed, dt);
  }

  /** Head straight for a target in 3D, easing in: no orbiting around it (the swarm fix, 2026-11-08). */
  private pursue(c: Critter, t: { x: number; y: number; z: number }, speed: number, dt: number): void {
    const dx = t.x - c.x, dy = t.y - c.y, dz = t.z - c.z;
    const d = Math.hypot(dx, dy, dz) || 1;
    const v = Math.min(speed, d * 4); // slow down on arrival instead of overshooting
    const k = Math.min(1, dt * 6);
    c.vx += ((dx / d) * v - c.vx) * k;
    c.vy += ((dy / d) * v - c.vy) * k;
    c.vz += ((dz / d) * v - c.vz) * k;
    c.x += c.vx * dt; c.y += c.vy * dt;
    c.z = Phaser.Math.Clamp(c.z + c.vz * dt, AQ.water.floorZ, this.map.surface - 4);
    keepInside(c, 20, this.map.width, this.map.width);
    if (Math.hypot(c.vx, c.vy) > 6) c.heading = Math.atan2(c.vy, c.vx);
  }

  /** Darter schools sometimes pick a fight with the nearest bigger fish, or you (BAMF69 2026-11-08). */
  private updateSchools(dt: number): void {
    this.schools.forEach((s, i) => {
      const members = this.critters.filter((c) => c.school === i && this.alive(c));
      if (members.length) {
        s.centre = { x: 0, y: 0, z: 0 };
        for (const m of members) { s.centre.x += m.x / members.length; s.centre.y += m.y / members.length; s.centre.z += m.z / members.length; }
      }
      if (s.target) {
        s.left -= dt;
        if (s.left <= 0 || (s.target !== "you" && !this.alive(s.target)) || (s.target === "you" && this.mode !== "swim")) { s.target = null; s.cooldown = this.schoolWait(); }
        return;
      }
      if ((s.cooldown -= dt) > 0) return;
      if (!members.length) { s.cooldown = 3; return; }
      const centre = s.centre;
      const victims: (Critter | { id: number; x: number; y: number; z: number })[] = this.critters.filter((c) => this.alive(c) && (c.kind === "finray" || c.kind === "spinefish" || c.kind === "shellback"));
      const youInRange = Math.hypot(this.av.x - centre.x, this.av.y - centre.y, this.av.z - centre.z) < AQ.schools.range;
      // you are in range: an even chance (AQ.schools.youChance) they come for you instead of the nearest fish
      const youOk = this.me.hp >= maxHp(this.me) * AQ.schools.breakOffAt; // not while you are recovering
      const pick = youInRange && youOk && this.mode === "swim" && this.rng() < AQ.schools.youChance ? { id: PLAYER_ID } : schoolTarget(centre, victims, AQ.schools.range);
      s.target = !pick ? null : pick.id === PLAYER_ID ? "you" : (pick as Critter);
      if (s.target) { s.left = AQ.schools.swarmS; Log.info(LOG, `SWARM school ${i} -> ${s.target === "you" ? "you" : s.target.kind}`); }
      else s.cooldown = 3;
    });
  }

  /** Another fish hurts this one; at 0 hp it dies and drops its meat and part (every death drops loot). */
  private hurt(c: Critter, dmg: number, by: string): void {
    c.hp -= dmg;
    c.hitCd = Math.max(c.hitCd, 0.25);
    if (c.hp > 0) return;
    this.kill(c, false);
    Log.info(LOG, `FISHKILL ${by} killed ${c.kind}`);
  }

  /** The deepmaw: the gulper's mind. It hunts you or any fish, rests after a meal, tires of chasing you. */
  private deepmawThink(d: Critter, dt: number, seen: Seen[]): void {
    const before = d.brain!;
    d.brain = think(before, d, seen, dt, AQ.deepmaw.brain);
    if (d.brain.targetId === PLAYER_ID && before.targetId !== PLAYER_ID) {
      Log.info(LOG, `HUNT player (deepmaw ${d.id})`);
      if (this.huntToastCd <= 0) { this.hud.toast(shell.i18n.t("aq.hunted")); this.huntToastCd = 8; }
    }
    const tid = d.brain.targetId;
    const target = tid === null ? null : tid === PLAYER_ID ? this.av : this.critters.find((c) => c.id === tid && this.alive(c)) ?? null;
    const resting = d.brain.state === "sated" || d.brain.state === "tired";
    const k = this.K("deepmaw");
    const to = target ? { x: target.x - d.x, y: target.y - d.y } : this.wanderDir(d, dt);
    const len = Math.hypot(to.x, to.y) || 1;
    this.swimTo(d, { x: to.x / len, y: to.y / len }, target ? target.z : d.z, k.speed * (resting ? AQ.deepmaw.restSpeedMult : 1), dt);
    if (!target || d.brain.state !== "hunt" || tid === PLAYER_ID) return;
    const prey = target as Critter;
    if (Math.hypot(prey.x - d.x, prey.y - d.y, prey.z - d.z) > (k.size + prey.size) * 0.45 + 6) return;
    if (prey.kind === "darter") this.kill(prey, false); // swallowed whole
    else this.hurt(prey, k.bite * AQ.deepmawVsFish, "deepmaw"); // bitten: it may survive, or die and drop its part
    d.brain = ate(d.brain, AQ.deepmaw.brain);
  }

  private respawn(c: Critter): void {
    const k = this.K(c.kind as AqKind);
    const home = c.school >= 0 ? this.schools[c.school]?.centre : null; // a darter rejoins its school
    Object.assign(c, home && home.x ? { x: home.x + (this.rng() - 0.5) * 80, y: home.y + (this.rng() - 0.5) * 80 } : this.spot(500), { z: k.zMin + this.rng() * (k.zMax - k.zMin), vx: 0, vy: 0, vz: 0, hp: k.hp, provokedLeft: 0 });
    if (c.brain) c.brain = newBrain();
  }

  /** The sharks: think (sharks.ts), then hunt you, peel off, or roam. */
  private moveSharks(dt: number): void {
    const you = { x: this.av.x, y: this.av.y, z: this.av.z, airborne: this.av.airborne, hpFrac: this.me.hp / maxHp(this.me) };
    for (const sh of this.sharks) {
      sh.biteCd = Math.max(0, sh.biteCd - dt);
      sh.hitCd = Math.max(0, sh.hitCd - dt);
      if (sh.respawnIn > 0) {
        if ((sh.respawnIn -= dt) <= 0) Object.assign(sh, this.spot(1200), { hp: sh.spec.hp, brain: newSharkBrain() });
        continue;
      }
      const before = sh.brain.mode;
      const spec = { ...sh.spec, sight: sh.spec.sight * this.climate.hunterSight };
      sh.brain = sharkThink(sh.brain, sh, you, dt, spec, sh.rules, SHARK_MIND);
      if (sh.brain.mode === "hunt" && before !== "hunt") {
        Log.info(LOG, `SHARK (${sh.rules.kind}) hunts you${you.hpFrac < 0.5 && sh.rules.relentlessLow ? " relentlessly" : ""}`);
      }
      const sp = sh.spec.speed * this.climate.hunterSpeed;
      const c = sh as unknown as Critter; // pursue / swimTo only need position, velocity and heading
      if (sh.brain.mode === "hunt") this.pursue(c, this.av, sp, dt);
      else if (sh.brain.mode === "rest") { // peel off: away from you
        const dx = sh.x - this.av.x, dy = sh.y - this.av.y, d = Math.hypot(dx, dy) || 1;
        this.swimTo(c, { x: dx / d, y: dy / d }, sh.z, sp * 0.7, dt);
      } else {
        sh.turnIn -= dt;
        if (sh.turnIn <= 0) { sh.heading += (this.rng() - 0.5) * 1.5; sh.turnIn = 2 + this.rng() * 3; }
        this.swimTo(c, { x: Math.cos(sh.heading), y: Math.sin(sh.heading) }, sh.z, sp * 0.45, dt);
      }
    }
  }

  /** You and a shark touching: a hunting shark bites (then peels off); your ram hurts it (it has a lot of health). */
  private sharkContacts(): void {
    const myR = bodySize(this.me) * 0.45;
    for (const sh of this.sharks) {
      if (sh.respawnIn > 0 || sh.hitCd > 0) continue;
      const dx = sh.x - this.av.x, dy = sh.y - this.av.y, dz = sh.z - this.av.z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist > myR + sh.spec.size * 0.4) continue;
      sh.hitCd = 0.5;
      const ramming = (this.av.vx * dx + this.av.vy * dy + this.av.vz * dz) / Math.max(1, dist) >= AQ.stats.rammingSpeed || this.av.dashLeft > 0;
      if (ramming) {
        sh.hp -= ramDamage(this.me) * (this.av.dashLeft > 0 ? AQ.stats.dashRamMult : 1);
        this.sfx.play("chomp_you");
        if (sh.hp <= 0) {
          sh.respawnIn = 60;
          sh.spr.setVisible(false);
          this.kills += 3;
          for (let i = 0; i < sh.spec.meat; i++) this.addItem("meatL", { x: sh.x + (this.rng() - 0.5) * 80, y: sh.y + (this.rng() - 0.5) * 80, z: sh.z }, AQ.meatLifeS * 2);
          Log.info(LOG, `KILL shark (${sh.rules.kind})`);
          continue;
        }
      }
      if (sh.brain.mode === "hunt" && sh.biteCd <= 0) {
        sh.biteCd = SHARK_MIND.biteCooldownS;
        sh.brain = sharkBit(sh.brain, SHARK_MIND);
        this.av.vx -= (dx / Math.max(1, dist)) * 260;
        this.av.vy -= (dy / Math.max(1, dist)) * 260;
        this.takeDamage(sh.spec.bite, `shark (${sh.rules.kind})`);
      }
    }
  }

  /** You and the creatures touching: swimming into one fast (or dashing) is your ram; otherwise a biter bites you. */
  private contacts(): void {
    const myR = bodySize(this.me) * 0.45;
    for (const c of this.critters) {
      if (!this.alive(c) || c.hitCd > 0) continue;
      const k = this.K(c.kind as AqKind);
      const dx = c.x - this.av.x, dy = c.y - this.av.y, dz = c.z - this.av.z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist > myR + k.size * 0.45) continue;
      const into = (this.av.vx * dx + this.av.vy * dy + this.av.vz * dz) / Math.max(1, dist);
      const ramming = into >= AQ.stats.rammingSpeed || this.av.dashLeft > 0;
      c.hitCd = 0.4;
      if (c.kind === "darter") { // a darter is a mouthful if your diet takes meat; else it bounces off
        const r = eatFood(this.me, "meat", AQ.food.darterWhole);
        if (r.eaten) { this.gotFood(r); this.sfx.play("eat_meat"); this.kill(c, true); }
        else { this.cantEat(); this.knock(c, 0.5); }
        continue;
      }
      if (ramming) {
        c.hp -= ramDamage(this.me) * (this.av.dashLeft > 0 ? AQ.stats.dashRamMult : 1);
        c.provokedLeft = 6;
        this.knock(c, 1);
        this.sfx.play("chomp_you");
        Log.debug(LOG, `RAM ${c.kind} hp ${Math.round(c.hp)}`);
        if (c.hp <= 0) { this.kill(c, true); continue; }
      }
      const hunting = c.brain ? c.brain.state === "hunt" && c.brain.targetId === PLAYER_ID : k.aggro > 0 || c.provokedLeft > 0;
      if (k.bite > 0 && c.biteCd <= 0 && hunting && !ramming) this.bitten(c, k.bite);
      else if (!ramming) this.knock(c, 0.5);
    }
  }

  private knock(c: Critter, strength: number): void {
    const dx = c.x - this.av.x, dy = c.y - this.av.y;
    const d = Math.hypot(dx, dy) || 1;
    const push = AQ.knockback * strength;
    c.vx = (dx / d) * push;
    c.vy = (dy / d) * push;
    this.av.vx -= (dx / d) * push * 0.5;
    this.av.vy -= (dy / d) * push * 0.5;
  }

  private bitten(c: Critter, bite: number): void {
    c.biteCd = c.brain ? AQ.deepmaw.biteCooldownS : AQ.biteCooldownS;
    this.knock(c, c.brain ? 1.2 : 0.8);
    if (c.brain) c.brain = ate(c.brain, AQ.deepmaw.brain); // after a bite it backs off: your escape window (pillar 1)
    this.takeDamage(bite, c.kind);
  }

  private takeDamage(dmg: number, by: string): void {
    if (this.invincible) { this.flashLeft = 0.1; Log.debug(LOG, `HURT by ${by}: ignored (invincible)`); return; }
    const r = takeHit(this.me, dmg);
    this.me = r.creature;
    this.sfx.play(chompFor(by));
    this.cameras.main.shake(160, (Math.min(10, 3 + dmg / 3) * effectiveShake(shell.settings)) / this.scale.width);
    this.flashLeft = 0.18;
    Log.info(LOG, `HURT by ${by}: -${Math.round(r.damage)} hp (${Math.round(this.me.hp)}/${maxHp(this.me)})`);
    if (r.died) this.die();
  }

  /** A relative carries on: food progress and the newest part are lost (stakes up from the cell stage). */
  private die(): void {
    const r = dieAndCarryOn(this.me);
    this.me = r.creature;
    this.deaths++;
    if (this.mode === "river" && this.rb && this.run) { // in a river: back to its start
      this.rb = newRiverBody(this.run.spec);
    } else {
      const dist = (k: Critter) => Math.hypot(k.x - this.av.x, k.y - this.av.y);
      const heir = this.kin.reduce((b, k) => (dist(k) > dist(b) ? k : b), this.kin[0]); // the farthest relative: away from danger
      if (heir) {
        Object.assign(this.av, { x: heir.x, y: heir.y, z: heir.z, heading: heir.heading, vx: 0, vy: 0, vz: 0, airborne: false });
        this.thickness = heir.thickness;
        Object.assign(heir, this.spot(400));
      }
    }
    const part = r.lostPart ? shell.i18n.t("aq.died_part", { part: shell.i18n.t(`aq.part_${r.lostPart}`) }) : "";
    this.hud.clearToast();
    this.hud.blackout(shell.i18n.t("aq.died_v2", { part }), AQ.death.blackS, AQ.death.fadeS); // 2026-11-09: black, the words, fade in
    this.sfx.play("pop");
    Log.info(LOG, `DIED (${this.deaths}): a relative carries on; lost part ${r.lostPart ?? "none"}`);
    this.saveRun();
  }

  /** Every death drops the creature's meat and its part where it died (the cell stage's rule). */
  private kill(c: Critter, byYou: boolean): void {
    const k = this.K(c.kind as AqKind);
    c.respawnIn = k.respawnS;
    c.spr.setVisible(false);
    if (byYou) this.kills++;
    if (c.kind !== "darter") {
      for (let i = 0; i < k.meat; i++) { // its chunk size: the big enemies drop big meat
        this.addItem(k.chunk, { x: c.x + (this.rng() - 0.5) * 40, y: c.y + (this.rng() - 0.5) * 40, z: c.z + (this.rng() - 0.5) * 20 }, AQ.meatLifeS);
      }
      if (k.part) this.addItem(k.part, { x: c.x, y: c.y, z: c.z }, 45);
    }
    if (byYou) { this.sfx.play("pop"); Log.info(LOG, `KILL ${c.kind}${k.part ? ` (drops ${k.part})` : ""}`); }
  }

  private tickItems(dt: number): void {
    for (const it of this.items) {
      if (it.life === Infinity) continue;
      it.life -= dt;
      if (it.kind.startsWith("meat")) it.z = Math.max(4, it.z - 8 * dt); // meat sinks
      if (it.life <= 0) it.spr.destroy();
    }
    this.items = this.items.filter((i) => i.spr.active);
  }

  private tickTimers(dt: number): void {
    this.cantEatCd = Math.max(0, this.cantEatCd - dt);
    this.huntToastCd = Math.max(0, this.huntToastCd - dt);
    this.warnCd = Math.max(0, this.warnCd - dt);
    this.flashLeft = Math.max(0, this.flashLeft - dt);
    this.mouthToastCd = Math.max(0, this.mouthToastCd - dt);
    this.tiredToastCd = Math.max(0, this.tiredToastCd - dt);
    if (has(this.me, "gills")) this.me = heal(this.me, AQ.parts.gillsRegen * dt);
    this.genLeft -= dt;
    if (this.genLeft <= 0) this.passGeneration();
    if ((this.saveIn -= dt) <= 0) { this.saveIn = AQ.save.everyS; this.saveRun(); }
    if ((this.regrowIn -= dt) <= 0) {
      const food = this.climate.food; // warm water grows more, faster; cold water less, slower
      this.regrowIn = AQ.regrowS / food;
      if (this.items.filter((i) => i.kind === "algae").length < this.map.algae * food) this.addItem("algae", { ...this.spot(300), z: 0 });
      if (this.items.filter((i) => i.kind === "plankton").length < this.map.plankton * food) this.addItem("plankton", { ...this.spot(300), z: this.planktonZ() });
      if (this.items.filter((i) => i.kind === "bloom").length < Math.round(this.map.blooms * food) && this.rng() < 0.15 * food) this.addItem("bloom", { ...this.spot(400), z: 0 });
    }
  }

  // ---- the river runs (the minigame between maps) ---------------------------------------------------------
  private startRiver(i: number): void {
    this.riverIndex = i;
    const spec = RIVERS[i];
    this.run = makeRiver(spec, this.rng);
    this.rb = newRiverBody(spec);
    this.partSeen = false;
    this.panel.close();
    for (const c of [...this.critters, ...this.kin]) c.spr.setVisible(false);
    for (const it of this.items) it.spr.setVisible(false);
    for (const sh of this.sharks) sh.spr.setVisible(false);
    this.setPalette(RIVER_PALETTE);
    for (const o of this.riverObjs) o.spr.destroy();
    this.riverObjs = [];
    for (const t of this.run.things) {
      const spr = t.kind === "spinefish"
        ? this.add.sprite(0, 0, "aspine").play(animKey("aspine", "swim", "front")).setVisible(false)
        : this.propSprite(t.kind === "part" ? spec.part : t.kind === "rock" ? "rock" : (t.kind as ItemKind));
      if (t.kind === "rock") spr.setOrigin(0.5, 0.5);
      this.riverObjs.push({ t, spr, gone: false });
    }
    for (let s = 0; s < spec.length + 400; s += 70) { // the banks: weed and rocks along both sides
      for (const side of [-1, 1]) {
        const kind: ItemKind = this.rng() < 0.5 ? "weed" : "rock";
        this.riverObjs.push({ t: { kind: "bank", s: s + this.rng() * 40, x: side * (spec.width / 2 + 50 + this.rng() * 40), z: 0, r: 0 }, spr: this.propSprite(kind), gone: false });
      }
    }
    this.specks = Array.from({ length: 700 }, () => ({ x: (this.rng() - 0.5) * (spec.width + 160), y: -this.rng() * (spec.length + 600) }));
    this.mode = this.mode === "reveal" ? "reveal" : "river";
    this.hud.toast(shell.i18n.t("aq.river_start"), 6);
    this.sfx.play("evolve");
    Log.info(LOG, `RIVER ${i + 1} start (${spec.length} px, part ${spec.part})`);
  }

  private riverFrame(dt: number, playing: boolean): void {
    const run = this.run!, rb = this.rb!, spec = run.spec;
    const p = this.readInput(playing, dt);
    const m = movement(this.me);
    this.av.dashCd = Math.max(0, this.av.dashCd - dt);
    this.riverHitCd = Math.max(0, this.riverHitCd - dt);
    this.flashLeft = Math.max(0, this.flashLeft - dt);
    this.tiredToastCd = Math.max(0, this.tiredToastCd - dt);
    if (playing && !this.autoplay && shell.input.takePress("pace")) this.togglePace();
    if (this.wantFast && this.me.stamina <= 0) this.wantFast = false;
    this.kickCd = Math.max(0, this.kickCd - dt);
    // swimming with the current: full speed (W, fast pace) drains stamina; otherwise the river does the work
    this.pace = p.s.push > 0 && this.wantFast && this.me.stamina > 0 ? "fast" : p.s.push > 0 ? "cruise" : "still";
    this.me = stepStamina(this.me, this.pace, dt, this.climate.staminaRegen);
    if (p.s.push > 0 && this.pace !== "fast") p.s.push *= AQ.stamina.cruiseMult;
    if (p.doJump && rb.z >= spec.depth - 16 && !rb.airborne) {
      if (!canAbility(this.me)) this.tired();
      else if (riverJump(rb, spec, this.water.breachSpeed)) { this.me = spendAbility(this.me); this.sfx.play("evolve"); Log.debug(LOG, "RIVER JUMP"); }
    } else if (p.doJump && !rb.airborne && this.kickCd <= 0) { // deeper down, Space is a quick kick up (free)
      rb.vz += AQ.water.kick * 1.4;
      this.kickCd = AQ.water.kickCdS * 0.6;
      this.sfx.play("choose");
    }
    if (p.doDash && this.av.dashCd <= 0) {
      if (!canAbility(this.me)) this.tired();
      else { this.me = spendAbility(this.me); rb.dashLeft = m.dashS; this.av.dashCd = m.dashCdS; this.sfx.play("bump"); }
    }
    if (riverStep(rb, p.s, dt, spec, m.dashSpeed)) this.sfx.play("pop");
    Object.assign(this.av, { x: rb.x, y: -rb.s, z: rb.z, heading: -Math.PI / 2, airborne: rb.airborne, dashLeft: rb.dashLeft });
    this.avatarSpr.setRotation(-p.s.turn * 0.15);
    // rocks and logs: a hit hurts and stops you dead in the current
    const me = bodySize(this.me) * 0.35;
    const hit = this.riverHitCd <= 0 ? hitAt(run, rb.s, rb.x, rb.z, me) : null;
    if (hit) {
      this.riverHitCd = 0.8;
      rb.speed *= 0.3;
      rb.vx = Math.sign(rb.x - hit.x || 1) * 180;
      Log.info(LOG, `RIVER HIT ${hit.kind}`);
      this.takeDamage(spec.hit, hit.kind);
      if (this.mode !== "river") return;
    }
    // food, the part, spinefish
    for (const o of this.riverObjs) {
      if (o.gone || o.t.kind === "bank" || o.t.kind === "rock" || o.t.kind === "log") continue;
      const t = o.t;
      if (t.kind === "spinefish" && Math.abs(t.s - rb.s) < 200) t.x += Math.sign(rb.x - t.x) * 60 * dt; // it lunges across at you
      if (Math.hypot(t.s - rb.s, t.x - rb.x, t.z - rb.z) > me + t.r * (t.kind === "part" ? AQ.riverPartReach : 1)) continue;
      if (t.kind === "part") { this.pickPart(spec.part); o.gone = true; o.spr.destroy(); Log.info(LOG, `RIVER PART ${spec.part}`); }
      else if (t.kind === "spinefish") {
        o.gone = true; o.spr.destroy();
        if (rb.dashLeft > 0) { this.kills++; this.eatThing("meat"); this.sfx.play("pop"); }
        else this.takeDamage(KINDS.spinefish.bite, "spinefish");
      } else if (this.eatThing(t.kind)) { o.gone = true; o.spr.destroy(); }
    }
    if (rb.s >= spec.length) { this.playCutscene("fromRiver", () => this.endRiver()); return; }
    this.drawRiver(dt);
  }

  /**
   * The river's unique part, made impossible to miss (BAMF69 2026-11-08): shiny gold, spinning, sparkling, seen from
   * far past the fog, with a twinkle the moment it comes into view.
   */
  private drawGoldPart(cam: Camera, o: RiverObj): void {
    const { width: w, height: h } = this.scale;
    const t = o.t;
    const p = project(cam, t.x, -t.s, t.z, w, h, { ...AQ.camera, far: AQ.camera.far * 1.5 }); // half the first build's reach (2026-11-08)
    if (!p || p.sx < -40 || p.sx > w + 40) { o.spr.setVisible(false); return; }
    const now = this.time.now / 1000;
    const k = Math.max(1, (AQ.size.orb * 2.2 * p.scale) / px("aprops")) * (1 + 0.15 * Math.sin(now * 6));
    o.spr.setVisible(true).setPosition(p.sx, p.sy).setScale(k * Math.abs(Math.cos(now * 3)) + 0.05, k).setDepth(2300)
      .setTintMode(Phaser.TintModes.SCREEN).setTint(0xffd040, 0xfff0a0, 0xffb020, 0xffd040).setAlpha(1); // shiny gold; a spin: the width swings with cos
    const g = this.fx;
    const r = Math.max(14, 22 * k);
    const glow = 0.75 + 0.25 * Math.sin(now * 5); // a gold glow behind it
    g.fillStyle(0xffc030, 0.25 * glow).fillCircle(p.sx, p.sy, r * 1.5).fillStyle(0xffe070, 0.45 * glow).fillCircle(p.sx, p.sy, r * 0.95)
      .fillStyle(0xfff8d0, 0.6 * glow).fillCircle(p.sx, p.sy, r * 0.5);
    for (let i = 0; i < 6; i++) { // sparkles circling it, twinkling
      const a = now * 2 + (i * Math.PI) / 3;
      const tw = 0.5 + 0.5 * Math.sin(now * 9 + i * 1.7);
      const x = p.sx + Math.cos(a) * r, y = p.sy + Math.sin(a) * r * 0.7, len = 2 + 4 * tw;
      g.fillStyle(0xfff8d0, tw).fillRect(x - len, y - 0.5, len * 2, 1).fillRect(x - 0.5, y - len, 1, len * 2);
    }
    if (!this.partSeen) {
      this.partSeen = true;
      this.sfx.play("twinkle");
      this.hud.toast(shell.i18n.t("aq.part_ahead"), 3);
      Log.info(LOG, "RIVER PART in view");
    }
  }

  /** A short cutscene (about 2.6 s, Enter skips): the leap into a river, or out of one into the next water. */
  private playCutscene(kind: "toRiver" | "fromRiver", done: () => void): void {
    const next = MAPS[Math.min(MAPS.length - 1, this.riverIndex + 1)];
    this.cut = { kind, t: 0, done, title: kind === "toRiver" ? shell.i18n.t("aq.cut_to_river") : shell.i18n.t(`aq.cut_${next.id}`),
      palette: kind === "toRiver" ? this.map.palette : next.palette };
    this.mode = "cutscene";
    this.panel.close();
    this.hud.banner(null);
    this.hud.clearToast();
    this.sfx.loop("hunt", "music/hunt.wav", false);
    this.sfx.play("evolve");
    Log.info(LOG, `CUTSCENE ${kind}`);
  }

  private cutsceneFrame(dt: number, playing: boolean): void {
    const c = this.cut!;
    c.t += dt;
    const DUR = 2.6;
    const inp = shell.input;
    const skip = playing && !this.autoplay && (inp.takePress("ui_accept") || inp.takePress("jump") || inp.takePress("interact"));
    if (c.t >= DUR || skip) {
      this.cutGfx.setVisible(false).clear();
      this.cutTitle.setVisible(false);
      this.cut = null;
      this.mode = "swim";
      c.done();
      return;
    }
    // hide the world; draw the little scene in screen space
    for (const o of [...this.critters, ...this.kin]) o.spr.setVisible(false);
    for (const o of [...this.items]) o.spr.setVisible(false);
    for (const o of this.sharks) o.spr.setVisible(false);
    for (const o of this.riverObjs) o.spr.setVisible(false);
    for (const l of Object.values(this.partLayers)) l?.setVisible(false);
    this.floor.clear(); this.fx.clear(); this.bg.setVisible(false); this.skyBg.setVisible(false); this.lensBg.setVisible(false);
    this.hud.hideStatus();
    this.hud.warn(null, 0, true);
    const { width: w, height: h } = this.scale;
    const g = this.cutGfx.setVisible(true).clear();
    const sea = h * 0.62;
    const sky = (y0: number, y1: number, a: number, b: number) => { for (let i = 0; i < 12; i++) g.fillStyle(this.lerpColor(a, b, i / 11), 1).fillRect(0, y0 + ((y1 - y0) / 12) * i, w, (y1 - y0) / 12 + 1); };
    sky(0, sea, 0x1a2a44, 0x7a8a9a);
    sky(sea, h, c.palette.ripple, c.palette.fog);
    const now = this.time.now / 1000;
    for (let i = 0; i < 40; i++) { // the water's surface glinting
      const x = (i * 97 + now * 30) % w;
      g.fillStyle(0xe8f4f4, 0.35).fillRect(x, sea + 2 + (i % 5) * 7, 10 + (i % 3) * 6, 1);
    }
    const k = c.t / DUR;
    let x0: number, x1: number, peak: number;
    if (c.kind === "toRiver") { // a river pouring out of the far shore: white rushing streaks; you leap into it
      g.fillStyle(0x2a3a24, 1).fillRect(w * 0.62, sea - 46, w * 0.38, 46); // the far bank
      g.fillStyle(0x6a8a5a, 1).fillRect(w * 0.7, sea - 30, w * 0.3, 30); // the river's channel
      for (let i = 0; i < 16; i++) g.fillStyle(0xf0fff8, 0.6).fillRect(w * 0.7 + ((i * 41 + now * 260) % (w * 0.3)), sea - 26 + (i % 4) * 6, 14, 2);
      x0 = w * 0.18; x1 = w * 0.82; peak = h * 0.18;
    } else { // a waterfall off the river's end: you leap off the falls into the wide water below
      g.fillStyle(0x2a3a24, 1).fillRect(0, sea - 90, w * 0.3, 90); // the cliff
      for (let i = 0; i < 18; i++) g.fillStyle(0xf0fff8, 0.55).fillRect(w * 0.27 + (i % 3) * 5, sea - 90 + ((i * 23 + now * 300) % 90), 3, 12); // the falls
      x0 = w * 0.22; x1 = w * 0.72; peak = h * 0.14;
    }
    // you: an arc through the air, nose following the arc; a splash where you land
    const arc = Math.min(1, k * 1.25);
    const x = x0 + (x1 - x0) * arc;
    const y = (1 - arc) * (1 - arc) * (sea - 6) + 2 * (1 - arc) * arc * (peak - 60) + arc * arc * (sea + 4);
    const dy = 2 * (1 - arc) * ((peak - 60) - (sea - 6)) + 2 * arc * ((sea + 4) - (peak - 60));
    const dx = x1 - x0;
    this.avatarSpr.setVisible(true).setDepth(2600).setPosition(x, y).setScale(2.4).setAlpha(arc >= 1 ? 0 : 1)
      .setFlipY(false).setRotation(Math.atan2(dy, dx)).play(animKey("aswim", "swim", `side${this.look}`), true).clearTint();
    if (arc >= 1) for (let i = 0; i < 10; i++) { // the splash
      const sk = (k - 0.8) * 5;
      g.fillStyle(0xffffff, Math.max(0, 0.8 - sk)).fillCircle(x1 + Math.cos(i) * 30 * sk, sea - Math.abs(Math.sin(i * 1.7)) * 40 * sk, 3);
    }
    this.cutTitle.setVisible(true).setText(c.title).setAlpha(Math.min(1, k * 3) * Math.min(1, (1 - k) * 4));
  }

  private endRiver(): void {
    for (const o of this.riverObjs) o.spr.destroy();
    this.riverObjs = [];
    this.run = null;
    this.rb = null;
    const next = Math.min(MAPS.length - 1, this.riverIndex + 1);
    this.mode = "swim";
    this.buildMap(next, "river");
    this.hud.toast(shell.i18n.t(`aq.arrive_${MAPS[next].id}`), 7);
    this.sfx.play("pop");
    Log.info(LOG, `RIVER ${this.riverIndex + 1} done: into the ${MAPS[next].id}`);
  }

  private drawRiver(dt: number): void {
    const { width: w, height: h } = this.scale;
    const C = AQ.camera, spec = this.run!.spec, rb = this.rb!;
    const cam = cameraBehind({ x: rb.x, y: -rb.s, z: rb.z, heading: -Math.PI / 2 }, C);
    if (!rb.airborne) cam.z = Math.min(cam.z, spec.depth - 6);
    const above = cam.z > spec.depth;
    this.bg.setVisible(!above);
    this.skyBg.setVisible(above);
    this.lensBg.setVisible(false);
    const g = this.floor.clear();
    this.fx.clear();
    for (const s of this.specks) { // the riverbed rushing by, and the surface's light
      const p = project(cam, s.x, s.y, 0, w, h, C);
      if (p && p.sx > 0 && p.sx < w && p.sy < h) g.fillStyle(this.palette.speck, 0.9 - this.fogIndex(p.depth) / 20).fillRect(p.sx, p.sy, Math.max(1, p.scale * 1.6), Math.max(1, p.scale * 3));
      const q = project(cam, s.x * 0.8, s.y - 37, spec.depth, w, h, C);
      if (q && q.sx > 0 && q.sx < w && q.sy > 0) g.fillStyle(this.palette.ripple, 0.5 - this.fogIndex(q.depth) / 34).fillRect(q.sx, q.sy, Math.max(1, q.scale * 1.2), Math.max(1, q.scale * 3));
    }
    for (const o of this.riverObjs) {
      if (o.gone) continue;
      const t = o.t;
      if (t.kind === "part") { this.drawGoldPart(cam, o); continue; }
      const size = t.kind === "rock" ? AQ.size.boulder : t.kind === "log" ? AQ.size.log * 1.6 : t.kind === "bank" ? AQ.size.weed * 0.7 : t.kind === "spinefish" ? KINDS.spinefish.size : AQ.size.plankton;
      this.place(cam, o.spr, t.x, -t.s, t.z, size, t.kind === "spinefish" ? px("aspine") : px("aprops"));
    }
    this.drawAvatar(rb.airborne);
    this.hud.warn(null, dt, true);
    this.hud.banner(null);
    this.sfx.loop("hunt", "music/hunt.wav", false);
    this.hud.status([...this.statusLines(), shell.i18n.t("aq.river_progress", { n: RIVERS.indexOf(spec) + 1, pct: Math.min(100, Math.round((rb.s / spec.length) * 100)) })]);
    this.hudExtras();
  }

  // ---- drawing: the behind view ---------------------------------------------------------------------
  private drawAvatar(airborne: boolean): void {
    const { width: w, height: h } = this.scale;
    const C = AQ.camera;
    const s = (bodySize(this.me) * C.focal) / C.back / px("aswim");
    const bob = shell.settings.access.reduce_motion || airborne ? 0 : Math.sin(this.time.now / 260) * 1.5;
    const th = 0.75 + 0.5 * this.thickness;
    this.avatarSpr.setVisible(true).setPosition(w / 2, h * C.avatarY + bob).setScale(s * th, s).setFlipX(false).setFlipY(false)
      .setDepth(2500).setAlpha(1).play(animKey("aswim", "swim", `back${this.look}`), true);
    if (this.flashLeft > 0) this.avatarSpr.setTint(0xff8080);
    else this.avatarSpr.clearTint();
    // the parts you wear, drawn over your back (2026-11-08), in step with your swim frame
    const frame = this.avatarSpr.anims.currentFrame?.index ?? 1;
    for (const p of AQ_PARTS) {
      const layer = this.partLayers[p];
      if (!layer) continue;
      if (!has(this.me, p)) { layer.setVisible(false); continue; }
      layer.setVisible(true).setFrame(firstFrame(this.partsLayout, "on", p) + frame - 1).setPosition(this.avatarSpr.x, this.avatarSpr.y)
        .setScale(this.avatarSpr.scaleX, this.avatarSpr.scaleY).setRotation(this.avatarSpr.rotation);
      if (this.flashLeft > 0) layer.setTint(0xff8080); else layer.clearTint();
    }
  }

  private drawBehind(dt: number): void {
    const { width: w, height: h } = this.scale;
    const C = AQ.camera;
    const cam = cameraBehind(this.av, C);
    if (!this.av.airborne) cam.z = Math.min(cam.z, this.map.surface - 6); // stay under the surface unless you breach
    const above = cam.z > this.map.surface;
    this.bg.setVisible(!above);
    this.skyBg.setVisible(above);
    this.lensBg.setVisible(false);
    const g = this.floor.clear();
    this.fx.clear();
    for (const d of this.decals) { // the seabed's texture: flattened by the view (lower, wider ellipses far away)
      const p = project(cam, d.x, d.y, 0, w, h, C);
      if (!p || p.depth < d.w * 0.8 + 40 || p.sx < -200 || p.sx > w + 200 || p.sy > h + 40) continue; // never under the camera
      const fw = d.w * p.scale;
      const fh = Math.max(1, fw * d.aspect * Math.min(1, cam.z / p.depth) * 1.2);
      const near = Phaser.Math.Clamp((p.depth - (d.w * 0.8 + 40)) / 120, 0, 1); // fade in instead of growing at you
      g.fillStyle(d.color, d.alpha * near * (1 - this.fogIndex(p.depth) / 18)).fillEllipse(p.sx, p.sy, fw, fh);
    }
    for (const s of this.specks) { // seabed specks, and the surface's light ripples overhead
      const p = project(cam, s.x, s.y, 0, w, h, C);
      if (p && p.sx > 0 && p.sx < w && p.sy < h) {
        g.fillStyle(this.palette.speck, 0.9 - this.fogIndex(p.depth) / 20).fillRect(p.sx, p.sy, Math.max(1, p.scale * 1.6), Math.max(1, p.scale * 0.8));
      }
      const q = project(cam, s.y, s.x, this.map.surface, w, h, C); // swapped axes: a different pattern up there
      if (q && q.sx > 0 && q.sx < w && q.sy > 0) {
        g.fillStyle(above ? 0x6a9aa4 : this.palette.ripple, 0.55 - this.fogIndex(q.depth) / 34).fillRect(q.sx, q.sy, Math.max(1, q.scale * 2.4), Math.max(1, q.scale * 0.5));
      }
    }
    if (this.map.exitForm !== null) this.drawMouth(cam, g);
    for (const it of this.items) this.place(cam, it.spr, it.x, it.y, it.z, it.size, px("aprops"));
    for (const c of [...this.critters, ...this.kin]) {
      if (!this.alive(c)) { c.spr.setVisible(false); continue; }
      const p = this.place(cam, c.spr, c.x, c.y, c.z, c.size, px(c.atlas));
      if (!p) continue;
      const v = viewOf(c.heading, cam.heading);
      const row = c.kind === "kin" ? `${v.view}${this.look}` : v.view; // your kin share your look
      c.spr.play(animKey(c.atlas, "swim", row), true).setFlipX(v.flip).setRotation(0).setFlipY(false);
      if (c.hitCd > 0.2) c.spr.setTint(0xff9090); // just hurt: a red flash
      if (c.kind === "kin") {
        const th = 0.75 + 0.5 * c.thickness;
        c.spr.setScale(c.spr.scaleX * (v.view === "side" ? 1 : th), c.spr.scaleY * (v.view === "side" ? th : 1));
      }
    }
    for (const sh of this.sharks) { // the sharks: like the creatures, the large one darker
      if (sh.respawnIn > 0) { sh.spr.setVisible(false); continue; }
      const p = this.place(cam, sh.spr, sh.x, sh.y, sh.z, sh.spec.size, px(sh.atlas));
      if (!p) continue;
      const v = viewOf(sh.heading, cam.heading);
      sh.spr.play(animKey(sh.atlas, "swim", v.view), true).setFlipX(v.flip).setRotation(0).setFlipY(false);
      if (sh.spec.tint !== 0xffffff) sh.spr.setTint(this.mulTint(this.fogTints[this.fogIndex(p.depth)], sh.spec.tint));
    }
    this.drawAvatar(this.av.airborne);
    // the hidden-threat cue: hunters out of view (a deepmaw hunting you or close, a spinefish close enough to chase,
    // anything you provoked, a darter school swarming you)
    const range = AQ.warn.range;
    const near = (c: Critter, r: number) => Math.hypot(c.x - this.av.x, c.y - this.av.y, c.z - this.av.z) < r;
    const hunters = this.critters.filter((c) => this.alive(c) && (c.provokedLeft > 0
      || (c.brain && ((c.brain.state === "hunt" && c.brain.targetId === PLAYER_ID) || (c.brain.state === "wander" && near(c, range * 0.5))))
      || (c.kind === "spinefish" && near(c, this.K("spinefish").aggro))
      || (c.school >= 0 && this.schools[c.school]?.target === "you")));
    const sharksOnYou = this.sharks.filter((sh) => sh.respawnIn <= 0 && sh.brain.mode === "hunt");
    const threat = this.mode === "swim" ? hiddenThreat(this.av, [...hunters, ...sharksOnYou], range * 1.5, AQ.warn.viewHalfAngle, AQ.warn.viewHalfPitch) : null;
    this.hud.warn(threat, dt, shell.settings.access.reduce_motion);
    const huntingYou = sharksOnYou.length > 0 || this.critters.some((c) => c.brain?.state === "hunt" && c.brain.targetId === PLAYER_ID) || hunters.some((c) => !c.brain);
    if (threat && huntingYou && this.warnCd <= 0 && this.mode === "swim") {
      this.sfx.play("warn_behind");
      this.warnCd = AQ.warn.soundEveryS;
      Log.debug(LOG, `WARN ${threat.edge} ${Math.round(threat.dist)} px`);
    }
    this.hud.status(this.statusLines());
    this.hudExtras();
    if (this.mode === "swim" && this.pace === "fast" && Math.hypot(this.av.vx, this.av.vy) > 80) this.drawSpeedStreaks();
  }

  /** Full speed made obvious (2026-11-08): streaks rushing past toward the screen edges, and bubbles off your body. */
  private drawSpeedStreaks(): void {
    const { width: w, height: h } = this.scale;
    const g = this.fx, now = this.time.now / 1000;
    const cx = w / 2, cy = h * AQ.camera.horizon + 20, reach = Math.hypot(w, h) * 0.6;
    for (let i = 0; i < 28; i++) {
      const a = i * 2.39996; // golden angle: an even spread
      const r = 0.45 + ((now * 1.6 + i * 0.137) % 1) * 0.6; // each streak runs outward and loops
      const len = 18 + 40 * (r - 0.45);
      const x1 = cx + Math.cos(a) * reach * r, y1 = cy + Math.sin(a) * reach * r * 0.75;
      const x2 = cx + Math.cos(a) * (reach * r + len), y2 = cy + Math.sin(a) * (reach * r + len) * 0.75;
      g.lineStyle(2, 0xe8fcfc, 0.3 + 0.6 * (r - 0.45)).lineBetween(x1, y1, x2, y2);
    }
    for (let i = 0; i < 6; i++) { // bubbles streaming back off your body
      const k = (now * 2.2 + i / 6) % 1;
      g.fillStyle(0xe8f8ff, 0.5 * (1 - k)).fillCircle(w / 2 + Math.sin(i * 7.1) * 18, h * AQ.camera.avatarY + 10 + k * 46, 1.5 + k * 2);
    }
  }

  /** Part icons with what each does (top right), and the stamina gauge (bottom right). */
  private hudExtras(): void {
    const i = shell.i18n, me = this.me;
    const row = (p: AqPart | null, unique: boolean) => ({
      atlas: "aprops", frame: p ? firstFrame(this.propsLayout, "bob", p) : null, unique,
      text: p ? `${i.t(`aq.part_${p}`)}: ${i.t(`aq.desc_${p}`)}` : i.t(unique ? "aq.slot_river" : "aq.slot_empty"),
    });
    const rows = [
      ...Array.from({ length: slots(me) }, (_, n) => row(me.parts[n] ?? null, false)),
      ...UNIQUE_PARTS.map((_, n) => row(me.uniques[n] ?? null, true)),
    ];
    this.hud.parts(rows);
    const paceLabel = i.t(outOfBreath(me) ? "aq.pace_out" : this.wantFast ? "aq.pace_fast" : "aq.pace_cruise");
    this.hud.health(me.hp, maxHp(me));
    this.hud.stamina(me.stamina, maxStamina(me), paceLabel, AQ.stamina.abilityCost / maxStamina(me), AQ.stamina.minFast);
  }

  /** The river mouth: a shaft of light from the seabed to the surface; bright once you are big enough to leap. */
  private drawMouth(cam: Camera, g: Phaser.GameObjects.Graphics): void {
    const { width: w, height: h } = this.scale;
    const open = this.mouthOpen();
    for (let z = 0; z <= this.map.surface; z += 12) {
      const p = project(cam, this.mouth.x, this.mouth.y, z, w, h, { ...AQ.camera, far: AQ.camera.far * 1.6 });
      if (!p) continue;
      const pulse = 0.75 + 0.25 * Math.sin(this.time.now / 300 + z / 40);
      g.fillStyle(open ? 0xfff0b0 : 0x8aa0a0, (open ? 0.5 : 0.18) * pulse).fillRect(p.sx - p.scale * 30, p.sy - p.scale * 6, p.scale * 60, p.scale * 12);
    }
  }

  private mouthLine(): string {
    if (this.map.exitForm === null) return "";
    const i = shell.i18n;
    if (!this.mouthOpen()) return i.t("aq.mouth_grow", { n: this.map.exitForm });
    const rel = wrapAngle(Math.atan2(this.mouth.y - this.av.y, this.mouth.x - this.av.x) - this.av.heading);
    const arrow = ARROWS[((Math.round(rel / (Math.PI / 4)) % 8) + 8) % 8];
    return i.t("aq.mouth_open", { arrow, d: Math.round(Math.hypot(this.mouth.x - this.av.x, this.mouth.y - this.av.y)) });
  }

  private statusLines(): string[] {
    const i = shell.i18n, me = this.me;
    const need = foodToEvolve(me);
    return [
      `${i.t(`aq.map_${this.run ? "river" : this.map.id}`)}   ${i.t("aq.form", { n: me.form })}   ${i.t("aq.hp", { n: Math.ceil(me.hp), max: maxHp(me) })}`,
      " ", // room for the health bar
      need === Infinity ? "" : i.t("aq.food", { n: Math.floor(me.food), need }),
      i.t("aq.diet_line", { diet: i.t(`diet.${me.diet}`) }), // 2026-11-09: "a line in the top right that tells you your fish's diet"
      i.t("aq.points", { a: Math.floor(me.points.algae), m: Math.floor(me.points.meat) }),
      this.av.dashCd > 0 ? i.t("aq.dash_wait", { s: this.av.dashCd.toFixed(1) }) : i.t(canAbility(me) ? "aq.dash_ready" : "aq.dash_tired"),
      this.run ? "" : `${i.t("aq.body", { word: bodyWord(this.thickness) })} (${describeBody(this.thickness)})`,
      this.run ? "" : `${i.t("aq.water", { t: Math.round(this.tempC) })} (${describeWater(this.tempC).split(":")[0]})`,
      this.run ? "" : this.mouthLine(),
    ].filter((l) => l !== "");
  }

  /** Multiply two 0xRRGGBB tints (the fog and a creature's own shade). */
  private mulTint(a: number, b: number): number {
    const ch = (v: number, sh: number) => ((v >> sh) & 0xff) / 255;
    const m = (sh: number) => Math.round(ch(a, sh) * ch(b, sh) * 255) << sh;
    return m(16) | m(8) | m(0);
  }

  private fogIndex(depth: number): number {
    const C = AQ.camera;
    return Math.round(Phaser.Math.Clamp((depth - C.fogStart) / (C.far - C.fogStart), 0, 1) * 16);
  }

  /** Put a sprite where its point projects, sized and fogged by distance; nearer than you: see-through. */
  private place(cam: Camera, spr: Phaser.GameObjects.Sprite, x: number, y: number, z: number, size: number, cellPx: number) {
    const { width: w, height: h } = this.scale;
    const p = project(cam, x, y, z, w, h, AQ.camera);
    if (!p || p.sx < -80 || p.sx > w + 80 || p.sy < -80 || p.sy > h + 120) {
      spr.setVisible(false);
      return null;
    }
    spr.setVisible(true).setPosition(p.sx, p.sy).setScale((size * p.scale) / cellPx).setDepth(1000 + (AQ.camera.far - p.depth))
      .setTint(this.fogTints[this.fogIndex(p.depth)])
      .setAlpha(Phaser.Math.Clamp((p.depth - AQ.camera.near) / (AQ.camera.back - AQ.camera.near), 0.15, 1));
    return p;
  }

  // ---- drawing: the lens (top-down, god mode) ----------------------------------------------------------
  private drawLens(): void {
    const { width: w, height: h } = this.scale;
    const cx = (w - 258) / 2, cy = h / 2;
    const Z = LENS_ZOOM, W = this.map.width;
    const sx = (x: number) => cx + (x - this.av.x) * Z;
    const sy = (y: number) => cy + (y - this.av.y) * Z;
    this.bg.setVisible(false);
    this.skyBg.setVisible(false);
    this.floor.clear();
    this.hud.warn(null, 0, true);
    this.hud.hideStatus();
    this.hud.banner(null);
    this.sfx.loop("hunt", "music/hunt.wav", false);
    const wash = this.lerpColor(0x16324a, 0x3a3020, (this.tempC - AQ.lens.tempMin) / (AQ.lens.tempMax - AQ.lens.tempMin));
    this.lensBg.clear().setVisible(true).fillStyle(0x050f13, 1).fillRect(0, 0, w, h).fillStyle(wash, 1)
      .fillRect(sx(0), sy(0), W * Z, W * Z).lineStyle(1, 0x6a9aa0, 0.6).strokeRect(sx(0), sy(0), W * Z, W * Z);
    if (this.map.exitForm !== null) {
      this.lensBg.lineStyle(2, this.mouthOpen() ? 0xfff0b0 : 0x8aa0a0, 0.9).strokeCircle(sx(this.mouth.x), sy(this.mouth.y), AQ.mouth.radius * Z);
    }
    const show = (spr: Phaser.GameObjects.Sprite, x: number, y: number, size: number, cellPx: number, depth: number) => {
      const X = sx(x), Y = sy(y);
      const on = X > -20 && X < w - 250 && Y > -20 && Y < h + 20;
      spr.setVisible(on).setPosition(X, Y).setScale((size * Z * 2.2) / cellPx).setDepth(depth).clearTint().setAlpha(1);
      return on;
    };
    for (const it of this.items) if (show(it.spr, it.x, it.y, it.size, px("aprops"), 10)) it.spr.setRotation(0);
    for (const c of [...this.critters, ...this.kin]) {
      if (!this.alive(c) || !show(c.spr, c.x, c.y, c.size, px(c.atlas), c.kind === "deepmaw" ? 30 : 20)) continue;
      c.spr.play(animKey(c.atlas, "swim", c.kind === "kin" ? `side${this.look}` : "side"), true).setFlipX(false).setFlipY(Math.cos(c.heading) < 0).setRotation(c.heading);
    }
    for (const sh of this.sharks) {
      if (sh.respawnIn > 0 || !show(sh.spr, sh.x, sh.y, sh.spec.size, px(sh.atlas), 35)) continue;
      sh.spr.play(animKey(sh.atlas, "swim", "side"), true).setFlipX(false).setFlipY(Math.cos(sh.heading) < 0).setRotation(sh.heading);
    }
    for (const layer of Object.values(this.partLayers)) layer?.setVisible(false);
    show(this.avatarSpr, this.av.x, this.av.y, bodySize(this.me) * 1.4, px("aswim"), 40);
    this.avatarSpr.play(animKey("aswim", "swim", `side${this.look}`), true).setFlipY(Math.cos(this.av.heading) < 0).setRotation(this.av.heading).setTint(0xfff0a0);
  }

  // ---- autoplay (smoke runs): simple pilots ------------------------------------------------------------
  private pilot(dt: number): Pilot {
    this.pilotT += dt;
    const none: Pilot = { s: { turn: 0, push: 0, rise: 0 }, doJump: false, doDash: false };
    const a = this.av;
    if (this.pilotKind === "still") return none; // ?pilot=still: hold still (checks the darter swarms)
    if (this.pilotKind === "breach") return { s: { turn: 0.15, push: 1, rise: 1 }, doJump: !a.airborne && a.z >= this.map.surface - 2, doDash: false };
    if (this.pilotT > 14 && this.pilotKind !== "fight") { this.pilotT = 0; this.openLens(); return none; }
    for (const stat of AQ_STATS) if (buyUpgrade(this.me, stat).ok) { this.tryBuy(stat); break; }
    const d = (f: { x: number; y: number }) => Math.hypot(f.x - a.x, f.y - a.y);
    const steerTo = (goal: { x: number; y: number; z: number }, dashNow: boolean, jumpNow = false): Pilot => {
      const want = wrapAngle(Math.atan2(goal.y - a.y, goal.x - a.x) - a.heading);
      return { s: { turn: Phaser.Math.Clamp(want * 2, -1, 1), push: Math.abs(want) < 1.2 ? 1 : 0.3, rise: Phaser.Math.Clamp((goal.z - a.z) / 20, -1, 1) }, doJump: jumpNow, doDash: dashNow };
    };
    if (this.mouthOpen()) { // big enough: head for the river mouth, rise, and breach in its light
      const at = d(this.mouth) < AQ.mouth.radius * 0.7;
      return steerTo({ ...this.mouth, z: this.map.surface }, false, at && a.z >= this.map.surface - 4);
    }
    if (this.pilotKind === "fight") {
      const loot = this.items.filter((i) => isPart(i.kind) || i.kind.startsWith("meat") || i.kind === "bloom" || i.kind === "pod");
      const foes = this.critters.filter((c) => this.alive(c) && (c.kind === "spinefish" || c.kind === "shellback"));
      const goal = [...loot, ...foes].reduce<{ x: number; y: number; z: number } | null>((b, f) => (!b || d(f) < d(b) ? f : b), null);
      return goal ? steerTo(goal, d(goal) < 90) : none;
    }
    const hunter: { x: number; y: number } | undefined = this.sharks.find((sh) => sh.respawnIn <= 0 && sh.brain.mode === "hunt")
      ?? this.critters.find((c) => this.alive(c) && ((c.brain?.state === "hunt" && c.brain.targetId === PLAYER_ID) || c.provokedLeft > 0));
    this.wantFast = !!hunter && d(hunter) < 400 && canGoFast(this.me); // the pilot sprints away from hunters
    if (hunter && d(hunter) < 260) return steerTo({ x: a.x * 2 - hunter.x, y: a.y * 2 - hunter.y, z: a.z }, true);
    const meat = this.me.diet !== "herbivore", plants = this.me.diet !== "carnivore";
    const food = this.items.filter((i) => isPart(i.kind) || (i.kind.startsWith("meat") ? meat : (FOOD_ITEMS.includes(i.kind) || i.kind === "bloom") && plants));
    const prey = meat ? this.critters.filter((c) => this.alive(c) && (c.kind === "darter" || c.kind === "finray")) : [];
    const goal = [...food, ...prey].reduce<{ x: number; y: number; z: number } | null>((b, f) => (!b || d(f) < d(b) ? f : b), null);
    return goal ? steerTo(goal, false) : { s: { turn: 0.3, push: 1, rise: 0 }, doJump: false, doDash: false };
  }

  /** River pilot: line up with the next row's passage (the gap, over the low rocks, under the logs). */
  private pilotRiver(): Pilot {
    const rb = this.rb!, run = this.run!, spec = run.spec;
    const row = run.rows.find((r) => r.s > rb.s - 10);
    const part = run.things.find((t) => t.kind === "part" && t.s > rb.s);
    let x = 0, z = spec.depth / 2;
    if (row) {
      if (row.type === "wall") x = row.gapX;
      else if (row.type === "low") z = spec.depth - 14;
      else z = 16;
    }
    if (part && part.s - rb.s < 300) { x = part.x; z = part.z; }
    return { s: { turn: Phaser.Math.Clamp((x - rb.x) / 25, -1, 1), push: 0, rise: Phaser.Math.Clamp((z - rb.z) / 12, -1, 1) }, doJump: false, doDash: false };
  }

  private pilotLens(dt: number): void {
    this.pilotT += dt;
    if (this.pilotT > 0.4 && this.tempC > AQ.lens.tempMin) { this.setTemp(-AQ.lens.tempStep); this.pilotT = 0; }
    else if (this.tempC <= AQ.lens.tempMin && this.pilotT > 1) {
      this.passGeneration();
      this.pilotT = 0;
      if (this.pop.generation % 2 === 0) this.closeLens();
    }
  }
}

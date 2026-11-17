// Purpose: Creature roguelike Water slice: stable generated expeditions, inherited bodies and Gardener solutions.
// Usage: Registered as creature in main.ts. Existing actions and original sprite sheets; no shared shell changes.
// Notes: PROTOTYPE: four overworld paths, one playable biome. Unfinished lives restart at the nest.
// Pseudocode: seed/restore world -> explore -> discover adaptations -> Gardener changes terrain/weather ->
//            return/die -> choose climate and daughter -> revisit the same world -> claim Water crown.
// Authored: Written with Codex (GPT-6).
import * as Phaser from "phaser";
import { shell } from "../shell/app";
import { Log } from "../core/log";
import { writeStage, refreshLineage } from "../core/lineage";
import { revealFrom } from "./aquatic/reveal";
import { newBody, stepBody, boxHits, type Body } from "./creature/physics";
import { GEN, evidence, edible, inherit, offspring, resumeGarden, newGarden, creatureSource, type Garden, type Heir, type Climate } from "./creature/generations";
import { WATER, generateWater, levelStart, type Difficulty, type WaterWorld, type WaterRoom } from "./creature/waterWorld";
import { attachExpedition, intervene, interventionLock, levelLock, weatherEvent, stepWeather, effectiveClimate, type Weather, type Intervention } from "./creature/expedition";
import { stepWaterBody, inWater, waterline } from "./creature/waterPhysics";
import { drawWaterRoom, type WaterFood } from "./creature/waterView";
import { OVERWORLD, BIOME_PATHS, WATER_PATHS, hubSolid, nearLandmark } from "./creature/overworld";
import { drawHub, hubLabels } from "./creature/overworldView";
import { AVATAR_ASSETS, avatarAssetsReady, queueAvatarAssets } from "./creature/avatarAssets";
import { ENEMIES, ENCOUNTER, spawnEncounters, stepEnemy, biteDamage, evasion, reedCover, hasVent, ventPhase, type WaterEnemy } from "./creature/waterEncounters";
import { switchback, challengeSolid, clearWaterLine } from "./creature/waterChallenges";
import { newObjective, newCargo, valves, leftExit, drainedRoom, tickObjective, useValve, bankCargo, objectiveBarrier, canClaimSeal, emergencyRelease, type RoomObjective, type Cargo } from "./creature/waterObjectives";
import { arenaRoom, activeThreat, encounterLock, sealedEncounter, guardedControl, CONTROL_SECONDS, advanceOperation, canIncapacitate, type Operation } from "./creature/waterCombatRooms";
import { NET, useNet, netCatches } from "./creature/waterTraps";
import { verticalArrival, horizontalReturn, pitRoom } from "./creature/waterRoutes";
import { StageUi, action, type StageAction } from "./stageUi";
import { LineagePanel } from "./lineagePanel";
interface Foe extends WaterEnemy { sprite: Phaser.GameObjects.Sprite; label: Phaser.GameObjects.Text }
interface RoomLife { food: WaterFood[]; foes: WaterEnemy[]; trap: boolean; cache: boolean; objective: RoomObjective }
interface Choice { id: string; label: string; run: () => void }
type Mode = "play" | "journal" | "gardener" | "climate" | "heir" | "won" | "newworld";
const POSE_START = { idle: 0, walk: 4, jump: 8, bite: 12, crouch: 16 };
export class CreatureScene extends Phaser.Scene {
  private garden!: Garden;
  private world!: WaterWorld;
  private room = -1;
  private operation: Operation | null = null;
  private stun = 0;
  private body!: Body;
  private player!: Phaser.GameObjects.Sprite;
  private gfx!: Phaser.GameObjects.Graphics;
  private landmarks: Phaser.GameObjects.Text[] = [];
  private ready = false;
  private debugEncounters = new URLSearchParams(location.search).has("debug");
  private screenUi!: StageUi;
  private lineage!: LineagePanel;
  private mode: Mode = "play";
  private selection = 0;
  private heirs: Heir[] = [];
  private climate: Climate = "flood";
  private evidence = evidence();
  private hp = GEN.health;
  private hunger = 0;
  private oxygen = WATER.oxygenSeconds as number;
  private hurt = 0;
  private bite = 0;
  private facing = 1;
  private clock = 0;
  private explored = false;
  private weather: Weather = { climate: "flood", remaining: 0 };
  private enemies: Foe[] = [];
  private food: WaterFood[] = [];
  private rooms = new Map<number, RoomLife>();
  private trap = false;
  private foodCache = false;
  private objective = newObjective();
  private cargo: Cargo = newCargo();
  private message = "Four paths leave the nest. Water is the first playable biome.";
  constructor() { super("creature"); }
  preload(): void {
    // Direct image loading avoids the intermittent XHR -> blob URL decode failures seen in
    // the desktop browser. Both paths are supported by Phaser; this choice is creature-local.
    this.load.imageLoadType = "HTMLImageElement";
    queueAvatarAssets(this);
    if (new URLSearchParams(location.search).has("debug")) {
      Log.info("creature", `Avatar preload queued ${this.load.list.size}; cached ${AVATAR_ASSETS.map(a => `${a.key}:${this.textures.exists(a.key)}`).join(",")}`);
      this.load.on("loaderror", (file: Phaser.Loader.File) => Log.warn("creature", `Avatar load failed: ${file.key} ${file.src}`));
      this.load.once("complete", () => Log.info("creature", `Avatar preload complete ${this.load.totalComplete}/${this.load.totalFailed}; ready ${avatarAssetsReady(this)}`));
    }
  }
  create(): void {
    this.ready = false;
    this.screenUi = new StageUi(this);
    this.screenUi.root.classList.add("creature-expedition");
    if (avatarAssetsReady(this)) this.beginCreature();
    else {
      Log.warn("creature", `Creature textures not ready: ${AVATAR_ASSETS.map(a => `${a.key}:${this.textures.exists(a.key) ? this.textures.get(a.key).getFrameNames().length : "absent"}`).join(", ")}`);
      // create runs inside the loader's complete event. Start retries on the next scene tick,
      // after its original completion handlers have finished clearing their queues.
      this.time.delayedCall(0, () => { if (!this.ready) this.retryAvatars(); });
    }
  }
  private retryAvatars(): void {
    this.screenUi.show("Loading creature bodies…", []);
    this.load.reset(); queueAvatarAssets(this);
    this.load.once("complete", () => {
      if (avatarAssetsReady(this)) this.beginCreature();
      else this.screenUi.show("Creature images could not be loaded. Your checkpoint is unchanged. Retry to load the player and predators before exploring.",
        [{ id: "retry-assets", label: "Retry creature images", run: () => this.retryAvatars() }]);
    });
    this.load.start();
  }
  private beginCreature(): void {
    if (this.ready) return;
    this.gfx = this.add.graphics();
    this.player = this.add.sprite(64, WATER.floor - 16, "genWalker", 0).setDepth(4);
    this.cameras.main.setBounds(0, 0, 640, 360).startFollow(this.player, true, 0.15, 0.15);
    const prev = shell.saves.load("lineage").envelope?.data, reveal = revealFrom(prev, 3, "creature");
    const home = refreshLineage(prev)?.species[0];
    const source = creatureSource(prev, reveal.diet);
    const seed = this.requestedSeed();
    this.garden = attachExpedition(resumeGarden(shell.saves.load("creature_generations").envelope?.data, reveal.diet, source), seed, home?.stages.aquatic?.parts);
    this.buildWorld(); this.newLife(); this.close(); this.save();
    this.lineage = new LineagePanel(this);
    if (!new URLSearchParams(location.search).has("autoplay")) {
      this.lineage.show(reveal, "Begin exploring"); this.screenUi.root.inert = true; shell.input.clearHeld();
    }
    this.ready = true; this.draw();
  }
  private requestedSeed(): number {
    const raw = new URLSearchParams(location.search).get("creatureSeed");
    return raw !== null && /^\d+$/.test(raw) && Number(raw) <= 0xffffffff ? Number(raw) : crypto.getRandomValues(new Uint32Array(1))[0];
  }
  private buildWorld(): void {
    this.world = generateWater(this.garden.expedition!.seed);
    if (this.world.fallback) Log.warn("creature", `Generator fallback: ${this.world.rejected.join("; ")}`);
    Log.info("creature", `Water world seed ${this.world.seed}, generator v${this.world.version}, G${this.garden.generation}`);
  }
  private newLife(): void {
    this.rooms.clear(); this.evidence = evidence(); this.explored = false; this.cargo = newCargo();
    this.hp = GEN.health + this.garden.traits.vitality; this.hunger = 0;
    this.oxygen = WATER.oxygenSeconds; this.hurt = 0; this.stun = 0; this.bite = 0; this.clock = 0;
    this.weather = { climate: this.garden.climate, remaining: 0 }; this.enter(-1, OVERWORLD.nest);
  }
  private get currentRoom(): WaterRoom { return this.world.rooms[this.room]; }
  private remember(): void {
    if (this.room < 0) return;
    this.rooms.set(this.room, { food: this.food, foes: this.enemies.map(({ sprite: _sprite, label: _label, ...e }) => ({ ...e })), trap: this.trap, cache: this.foodCache, objective: { ...this.objective } });
  }
  private enter(id: number, x: number, y: number = WATER.floor, facing: number = x > 500 ? -1 : 1, vy = 0): void {
    this.operation = null;
    this.landmarks.forEach(label => label.destroy()); this.landmarks = [];
    const width = id === -1 ? OVERWORLD.width : id === -2 ? OVERWORLD.waterWidth : WATER.width;
    this.cameras.main.setBounds(0, 0, width, 360);
    if (id < 0) this.landmarks = hubLabels(id === -2).map(p => this.add.text(p.x, p.y, p.text,
      { fontFamily: "monospace", fontSize: "10px", color: "#ecedd4", align: "center", backgroundColor: "#132b2bcc", padding: { x: 5, y: 4 } }).setOrigin(0.5, 0).setResolution(2).setDepth(6));
    this.room = id; this.enemies.forEach(e => { e.sprite.destroy(); e.label.destroy(); }); this.enemies = [];
    this.body = newBody(x, y); this.body.vy = vy; this.facing = facing; this.oxygen = WATER.oxygenSeconds;
    this.player.setPosition(x, y - 16).setFlipX(facing < 0);
    if (id < 0) { this.food = []; this.message = id === -1 ? "Explore the four trails. Walk right to Water; E at the nest raises daughters." : "Follow the shore to the three level entrances. E enters a trail; walk left to return to the overworld."; return; }
    this.explored = true;
    const e = this.garden.expedition!;
    if (!e.visited.includes(id)) { e.visited.push(id); this.save(); }
    const r = this.currentRoom, old = this.rooms.get(id), climate = this.climateNow();
    this.trap = old?.trap ?? false; this.foodCache = old?.cache ?? false;
    this.objective = old?.objective ? { ...old.objective } : newObjective();
    if (id === 5 && this.rooms.get(4)?.objective.open) this.objective.verticalOpen = true;
    this.landmarks = valves(r).map((v, n) => this.add.text(v.x, v.y - 24, `${n + 1} · ${v.text.split(" · ").at(-1)}${guardedControl(r, n) ? " · E + stay 2s" : ""}`, { fontFamily: "monospace", fontSize: "10px", color: "#fff0bd", backgroundColor: "#172b2a", padding: { x: 3, y: 3 } }).setOrigin(0.5, 1).setDepth(7));
    if (leftExit(r)) this.landmarks.push(this.add.text(128, 196, "← ONWARD HATCH\nReturn after both controls", { fontFamily: "monospace", fontSize: "10px", color: "#bfe7d8", align: "center" }).setOrigin(0.5, 1).setDepth(7));
    if (arenaRoom(r)) this.landmarks.push(this.add.text(98, 194, "ENCOUNTER SEAL\nDefeat / subdue / trap", { fontFamily: "monospace", fontSize: "10px", color: "#ffcf91", align: "center" }).setOrigin(0.5, 1).setDepth(7));
    if (this.enemies.length || spawnEncounters(r).length) {
      this.landmarks.push(this.add.text(NET.rigX, 260, "E: RIGGING", { fontFamily: "monospace", fontSize: "10px", color: "#f0d79c", backgroundColor: "#172b2a" }).setOrigin(0.5, 1).setDepth(7));
      this.landmarks.push(this.add.text(NET.x, 208, "E: NET\nLure here", { fontFamily: "monospace", fontSize: "10px", color: "#f0d79c", align: "center", backgroundColor: "#172b2a" }).setOrigin(0.5, 1).setDepth(7));
    }
    if (r.id === 1) this.landmarks.push(this.add.text(128, 104, "↑ NURSERY", { fontFamily: "monospace", fontSize: "10px", color: "#bfe7d8" }).setOrigin(0.5, 0).setDepth(7));
    if (r.id === 3 || r.id === 4) this.landmarks.push(this.add.text(r.id === 3 ? 128 : 328, 312, r.id === 3 ? "↓ REED SHAFT" : "↓ GALLERY DRAIN\nOpens with sluice", { fontFamily: "monospace", fontSize: "10px", color: "#bfe7d8", align: "center" }).setOrigin(0.5, 0).setDepth(7));
    if (r.id === 5 && this.objective.verticalOpen) this.landmarks.push(this.add.text(280, 104, "↑ DRAIN CHAMBER", { fontFamily: "monospace", fontSize: "10px", color: "#bfe7d8" }).setOrigin(0.5, 0).setDepth(7));
    this.food = old?.food ?? r.food.map((x, n) => ({ x, meat: climate === "drought" ? n !== 0 : n === 3, taken: false }));
    this.enemies = (old?.foes ?? spawnEncounters(r)).map(foe => ({ ...foe,
      sprite: this.add.sprite(foe.x, foe.y, "genFoe", ENEMIES[foe.kind].frame).setDepth(3),
      label: this.add.text(foe.x, foe.y - 26, ENEMIES[foe.kind].name, { fontFamily: "monospace", fontSize: "11px", color: "#eef0d9", backgroundColor: "#12272bcc", padding: { x: 3, y: 2 } }).setOrigin(0.5, 1).setResolution(1).setDepth(6)
    }));
    this.message = r.id === 4 || r.id === 8 ? "Find the lower drain control 1, then backtrack to upper release 2. E operates controls. Carry rewards home alive." :
      r.id === 6 || r.id === 10 ? "Charge lower control 1, return to raised wheel 2, then cross before pressure expires. The seal must come home alive." :
      r.id === 3 ? "Nursery branch: open the upper lever, then study the ripplefins. Carry their sample home alive to unlock fins for daughters." :
      r.gate && !e.basinRaised ? "A sealed log sluice blocks the passage. Open the Gardener lens and raise the basin." :
      r.current && !e.torrentDiverted ? "The torrent overpowers even fins. The Gardener must divert its headwaters." :
      switchback(r) ? "Dive beneath the roof to upper relay 1, then over the rock to lower latch 2. The onward hatch is back LEFT; retrace the shaft." :
      hasVent(r) ? "Bubble vent crossing: bubbles warn before the plume. Wait for it to settle, or swim above it. Watch for submerged hunters." :
      r.id === 4 ? "Chargers commit to their rush: jump or change height, then counterattack while they recover. Reed eyes warn of ambushers." :
      "Find the raised gold sluice lever; jump or swim UP to reach it and press E. Open the route, then bring discoveries back to the nest alive.";
  }
  private travel(id: number, x: number, y: number = WATER.floor, facing: number = x > 500 ? -1 : 1, vy = 0): void { this.remember(); this.enter(id, x, y, facing, vy); shell.input.clearPresses(); }
  private retreat(): void { this.travel(-1, OVERWORLD.nest); this.close(); }
  private save(): void {
    try { shell.saves.save("creature_generations", this.garden as unknown as Parameters<typeof shell.saves.save>[1]); }
    catch (err) { Log.warn("creature", `Checkpoint failed: ${String(err)}`); this.message = "Save failed; your garden continues in memory."; }
  }
  private open(mode: Mode): void { this.mode = mode; this.selection = 0; shell.input.clearHeld(); }
  private close(): void { this.mode = "play"; shell.input.clearHeld(); this.screenUi.hide(); }
  private roomWater() { return this.room >= 0 && drainedRoom(this.currentRoom, this.objective) ? { ...this.garden.expedition!, basinRaised: false } : this.garden.expedition!; }
  private climateNow(): Climate { return effectiveClimate(this.garden, this.weather); }
  private endLife(reason: string, died = false): void {
    const count = this.cargo.samples.length + this.cargo.clears.length;
    if (died) { this.cargo = newCargo(); reason += ` Lost ${count} unbanked samples/seals. Banked traits and world changes survive.`; }
    else {
      const crown = this.cargo.clears.includes("hard");
      this.garden = bankCargo(this.garden, this.cargo); this.cargo = newCargo(); this.save();
      if (crown) { this.finish(); return; }
      reason += ` Safely banked ${count} samples/seals for your lineage.`;
    }
    this.message = reason; this.heirs = offspring(this.garden, this.evidence); this.open("climate");
  }
  private startLevel(tier: Difficulty): void {
    const lock = levelLock(tier, this.garden.traits);
    if (lock) { this.message = lock; return; }
    this.travel(levelStart(tier), WATER.spawn); this.close();
  }
  private changeTerrain(kind: Intervention): void {
    const lock = interventionLock(this.garden, kind);
    if (lock) { this.message = lock; return; }
    this.garden = intervene(this.garden, kind); this.save();
    this.message = kind === "raise" ? "Basin raised. Log sluices float open, and deeper water persists across generations." : "Torrent diverted. Finned descendants can now swim against the remaining current.";
    this.close();
  }
  private menuContent(): { text: string; choices: Choice[] } {
    const e = this.garden.expedition!, back = { id: "back", label: "Return to creature", run: () => this.close() };
    switch (this.mode) {
      case "journal": return { text: `LINEAGE JOURNAL · seed ${e.seed}\n\nUnbanked cargo: ${[...this.cargo.samples, ...this.cargo.clears].join(", ") || "none"}. Return to the nest alive.\n\nCompleted Water levels: ${e.completed.join(", ") || "none"}.\nDiscovered adaptations: ${e.unlocked.join(", ") || "none"}.\n\nNavigate the overworld with your creature. Water lies east of the nest; its shoreline has the Easy, Medium and Hard entrances.\n\n${this.garden.history.slice(-6).join("\n")}`,
        choices: [{ id: "back", label: "Return to creature", run: () => this.close() },
          { id: "newworld", label: "Start a different world…", run: () => this.open("newworld") }] };
      case "gardener": return { text: `THE GARDENER\n\nPermanent terrain changes stay with this world. Weather lasts ${WATER.weatherSeconds}s of active exploration; menus and pause stop its clock.\n\nRaise basin: float open the log sluices and fill swimming channels.\nDivert torrent: reduce upstream force; inherited fins are still required.\nRain: slower predators and concealment while hiding.\nDrought: stronger bites, faster predators. Food already gathered does not respawn.\n\nBasin: ${e.basinRaised ? "raised" : "low"}. Torrent: ${e.torrentDiverted ? "diverted" : "wild"}.\n${this.message}`,
        choices: [{ id: "raise", label: e.basinRaised ? "Basin already raised" : "Raise basin · permanent", run: () => this.changeTerrain("raise") },
          { id: "divert", label: e.torrentDiverted ? "Torrent already diverted" : "Divert torrent · permanent", run: () => this.changeTerrain("divert") },
          ...(["flood", "drought"] as Climate[]).map(climate => ({ id: climate, label: climate === "flood" ? "Call rain · 60s" : "Call drought · 60s", run: () => { this.weather = weatherEvent(climate); this.message = `${climate === "flood" ? "Rain" : "Drought"} begins. Its clock runs only during exploration.`; this.close(); } })), back] };
      case "climate": return { text: `${this.message}\n\nTHE NEXT GENERATION\n\nChoose its background climate. Drought favors meat and biting (+1 damage); flood favors plants, slower predators and hiding. Temporary Gardener weather can override this during exploration.\n\nTerrain changes and discovered adaptations survive either choice.`,
        choices: (["drought", "flood"] as Climate[]).map(climate => ({ id: climate, label: climate === "flood" ? "Flood · shelter and plants" : "Drought · meat and stronger bites", run: () => { this.climate = climate; this.open("heir"); } })) };
      case "heir": return { text: `CHOOSE YOUR DAUGHTER · generation ${this.garden.generation + 1}\n\n` + this.heirs.map(h => `${h.name}: STR ${h.traits.strength} · VIT ${h.traits.vitality} · ${this.abilities(h.traits)}\n${h.cause}`).join("\n\n"),
        choices: this.heirs.map((h, n) => ({ id: `heir${n}`, label: h.name, run: () => {
          this.garden = inherit(this.garden, h, this.climate); this.save(); this.newLife(); this.close();
        } })) };
      case "newworld": return { text: "START A DIFFERENT WORLD?\n\nThis replaces this creature checkpoint, its generations and Water discoveries. Your incoming aquatic lineage remains. The new world gets a different seed. Export your save first if you want to keep both worlds.",
        choices: [{ id: "cancel", label: "Keep this world", run: () => this.close() }, { id: "restart", label: "Replace creature world", run: () => {
          const old = this.garden, seed = (old.expedition!.seed + 0x9e3779b9) >>> 0;
          const prev = refreshLineage(shell.saves.load("lineage").envelope?.data);
          this.garden = attachExpedition({ ...old, ...newGarden(old.traits.diet), expedition: undefined }, seed, prev?.species[0]?.stages.aquatic?.parts);
          this.buildWorld(); this.newLife(); this.save(); this.close();
        } }] };
      case "won": return { text: "WATER BIOME COMPLETE\n\nYou crossed the shallows, inherited aquatic adaptations and shaped the torrent with the Gardener.\n\nThis first-biome prototype ends at the Water crown. The full creature stage will open its final region after any two hard biomes. You can keep exploring or test the existing civilization handoff.",
        choices: [{ id: "continue", label: "Continue to civilization", run: () => shell.startGame("civ") },
          { id: "keep", label: "Keep exploring this world", run: () => this.retreat() }] };
      default: return { text: "", choices: [] };
    }
  }
  private abilities(t = this.garden.traits): string { return [t.climb ? "claws" : "", t.gills ? "gills" : "", t.fins ? "swimming fins" : ""].filter(Boolean).join(", ") || "no special adaptations"; }
  private updateMenu(): void {
    const i = shell.input, content = this.menuContent();
    const left = i.takePress("move_left"), uiLeft = i.takePress("ui_left"), up = i.takePress("ui_up");
    const right = i.takePress("move_right"), uiRight = i.takePress("ui_right"), down = i.takePress("ui_down");
    if (left || uiLeft || up) this.selection = Math.max(0, this.selection - 1);
    if (right || uiRight || down) this.selection = Math.min(content.choices.length - 1, this.selection + 1);
    if (i.takePress("ui_accept")) content.choices[this.selection]?.run();
    else if (i.takePress("lens") && this.mode === "gardener") this.close();
  }
  update(_time: number, delta: number): void {
    if (!this.ready) { if (avatarAssetsReady(this)) this.beginCreature(); else return; }
    if (shell.topId !== "play") return;
    if (this.lineage.isOpen) {
      if (shell.input.takePress("ui_accept") || shell.input.takePress("interact")) {
        this.lineage.hide(); this.screenUi.root.inert = false; shell.input.clearHeld(); this.draw();
      }
      return;
    }
    if (this.mode !== "play") { this.updateMenu(); if (this.sys.isActive()) this.draw(); return; }
    const i = shell.input, dt = Math.min(delta / 1000, 0.05) * shell.settings.access.game_speed;
    if (i.takePress("lens")) { this.open("gardener"); this.draw(); return; }
    this.stun = Math.max(0, this.stun - dt);
    this.clock += dt; this.hurt = Math.max(0, this.hurt - dt); this.bite = Math.max(0, this.bite - dt);
    const dir = this.stun > 0 ? 0 : Number(i.isDown("move_right")) - Number(i.isDown("move_left")), crouch = this.stun === 0 && i.isDown("move_down");
    const jump = i.takePress("jump") && this.stun === 0; if (jump) this.evidence.jumps++;
    const attack = i.takePress("attack") && this.stun === 0, altAttack = i.takePress("sink") && this.stun === 0;
    if (dir) this.facing = dir;
    if (this.room < 0) {
      if ((attack || altAttack) && this.bite === 0) this.bite = GEN.biteCooldown;
      // Hubs are physical, safe levels. There is no world/difficulty selection dialog.
      stepBody(this.body, { dir, jump, speed: crouch ? 45 : i.isDown("pace") ? 165 : 105 }, dt,
        (x, y) => hubSolid(this.room === -2, x, y));
      if (this.room === -1) {
        const path = BIOME_PATHS.find(p => nearLandmark(this.body.x, p.x));
        this.message = path ? `E: follow ${path.name} trail${path.name === "Water" ? " to its level entrances." : " · this biome is coming later."}` :
          nearLandmark(this.body.x, OVERWORLD.nest) ? "E: rest at your nest and raise daughters after exploring. Four biome paths lie to the east." : "A/D move · Space jump · explore the four biome trails. Signs mark each destination.";
        if (i.takePress("interact")) {
          if (nearLandmark(this.body.x, OVERWORLD.nest)) this.explored ? this.endLife("You rested at the nest. Your offspring carry this life's discoveries.") : this.message = "Explore Water before raising daughters.";
          else if (path?.name === "Water") this.travel(-2, 64);
          else if (path) this.message = `${path.name} is coming later. Follow Water's trail to play the first biome.`;
        }
      } else {
        const path = WATER_PATHS.find(p => nearLandmark(this.body.x, p.x));
        this.message = path ? levelLock(path.tier, this.garden.traits) || `E: enter ${path.name} · ${path.tier}${this.garden.expedition!.completed.includes(path.tier) ? " · completed" : ""}.` : "Explore the Water shoreline. Three cave trails lead to Easy, Medium and Hard. Walk left to return to the nest.";
        if (i.takePress("interact")) { if (path) this.startLevel(path.tier); else if (this.body.x < 100) this.travel(-1, BIOME_PATHS[0].x, WATER.floor, -1); }
        if (this.room === -2 && this.body.x < 20) this.travel(-1, BIOME_PATHS[0].x, WATER.floor, -1);
      }
    } else {
      this.weather = stepWeather(this.weather, dt); this.hunger += dt; this.objective = tickObjective(this.objective, dt);
      const r = this.currentRoom;
      const wasSealed = sealedEncounter(this.objective);
      this.objective = encounterLock(r, this.objective, this.enemies, this.body.x);
      if (!wasSealed && sealedEncounter(this.objective)) this.message = "Encounter sealed! Defeat all threats, or rig and arm the net, then lure attacks through it, or fight/subdue. Evasion does not break this seal.";
      stepWaterBody(this.body, r, this.roomWater(), this.garden.traits, { dir,
        vertical: this.stun > 0 ? 0 : Number(crouch) - Number(i.isDown("move_up") || i.isDown("jump")), jump, crouch, stunned: this.stun > 0, braced: !!this.operation && !dir && !crouch && !i.isDown("move_up") && !jump, sprint: i.isDown("pace") }, dt, this.objective);
      const underwater = inWater(this.body, this.roomWater()) && this.body.y - this.body.h > waterline(this.roomWater());
      this.oxygen = underwater && !this.garden.traits.gills ? Math.max(0, this.oxygen - dt) : WATER.oxygenSeconds;
      if (this.oxygen === 0 && this.hurt === 0) { this.hp--; this.hurt = GEN.damageGrace; this.message = "Out of breath! Swim up or return. Gills must be inherited by a daughter."; }
      if ((attack || altAttack) && this.bite === 0) {
        this.bite = GEN.biteCooldown;
        for (const e of this.enemies) if (activeThreat(e) && Math.abs(e.x - this.body.x) < GEN.biteReach && Math.abs(e.y - (this.body.y - 16)) < 30 && Math.sign(e.x - this.body.x) === this.facing && clearWaterLine(r, this.garden.expedition!.basinRaised, this.body.x, this.body.y - 16, e.x, e.y, this.objective)) {
          e.hp -= biteDamage(e, this.garden.traits.strength + (this.climateNow() === "drought" ? 1 : 0));
          const pushed = e.x + this.facing * 10;
          if (!boxHits(pushed, e.y + 8, 16, 16, (tx, ty) => objectiveBarrier(r, this.objective, tx) || challengeSolid(r, this.roomWater().basinRaised, tx, ty, this.objective))) e.x = pushed;
          this.evidence.fights++;
          if (e.hp <= 0) this.food.push({ x: e.x, meat: true, taken: false });
        }
      }
      this.stepEnemies(dt, crouch);
      this.objective = encounterLock(r, this.objective, this.enemies, this.body.x);
      if (hasVent(r) && ventPhase(this.clock) === "active" && Math.abs(this.body.x - ENCOUNTER.ventX) < ENCOUNTER.ventRadius && this.body.y > 267 && this.hurt === 0) {
        this.hp--; this.hurt = GEN.damageGrace; this.body.vy = -150; this.message = "Scalding vent! Bubbles warn first: wait for it to stop, or swim over the plume.";
      }
      if (switchback(r) && !this.foodCache && Math.abs(this.body.x - ENCOUNTER.cacheX) < 18 && Math.abs(this.body.y - ENCOUNTER.cacheY) < 10) {
        this.foodCache = true; this.hp = Math.min(GEN.health + this.garden.traits.vitality, this.hp + ENCOUNTER.cacheHeal);
        this.hunger = Math.max(0, this.hunger - WATER.foodRelief * 2); this.message = "Shaft cache found: compatible food restores health and hunger. The detour paid off.";
        if (this.garden.traits.diet === "carnivore") this.evidence.meat++; else this.evidence.plants++;
      }
      for (const f of this.food) if (!f.taken && Math.abs(f.x - this.body.x) < 20 && this.body.y > 275 && edible(this.garden.traits.diet, f.meat)) {
        f.taken = true; this.hunger = Math.max(0, this.hunger - WATER.foodRelief); this.hp = Math.min(GEN.health + this.garden.traits.vitality, this.hp + GEN.foodHeal);
        if (f.meat) this.evidence.meat++; else this.evidence.plants++;
      }
      if (this.operation) {
        this.operation = advanceOperation(this.operation, this.body.x, this.body.y, this.hp, this.enemies.filter(e => clearWaterLine(r, this.roomWater().basinRaised, this.body.x, this.body.y - 16, e.x, e.y, this.objective)), dt);
        if (!this.operation) this.message = "Control interrupted. Lure the guard away or disable it, then E and remain still for two seconds.";
        else if (this.operation.elapsed >= CONTROL_SECONDS) {
          const result = useValve(r, this.objective, this.body.x, this.body.y);
          this.objective = result.state; this.message = result.message; this.operation = null;
        }
      }
      if (i.takePress("interact") && this.stun === 0) this.interact();
      // Interact can change room/mode; never continue operating on its previous room.
      if (this.mode === "play" && this.room === r.id) {
        if (this.body.x > 625) r.right >= 0 ? this.travel(r.right, WATER.spawn) : this.message = "E claims the goal. Turn back through the rooms and shoreline to reach the nest alive.";
        else if (this.body.x < 20) {
          if (r.left >= 0) { const a = horizontalReturn(r.id, r.left); this.travel(a.room, a.x, a.y, a.facing); }
          else this.travel(-2, WATER_PATHS.find(p => p.tier === r.tier)!.x, WATER.floor, -1);
        }
        if (this.room === r.id) {
          const arrival = verticalArrival(r.id, this.body.x, this.body.y, this.objective);
          if (arrival) this.travel(arrival.room, arrival.x, arrival.y, arrival.facing, arrival.vy);
          else if (pitRoom(r.id) && this.body.y > 338) {
            this.hp -= 3; this.hurt = GEN.damageGrace; this.stun = 0.5; this.operation = null;
            this.body = newBody(96, WATER.floor); this.message = "Spiked pit! Lost 3 health. Jump across the marked gap; the recovery ledge is at its near side.";
          }
        }
        if (r.gate && !this.garden.expedition!.basinRaised && Math.abs(this.body.x - r.gateX) < 45) this.message = "Sealed log sluice: only the Gardener can open it. Use Gardener → Raise basin.";
      }
      if (this.hunger >= WATER.hungerSeconds) { this.hp--; this.hunger = WATER.hungerSeconds - 15; this.message = "Hungry: find compatible food or return to raise a daughter."; }
      if (this.hp <= 0) this.endLife("This creature's life ended.", true);
    }
    // Select atlas frames on the scene clock: avoids re-entering Phaser's animation-start path on pose changes.
    const pose = this.bite > 0.15 ? "bite" : !this.body.onGround ? "jump" : crouch ? "crouch" : dir ? "walk" : "idle";
    const frame = POSE_START[pose] + (shell.settings.access.reduce_motion ? 0 : Math.floor(this.clock * 8) % 4);
    this.player.setPosition(this.body.x, this.body.y - 16).setFlipX(this.facing < 0).setFrame(frame)
      .setTint(this.garden.traits.gills ? 0xa4dfe5 : this.garden.traits.climb ? 0xb1e5ba : 0xffffff)
      .setAlpha(this.hurt > 0 ? 0.6 : 1).setScale(1 + this.garden.traits.vitality * 0.015);
    this.draw();
  }
  private stepEnemies(dt: number, crouch: boolean): void {
    const r = this.currentRoom, flood = this.climateNow() === "flood";
    for (const [lane, e] of this.enemies.entries()) {
      e.sprite.setVisible(e.hp > 0); e.label.setVisible(e.hp > 0); if (e.hp <= 0) continue;
      if (e.incapacitated) { e.sprite.setTint(0x86959b).setAlpha(0.55).setAngle(80); e.label.setPosition(e.trapped ? NET.x - 36 : e.x, e.trapped ? 232 + lane * 16 : e.y - 26 - lane * 18).setText(e.trapped ? "NETTED" : "SUBDUED"); continue; }
      const reeds = reedCover(r, this.body.x);
      // S steers a swimmer down; it is not universal invisibility in open water.
      const hidden = crouch && (flood || reeds) && (!inWater(this.body, this.roomWater()) || reeds && this.body.y > 285);
      const hit = stepEnemy(e, { x: this.body.x, y: this.body.y - 16, hidden: hidden || !clearWaterLine(r, this.garden.expedition!.basinRaised, e.x, e.y, this.body.x, this.body.y - 16, this.objective),
        submerged: this.body.y - this.body.h > waterline(this.roomWater()) }, dt, flood,
        r.gate && !this.garden.expedition!.basinRaised ? r.gateX + 28 : e.kind === "swimmer" ? 152 : 72,
        (x, y) => boxHits(x, y + 8, 16, 16, (tx, ty) => objectiveBarrier(r, this.objective, tx) || challengeSolid(r, this.garden.expedition!.basinRaised, tx, ty, this.objective)));
      if (netCatches(this.objective, e)) {
        e.incapacitated = true; e.trapped = true; this.objective.netArmed = false; this.objective.netCaught = (this.objective.netCaught ?? 0) + 1;
        this.evidence.solves++; this.message = "Net immobilized a healthy threat! No bite required. E at the frame rearms it for another enemy.";
      } else if (hit && this.hurt === 0) {
        this.hp -= ENEMIES[e.kind].damage; this.hurt = GEN.damageGrace; this.stun = ENEMIES[e.kind].stun; this.operation = null;
        if (this.stun > 0) { this.body.vx = e.facing * 180; this.body.vy = -120; }
        this.message = `${ENEMIES[e.kind].name} hit for ${ENEMIES[e.kind].damage}! ${this.stun > 0 ? "Stunned briefly. " : ""}Dodge the tell, or rig a net and lure it through.`;
      }
      const avoided = evasion(e, this.body.x, this.body.y - 16, hidden);
      if (avoided) {
        e.passed = true; if (avoided === "stealth") this.evidence.sneaks++; else this.evidence.solves++;
        this.message = avoided === "stealth" ? "Passed unseen: stealth shaped your descendants." : "Evaded through a safer route: adaptable exploration recorded.";
      }
      const tint = e.phase === "tell" ? 0xffb75c : e.phase === "recover" ? 0xbbb1d8 : ENEMIES[e.kind].tint;
      e.sprite.setPosition(e.x, e.y).setFlipX(e.facing < 0).setTint(tint).setScale(e.kind === "charger" ? 1.25 : e.kind === "ambusher" ? 0.85 : 1)
        .setAlpha(e.kind === "ambusher" && e.phase === "patrol" ? 0.6 : 1);
      const tell = canIncapacitate(e, this.body.x, this.body.y) ? "E: SUBDUE" : e.phase === "tell" ? "! DODGE" : e.phase === "recover" ? "OPEN" : e.phase === "strike" ? "RUSH" : e.kind.toUpperCase();
      e.label.setPosition(e.x, e.y - 22 - lane * 18).setText(tell);
    }
  }
  private interact(): void {
    const r = this.currentRoom, x = this.body.x;
    const net = this.enemies.length ? useNet(this.objective, x, this.body.y) : null;
    if (net) { this.objective = net.state; this.message = net.message; return; }
    const subdued = this.enemies.find(e => canIncapacitate(e, x, this.body.y) && clearWaterLine(r, this.roomWater().basinRaised, x, this.body.y - 16, e.x, e.y, this.objective));
    if (subdued) { subdued.incapacitated = true; this.evidence.solves++; this.objective = encounterLock(r, this.objective, this.enemies, x); this.message = "Threat subdued for this life. It will not attack or hold the encounter seal."; return; }
    const valve = useValve(r, this.objective, x, this.body.y);
    if (valve.used) {
      if (sealedEncounter(this.objective)) { this.message = "Encounter seal holds the controls. Defeat all threats, or wound and E during recovery to subdue."; return; }
      const index = valves(r).findIndex(v => Math.abs(x - v.x) < 28 && Math.abs(this.body.y - v.y) < 25);
      if (guardedControl(r, index)) {
        this.operation = { x, y: this.body.y, hp: this.hp, elapsed: 0 };
        this.message = "Operating guarded control: remain still for two seconds. Nearby active guards or damage interrupt."; return;
      }
      this.objective = valve.state; this.message = valve.message; return;
    }
    if (leftExit(r) && Math.abs(x - 128) < 28 && Math.abs(this.body.y - 236) < 25) {
      if (this.objective.open) this.travel(r.right, WATER.spawn);
      else this.message = "Onward hatch locked. Prime the shaft relay, release the far lower latch, then come back here.";
      return;
    }
    // Entrance rigging is handled first; the adjacent nursery arch remains a separate route.
    if (r.branch >= 0 && Math.abs(x - 126) < WATER.interactReach) { this.travel(r.branch, WATER.spawn); return; }
    if (r.reward && x > 550) {
      const had = this.garden.expedition!.unlocked.includes(r.reward);
      if (!had && !this.cargo.samples.includes(r.reward)) this.cargo.samples.push(r.reward);
      this.message = had ? "This adaptation is already available to your daughters." : `${r.reward === "gills" ? "Gills" : "Swimming fins"} discovered! Your body stays the same; CARRY IT HOME ALIVE to bank it, then choose ${r.reward === "gills" ? "Tidefoot" : "Reedheart"}. Death or reloading loses carried samples.`;
      if (!r.goal) return;
    }
    if (r.goal && x > 550) {
      const released = emergencyRelease(r, this.objective, x);
      if (released !== this.objective) { this.objective = released; this.message = "Pressure expired. Emergency latch opens the return route, but not the seal. Go back to recharge the lower control and reset the raised wheel."; return; }
      if (this.enemies.some(e => activeThreat(e) && !e.passed)) { this.message = "Clear the goal by fighting, subduing, passing unseen, or rigging a net and luring threats through it."; return; }
      if (!canClaimSeal(this.objective)) { this.message = "Seal locked: solve the marked controls or reset the pressure wheel, then reach the seal in time."; return; }
      this.objective = { ...this.objective, remaining: 0 };
      if (!this.cargo.clears.includes(r.tier)) this.cargo.clears.push(r.tier);
      this.message = `Water ${r.tier} seal secured. Turn back and bring it to the nest alive. Surviving enemies still threaten the return journey.`;
    }
  }
  private finish(): void {
    try {
      const prev = shell.saves.load("lineage").envelope?.data, e = this.evidence;
      const garden = { ...this.garden }; delete garden.source;
      const next = writeStage(prev, "creature", [{ cause: `Water crown, generation ${garden.generation}: ${e.fights} bites, ${e.sneaks} unseen passages, ${e.solves} environmental solutions.`, effect: { aggressive: e.fights * 0.02, cautious: e.sneaks * 0.04, adaptable: e.solves * 0.04 } },
        { cause: garden.expedition!.interventions.join(" "), effect: { adaptable: garden.expedition!.interventions.length * 0.03 } }],
      { ...garden, diet: garden.traits.diet, hero: { ...garden.traits }, traits: [garden.traits.climb ? "climbing claws" : "", garden.traits.gills ? "gills" : "", garden.traits.fins ? "swimming fins" : ""].filter(Boolean), abilities: [garden.traits.climb ? "climb" : "", garden.traits.gills ? "gills" : "", garden.traits.fins ? "swim" : ""].filter(Boolean) });
      shell.saves.save("lineage", next as unknown as Parameters<typeof shell.saves.save>[1]); this.save(); this.open("won");
    } catch (err) { Log.warn("creature", String(err)); this.message = "Could not save the hero. Try claiming the crown again."; }
  }
  private draw(): void {
    const g = this.gfx; g.clear();
    if (this.room < 0) drawHub(g, this.room === -2, this.garden.traits, this.garden.expedition!);
    else drawWaterRoom(g, this.currentRoom, this.roomWater(), this.food, this.trap, this.clock, this.foodCache, this.objective);
    for (const foe of this.enemies) if (foe.kind === "dropper" && activeThreat(foe)) {
      g.fillStyle(foe.phase === "tell" ? 0xe9b55e : 0x111e27, 0.65).fillEllipse(foe.x, 300, 46, 9);
      if (foe.phase === "tell") g.lineStyle(2, 0xe9b55e).strokeRect(foe.x - 22, 238, 44, 65);
    }
    if (this.debugEncounters) for (const e of this.enemies) if (e.hp > 0) {
      g.lineStyle(1, 0xf1d478, 0.5).strokeCircle(e.x, e.y, ENEMIES[e.kind].detect);
      g.lineStyle(2, 0xffae72).lineBetween(e.x, e.y, e.x + e.facing * 80, e.y + e.aimY * 80);
    }
    const t = this.garden.traits, e = this.garden.expedition!, weather = this.weather.remaining > 0 ? `${this.weather.climate} ${Math.ceil(this.weather.remaining)}s` : this.garden.climate;
    this.screenUi.setStatus(`G${this.garden.generation} · ${this.room === -1 ? "Overworld" : this.room === -2 ? "Water shoreline" : this.currentRoom.name} · HP ${this.hp}/${GEN.health + t.vitality} · Carrying ${this.cargo.samples.length + this.cargo.clears.length}${this.room >= 0 && this.objective.netArmed ? " · NET READY" : ""}${this.room >= 0 && sealedEncounter(this.objective) ? " · SEALED: " + this.enemies.filter(activeThreat).length + " threats" : ""}`,
      `UNBANKED: ${[...this.cargo.samples, ...this.cargo.clears.map(t => t + " seal")].join(", ") || "none"}\nBring these to the nest alive. Death/reload loses unbanked cargo.\nSeed ${e.seed} · generator v${WATER.version}\n${t.diet} · STR ${t.strength} · VIT ${t.vitality} · ${this.abilities()}\nFood ${Math.max(0, Math.round(100 - this.hunger / WATER.hungerSeconds * 100))}% · Air ${Math.ceil(this.oxygen)}s · ${weather}\nBasin ${e.basinRaised ? "raised" : "low"} · torrent ${e.torrentDiverted ? "diverted" : "wild"}\nUnlocked for daughters: ${e.unlocked.join(", ") || "none"}\nCompleted: ${e.completed.join(", ") || "none"}\nA/D move · W/Space swim up · S swim down/hide · J/F bite · E use · U Gardener\n\n${this.garden.history.slice(-8).join("\n")}`);
    const view = this.cameras.main.worldView;
    const unseen = this.enemies.find(e => activeThreat(e) && Math.abs(e.x - this.body.x) < 180 && (e.x < view.left || e.x > view.right));
    const warning = this.enemies.find(e => activeThreat(e) && e.phase === "tell" && Math.abs(e.x - this.body.x) < 180);
    this.screenUi.setMessage(this.stun > 0 ? `STUNNED · ${this.stun.toFixed(1)}s` : this.operation ? `OPERATING: ${Math.floor(this.operation.elapsed / CONTROL_SECONDS * 100)}% · stay still; guards interrupt.` : this.room >= 0 && this.objective.remaining > 0 ? `PRESSURE GATE: ${Math.ceil(this.objective.remaining)}s · cross the vent or rearm the wheel.` : warning ? `${ENEMIES[warning.kind].name} is preparing an attack! Change height or get behind it; strike during recovery.` : unseen && !shell.input.isDown("move_down") ? `Predator approaching from the ${unseen.x < this.body.x ? "left" : "right"}.` : this.message);
    const actions: StageAction[] = [action("use", "interact", "Use / study"), action("jump", "jump", "Jump"), action("bite", "attack", "Bite"),
      { id: "gardener", label: "Gardener", run: () => this.open("gardener") }, { id: "journal", label: "Journal", run: () => this.open("journal") }];
    this.screenUi.actions(actions);
    if (this.mode === "play") this.screenUi.hide();
    else {
      const content = this.menuContent(); this.selection = Math.min(this.selection, content.choices.length - 1);
      this.screenUi.show(`${content.text}\n\nSelected: ${content.choices[this.selection]?.label ?? ""}`, content.choices.map((c, n) => ({ ...c, run: () => { this.selection = n; shell.input.clearHeld(); c.run(); if (this.sys.isActive()) this.draw(); } })));
    }
  }
}

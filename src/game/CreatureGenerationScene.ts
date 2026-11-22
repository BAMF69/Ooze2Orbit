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
import { WATER, generateWater, type Difficulty, type WaterWorld, type WaterRoom } from "./creature/waterWorld";
import { generateWaterV2, levelEntry, isWorldV2, remapVisited } from "./creature/levelgen/world";
import { keysOf } from "./creature/levelgen/keys";
import { currentAdvice, levelAdvice, heirNote, generationPlan } from "./creature/guidance";
import { creatureIcon, equipmentRows } from "./creature/creatureIcons";
import { minimapModel, drawMinimap } from "./creature/minimap";
import { attachExpedition, classFromTemperament, intervene, interventionLock, levelLock, weatherEvent, stepWeather, effectiveClimate, canRefreshLevel, refreshLevel, type Weather, type Intervention } from "./creature/expedition";
import { stepWaterBody, inWater, isSubmerged, waterlineAt } from "./creature/waterPhysics";
import { drawWaterRoom, type WaterFood } from "./creature/waterView";
import { OVERWORLD, BIOME_PATHS, WATER_PATHS, hubSolid, nearLandmark } from "./creature/overworld";
import { drawHub, hubLabels } from "./creature/overworldView";
import { AVATAR_ASSETS, avatarAssetsReady, queueAvatarAssets } from "./creature/avatarAssets";
import { AvatarView } from "./creature/avatarView";
import { addFoeSprite, poseHdFoe } from "./creature/foeView";
import { RoomArt } from "./creature/roomArt";
import { avatarDiet, avatarFamily, wornTraits, type AvatarFamily, type AvatarLook } from "./creature/avatarLook";
import { ENEMIES, ENCOUNTER, spawnEncounters, stepEnemy, biteDamage, evasion, reedCover, ventPhase, type WaterEnemy } from "./creature/waterEncounters";
import { challengeSolid, clearWaterLine } from "./creature/waterChallenges";
import { newObjective, newCargo, valves, useKeyed, canCollectReward, drainedRoom, tickObjective, useValve, bankCargo, objectiveBarrier, canClaimSeal, emergencyRelease, type RoomObjective, type Cargo } from "./creature/waterObjectives";
import { arenaRoom, activeThreat, encounterLock, sealedEncounter, guardedControl, CONTROL_SECONDS, advanceOperation, canIncapacitate, type Operation } from "./creature/waterCombatRooms";
import { netRig, netFrame, useNet, netCatches } from "./creature/waterTraps";
import { latched, roomSpec, roomGeometry, roomLabel } from "./creature/levelgen/roomSpec";
import { rightEdgeX, leftEdgeX, bottomEdgeY, goalX, regionAt, type RoomGeometry } from "./creature/levelgen/geometry";
import { verticalArrival, horizontalReturn, pitRoom } from "./creature/waterRoutes";
import { StageUi, action, type StageAction } from "./stageUi";
import { LineagePanel } from "./lineagePanel";
import { CreatureHud } from "./creature/hud";
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
  /** HD avatar (creature-hd): body + worn-trait strips; `player` is its anchor sprite. */
  private avatar!: AvatarView;
  private incoming!: Pick<AvatarLook, "family" | "diet">;
  /** Illustrated Water terrain drawn from live collision (creature-hd). */
  private roomArt!: RoomArt;
  private gfx!: Phaser.GameObjects.Graphics;
  private landmarks: Phaser.GameObjects.Text[] = [];
  private ready = false;
  private debugEncounters = new URLSearchParams(location.search).has("debug");
  private screenUi!: StageUi;
  private creatureHud!: CreatureHud;
  private lineage!: LineagePanel;
  private mode: Mode = "play";
  private selection = 0;
  private heirs: Heir[] = [];
  private climate: Climate = "flood";
  private evidence = evidence();
  private hp = GEN.health;
  private hunger = 0;
  private oxygen = WATER.oxygenSeconds as number;
  private wasWet = false;
  private rack!: HTMLDivElement;
  private rackNote!: HTMLDivElement;
  private rackKey = "";
  private minimap!: HTMLCanvasElement;
  private minimapPanel!: HTMLDivElement;
  private minimapKey = "";
  private hudColumn!: HTMLDivElement;
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
  private classSkill: "roar" | "burrow" | "tool" = "roar";
  private message = "Four paths leave the nest. Water is the first playable biome.";
  constructor() { super("creature"); }
  preload(): void {
    // Direct image loading avoids the intermittent XHR -> blob URL decode failures seen in
    // the desktop browser. Both paths are supported by Phaser; this choice is creature-local.
    this.load.imageLoadType = "HTMLImageElement";
    this.incoming = this.incomingLook();
    queueAvatarAssets(this, this.incoming);
    if (new URLSearchParams(location.search).has("debug")) {
      Log.info("creature", `Avatar preload queued ${this.load.list.size}; cached ${AVATAR_ASSETS.map(a => `${a.key}:${this.textures.exists(a.key)}`).join(",")}`);
      this.load.on("loaderror", (file: Phaser.Loader.File) => Log.warn("creature", `Avatar load failed: ${file.key} ${file.src}`));
      this.load.once("complete", () => Log.info("creature", `Avatar preload complete ${this.load.totalComplete}/${this.load.totalFailed}; ready ${avatarAssetsReady(this, this.incoming)}`));
    }
  }
  create(): void {
    this.ready = false;
    this.screenUi = new StageUi(this);
    this.screenUi.root.classList.add("creature-expedition");
    this.creatureHud = new CreatureHud(this, this.screenUi);
    // Equipment rack in the top right, styled like the cell stage's (shared .cell-icon-rack classes, no CSS edits).
    this.rack = document.createElement("div"); this.rack.className = "cell-icon-rack creature-icon-rack";
    this.rackNote = document.createElement("div"); this.rackNote.className = "cell-icon-note"; this.rackNote.hidden = true;
    // Top-right column: equipment rack, then the level minimap, then the tapped-icon note (no shared CSS edits).
    const column = document.createElement("div");
    column.className = "creature-hud-column";
    Object.assign(column.style, { position: "absolute", right: "calc(var(--safe-right) + 12px)", top: "calc(var(--safe-top) + 60px)", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", pointerEvents: "none" });
    this.rack.style.position = "static"; this.rackNote.style.position = "static";
    this.minimapPanel = document.createElement("div"); this.minimapPanel.className = "cell-icon-rack creature-minimap"; this.minimapPanel.style.position = "static";
    this.minimapPanel.setAttribute("role", "img");
    this.minimap = document.createElement("canvas"); this.minimap.style.display = "block"; this.minimapPanel.append(this.minimap);
    column.append(this.rack, this.minimapPanel, this.rackNote); this.screenUi.root.append(column); this.hudColumn = column;
    if (avatarAssetsReady(this, this.incoming)) this.beginCreature();
    else {
      Log.warn("creature", `Creature textures not ready: ${AVATAR_ASSETS.map(a => `${a.key}:${this.textures.exists(a.key) ? this.textures.get(a.key).getFrameNames().length : "absent"}`).join(", ")}`);
      // create runs inside the loader's complete event. Start retries on the next scene tick,
      // after its original completion handlers have finished clearing their queues.
      this.time.delayedCall(0, () => { if (!this.ready) this.retryAvatars(); });
    }
  }
  private retryAvatars(): void {
    this.screenUi.show("Loading creature bodies…", []);
    this.load.reset(); queueAvatarAssets(this, this.incoming);
    this.load.once("complete", () => {
      if (avatarAssetsReady(this, this.incoming)) this.beginCreature();
      else this.screenUi.show("Creature images could not be loaded. Your checkpoint is unchanged. Retry to load the player and predators before exploring.",
        [{ id: "retry-assets", label: "Retry creature images", run: () => this.retryAvatars() }]);
    });
    this.load.start();
  }
  private beginCreature(): void {
    if (this.ready) return;
    this.gfx = this.add.graphics();
    this.avatar = new AvatarView(this, { ...this.incoming, worn: [] }, 64, WATER.floor - 16);
    this.player = this.avatar.anchor;
    this.roomArt = new RoomArt(this);
    this.cameras.main.setBounds(0, 0, 640, 360).startFollow(this.player, true, 0.15, 0.15);
    const prev = shell.saves.load("lineage").envelope?.data, reveal = revealFrom(prev, 3, "creature");
    const home = refreshLineage(prev)?.species[0];
    const source = creatureSource(prev, reveal.diet);
    const seed = this.requestedSeed();
    this.classSkill = classFromTemperament(Object.fromEntries(reveal.rows.map(r => [r.kind, r.pct])) as { aggressive: number; cautious: number; adaptable: number });
    this.garden = attachExpedition(resumeGarden(shell.saves.load("creature_generations").envelope?.data, reveal.diet, source), seed, home?.stages.aquatic?.parts, this.classSkill);
    this.buildWorld(); this.newLife(); this.close(); this.save();
    // An isolated, local art review opens the actual room renderer at the comparison position.
    const review = new URLSearchParams(location.search);
    if (import.meta.env.DEV && review.get("creatureArtReview") === "reed-shallows"
      && review.get("data-dir") === "creature-art-review-v2" && this.garden.expedition?.seed === 0) {
      this.enter(1, 320);
    }
    this.lineage = new LineagePanel(this);
    if (!new URLSearchParams(location.search).has("autoplay")) {
      this.lineage.show(reveal, "Begin exploring"); this.screenUi.root.inert = true; shell.input.clearHeld();
    }
    this.ready = true; this.draw();
  }
  /**
   * The HD body to load before play: family from the incoming temperament reveal, diet from the lineage, exactly
   * as beginCreature resolves them (resumeGarden keeps a checkpoint only when its diet matches the reveal).
   */
  private incomingLook(): Pick<AvatarLook, "family" | "diet"> {
    const reveal = revealFrom(shell.saves.load("lineage").envelope?.data, 3, "creature");
    const pct = Object.fromEntries(reveal.rows.map(r => [r.kind, r.pct])) as Partial<Record<AvatarFamily, number>>;
    // Dev override for art review only: ?avatarFamily=cautious&avatarDiet=carnivore (ignored unless valid).
    const q = new URLSearchParams(location.search), qf = q.get("avatarFamily");
    const family = qf === "aggressive" || qf === "cautious" || qf === "adaptable" ? qf : avatarFamily(pct);
    return { family, diet: avatarDiet(q.get("avatarDiet") ?? reveal.diet) };
  }
  private requestedSeed(): number {
    const raw = new URLSearchParams(location.search).get("creatureSeed");
    return raw !== null && /^\d+$/.test(raw) && Number(raw) <= 0xffffffff ? Number(raw) : crypto.getRandomValues(new Uint32Array(1))[0];
  }
  /** Seed refresh (CREATURE_LEVELGEN.md §7a): a cleared level gets a fresh map to grind on. The other levels keep
   *  their maps; room ids shift, so visited rooms are remapped by graph node and this life's room states reset. */
  private refreshMap(tier: Difficulty): void {
    const before = this.world;
    this.garden = refreshLevel(this.garden, tier); this.buildWorld();
    if (isWorldV2(before) && isWorldV2(this.world)) this.garden.expedition!.visited = remapVisited(before, this.world, this.garden.expedition!.visited, tier);
    this.rooms.clear(); this.save();
    this.message = `A fresh path opens through Water ${tier}. Its rooms are new; the other levels are unchanged.`;
  }
  /** A version 1 save replays its frozen skeleton unchanged; every new world comes from the graph generator. */
  private buildWorld(): void {
    const e = this.garden.expedition!;
    this.world = e.version === 1 ? generateWater(e.seed) : generateWaterV2(e.seed, this.garden.traits.classSkills ?? [this.classSkill], e.rerolls);
    if (this.world.fallback) Log.warn("creature", `Generator fallback: ${this.world.rejected.join("; ")}`);
    Log.info("creature", `Water world seed ${this.world.seed}, generator v${this.world.version}, G${this.garden.generation}`);
  }
  private newLife(): void {
    this.rooms.clear(); this.evidence = evidence(); this.explored = false; this.cargo = newCargo();
    this.hp = GEN.health + this.garden.traits.vitality; this.hunger = 0;
    this.oxygen = WATER.oxygenSeconds; this.hurt = 0; this.stun = 0; this.bite = 0; this.clock = 0;
    this.weather = { climate: this.garden.climate, remaining: 0 }; this.enter(-1, OVERWORLD.nest);
  }
  private get currentRoom(): WaterRoom { return this.roomById(this.room); }
  /** Geometry of the current Water room (one v1 screen unless the room is larger). */
  private get geom(): RoomGeometry { return roomGeometry(this.currentRoom); }
  private roomById(id: number): WaterRoom { return this.world.rooms.find(r => r.id === id)!; }
  private remember(): void {
    if (this.room < 0) return;
    this.rooms.set(this.room, { food: this.food, foes: this.enemies.map(({ sprite: _sprite, label: _label, ...e }) => ({ ...e })), trap: this.trap, cache: this.foodCache, objective: { ...this.objective } });
  }
  private enter(id: number, x: number, y: number = WATER.floor, facing: number = x > 500 ? -1 : 1, vy = 0): void {
    this.operation = null;
    this.landmarks.forEach(label => label.destroy()); this.landmarks = [];
    // Hubs scroll across their own width; a Water room across its geometry (one screen for v1 rooms).
    const g = id >= 0 ? roomGeometry(this.roomById(id)) : null;
    const width = id === -1 ? OVERWORLD.width : id === -2 ? OVERWORLD.waterWidth : g!.width;
    this.cameras.main.setBounds(0, 0, width, g?.height ?? 360);
    if (id < 0) this.landmarks = hubLabels(id === -2).map(p => this.add.text(p.x, p.y, p.text,
      { fontFamily: "monospace", fontSize: "10px", color: "#ecedd4", align: "center", backgroundColor: "#132b2bcc", padding: { x: 5, y: 4 } }).setOrigin(0.5, 0).setResolution(2).setDepth(6));
    this.room = id; this.enemies.forEach(e => { e.sprite.destroy(); e.label.destroy(); }); this.enemies = [];
    this.body = newBody(x, y); this.body.vy = vy; this.facing = facing; this.oxygen = WATER.oxygenSeconds;
    this.player.setPosition(x, y - 16).setFlipX(facing < 0);
    if (id < 0) { this.food = []; this.message = id === -1 ? "Explore the four trails. Walk right to Water; E at the nest raises daughters." : "Follow the shore to the three level entrances. E enters a trail; walk left to return to the overworld."; return; }
    this.explored = true;
    const e = this.garden.expedition!;
    if (!e.visited.includes(id)) { e.visited.push(id); this.save(); }
    const r = this.currentRoom, spec = roomSpec(r), old = this.rooms.get(id), climate = this.climateNow();
    this.trap = old?.trap ?? false; this.foodCache = old?.cache ?? false;
    this.objective = old?.objective ? { ...old.objective } : newObjective();
    if (spec.verticalOpenFrom !== null && this.rooms.get(spec.verticalOpenFrom)?.objective.open) this.objective.verticalOpen = true;
    if (spec.farOpenFrom != null) this.objective.farOpen = latched(this.rooms.get(spec.farOpenFrom)?.objective); // a channel's finale hatch
    this.landmarks = valves(r).map((v, n) => this.add.text(v.x, v.y - 24, `${n + 1} · ${v.text.split(" · ").at(-1)}${guardedControl(r, n) ? " · E + stay 2s" : ""}`, { fontFamily: "monospace", fontSize: "10px", color: "#fff0bd", backgroundColor: "#172b2a", padding: { x: 3, y: 3 } }).setOrigin(0.5, 1).setDepth(7));
    if (spec.keyed) this.landmarks.push(this.add.text(spec.keyed.x, spec.keyed.y - 40, spec.keyed.opens === "keyOpen" ? `E: ${r.name.toUpperCase()}\n${(spec.variant ?? "").replace("tool", "tool use").toUpperCase()} LINEAGE` : "E: GROTTO SHAFT", { fontFamily: "monospace", fontSize: "10px", color: "#f0d79c", align: "center", backgroundColor: "#172b2a" }).setOrigin(0.5, 1).setDepth(7));
    if (spec.leftHatch) this.landmarks.push(this.add.text(spec.leftHatch.x, spec.leftHatch.y - 40, "← ONWARD HATCH\nReturn after both controls", { fontFamily: "monospace", fontSize: "10px", color: "#bfe7d8", align: "center" }).setOrigin(0.5, 1).setDepth(7));
    if (arenaRoom(r)) this.landmarks.push(this.add.text(98, 194, "ENCOUNTER SEAL\nDefeat / subdue / trap", { fontFamily: "monospace", fontSize: "10px", color: "#ffcf91", align: "center" }).setOrigin(0.5, 1).setDepth(7));
    if (this.enemies.length || spawnEncounters(r).length) {
      this.landmarks.push(this.add.text(netRig(r).x, netRig(r).y - 44, "E: RIGGING", { fontFamily: "monospace", fontSize: "10px", color: "#f0d79c", backgroundColor: "#172b2a" }).setOrigin(0.5, 1).setDepth(7));
      this.landmarks.push(this.add.text(netFrame(r).x, netFrame(r).y - 80, "E: NET\nLure here", { fontFamily: "monospace", fontSize: "10px", color: "#f0d79c", align: "center", backgroundColor: "#172b2a" }).setOrigin(0.5, 1).setDepth(7));
    }
    for (const op of spec.openings) if (op.label.always || this.objective.verticalOpen) this.landmarks.push(this.add.text((op.tiles[0] + op.tiles[1] + 1) * 8, op.side === "top" ? 104 : 312, op.label.text, { fontFamily: "monospace", fontSize: "10px", color: "#bfe7d8", align: "center" }).setOrigin(0.5, 0).setDepth(7));
    this.food = old?.food ?? r.food.map((x, n) => ({ x, meat: climate === "drought" ? n !== 0 : n === 3, taken: false }));
    this.enemies = (old?.foes ?? spawnEncounters(r)).map(foe => ({ ...foe,
      sprite: addFoeSprite(this, foe),
      label: this.add.text(foe.x, foe.y - 26, ENEMIES[foe.kind].name, { fontFamily: "monospace", fontSize: "11px", color: "#eef0d9", backgroundColor: "#12272bcc", padding: { x: 3, y: 2 } }).setOrigin(0.5, 1).setResolution(1).setDepth(6)
    }));
    this.message = spec.hint.priority ??
      (r.gate && !e.basinRaised ? "A sealed log sluice blocks the passage. Open the Gardener lens and raise the basin." :
      currentAdvice(r, this.garden.traits, e) ?? spec.hint.fallback);
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
    if (lock) { this.message = levelAdvice(tier, this.garden.traits, this.garden.expedition!) ?? lock; return; }
    this.travel(levelEntry(this.world, tier), WATER.spawn); this.close();
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
      case "heir": { const plan = generationPlan(this.garden); return { text: `CHOOSE YOUR DAUGHTER · generation ${this.garden.generation + 1}\n\n${plan ? plan + "\n\n" : ""}` + this.heirs.map(h => { const note = heirNote(h, this.garden); return `${h.name}: STR ${h.traits.strength} · VIT ${h.traits.vitality} · ${this.abilities(h.traits)}${note ? "\n" + note : ""}\n${h.cause}`; }).join("\n\n"),
        choices: this.heirs.map((h, n) => ({ id: `heir${n}`, label: h.name, run: () => {
          this.garden = inherit(this.garden, h, this.climate); this.save(); this.newLife(); this.close();
        } })) }; }
      case "newworld": return { text: "START A DIFFERENT WORLD?\n\nThis replaces this creature checkpoint, its generations and Water discoveries. Your incoming aquatic lineage remains. The new world gets a different seed. Export your save first if you want to keep both worlds.",
        choices: [{ id: "cancel", label: "Keep this world", run: () => this.close() }, { id: "restart", label: "Replace creature world", run: () => {
          const old = this.garden, seed = (old.expedition!.seed + 0x9e3779b9) >>> 0;
          const prev = refreshLineage(shell.saves.load("lineage").envelope?.data);
          this.garden = attachExpedition({ ...old, ...newGarden(old.traits.diet), expedition: undefined }, seed, prev?.species[0]?.stages.aquatic?.parts, this.classSkill);
          this.buildWorld(); this.newLife(); this.save(); this.close();
        } }] };
      case "won": return { text: "WATER BIOME COMPLETE\n\nYou crossed the shallows, inherited aquatic adaptations and shaped the torrent with the Gardener.\n\nThis first-biome prototype ends at the Water crown. The full creature stage will open its final region after any two hard biomes. You can keep exploring or test the existing civilization handoff.",
        choices: [{ id: "continue", label: "Continue to civilization", run: () => shell.startGame("civ") },
          { id: "keep", label: "Keep exploring this world", run: () => this.retreat() }] };
      default: return { text: "", choices: [] };
    }
  }
  private abilities(t = this.garden.traits): string { return [t.climb ? "claws" : "", t.gills ? "gills" : "", t.fins ? "swimming fins" : "", ...(t.classSkills ?? []).map(c => c === "tool" ? "tool use" : c)].filter(Boolean).join(", ") || "no special adaptations"; }
  /** What this creature can open: its traits as keys, plus the world's permanent Gardener terrain. */
  private lineageKeys() { const t = this.garden.traits, e = this.garden.expedition!; return keysOf({ stats: { strength: t.strength, vitality: t.vitality }, gills: t.gills, fins: t.fins, climb: t.climb, classSkills: t.classSkills }, e); }
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
    if (!this.ready) { if (avatarAssetsReady(this, this.incoming)) this.beginCreature(); else return; }
    if (shell.topId !== "play") { this.creatureHud.suspend(); return; }
    if (this.lineage.isOpen) {
      this.creatureHud.suspend();
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
    // F bites too: it was the old default of "sink"; the aquatic remaster gave F to "electric" (Shock) and moved sink to
    // C, which left the creature stage's "J/F bite" without F (BAMF69 2026-11-18). Both presses are taken every frame.
    const sinkPress = i.takePress("sink"), shockPress = i.takePress("electric");
    const attack = i.takePress("attack") && this.stun === 0, altAttack = (sinkPress || shockPress) && this.stun === 0;
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
        const refreshable = !!path && canRefreshLevel(this.garden.expedition!, path.tier);
        this.message = path ? levelLock(path.tier, this.garden.traits) && (levelAdvice(path.tier, this.garden.traits, this.garden.expedition!) ?? levelLock(path.tier, this.garden.traits)) || `E: enter ${path.name} · ${path.tier}${this.garden.expedition!.completed.includes(path.tier) ? " · completed" : ""}${refreshable ? " · S+E: fresh map" : ""}.` : "Explore the Water shoreline. Three cave trails lead to Easy, Medium and Hard. Walk left to return to the nest.";
        if (i.takePress("interact")) {
          if (path && refreshable && i.isDown("move_down")) this.refreshMap(path.tier);
          else if (path) this.startLevel(path.tier); else if (this.body.x < 100) this.travel(-1, BIOME_PATHS[0].x, WATER.floor, -1);
        }
        if (this.room === -2 && this.body.x < 20) this.travel(-1, BIOME_PATHS[0].x, WATER.floor, -1);
      }
    } else {
      this.weather = stepWeather(this.weather, dt); this.hunger += dt; this.objective = tickObjective(this.objective, dt);
      const r = this.currentRoom;
      // Entering the water of a current room explains exactly what is missing to swim upstream.
      const wet = inWater(this.body, this.roomWater(), r);
      if (wet && !this.wasWet) { const advice = currentAdvice(r, this.garden.traits, this.garden.expedition!); if (advice) this.message = advice; }
      this.wasWet = wet;
      const wasSealed = sealedEncounter(this.objective);
      this.objective = encounterLock(r, this.objective, this.enemies, this.body.x);
      if (!wasSealed && sealedEncounter(this.objective)) this.message = "Encounter sealed! Defeat all threats, or rig and arm the net, then lure attacks through it, or fight/subdue. Evasion does not break this seal.";
      stepWaterBody(this.body, r, this.roomWater(), this.garden.traits, { dir,
        vertical: this.stun > 0 ? 0 : Number(crouch) - Number(i.isDown("move_up") || i.isDown("jump")), jump, crouch, stunned: this.stun > 0, braced: !!this.operation && !dir && !crouch && !i.isDown("move_up") && !jump, sprint: i.isDown("pace") }, dt, this.objective);
      const underwater = isSubmerged(this.body, this.roomWater(), r);
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
      const spec = roomSpec(r);
      if (spec.vent && ventPhase(this.clock) === "active" && Math.abs(this.body.x - spec.vent.x) < ENCOUNTER.ventRadius && this.body.y > 267 && this.hurt === 0) {
        this.hp--; this.hurt = GEN.damageGrace; this.body.vy = -150; this.message = "Scalding vent! Bubbles warn first: wait for it to stop, or swim over the plume.";
      }
      if (spec.cache && !this.foodCache && Math.abs(this.body.x - spec.cache.x) < 18 && Math.abs(this.body.y - spec.cache.y) < 10) {
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
        if (this.body.x > rightEdgeX(this.geom)) r.right >= 0 ? this.travel(r.right, WATER.spawn) : this.message = "E claims the goal. Turn back through the rooms and shoreline to reach the nest alive.";
        else if (this.body.x < leftEdgeX(this.geom)) {
          if (r.left >= 0) { const a = horizontalReturn(r, this.roomById(r.left)); this.travel(a.room, a.x, a.y, a.facing); }
          else this.travel(-2, WATER_PATHS.find(p => p.tier === r.tier)!.x, WATER.floor, -1);
        }
        if (this.room === r.id) {
          const arrival = verticalArrival(r, this.body.x, this.body.y, this.objective);
          if (arrival) this.travel(arrival.room, arrival.x, arrival.y, arrival.facing, arrival.vy);
          else if (pitRoom(r) && this.body.y > bottomEdgeY(this.geom)) {
            this.hp -= 3; this.hurt = GEN.damageGrace; this.stun = 0.5; this.operation = null;
            this.body = newBody(spec.pits[0].recoverX, WATER.floor); this.message = "Spiked pit! Lost 3 health. Jump across the marked gap; the recovery ledge is at its near side.";
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
    // Worn traits now show as body parts (creature-hd), replacing the old gills/claws tint.
    this.avatar.update({ ...this.incoming, worn: wornTraits(this.garden.traits) }, this.body.x, this.body.y - 16, frame,
      this.facing < 0, 1 + this.garden.traits.vitality * 0.015, this.hurt > 0 ? 0.6 : 1,
      pose !== "bite" && this.room >= 0 && !!this.garden.traits.fins && inWater(this.body, this.roomWater(), this.currentRoom));
    this.draw();
  }
  private stepEnemies(dt: number, crouch: boolean): void {
    const r = this.currentRoom, flood = this.climateNow() === "flood";
    // A swimmer keeps to the water it spawned in; land enemies to the room's enemy bounds.
    const g = this.geom;
    for (const [lane, e] of this.enemies.entries()) {
      e.sprite.setVisible(e.hp > 0); e.label.setVisible(e.hp > 0); if (e.hp <= 0) continue;
      if (e.incapacitated) { if (!poseHdFoe(e.sprite, e, this.clock, shell.settings.access.reduce_motion)) e.sprite.setTint(0x86959b).setAlpha(0.55).setAngle(80); e.label.setPosition(e.trapped ? netFrame(r).x - 36 : e.x, e.trapped ? 232 + lane * 16 : e.y - 26 - lane * 18).setText(e.trapped ? "NETTED" : "SUBDUED"); continue; }
      const reeds = reedCover(r, this.body.x);
      const swim = regionAt(g, e.home) ?? g.water[0];
      // S steers a swimmer down; it is not universal invisibility in open water.
      const hidden = crouch && (flood || reeds) && (!inWater(this.body, this.roomWater(), r) || reeds && this.body.y > 285);
      const hit = stepEnemy(e, { x: this.body.x, y: this.body.y - 16, hidden: hidden || !clearWaterLine(r, this.garden.expedition!.basinRaised, e.x, e.y, this.body.x, this.body.y - 16, this.objective),
        submerged: this.body.y - this.body.h > waterlineAt(r, this.roomWater(), this.body.x) }, dt, flood,
        r.gate && !this.garden.expedition!.basinRaised ? r.gateX + 28 : e.kind === "swimmer" ? swim.x0 + 8 : g.enemyMinX,
        (x, y) => boxHits(x, y + 8, 16, 16, (tx, ty) => objectiveBarrier(r, this.objective, tx) || challengeSolid(r, this.garden.expedition!.basinRaised, tx, ty, this.objective)),
        { maxX: g.enemyMaxX, swimMaxX: swim.x1 - 8 });
      if (netCatches(r, this.objective, e)) {
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
      if (!poseHdFoe(e.sprite, e, this.clock, shell.settings.access.reduce_motion))
        e.sprite.setPosition(e.x, e.y).setFlipX(e.facing < 0).setTint(tint).setScale(e.kind === "charger" ? 1.25 : e.kind === "ambusher" ? 0.85 : 1)
          .setAlpha(e.kind === "ambusher" && e.phase === "patrol" ? 0.6 : 1);
      const tell = canIncapacitate(e, this.body.x, this.body.y) ? "E: SUBDUE" : e.phase === "tell" ? "! DODGE" : e.phase === "recover" ? "OPEN" : e.phase === "strike" ? "RUSH" : e.kind.toUpperCase();
      e.label.setPosition(e.x, e.y - 22 - lane * 18).setText(tell);
    }
  }
  private interact(): void {
    const r = this.currentRoom, x = this.body.x;
    const net = this.enemies.length ? useNet(r, this.objective, x, this.body.y) : null;
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
    // Class doors and grotto shafts open only for a lineage holding the key (levelgen/keys.ts material table).
    const keyed = useKeyed(r, this.objective, x, this.body.y, this.lineageKeys());
    if (keyed.used) { if (keyed.state !== this.objective) this.evidence.solves++; this.objective = keyed.state; this.message = keyed.message; return; }
    const hatch = roomSpec(r).leftHatch;
    if (hatch && Math.abs(x - hatch.x) < 28 && Math.abs(this.body.y - hatch.y) < 25) {
      if (this.objective.open) this.travel(r.right, WATER.spawn);
      else this.message = "Onward hatch locked. Prime the shaft relay, release the far lower latch, then come back here.";
      return;
    }
    // Entrance rigging is handled first; the adjacent nursery arch remains a separate route.
    const arch = roomSpec(r).branchArchX;
    if (r.branch >= 0 && arch !== null && Math.abs(x - arch) < WATER.interactReach) { this.travel(r.branch, WATER.spawn); return; }
    if (r.reward && x > goalX(this.geom)) {
      if (!canCollectReward(this.objective)) {
        this.message = sealedEncounter(this.objective) ? "The discovery lies past the encounter seal. Defeat, subdue or net every threat first." : "The discovery is still out of reach. Open this room's marked lever or controls first.";
        return;
      }
      const had = this.garden.expedition!.unlocked.includes(r.reward);
      if (!had && !this.cargo.samples.includes(r.reward)) this.cargo.samples.push(r.reward);
      const story = r.reward === "gills" || r.reward === "fins", label = { gills: "Gills", fins: "Swimming fins", fullArmor: "Full armor plating", iceBreath: "Ice breath" }[r.reward];
      this.message = had ? "This adaptation is already available to your daughters." : story
        ? `${label} discovered! Your body stays the same; CARRY IT HOME ALIVE to bank it, then choose ${r.reward === "gills" ? "Tidefoot" : "Reedheart"}. Death or reloading loses carried samples.`
        : `${label} discovered in a hidden grotto! CARRY IT HOME ALIVE to bank it for your lineage. Death or reloading loses carried samples.`;
      if (!r.goal) return;
    }
    if (r.goal && x > goalX(this.geom)) {
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
  /** Repaints the level minimap only when the room, explored rooms or banked rewards change; hidden in hubs. */
  private drawMinimap(): void {
    // Sit below the status line, which wraps on narrow phones, so the column never covers it.
    const status = this.screenUi.root.querySelector(".stage-status")?.getBoundingClientRect();
    const top = status && status.bottom > 0 ? `${Math.round(status.bottom + 6)}px` : "calc(var(--safe-top) + 60px)";
    if (this.hudColumn.style.top !== top) this.hudColumn.style.top = top;
    if (this.room < 0) { this.minimapPanel.hidden = true; this.minimapKey = ""; return; }
    const e = this.garden.expedition!, tier = this.currentRoom.tier, key = JSON.stringify([this.room, tier, e.visited, e.unlocked]);
    this.minimapPanel.hidden = false; if (key === this.minimapKey) return;
    this.minimapKey = key;
    const model = minimapModel(this.world, tier, e.visited, this.room, e.unlocked);
    drawMinimap(this.minimap, model);
    this.minimapPanel.setAttribute("aria-label", `Map of Water ${tier}: ${model.rooms.filter(r => r.state !== "adjoining").length} rooms explored, ${model.rooms.filter(r => r.state === "adjoining").length} unexplored next door.`);
  }
  /** Rebuilds the equipment rack only when the traits or banked discoveries change. */
  private drawRack(): void {
    const rows = equipmentRows(this.garden.traits, this.garden.expedition!), key = JSON.stringify(rows);
    if (key === this.rackKey) return;
    this.rackKey = key; this.rack.replaceChildren();
    const row = (title: string, items: typeof rows.equipped, dim: boolean) => {
      const r = document.createElement("div"); r.className = "cell-icon-row";
      // The shared HUD dock stylesheet hides .icon-row-label for the cell and aquatic docks; the creature rack keeps
      // its Equipped / Banked labels (BAMF69 2026-11-18), so they override that rule inline.
      const label = document.createElement("span"); label.className = "icon-row-label"; label.textContent = title; label.style.setProperty("display", "inline", "important"); r.append(label);
      for (const it of items) {
        const b = document.createElement("button"); b.title = it.label; b.setAttribute("aria-label", it.label); b.dataset.icon = it.icon;
        Object.assign(b.style, { width: "40px", height: "40px", minHeight: "40px", padding: "4px", borderRadius: "10px", opacity: dim ? "0.55" : "1" });
        b.append(creatureIcon(it.icon));
        b.onclick = () => { this.rackNote.hidden = !this.rackNote.hidden && this.rackNote.textContent === it.label; this.rackNote.textContent = it.label; };
        r.append(b);
      }
      if (!items.length) { const e = document.createElement("span"); e.className = "empty-icons"; e.textContent = "none yet"; e.style.setProperty("display", "inline", "important"); r.append(e); }
      this.rack.append(r);
    };
    row("Equipped", rows.equipped, false);
    if (rows.banked.length) row("Banked", rows.banked, true);
  }
  private draw(): void {
    this.drawRack(); this.drawMinimap();
    const g = this.gfx; g.clear();
    if (this.room < 0) { this.roomArt.syncHub(this.room === -2); drawHub(g, this.room === -2, this.garden.traits, this.garden.expedition!); }
    else this.roomArt.sync(this.currentRoom, this.roomWater(), this.objective);
    if (this.room >= 0) drawWaterRoom(g, this.currentRoom, this.roomWater(), this.food, this.trap, this.clock, this.foodCache, this.objective, true);
    for (const foe of this.enemies) if (foe.kind === "dropper" && activeThreat(foe)) {
      g.fillStyle(foe.phase === "tell" ? 0xe9b55e : 0x111e27, 0.65).fillEllipse(foe.x, 300, 46, 9);
      if (foe.phase === "tell") g.lineStyle(2, 0xe9b55e).strokeRect(foe.x - 22, 238, 44, 65);
    }
    if (this.debugEncounters) for (const e of this.enemies) if (e.hp > 0) {
      g.lineStyle(1, 0xf1d478, 0.5).strokeCircle(e.x, e.y, ENEMIES[e.kind].detect);
      g.lineStyle(2, 0xffae72).lineBetween(e.x, e.y, e.x + e.facing * 80, e.y + e.aimY * 80);
    }
    const t = this.garden.traits, e = this.garden.expedition!, weather = this.weather.remaining > 0 ? `${this.weather.climate} ${Math.ceil(this.weather.remaining)}s` : this.garden.climate;
    const where = this.room === -1 ? 'Overworld' : this.room === -2 ? 'Water shoreline' : roomLabel(this.currentRoom, e.seed);
    this.creatureHud.update({ hp:this.hp, maxHp:GEN.health+t.vitality,
      food:Math.max(0,Math.round(100-this.hunger/WATER.hungerSeconds*100)), air:this.oxygen, airMax:WATER.oxygenSeconds,
      submerged:this.room>=0&&isSubmerged(this.body,this.roomWater(),this.currentRoom), gills:!!t.gills,
      cargo:this.cargo.samples.length+this.cargo.clears.length, diet:t.diet,
      generation:this.garden.generation, location:where,
      roomIdentity:this.room>=0?`Room ${this.room} · ${this.currentRoom.tier} · seed ${e.seed}`:where,
      netReady:this.room>=0&&this.objective.netArmed, sealedThreats:this.room>=0&&sealedEncounter(this.objective)?this.enemies.filter(activeThreat).length:undefined,
      available:this.mode==='play'&&!this.lineage.isOpen&&shell.topId==='play' });
    this.screenUi.setStatus(`G${this.garden.generation} · ${where} · HP ${this.hp}/${GEN.health + t.vitality} · Carrying ${this.cargo.samples.length + this.cargo.clears.length}${this.room >= 0 && this.objective.netArmed ? " · NET READY" : ""}${this.room >= 0 && sealedEncounter(this.objective) ? " · SEALED: " + this.enemies.filter(activeThreat).length + " threats" : ""}`,
      `UNBANKED: ${[...this.cargo.samples, ...this.cargo.clears.map(t => t + " seal")].join(", ") || "none"}\nBring these to the nest alive. Death/reload loses unbanked cargo.\nSeed ${e.seed} · generator v${this.world.version}\n${t.diet} · STR ${t.strength} · VIT ${t.vitality} · ${this.abilities()}\nFood ${Math.max(0, Math.round(100 - this.hunger / WATER.hungerSeconds * 100))}% · Air ${Math.ceil(this.oxygen)}s · ${weather}\nBasin ${e.basinRaised ? "raised" : "low"} · torrent ${e.torrentDiverted ? "diverted" : "wild"}\nUnlocked for daughters: ${e.unlocked.join(", ") || "none"}\nCompleted: ${e.completed.join(", ") || "none"}\nA/D move · W/Space swim up · S swim down/hide · J/F bite · E use · U Gardener\n\n${this.garden.history.slice(-8).join("\n")}`);
    const view = this.cameras.main.worldView;
    const unseen = this.enemies.find(e => activeThreat(e) && Math.abs(e.x - this.body.x) < 180 && (e.x < view.left || e.x > view.right));
    const warning = this.enemies.find(e => activeThreat(e) && e.phase === "tell" && Math.abs(e.x - this.body.x) < 180);
    this.screenUi.setMessage(this.stun > 0 ? `STUNNED · ${this.stun.toFixed(1)}s` : this.operation ? `OPERATING: ${Math.floor(this.operation.elapsed / CONTROL_SECONDS * 100)}% · stay still; guards interrupt.` : this.room >= 0 && this.objective.remaining > 0 ? `PRESSURE GATE: ${Math.ceil(this.objective.remaining)}s · cross the vent or rearm the wheel.` : warning ? `${ENEMIES[warning.kind].name} is preparing an attack! Change height or get behind it; strike during recovery.` : unseen && !shell.input.isDown("move_down") ? `Predator approaching from the ${unseen.x < this.body.x ? "left" : "right"}.` : this.message);
    const actions: StageAction[] = [action("use", "interact", "Use / study"), action("jump", "jump", "Jump"), action("bite", "attack", "Bite"),
      { id: "gardener", label: "Gardener", run: () => this.open("gardener") }, { id: "journal", label: "Journal", run: () => this.open("journal") }];
    this.creatureHud.actions(actions);
    if (this.mode === "play") this.screenUi.hide();
    else {
      const content = this.menuContent(); this.selection = Math.min(this.selection, content.choices.length - 1);
      this.screenUi.show(`${content.text}\n\nSelected: ${content.choices[this.selection]?.label ?? ""}`, content.choices.map((c, n) => ({ ...c, run: () => { this.selection = n; shell.input.clearHeld(); c.run(); if (this.sys.isActive()) this.draw(); } })));
    }
  }
}

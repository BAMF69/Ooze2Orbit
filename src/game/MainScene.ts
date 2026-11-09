// ---------------------------------------------------------------------------
// MainScene.ts
// Purpose : The cell stage toy: pick a diet, swim a pond, eat algae or meat, bump other cells until they pop
//           (they drop meat and the part they wear), spend plant and meat points on upgrades, and evolve twice
//           (choosing your diet again each time). The parts you carry change how your cell looks.
// Usage   : Registered in src/main.ts as "main"; the shell (src/shell/app.ts) starts, pauses and stops it.
//           ?autoplay: a simple pilot steers and buys (for `dev.py smoke --drive play:N --query autoplay`);
//           ?finish (or the ` key): finish the stage now and offer the evolve into the aquatic stage;
//           add &diet=herbivore|carnivore|omnivore to pick its diet (default omnivore), the picker is skipped.
//           ?debug: draws collision circles and logs channel "cell"; channel "lineage" logs the temperament at each
//           evolution and the lineage written at the stage's end (save slot "lineage", docs/HANDOFF_CONTRACT.md).
// Notes   : PROTOTYPE (toy tier). Rules live in src/game/cell/rules.ts, numbers in cell/tuning.ts, movement maths
//           in cell/steer.ts, the pilot in cell/pilot.ts, UI in cell/hud.ts, upgradePanel.ts, dietPicker.ts. This
//           file wires them to sprites. No physics engine: a few dozen circles, checked by distance each frame.
//           No game over (pillar 1, tense but fair): a bump moves food out of your meter into the water nearby.
//           Controls: WASD/arrows swim; E toggles upgrades (the pond keeps moving; while it is open the arrows
//           and Enter drive the panel and only WASD swims); the diet picker pauses the pond.
//
// Pseudocode:
//   create : pond backdrop -> animations from the atlas layouts -> player -> algae, pond cells -> camera follow
//            -> HUD, upgrade panel, diet picker (shown at once unless autoplay)
//   update : dt -> diet picker open? read its input, stop -> panel input -> steer player (keys or pilot) -> swim
//            -> mouth pulls algae -> eat edible food (points from fresh food) -> pick up parts -> pond cells
//            wander (prickles chase) -> bumps (damage the cell, knock food out of you, push apart) -> popped cells
//            drop meat + their part -> food sinks after a while -> regrow algae, respawn cells -> HUD, panel
//   record : diet picks, rams, pops, bites, gulper escapes and lures go into a CellRecord (cell/record.ts); at the
//            last form the lineage is built from it and saved once
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import * as Phaser from "phaser";
import { describeTemperament, shipSpecialty } from "../core/lineage";
import { Log } from "../core/log";
import { effectiveShake } from "../core/settings";
import { shell } from "../shell/app";
import { animKey, animSpecs, firstFrame, type AtlasLayout } from "./cell/atlas";
import { DietPicker } from "./cell/dietPicker";
import { CellHud } from "./cell/hud";
import { PondMood } from "./cell/mood";
import { cellSfx, type CellSfx } from "./cell/sfx";
import { pilotBuy, pilotTarget } from "./cell/pilot";
import { PLAYER_ID, ate, newBrain, think, type GulperBrain, type Seen } from "./cell/predator";
import { bump, cellLineage, cellTemperament, gulperEvent, newCellRecord, recordDiet, type CellRecord } from "./cell/record";
import {
  accel, addPart, bumpDamage, cellsWanted, changeDiet, drag, partAllowed, bumpFoodLoss, buyUpgrade, canEat, dropKinds, eat, eatFood, freshBase, knockbackTaken,
  cellHitDamage, deathMeat, loseFood, nextSpool, slots, spoolTime, thrustAt, maxSpeed, newCreature, pullRadius, spriteRow, upgradeTier, type Creature,
} from "./cell/rules";
import { keepInside, knockApart, swim, toward, wanderDir, type Body } from "./cell/steer";
import { UpgradePanel } from "./cell/upgradePanel";
import {
  CELL_KINDS, DIETS, DROPS, TUNING, UPGRADE_PAID_WITH, UPGRADE_STATS, type CellKind, type Diet, type FoodKind, type PartKind,
  type UpgradeStat,
} from "./cell/tuning";

const MAX_DT = 0.1; // s: clamp big gaps (tab in background, debugger pause)
const ANIM_FPS = 6;
const LOG = "cell";
const LINEAGE_LOG = "lineage";
const LINEAGE_SLOT = "lineage"; // save_lineage.json: what the aquatic stage will start from
/** Upgrade layers around the body (player depth 4): the membrane furthest back, mandibles in front. */
const UP_DEPTH: Readonly<Record<UpgradeStat, number>> = { defense: 3.7, speed: 3.8, mobility: 3.85, attack: 4.1 };

/** fresh = lying in the pond on its own (earns points); false = knocked out of you by a bump (food only). */
interface Food extends Body { spr: Phaser.GameObjects.Sprite; kind: FoodKind; base: number; fresh: boolean; life: number }
interface Orb extends Body { spr: Phaser.GameObjects.Sprite; part: PartKind }
interface PondCell extends Body {
  id: number; spr: Phaser.GameObjects.Sprite; kind: CellKind; hp: number; dirX: number; dirY: number; turnIn: number; hitCd: number;
  poppedByPlayer?: boolean; // the lineage counts only the player's pops
  brain?: GulperBrain; // predators only (cell/predator.ts)
  label?: Phaser.GameObjects.Text; // ?debug: the predator's state
}

export class MainScene extends Phaser.Scene {
  private creature: Creature = newCreature();
  private record: CellRecord = newCellRecord();
  private lineageSaved = false;
  private evolveReady = false; // the stage is over: Enter evolves into the aquatic stage (BAMF69 2026-11-08)
  private evolveT = 0;
  private evolveBanner?: Phaser.GameObjects.Text;
  private onDevKey = (e: KeyboardEvent) => { if (e.code === "Backquote" && shell.topId === "play") this.finishStageNow(); };
  private player!: Body & { spr: Phaser.GameObjects.Sprite };
  private spool = 0; // thrust build-up 0..1 while you hold a direction (rules.nextSpool)
  private upLayers!: Record<UpgradeStat, Phaser.GameObjects.Sprite>;
  private upsLayout!: AtlasLayout;
  private foods: Food[] = [];
  private orbs: Orb[] = [];
  private cells: PondCell[] = [];
  private hud!: CellHud;
  private mood!: PondMood;
  private sfx!: CellSfx;
  private panel!: UpgradePanel;
  private picker!: DietPicker;
  private rng!: Phaser.Math.RandomDataGenerator;
  private propsLayout!: AtlasLayout;
  private regrowIn = 0;
  private cantEatCd = 0;
  private respawnIn: Partial<Record<CellKind, number>> = {};
  private huntWarnCd = 0;
  private nextCellId = 1;
  private autoplay = false;
  private debugGfx: Phaser.GameObjects.Graphics | null = null;

  constructor() {
    super("main");
  }

  preload(): void {
    for (const [key, file] of [["player", "player_cell"], ["pond", "pond_cells"], ["props", "pond_props"]]) {
      this.load.spritesheet(key, `assets/art/${file}.png`, { frameWidth: 32, frameHeight: 32 });
      this.load.json(`${key}_layout`, `assets/art/${file}.json`);
    }
    // predators: a 64 px cell, so they show big without chunkier pixels than the other organisms
    this.load.spritesheet("pred", "assets/art/pond_predators.png", { frameWidth: 64, frameHeight: 64 });
    this.load.json("pred_layout", "assets/art/pond_predators.json");
    // upgrade looks: a 48 px cell (fins and membranes overflow 32), centered on the player
    this.load.spritesheet("ups", "assets/art/player_upgrades.png", { frameWidth: 48, frameHeight: 48 });
    this.load.json("ups_layout", "assets/art/player_upgrades.json");
  }

  create(): void {
    const params = new URLSearchParams(location.search);
    this.autoplay = params.has("autoplay");
    const askedDiet = params.get("diet") as Diet | null;
    if (askedDiet && !DIETS.includes(askedDiet)) Log.error(LOG, `?diet=${askedDiet} is not one of ${DIETS.join(", ")}`);
    this.rng = new Phaser.Math.RandomDataGenerator(["amber-pond"]); // same pond every run: repeatable captures
    this.creature = newCreature(askedDiet && DIETS.includes(askedDiet) ? askedDiet : "omnivore");
    this.record = newCellRecord();
    this.lineageSaved = false;
    this.evolveReady = false;
    this.evolveT = 0;
    window.addEventListener("keydown", this.onDevKey); // ` : finish the cell stage now (a test trigger)
    if (params.has("finish")) this.time.delayedCall(1500, () => this.finishStageNow()); // ?finish: the same, for smoke runs
    this.events.once("shutdown", () => window.removeEventListener("keydown", this.onDevKey));
    if (this.autoplay) this.record = recordDiet(this.record, this.creature.diet); // no picker: the asked diet is the pick
    this.foods = [];
    this.orbs = [];
    this.cells = [];
    this.respawnIn = {};
    this.huntWarnCd = 0;
    this.nextCellId = 1;
    this.regrowIn = 0;
    this.cantEatCd = 0;

    this.propsLayout = this.cache.json.get("props_layout") as AtlasLayout;
    for (const key of ["player", "pond", "props", "pred"]) this.makeAnims(key);
    this.drawPond();

    const { width, height } = TUNING.world;
    this.player = { x: width / 2, y: height / 2, vx: 0, vy: 0, spr: this.add.sprite(width / 2, height / 2, "player").setDepth(4) };
    this.upsLayout = this.cache.json.get("ups_layout") as AtlasLayout;
    this.upLayers = Object.fromEntries(UPGRADE_STATS.map((s) =>
      [s, this.add.sprite(width / 2, height / 2, "ups").setDepth(UP_DEPTH[s]).setVisible(false)])) as Record<UpgradeStat, Phaser.GameObjects.Sprite>;
    this.refreshPlayerLook();

    for (let i = 0; i < TUNING.algaeCount; i++) this.spawnAlgae();
    for (const kind of CELL_KINDS) for (let i = 0; i < cellsWanted(kind, this.creature.form); i++) this.spawnCell(kind);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, width, height);
    cam.startFollow(this.player.spr, true, 0.12, 0.12);

    this.mood = new PondMood(this);
    this.sfx = cellSfx();
    this.hud = new CellHud(this, shell.i18n, (p) => firstFrame(this.propsLayout, "prop", p));
    this.panel = new UpgradePanel(this, shell.i18n, (stat) => this.tryBuy(stat));
    this.picker = new DietPicker(this, shell.i18n, (d) => this.chooseDiet(d));
    if (params.has("debug")) this.debugGfx = this.add.graphics().setDepth(900);
    if (this.autoplay) this.hud.toast("cell.intro");
    else this.picker.show(this.creature.diet, "diet.title_start");
    Log.info(LOG, `pond ready: ${this.foods.length} algae, ${this.cells.length} cells, diet ${this.creature.diet}${this.autoplay ? " (autoplay)" : ""}`);
  }

  update(_time: number, deltaMs: number): void {
    if (shell.plantedCrash) {
      shell.plantedCrash = false;
      throw new Error("planted crash (dev.py smoke --drive crash)"); // proves the crash hook end to end
    }
    const dt = Math.min(deltaMs / 1000, MAX_DT) * shell.settings.access.game_speed;
    // This scene already runs under the loading screen, while presses made on the menus (Enter on "Play") still
    // sit in the input queue; the shell clears it only when the play screen appears. Read keys only from then
    // on, or that leftover Enter picked the default diet before a keyboard player could choose (2026-11-08).
    const playing = shell.topId === "play";
    if (this.picker.isOpen) {
      if (playing) this.pickerInput();
      this.hud.update(this.creature, dt);
      return; // the pond waits while you choose a diet
    }
    if (playing) this.panelInput();
    if (this.evolveReady) { // Enter (or 2 s of autoplay) evolves into the aquatic stage
      this.evolveT += dt;
      if (this.autoplay ? this.evolveT > 2 : playing && !this.panel.isOpen && shell.input.takePress("ui_accept")) { this.evolveToAquatic(); return; }
    }
    this.movePlayer(dt);
    this.syncUpgradeLayers();
    this.mood.follow(this.player.x, this.player.y);
    this.pullAndEat(dt);
    this.pickUpParts();
    this.moveCells(dt);
    this.bumps();
    this.cellBumps();
    this.deaths();
    this.tickFoodLife(dt);
    this.refill(dt);
    this.cantEatCd = Math.max(0, this.cantEatCd - dt);
    this.hud.update(this.creature, dt);
    this.panel.render(this.creature);
    this.sfx.update(shell.settings.audio);
    this.drawDebug();
  }

  // ---- setup -------------------------------------------------------------------
  private makeAnims(key: string): void {
    const layout = this.cache.json.get(`${key}_layout`) as AtlasLayout | undefined;
    if (!layout) throw new Error(`missing atlas layout ${key}_layout (public/assets/art)`);
    for (const a of animSpecs(key, layout)) {
      if (this.anims.exists(a.key)) continue;
      this.anims.create({ key: a.key, frames: this.anims.generateFrameNumbers(key, { start: a.start, end: a.end }), frameRate: ANIM_FPS, repeat: -1 });
    }
  }

  /** Deep water with soft lighter and darker patches (drawn once; colors in TUNING.mood). */
  private drawPond(): void {
    const { width, height } = TUNING.world;
    const m = TUNING.mood;
    const g = this.add.graphics().setDepth(0);
    g.fillStyle(m.water, 1).fillRect(0, 0, width, height);
    for (let i = 0; i < 70; i++) {
      const light = this.rng.frac() < 0.6;
      g.fillStyle(light ? m.waterLight : m.waterDark, 0.5);
      g.fillEllipse(this.rng.between(0, width), this.rng.between(0, height), this.rng.between(30, 120), this.rng.between(20, 70));
    }
    g.lineStyle(4, m.edge, 1).strokeRect(2, 2, width - 4, height - 4);
  }

  // ---- diet and upgrades -------------------------------------------------------------
  private pickerInput(): void {
    const inp = shell.input;
    if (inp.takePress("ui_left") || inp.takePress("move_left")) this.picker.move(-1);
    if (inp.takePress("ui_right") || inp.takePress("move_right")) this.picker.move(1);
    if (inp.takePress("ui_accept") || inp.takePress("jump")) this.chooseDiet(this.picker.confirm());
  }

  private chooseDiet(d: Diet): void {
    if (d !== this.creature.diet) this.hud.toast("cell.diet_now", { diet: shell.i18n.t(`diet.${d}`) });
    const change = changeDiet(this.creature, d);
    this.creature = change.creature;
    this.record = recordDiet(this.record, d);
    this.sfx.play("choose");
    for (const p of change.dropped) { // a part the new diet cannot use floats back out
      this.dropOrb(this.player.x, this.player.y - this.playerRadius() * 2, p);
      this.hud.toast("cell.part_shed", { part: shell.i18n.t(`part.${p}`), diet: shell.i18n.t(`diet.${d}`) });
    }
    if (change.dropped.length) this.refreshPlayerLook();
    shell.input.clearPresses(); // the confirming press must not also buy an upgrade
    Log.info(LOG, `DIET ${d}`);
    if (this.creature.form >= TUNING.maxForm) this.saveLineage(); // the last choice of the stage
  }

  private panelInput(): void {
    const inp = shell.input;
    if (this.autoplay) {
      const stat = pilotBuy(this.creature);
      if (stat) this.tryBuy(stat);
      return;
    }
    if (inp.takePress("interact")) this.panel.toggle();
    if (!this.panel.isOpen) return;
    if (inp.takePress("ui_up")) this.panel.move(-1);
    if (inp.takePress("ui_down")) this.panel.move(1);
    if (inp.takePress("ui_accept")) this.tryBuy(this.panel.selected);
  }

  private tryBuy(stat: UpgradeStat): void {
    const r = buyUpgrade(this.creature, stat);
    if (!r.ok) {
      if (r.reason === "points") {
        this.hud.toast(`up.need_${UPGRADE_PAID_WITH[stat]}`);
        this.sfx.play("deny");
      }
      return;
    }
    this.creature = r.creature;
    this.sfx.play("upgrade");
    this.hud.toast("up.bought", { stat: shell.i18n.t(`up.${stat}`), lvl: r.creature.ups[stat] });
    Log.info(LOG, `UPGRADE ${stat} -> ${r.creature.ups[stat]}`);
  }

  // ---- player --------------------------------------------------------------------
  private playerScale(): number {
    return TUNING.player.formScale[this.creature.form - 1] ?? 1;
  }

  private playerRadius(): number {
    return this.playerScale() * TUNING.player.radiusPerScale;
  }

  private refreshPlayerLook(): void {
    const row = spriteRow(this.creature);
    this.player.spr.play(animKey("player", row.pose, row.direction)).setScale(this.playerScale());
  }

  /** Each upgrade's layer follows the body: same spot, scale, flip, tilt, and the same swim frame. */
  private syncUpgradeLayers(): void {
    const body = this.player.spr;
    const step = Number(body.frame.name) % this.upsLayout.columns; // which of the 4 swim frames the body shows
    for (const stat of UPGRADE_STATS) {
      const layer = this.upLayers[stat];
      const tier = upgradeTier(this.creature.ups[stat]);
      layer.setVisible(tier > 0);
      if (!tier) continue;
      layer.setFrame(firstFrame(this.upsLayout, stat, `form${this.creature.form}_t${tier}`) + step)
        .setPosition(body.x, body.y).setScale(body.scaleX, body.scaleY).setFlipX(body.flipX).setAngle(body.angle);
    }
  }

  private movePlayer(dt: number): void {
    let ix = 0, iy = 0;
    if (this.autoplay) {
      const t = pilotTarget(this.creature, this.player, { orbs: this.orbs.filter((o) => partAllowed(this.creature.diet, o.part)), food: this.edibleFood(), cells: this.cells.filter((c) => c.kind !== "gulper") });
      if (t) ({ x: ix, y: iy } = toward(this.player, t));
    } else {
      // move_* is WASD + d-pad (rebindable); ui_* adds the arrow keys, except while the upgrade panel uses them
      const arrows = !this.panel.isOpen;
      const down = (a: string) => shell.input.isDown(`move_${a}`) || (arrows && shell.input.isDown(`ui_${a}`));
      ix = (down("right") ? 1 : 0) - (down("left") ? 1 : 0);
      iy = (down("down") ? 1 : 0) - (down("up") ? 1 : 0);
    }
    const p = this.player;
    const top = maxSpeed(this.creature);
    this.spool = nextSpool(this.spool, ix !== 0 || iy !== 0, dt, spoolTime(this.creature));
    const thrust = thrustAt(this.spool); // momentum: a heavy cell builds up to full thrust (playtest 2026-11-08)
    swim(p, ix * thrust, iy * thrust, dt, { accel: accel(this.creature), maxSpeed: top, drag: drag(this.creature) });
    keepInside(p, this.playerRadius(), TUNING.world.width, TUNING.world.height);
    p.spr.setPosition(p.x, p.y);
    if (Math.abs(p.vx) > 8) p.spr.setFlipX(p.vx < 0);
    const tilt = Phaser.Math.Clamp(p.vy / top, -1, 1) * 20;
    p.spr.setAngle(p.spr.flipX ? -tilt : tilt);
  }

  private applyFood(r: { creature: Creature; evolved: boolean }): void {
    this.creature = r.creature;
    if (!r.evolved) return;
    Log.info(LOG, `EVOLVED form ${this.creature.form}`);
    this.sfx.play("evolve");
    const from = this.player.spr.scale;
    this.refreshPlayerLook();
    this.tweens.add({ targets: this.player.spr, scale: { from: from * 0.8, to: this.playerScale() }, duration: 450, ease: "Back.Out" });
    if (!shell.settings.access.reduce_motion) this.cameras.main.flash(TUNING.evolveFlashS * 1000, 255, 240, 200);
    this.hud.toast(this.creature.form >= TUNING.maxForm ? "cell.evolved_last" : "cell.evolved", { form: this.creature.form, slots: slots(this.creature) });
    Log.info(LINEAGE_LOG, `form ${this.creature.form}: ${describeTemperament(cellTemperament(this.creature, this.record))}`);
    if (this.autoplay) {
      if (this.creature.form >= TUNING.maxForm) this.saveLineage(); // no picker: the stage ends at once
    } else {
      this.picker.show(this.creature.diet, "diet.title_evolve", { form: this.creature.form });
    }
  }

  /** The stage's end (last form, last diet picked): build the lineage and save it once. A failed save must not end the run. */
  /** ` (test trigger): finish the stage now: the last form, the lineage saved as it stands, the evolve offered. */
  private finishStageNow(): void {
    if (this.lineageSaved || this.picker.isOpen) return;
    this.creature = { ...this.creature, form: TUNING.maxForm };
    this.refreshPlayerLook();
    Log.info(LOG, "DEV finish the cell stage now");
    this.saveLineage();
  }

  /** The stage's end: on to the aquatic stage, which reads the lineage just saved. */
  private evolveToAquatic(): void {
    Log.info(LOG, "EVOLVE into the aquatic stage");
    shell.stopGame();
    shell.startGame("aquatic");
  }

  private saveLineage(): void {
    if (this.lineageSaved) return;
    this.lineageSaved = true;
    const lineage = cellLineage(this.creature, this.record);
    const home = lineage.species[0];
    try {
      shell.saves.save(LINEAGE_SLOT, lineage as unknown as Record<string, unknown>);
      const spec = shipSpecialty(home.temperament);
      Log.info(LINEAGE_LOG, `saved (slot ${LINEAGE_SLOT}): ${describeTemperament(home.temperament)}; leans ${spec.kind} (${spec.tech})`);
      for (const e of home.influence) Log.debug(LINEAGE_LOG, `  ${e.cause} ${JSON.stringify(e.effect)}`);
      this.evolveReady = true;
      this.evolveBanner ??= this.add.text(this.scale.width / 2, this.scale.height - 40, shell.i18n.t("cell.evolve_ready"),
        { fontFamily: "monospace", fontSize: "12px", color: "#fff6c8", backgroundColor: "#000000a0", padding: { x: 8, y: 4 } })
        .setOrigin(0.5, 1).setScrollFactor(0).setDepth(1200).setResolution(2);
      this.sfx.play("evolve");
    } catch (err) {
      Log.error(LINEAGE_LOG, `could not save the lineage (slot ${LINEAGE_SLOT}): ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ---- food ----------------------------------------------------------------------
  private edibleFood(): Food[] {
    return this.foods.filter((f) => canEat(this.creature, f.kind));
  }

  private addFood(x: number, y: number, kind: FoodKind, base: number, fresh: boolean, life: number, scale = 1): Food {
    const spr = this.add.sprite(x, y, "props").setDepth(1).setScale(scale).play(animKey("props", "prop", kind));
    spr.anims.setProgress(this.rng.frac());
    const f: Food = { x, y, vx: 0, vy: 0, spr, kind, base, fresh, life };
    this.foods.push(f);
    return f;
  }

  private spawnAlgae(): void {
    const { x, y } = this.freeSpot(40);
    this.addFood(x, y, "algae", freshBase("algae"), true, Infinity);
  }

  /** Scatter food from (x, y): it drifts out to a spot nearby. */
  private scatterFood(x: number, y: number, kinds: FoodKind[], fresh: boolean, life: number, scale: number, base?: number): void {
    for (const kind of kinds) {
      const d = wanderDir(() => this.rng.frac());
      const r = this.rng.between(12, TUNING.droppedFoodSpread);
      const fx = Phaser.Math.Clamp(x + d.x * r, 10, TUNING.world.width - 10);
      const fy = Phaser.Math.Clamp(y + d.y * r, 10, TUNING.world.height - 10);
      const f = this.addFood(x, y, kind, base ?? freshBase(kind), fresh, life, scale);
      f.x = fx;
      f.y = fy;
      this.tweens.add({ targets: f.spr, x: fx, y: fy, duration: 350, ease: "Quad.Out" });
    }
  }

  private pullAndEat(dt: number): void {
    const p = this.player;
    const pull = pullRadius(this.creature);
    const reach = this.playerRadius() + TUNING.player.eatRadiusBonus;
    this.foods = this.foods.filter((f) => {
      const d = Math.hypot(f.x - p.x, f.y - p.y);
      if (pull > 0 && f.kind === "algae" && d < pull && !this.tweens.isTweening(f.spr)) {
        const dir = toward(f, p);
        f.x += dir.x * TUNING.mouthPullSpeed * dt;
        f.y += dir.y * TUNING.mouthPullSpeed * dt;
        f.spr.setPosition(f.x, f.y);
      }
      if (d >= reach) return true;
      const r = eatFood(this.creature, f.kind, f.base, f.fresh);
      if (!r.eaten) {
        if (this.cantEatCd <= 0) {
          this.hud.toast("cell.cant_eat", { diet: shell.i18n.t(`diet.${this.creature.diet}`) });
          this.sfx.play("deny");
          this.cantEatCd = TUNING.cantEatToastS;
        }
        return true; // it floats past
      }
      this.sfx.play(f.kind === "algae" ? "eat_algae" : "eat_meat");
      this.applyFood(r);
      f.spr.destroy();
      return false;
    });
  }

  private tickFoodLife(dt: number): void {
    this.foods = this.foods.filter((f) => {
      if (f.life === Infinity) return true;
      f.life -= dt;
      if (f.life < 2) f.spr.setAlpha(Math.max(0, f.life / 2));
      if (f.life > 0) return true;
      f.spr.destroy();
      return false;
    });
  }

  // ---- parts ---------------------------------------------------------------------
  private dropOrb(x: number, y: number, part: PartKind): void {
    const spr = this.add.sprite(x, y, "props").setDepth(2).play(animKey("props", "prop", part));
    this.tweens.add({ targets: spr, scale: { from: 0, to: 1 }, duration: 300, ease: "Back.Out" });
    this.orbs.push({ x, y, vx: 0, vy: 0, spr, part });
  }

  private pickUpParts(): void {
    const reach = this.playerRadius() + 10;
    this.orbs = this.orbs.filter((o) => {
      if (Math.hypot(o.x - this.player.x, o.y - this.player.y) >= reach) return true;
      const r = addPart(this.creature, o.part);
      if (r.kind === "refused") {
        if (this.cantEatCd <= 0) {
          this.hud.toast("cell.part_refused", { part: shell.i18n.t(`part.${o.part}`), diet: shell.i18n.t(`diet.${this.creature.diet}`) });
          this.sfx.play("deny");
          this.cantEatCd = TUNING.cantEatToastS;
        }
        return true; // it stays in the pond
      }
      this.sfx.play("part");
      const name = shell.i18n.t(`part.${o.part}`);
      if (r.kind === "duplicate") {
        this.hud.toast("cell.part_dup", { part: name });
        this.applyFood(eat(this.creature, r.food));
      } else {
        this.creature = r.creature;
        this.refreshPlayerLook();
        if (r.kind === "replaced") this.hud.toast("cell.part_swap", { part: name, lost: shell.i18n.t(`part.${r.lost}`) });
        else this.hud.toast("cell.part_got", { part: name, hint: shell.i18n.t(`part.${o.part}_hint`) });
      }
      Log.info(LOG, `PART ${o.part} -> ${r.kind} [${this.creature.parts.join(",")}]`);
      o.spr.destroy();
      return false;
    });
  }

  // ---- pond cells ----------------------------------------------------------------
  private spawnCell(kind: CellKind): void {
    const k = TUNING.cell.kinds[kind];
    const { x, y } = this.freeSpot(k.spawnAway);
    const spr = this.add.sprite(x, y, k.atlas).setDepth(kind === "gulper" ? 3.5 : 3).setScale(k.scale).play(animKey(k.atlas, "swim", kind));
    spr.anims.setProgress(this.rng.frac());
    const d = wanderDir(() => this.rng.frac());
    const brain = kind === "gulper" ? newBrain(this.rng.frac() * TUNING.gulper.thinkS) : undefined;
    this.cells.push({ id: this.nextCellId++, x, y, vx: 0, vy: 0, spr, kind, hp: k.hp, dirX: d.x, dirY: d.y,
      turnIn: this.rng.frac() * TUNING.cell.wanderTurnS, hitCd: 0, brain }); // ?debug labels: drawDebug makes them
  }

  private moveCells(dt: number): void {
    const t = TUNING.cell;
    this.huntWarnCd = Math.max(0, this.huntWarnCd - dt);
    for (const c of this.cells) {
      const k = t.kinds[c.kind];
      c.turnIn -= dt;
      c.hitCd = Math.max(0, c.hitCd - dt);
      if (c.turnIn <= 0) {
        const d = wanderDir(() => this.rng.frac());
        c.dirX = d.x; c.dirY = d.y;
        c.turnIn = t.wanderTurnS * (0.5 + this.rng.frac());
      }
      let dir = { x: c.dirX, y: c.dirY };
      let speed = k.speed;
      if (c.brain) {
        const target = this.thinkGulper(c, dt);
        if (target) dir = toward(c, target);
        if (c.brain.state === "sated" || c.brain.state === "tired") speed *= TUNING.gulper.restSpeedMult;
      } else if (k.chase > 0 && Math.hypot(c.x - this.player.x, c.y - this.player.y) < k.chase) {
        dir = toward(c, this.player);
      }
      swim(c, dir.x * 0.6, dir.y * 0.6, dt, { accel: t.swimAccel, maxSpeed: speed, drag: t.swimDrag });
      keepInside(c, k.radius, TUNING.world.width, TUNING.world.height);
      c.spr.setPosition(c.x, c.y);
      if (Math.abs(c.vx) > 5) c.spr.setFlipX(c.vx < 0);
    }
    this.gulps();
  }

  /** Perception -> the gulper's state machine -> where to swim (null: wander). Warns you when it picks you. */
  private thinkGulper(g: PondCell, dt: number): { x: number; y: number } | null {
    const brain = g.brain;
    if (!brain) return null;
    const seen: Seen[] = [{ id: PLAYER_ID, x: this.player.x, y: this.player.y }];
    for (const c of this.cells) if (!c.brain && c.hp > 0) seen.push({ id: c.id, x: c.x, y: c.y });
    const next = think(brain, g, seen, dt, TUNING.gulper);
    const ev = gulperEvent(brain, next);
    if (ev) {
      this.record = bump(this.record, ev === "escape" ? "gulperEscapes" : "gulpersLured");
      Log.debug(LINEAGE_LOG, `gulper ${g.id}: ${ev}`);
    }
    if (next.targetId === PLAYER_ID && brain.targetId !== PLAYER_ID) {
      Log.info(LOG, `HUNT player (gulper ${g.id})`);
      if (this.huntWarnCd <= 0) { // pillar 1: every danger is readable before it hits
        this.hud.toast("cell.hunted");
        this.huntWarnCd = TUNING.cell.huntWarnS;
      }
    } else if (next.state !== brain.state) {
      Log.debug(LOG, `gulper ${g.id} ${brain.state} -> ${next.state}`);
    }
    g.brain = next;
    if (next.targetId === null) return null;
    return next.targetId === PLAYER_ID ? this.player : this.cells.find((c) => c.id === next.targetId) ?? null;
  }

  /** A hunting gulper that reaches its prey swallows it; like every death, the prey drops its part and meat. */
  private gulps(): void {
    for (const g of this.cells) {
      if (!g.brain || g.brain.state !== "hunt" || g.brain.targetId === PLAYER_ID) continue;
      const prey = this.cells.find((c) => c.id === g.brain?.targetId);
      if (!prey || prey.hp <= 0) continue;
      const reach = TUNING.cell.kinds[g.kind].radius + TUNING.cell.kinds[prey.kind].radius;
      if (Math.hypot(prey.x - g.x, prey.y - g.y) >= reach) continue;
      prey.hp = 0;
      this.cells = this.cells.filter((c) => c !== prey);
      this.killCell(prey, "gulped", g);
      g.brain = ate(g.brain, TUNING.gulper);
      this.sfx.play("eat_meat");
    }
  }

  /** Pond cells that touch bump each other: pushed apart, each takes half of what the other's bump costs you. */
  private cellBumps(): void {
    const t = TUNING.cell;
    for (let i = 0; i < this.cells.length; i++) {
      const a = this.cells[i];
      for (let j = i + 1; j < this.cells.length; j++) {
        const b = this.cells[j];
        if (a.hitCd > 0 || b.hitCd > 0 || a.hp <= 0 || b.hp <= 0) continue;
        if (Math.hypot(a.x - b.x, a.y - b.y) >= t.kinds[a.kind].radius + t.kinds[b.kind].radius) continue;
        a.hitCd = b.hitCd = TUNING.bumpCooldownS;
        a.hp -= cellHitDamage(b.kind);
        b.hp -= cellHitDamage(a.kind);
        knockApart(a, b, t.cellKnockback);
        for (const c of [a, b]) {
          c.spr.setTint(0xff9090);
          this.time.delayedCall(120, () => c.spr.active && c.spr.clearTint());
        }
        Log.debug(LOG, `cell bump ${a.kind}#${a.id} hp=${a.hp} / ${b.kind}#${b.id} hp=${b.hp}`);
      }
    }
  }

  /** Every pond cell at 0 hp dies, whoever hit it. Only the player's pops count for the lineage. */
  private deaths(): void {
    const dead = this.cells.filter((c) => c.hp <= 0);
    if (!dead.length) return;
    this.cells = this.cells.filter((c) => c.hp > 0);
    const byPlayer = dead.filter((c) => c.poppedByPlayer).length;
    if (byPlayer) this.record = bump(this.record, "cellsPopped", byPlayer);
    for (const c of dead) {
      this.killCell(c, c.poppedByPlayer ? "popped" : "bumped");
      this.sfx.play("pop");
    }
  }

  /**
   * The one way a pond cell dies (playtest 2026-11-08 "if a creature dies for any reason it drops its parts and
   * meat"): drop its part and its meat where it died, then animate it away (swallowed toward `into`, else popped).
   * The caller has already taken it out of this.cells.
   */
  private killCell(c: PondCell, cause: "popped" | "bumped" | "gulped", into?: Body): void {
    Log.info(LOG, `${cause === "gulped" ? "GULP" : "POP"} ${c.kind} (${cause})`);
    const part = DROPS[c.kind];
    if (part) this.dropOrb(c.x, c.y, part);
    this.scatterFood(c.x, c.y, Array<FoodKind>(deathMeat(c.kind, cause === "popped")).fill("meat"), true, TUNING.meatLifeS, 0.8);
    c.label?.destroy();
    const gone = into ? { x: into.x, y: into.y, scale: 0, duration: 200 } : { scale: 0, alpha: 0, duration: 250 };
    this.tweens.add({ targets: c.spr, ...gone, onComplete: () => c.spr.destroy() });
  }

  /** Player touches a cell: it takes damage, you lose food into the water, both bounce apart. */
  private bumps(): void {
    const pr = this.playerRadius();
    for (const c of this.cells) {
      const k = TUNING.cell.kinds[c.kind];
      if (c.hitCd > 0 || Math.hypot(c.x - this.player.x, c.y - this.player.y) >= pr + k.radius) continue;
      c.hitCd = TUNING.bumpCooldownS;
      const into = toward(this.player, c); // am I swimming into it, or is it biting me?
      const ramming = this.player.vx * into.x + this.player.vy * into.y >= TUNING.rammingSpeed;
      c.hp -= bumpDamage(this.creature, ramming);
      if (c.hp <= 0) c.poppedByPlayer = true;
      if (ramming) this.record = bump(this.record, "cellsRammed");
      else if (c.kind === "gulper") this.record = bump(this.record, "timesBitten");
      const loss = bumpFoodLoss(this.creature, c.kind);
      this.creature = loseFood(this.creature, loss);
      this.scatterFood(this.player.x, this.player.y, dropKinds(this.creature, loss), false, TUNING.droppedFoodLifeS, 0.7, 1);
      knockApart(this.player, c, TUNING.bumpKnockback * k.knockMult);
      this.sfx.play("bump");
      const push = knockbackTaken(this.creature) / TUNING.bumpKnockback; // mobility: you get pushed less
      this.player.vx *= push;
      this.player.vy *= push;
      this.cameras.main.shake(120, (TUNING.shakeOnBump * k.knockMult * effectiveShake(shell.settings)) / this.scale.width);
      c.spr.setTint(0xff9090);
      this.time.delayedCall(120, () => c.spr.active && c.spr.clearTint());
      Log.debug(LOG, `bump ${c.kind} hp=${c.hp} lost=${loss}`);
    }
    // the dead are swept up by deaths(), after the cells have bumped each other too
  }

  // ---- the pond refills ------------------------------------------------------------
  private refill(dt: number): void {
    const algae = this.foods.filter((f) => f.kind === "algae" && f.life === Infinity).length;
    if (algae < TUNING.algaeCount) {
      this.regrowIn -= dt;
      if (this.regrowIn <= 0) {
        this.spawnAlgae();
        this.regrowIn = TUNING.algaeRegrowS;
      }
    }
    // each kind refills toward cellsWanted (which grows with your form for predators), one at a time
    for (const kind of CELL_KINDS) {
      const alive = this.cells.filter((c) => c.kind === kind).length;
      if (alive >= cellsWanted(kind, this.creature.form)) {
        delete this.respawnIn[kind];
        continue;
      }
      const left = (this.respawnIn[kind] ?? TUNING.cell.kinds[kind].respawnS) - dt;
      if (left > 0) {
        this.respawnIn[kind] = left;
        continue;
      }
      this.spawnCell(kind);
      delete this.respawnIn[kind];
    }
  }

  /** A random spot in the pond at least `minDist` from the player. */
  private freeSpot(minDist: number): { x: number; y: number } {
    const { width, height } = TUNING.world;
    for (let i = 0; i < 30; i++) {
      const x = this.rng.between(30, width - 30), y = this.rng.between(30, height - 30);
      if (!this.player || Math.hypot(x - this.player.x, y - this.player.y) >= minDist) return { x, y };
    }
    return { x: this.rng.between(30, width - 30), y: this.rng.between(30, height - 30) };
  }

  private drawDebug(): void {
    const g = this.debugGfx;
    if (!g) return;
    g.clear().lineStyle(1, 0xff00ff, 1);
    g.strokeCircle(this.player.x, this.player.y, this.playerRadius());
    const pull = pullRadius(this.creature);
    if (pull) g.lineStyle(1, 0x80ff80, 0.5).strokeCircle(this.player.x, this.player.y, pull);
    g.lineStyle(1, 0xffff00, 1);
    for (const c of this.cells) g.strokeCircle(c.x, c.y, TUNING.cell.kinds[c.kind].radius);
    for (const c of this.cells) { // predators: sight ring, state label, line to the target (SOP-14 debug view)
      if (!c.brain) continue;
      g.lineStyle(1, 0xff6060, 0.35).strokeCircle(c.x, c.y, TUNING.gulper.sight);
      const tid = c.brain.targetId;
      const target = tid === PLAYER_ID ? this.player : this.cells.find((o) => o.id === tid);
      if (target) g.lineStyle(1, 0xff6060, 0.9).lineBetween(c.x, c.y, target.x, target.y);
      c.label ??= this.add.text(c.x, c.y, "", { fontFamily: "monospace", fontSize: "9px", color: "#ffd27f" }).setOrigin(0.5, 1).setDepth(901);
      c.label.setPosition(c.x, c.y - TUNING.cell.kinds[c.kind].radius - 4)
        .setText(`${c.brain.state}${tid === PLAYER_ID ? " YOU" : tid !== null ? " #" + tid : ""}`);
    }
  }
}

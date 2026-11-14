// ---------------------------------------------------------------------------
// Purpose : Creature Toy 2: connected exploration, mortal lives and inherited offspring.
// Usage   : Registered as creature; all controls use shell actions. Original sprite atlases reused.
// Notes   : PROTOTYPE: six handmade rooms; save checkpoints are generation boundaries.
// Pseudocode: explore -> gather behavioral evidence -> death/nest -> climate -> heir -> fresh life,
//            retaining opened gates and discovered rooms; crown seed writes the civilization hero.
// Authored: Written with Codex (GPT-6).
// ---------------------------------------------------------------------------
import * as Phaser from "phaser";
import { shell } from "../shell/app";
import { Log } from "../core/log";
import { writeStage, refreshLineage } from "../core/lineage";
import { revealFrom } from "./aquatic/reveal";
import { animSpecs, type AtlasLayout } from "./cell/atlas";
import { newBody, stepBody, type Body } from "./creature/physics";
import { GEN, ROOMS, edible, evidence, inherit, offspring, resumeGarden, type Climate, type Garden, type Heir } from "./creature/generations";
import { StageUi, action } from "./stageUi";
import { LineagePanel } from "./lineagePanel";

interface Enemy { x: number; hp: number; facing: number; tell: number; sprite: Phaser.GameObjects.Sprite; passed: boolean }
interface Food { x: number; meat: boolean; taken: boolean }
export class CreatureScene extends Phaser.Scene {
  private garden!: Garden;
  private room = 0;
  private body!: Body;
  private player!: Phaser.GameObjects.Sprite;
  private gfx!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private overlay!: Phaser.GameObjects.Text;
  private screenUi!: StageUi;
  private lineage!: LineagePanel;
  private mode: "play" | "climate" | "heir" | "won" = "play";
  private selection = 0;
  private heirs: Heir[] = [];
  private climate: Climate = "flood";
  private evidence = evidence();
  private hp = 6;
  private hunger = 0;
  private hurt = 0;
  private bite = 0;
  private facing = 1;
  private enemies: Enemy[] = [];
  private food: Food[] = [];
  private rooms = new Map<number, { food: Food[]; foes: { x: number; hp: number; passed: boolean }[]; trap: boolean }>();
  private trap = false;
  private message = "Explore both trails. Your actions shape the next generation.";
  constructor() { super("creature"); }
  preload(): void {
    this.load.spritesheet("genWalker", "assets/art/creature_walker.png", { frameWidth: 32, frameHeight: 32 });
    this.load.json("genWalkerLayout", "assets/art/creature_walker.json");
    this.load.spritesheet("genFoe", "assets/art/creature_foes.png", { frameWidth: 32, frameHeight: 32 });
  }
  create(): void {
    for (const a of animSpecs("gen", this.cache.json.get("genWalkerLayout") as AtlasLayout)) {
      if (!this.anims.exists(a.key)) this.anims.create({ key: a.key, frames: this.anims.generateFrameNumbers("genWalker", { start: a.start, end: a.end }), frameRate: 8, repeat: -1 });
    }
    this.gfx = this.add.graphics();
    this.player = this.add.sprite(64, GEN.floor - 16, "genWalker").setDepth(4);
    const text = (x: number, y: number, size: number) => this.add.text(x, y, "", { fontFamily: "monospace", fontSize: size + "px", color: "#e9f0d9", wordWrap: { width: 610 } }).setResolution(2).setDepth(10);
    this.hud = text(12, 25, 11); this.hint = text(12, 325, 10);
    this.overlay = text(32, 70, 13).setWordWrapWidth(570).setDepth(30);
    this.screenUi = new StageUi(this);
    this.cameras.main.setBounds(0, 0, 640, 360).startFollow(this.player, true, 0.15, 0.15);
    const prev = shell.saves.load("lineage").envelope?.data;
    const reveal = revealFrom(prev, 3, "creature");
    const home = refreshLineage(prev)?.species[0];
    // Only upstream evidence identifies this garden; writing its own hero must not invalidate a resume.
    const source = JSON.stringify([home?.id, reveal.diet, home?.stages.cell, home?.stages.aquatic,
      home?.influence.filter(e => e.stage === "cell" || e.stage === "aquatic")]);
    this.garden = resumeGarden(shell.saves.load("creature_generations").envelope?.data, reveal.diet, source);
    this.rooms.clear(); this.mode = "play"; this.evidence = evidence();
    this.hp = GEN.health + this.garden.traits.vitality; this.hunger = 0; this.hurt = 0; this.bite = 0;
    this.enter(0, 64);
    this.draw();
    this.lineage = new LineagePanel(this);
    if (!new URLSearchParams(location.search).has("autoplay")) {
      this.lineage.show(reveal, "Begin exploring");
      this.screenUi.root.inert = true;
      shell.input.clearHeld();
    }
    Log.info("creature", `Generation ${this.garden.generation}: ${JSON.stringify(this.garden.traits)}`);
  }
  private remember(): void {
    this.rooms.set(this.room, { food: this.food, foes: this.enemies.map(e => ({ x: e.x, hp: e.hp, passed: e.passed })), trap: this.trap });
  }
  private enter(id: number, x: number): void {
    this.room = id;
    if (!this.garden.visited.includes(id)) this.garden.visited.push(id);
    this.enemies.forEach(e => e.sprite.destroy());
    const old = this.rooms.get(id);
    this.trap = old?.trap ?? false;
    this.food = old?.food ?? [150, 270, 440, 530].map((fx, i) => ({ x: fx, meat: this.garden.climate === "drought" ? i >= 1 : i >= 3, taken: false }));
    const foes = old?.foes ?? (id === 0 ? [] : [{ x: 390, hp: id === 5 ? 12 + this.garden.generation : 4, passed: false }]);
    this.enemies = foes.map(e => ({ ...e, facing: -1, tell: 0, sprite: this.add.sprite(e.x, GEN.floor - 16, "genFoe").setDepth(3).setScale(id === 5 ? 1.7 : 1) }));
    this.body = newBody(x, GEN.floor); this.message = ROOMS[id].hint;
    if (id === 4) this.evidence.cliff = true;
  }
  private solid(tx: number, ty: number): boolean {
    if (ty >= 19) return true;
    if (tx < 0 || tx >= 40) return true;
    if (this.room === 2 && !this.garden.opened.includes(2) && tx >= 29 && tx <= 30 && ty >= 7) return true;
    if (this.room === 4 && !this.garden.opened.includes(4) && tx >= 29 && tx <= 30 && ty >= 7) return true;
    return (tx >= 13 && tx <= 16 && ty === 15) || (tx >= 22 && tx <= 24 && ty === 12);
  }
  private next(id: number, x: number): void { if (id >= 0) { this.remember(); this.enter(id, x); } }
  private endLife(reason: string): void {
    this.heirs = offspring(this.garden, this.evidence); this.mode = "climate"; this.selection = 1;
    this.message = reason; this.overlay.setVisible(true);
    shell.input.clearPresses();
  }
  private save(): void {
    try { shell.saves.save("creature_generations", this.garden as unknown as Parameters<typeof shell.saves.save>[1]); }
    catch (err) { Log.warn("creature", `Generation could not be saved: ${String(err)}`); this.message = "Save failed; this garden continues in memory."; }
  }
  private menu(): boolean {
    const i = shell.input;
    const left = i.takePress("move_left"), uiLeft = i.takePress("ui_left"), right = i.takePress("move_right"), uiRight = i.takePress("ui_right");
    if (left || uiLeft) this.selection = Math.max(0, this.selection - 1);
    if (right || uiRight) this.selection = Math.min(this.mode === "climate" ? 1 : 2, this.selection + 1);
    if (this.mode === "climate") {
      this.overlay.setText(`${this.message}\n\nTHE GARDENER: shape the next life\n\n${this.selection === 0 ? ">" : " "} DROUGHT: prey gathers; bites deal +1 damage.\n\n${this.selection === 1 ? ">" : " "} FLOOD: predators slow; crouching conceals you.\n\nA/D or arrows: choose     Enter: continue`);
      if (i.takePress("ui_accept")) { this.climate = this.selection === 0 ? "drought" : "flood"; this.selection = 0; this.mode = "heir"; }
    } else if (this.mode === "heir") {
      this.overlay.setText(`CHOOSE YOUR DAUGHTER — generation ${this.garden.generation + 1}\n\n` + this.heirs.map((h, n) => `${this.selection === n ? ">" : " "} ${h.name}: strength ${h.traits.strength}, vitality ${h.traits.vitality}${h.traits.climb ? ", climbing claws" : ""}\n${h.cause}`).join("\n\n") + "\n\nA/D or arrows: choose     Enter: inherit");
      if (i.takePress("ui_accept")) {
        this.garden = inherit(this.garden, this.heirs[this.selection], this.climate); this.save();
        this.rooms.clear(); this.evidence = evidence(); this.hp = GEN.health + this.garden.traits.vitality;
        this.hunger = 0; this.hurt = 0; this.bite = 0; this.mode = "play"; this.overlay.setVisible(false); this.enter(0, 64); i.clearPresses();
      }
    } else {
      this.overlay.setText("THE CROWN SEED IS YOURS\n\nYour surviving creature becomes the hero of its people.\n\nEnter: continue to civilization\nE: stay in this garden and raise another generation");
      if (i.takePress("ui_accept")) { shell.startGame("civ"); return true; }
      else if (i.takePress("interact")) this.endLife("The hero's line continues.");
    }
    return false;
  }
  update(_time: number, delta: number): void {
    if (shell.topId !== "play") return;
    if (this.lineage.isOpen) {
      if (shell.input.takePress("ui_accept") || shell.input.takePress("interact")) {
        this.lineage.hide(); this.screenUi.root.inert = false; shell.input.clearHeld();
      }
      return;
    }
    if (this.mode !== "play") { if (!this.menu()) this.draw(); return; }
    const dt = Math.min(delta / 1000, 0.05), i = shell.input;
    this.hunger += dt; this.hurt = Math.max(0, this.hurt - dt); this.bite = Math.max(0, this.bite - dt);
    const crouch = i.isDown("move_down"), dir = Number(i.isDown("move_right")) - Number(i.isDown("move_left"));
    const jump = i.takePress("jump"); if (jump) this.evidence.jumps++;
    if (dir) this.facing = dir;
    this.body.h = crouch ? 11 : 18;
    const collision = stepBody(this.body, { dir, jump, speed: crouch ? 45 : i.isDown("pace") ? 165 : 110 }, dt, (x, y) => this.solid(x, y));
    if (this.room === 4 && this.garden.traits.climb && collision.wall && i.isDown("move_up")) this.body.vy = -150;
    if (this.room === 4 && this.body.x > 495 && !this.garden.opened.includes(4)) { this.garden.opened.push(4); this.message = "Climbing route opened for your lineage."; }
    const attack = i.takePress("attack") || i.takePress("sink");
    if (attack && this.bite === 0) {
      this.bite = GEN.biteCooldown;
      if (this.room === 2 && Math.abs(this.body.x - 464) < 60 && !this.garden.opened.includes(2)) {
        if (this.garden.traits.strength >= GEN.strengthGate) { this.garden.opened.push(2); this.message = "Strong jaws broke the wall. Your descendants keep this route."; }
        else this.message = "Too hard: strength 4 needed. Strong-jawed offspring may break it.";
      }
      for (const e of this.enemies) if (e.hp > 0 && Math.abs(e.x - this.body.x) < GEN.biteReach && this.body.y > 250 && Math.sign(e.x - this.body.x) === this.facing) {
        e.hp -= this.garden.traits.strength + (this.garden.climate === "drought" ? 1 : 0); this.evidence.fights++; e.x += this.facing * 12;
        if (e.hp <= 0) { this.food.push({ x: e.x, meat: true, taken: false }); this.message = "Predator defeated. Meat remains for compatible diets."; }
      }
    }
    for (const e of this.enemies) {
      e.sprite.setVisible(e.hp > 0); if (e.hp <= 0) continue;
      const distance = Math.abs(e.x - this.body.x), hidden = crouch && (this.garden.climate === "flood" || (this.body.x > 200 && this.body.x < 350));
      if (distance < 190 && !hidden) { e.facing = Math.sign(this.body.x - e.x); e.x += e.facing * GEN.foeSpeed * (this.garden.climate === "flood" ? 0.6 : 1.3) * dt; }
      e.tell = distance < 45 && !hidden ? e.tell + dt : 0;
      if (e.tell > 0.7 && this.hurt === 0 && this.body.y > 265) { this.hp--; this.hurt = GEN.damageGrace; this.body.vy = -160; this.message = "Bitten! Orange jaws warn before the strike."; e.tell = 0; }
      if (this.body.x > e.x + 45 && hidden && !e.passed) { e.passed = true; this.evidence.sneaks++; this.message = "Passed unseen: cautious behavior recorded."; }
      e.sprite.setPosition(e.x, GEN.floor - 16).setFlipX(e.facing < 0).setTint(e.tell > 0.2 ? 0xff9c55 : 0xffffff);
    }
    for (const f of this.food) if (!f.taken && Math.abs(f.x - this.body.x) < 18 && this.body.y > 275 && edible(this.garden.traits.diet, f.meat)) {
      f.taken = true; this.hunger = Math.max(0, this.hunger - 35); this.hp = Math.min(GEN.health + this.garden.traits.vitality, this.hp + GEN.foodHeal);
      if (f.meat) this.evidence.meat++; else this.evidence.plants++;
    }
    if (i.takePress("interact")) {
      if (this.room === 0 && this.body.x < 135) {
        if (this.rooms.size > 0) this.endLife("You rested at the nest. Your offspring carry this life's legacy.");
        else this.message = "Explore beyond the nest before raising the next generation.";
      }
      else if (this.room === 1 && Math.abs(this.body.x - 300) < 65) this.next(4, 40);
      else if (this.room === 5 && this.body.x < 100) this.next(4, 570);
      else if (!this.trap && Math.abs(this.body.x - 220) < 55 && this.room !== 0) {
        this.trap = true; this.evidence.solves++; this.enemies.forEach(e => { e.hp = 0; this.food.push({ x: e.x, meat: true, taken: false }); }); this.message = "Hanging stone released: the threat is cleared without a fight.";
      }
      else if (this.room === 5 && this.body.x > 550) this.finish();
    }
    if (this.body.x < 14) this.next(ROOMS[this.room].left, 610);
    else if (this.body.x > 625) this.next(ROOMS[this.room].right, 30);
    if (this.hunger >= GEN.hungerSeconds) { this.hp--; this.hunger = GEN.hungerSeconds - 15; this.message = "Hungry: find food your diet can eat, or return to the nest."; }
    if (this.hp <= 0) this.endLife("This creature's life ended. The garden and its opened routes endure.");
    const pose = this.bite > 0.15 ? "bite" : !this.body.onGround ? "jump" : crouch ? "crouch" : dir ? "walk" : "idle";
    this.player.setPosition(this.body.x, this.body.y - 16).setFlipX(this.facing < 0).play(`gen:${pose}:right`, true).setTint(this.garden.traits.climb ? 0xb1e5ba : 0xffffff).setAlpha(this.hurt > 0 ? 0.6 : 1).setScale(1 + this.garden.traits.vitality * 0.015);
    this.draw();
  }
  private finish(): void {
    if (this.enemies.some(e => e.hp > 0 && !e.passed)) { this.message = "Claim the seed after defeating, trapping or sneaking past the guardian."; return; }
    try {
      const prev = shell.saves.load("lineage").envelope?.data;
      const e = this.evidence;
      const garden = { ...this.garden }; delete garden.source; // Checkpoint identity is local, not inherited biology.
      const next = writeStage(prev, "creature", [{ cause: `Generation ${this.garden.generation} reached the crown: ${e.fights} bites, ${e.sneaks} unseen passages, ${e.solves} traps.`, effect: { aggressive: e.fights * 0.02, cautious: e.sneaks * 0.04, adaptable: e.solves * 0.04 } }], { ...garden, diet: garden.traits.diet, traits: garden.traits.climb ? ["climbing claws"] : [], hero: { ...garden.traits }, abilities: garden.traits.climb ? ["climb"] : [] });
      shell.saves.save("lineage", next as unknown as Parameters<typeof shell.saves.save>[1]); this.save(); this.mode = "won"; this.overlay.setVisible(true); shell.input.clearPresses();
    } catch (err) { Log.warn("creature", String(err)); this.message = "Could not save the hero. Try claiming the seed again."; }
  }
  private draw(): void {
    const g = this.gfx; g.clear(); g.fillStyle(ROOMS[this.room].color).fillRect(0, 0, 640, 360);
    g.fillStyle(0x101f25).fillRect(0, 0, 640, 95);
    for (let x = 0; x < 640; x += 48) { g.fillStyle(0x142b29).fillRect(x + 12, 110 + x % 57, 9, 195); g.fillCircle(x + 16, 130 + x % 57, 32); }
    for (let y = 6; y < 22; y++) for (let x = 0; x < 40; x++) if (this.solid(x, y)) {
      g.fillStyle(y >= 19 ? 0x374a35 : 0x676250).fillRect(x * 16, y * 16, 16, 16); g.fillStyle(0x91a064, 0.4).fillRect(x * 16, y * 16, 15, 2);
    }
    g.fillStyle(0x568c4c, 0.6); for (let x = 205; x < 350; x += 7) g.fillRect(x, 285, 3, 19);
    for (const f of this.food) if (!f.taken) { g.fillStyle(f.meat ? 0xce8278 : 0x95cb60).fillEllipse(f.x, 296, 12, 8); }
    if (this.room !== 0) { g.lineStyle(2, 0xc3ac76).lineBetween(220, 180, 220, 285); if (!this.trap) g.fillStyle(0x999b88).fillTriangle(375, 180, 405, 180, 390, 210); }
    if (this.room === 0) g.lineStyle(3, 0xc5a567).strokeEllipse(70, 301, 65, 12);
    if (this.room === 1) g.lineStyle(3, 0x9bb97c).strokeRoundedRect(278, 255, 44, 49, 15);
    if (this.room === 5) g.fillStyle(0xf5d584).fillEllipse(580, 282, 16, 26);
    const t = this.garden.traits;
    this.hud.setText(`G${this.garden.generation}  ${ROOMS[this.room].name}  |  HP ${this.hp}/${GEN.health + t.vitality}  Food ${Math.max(0, Math.round(100 - this.hunger / GEN.hungerSeconds * 100))}%\n${t.diet}  STR ${t.strength}  VIT ${t.vitality}  ${t.climb ? "CLIMB" : "no claws"}  |  ${this.garden.climate}\nMap: ${ROOMS.map((r, n) => this.garden.visited.includes(n) ? `${n === this.room ? ">" : ""}${r.name}` : "?").join(" / ")}`);
    this.hint.setText(`${this.message}\nA/D move  Space jump  S hide  J/F bite  E use  W climb`);
    if (this.mode !== "play") { g.fillStyle(0x0b1820, 0.97).fillRect(16, 60, 608, 258); }
    this.hud.setVisible(false); this.hint.setVisible(false); this.overlay.setVisible(false);
    this.screenUi.setStatus(`G${this.garden.generation} · ${ROOMS[this.room].name} · HP ${this.hp}/${GEN.health + t.vitality}`, this.hud.text);
    const view = this.cameras.main.worldView;
    const unseen = !shell.input.isDown("move_down") && this.enemies.find(e => e.hp > 0 && Math.abs(e.x - this.body.x) < 190 && (e.x < view.left || e.x > view.right));
    this.screenUi.setMessage(unseen ? `Predator approaching from the ${unseen.x < this.body.x ? "left" : "right"}.` : this.message);
    this.screenUi.actions([action("use", "interact", shell.i18n.t("display.use_nest")), action("jump", "jump", shell.i18n.t("display.jump")), action("bite", "attack", shell.i18n.t("display.bite"))]);
    if (this.mode === "play") this.screenUi.hide();
    else if (this.mode === "won") this.screenUi.show(this.overlay.text, [action("continue", "ui_accept", "Continue to civilization"), action("raise", "interact", "Raise another generation")]);
    else this.screenUi.show(this.overlay.text, this.mode === "climate" ? [0, 1].map(n => ({ id: `climate${n}`, label: n === 0 ? "Drought" : "Flood", run: () => { this.selection = n; shell.input.inject("ui_accept"); } })) :
      this.heirs.map((h, n) => ({ id: `heir${n}`, label: h.name, run: () => { this.selection = n; shell.input.inject("ui_accept"); } })));
  }
}
// ---------------------------------------------------------------------------

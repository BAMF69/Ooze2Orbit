// ---------------------------------------------------------------------------
// CivScene.ts
// Purpose : The civilization stage, Toy 1 (docs/stages/04-civilization.md): you are the ruler of a 9-region hex
//           planet. Take regions by conquest, trade or faith, build machines, call down acts of god, and outplay a
//           rival that stands for a temperament you are not. A live tally shows which victory you are heading for.
// Usage   : the shell starts it as "civ" (main menu "Civilization stage (prototype)", or beating the Old Horn).
//           URL: ?stage=civ; &rival=aggressive|adaptable; &autoplay plays itself (smoke); &debug logs.
//           Controls: click a region (or Left/Right), click an action (or keys 1-9), Enter ends the turn.
// Notes   : PROTOTYPE (Toy 1). The rules are pure and tested in src/game/civ/rules.ts; this file draws the board,
//           the panel and the pieces (assets/art/civ_pieces) and turns input into actions. Not yet: saving, writing
//           the lineage, the T0|▼| probe, more acts, food.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import * as Phaser from "phaser";
import { writeStage, type TemperamentKind } from "../core/lineage";
import { Log } from "../core/log";
import { shell } from "../shell/app";
import { revealFrom, type Reveal } from "./aquatic/reveal";
import { LineagePanel } from "./lineagePanel";
import { animKey, animSpecs, type AtlasLayout } from "./cell/atlas";
import { cellSfx, type CellSfx } from "./cell/sfx";
import {
  CIV, MACHINE_NAME, SPECS, act, civRecord, beliefFor, blocked, buyoutFor, endTurn, newGame, priceFor, region, regionName, rivalFor, rivalName,
  shift, spec, tally, victoryType, won, yieldOf, type Action, type CivState, type Machine, type Method, type RivalKind,
} from "./civ/rules";

const LOG = "civ";
const HEX = 50; // hex radius in px (pointy-top)
const BOARD = { x: 205, y: 200 };
const SQ3 = Math.sqrt(3);
const COL = { you: 0x9a7432, rival: 0x7a2a3e, materials: 0x5a5048, goods: 0x2e5a5a, faith: 0x4a3e6a, sea: 0x0c1c2c };
const RES_COL: Record<string, string> = { materials: "#d8c0a0", goods: "#8ad8d0", faith: "#c0a8ff", favor: "#ffe080" };
const METHOD_WORD: Record<Method, string> = { conquest: "Conquest", trade: "Economic supremacy", faith: "Faith" };

const hexAt = (q: number, r: number) => ({ x: BOARD.x + HEX * SQ3 * (q + r / 2), y: BOARD.y + HEX * 1.5 * r });

interface Button { key: string; label: string; action: Action | "end"; rect: Phaser.Geom.Rectangle }

export class CivScene extends Phaser.Scene {
  private s!: CivState;
  private sel = "fernhills";
  private temper: Record<TemperamentKind, number> = { cautious: 0.4, aggressive: 0.3, adaptable: 0.3 };
  private sfx!: CellSfx;
  private g!: Phaser.GameObjects.Graphics;
  private texts: Phaser.GameObjects.Text[] = [];
  private sprites: Phaser.GameObjects.Sprite[] = [];
  private buttons: Button[] = [];
  private toastT!: Phaser.GameObjects.Text;
  private toastLeft = 0;
  private done = false;
  private lineage!: LineagePanel; // the opening screen: your lineage's temperament and what shaped it
  private reveal: Reveal | null = null;
  private intro = "";
  private autoplay = false;
  private pilotT = 0;
  private t = 0;
  private onKey = (e: KeyboardEvent) => {
    if (shell.topId !== "play" || this.done || this.lineage.isOpen) return;
    const b = this.buttons.find((x) => x.key === e.key);
    if (b) this.press(b);
  };

  constructor() {
    super("civ");
  }

  preload(): void {
    this.load.spritesheet("cpieces", "assets/art/civ_pieces.png", { frameWidth: 32, frameHeight: 32 });
    this.load.json("cpieces_layout", "assets/art/civ_pieces.json");
  }

  create(): void {
    const params = new URLSearchParams(location.search);
    this.autoplay = params.has("autoplay");
    if (params.has("debug")) Log.enableChannel(LOG);
    this.sfx = cellSfx();
    const layout = this.cache.json.get("cpieces_layout") as AtlasLayout | undefined;
    if (!layout) throw new Error("missing atlas layout cpieces_layout (build assets_src/sprites/civ_pieces.py)");
    for (const a of animSpecs("cpieces", layout)) if (!this.anims.exists(a.key)) this.anims.create({ key: a.key, frames: this.anims.generateFrameNumbers("cpieces", { start: a.start, end: a.end }), frameRate: 4, repeat: -1 });
    const harshness = this.readLineage();
    const primary = (Object.entries(this.temper) as [TemperamentKind, number][]).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
    const ask = params.get("rival");
    const kind: RivalKind = ask === "aggressive" || ask === "adaptable" ? ask : rivalFor(primary);
    this.s = newGame(kind, harshness);
    this.done = false;
    this.g = this.add.graphics();
    this.toastT = this.add.text(BOARD.x, 22, "", { fontFamily: "monospace", fontSize: "11px", color: "#fff6c8", align: "center", wordWrap: { width: 400 }, backgroundColor: "#000000a0", padding: { x: 6, y: 3 } })
      .setOrigin(0.5, 0).setDepth(100).setResolution(2).setVisible(false);
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => this.click(p.x, p.y));
    window.addEventListener("keydown", this.onKey);
    this.events.once("shutdown", () => window.removeEventListener("keydown", this.onKey));
    this.intro = `You rule ${spec("hearthhold").name}. Your rival, ${rivalName(kind)}, ${kind === "aggressive" ? "wants to conquer the planet" : "wants to buy the planet"}. Unite every region your way.`;
    this.lineage = new LineagePanel(this);
    if (this.autoplay) this.toast(this.intro, 6); // the smoke pilot skips the opening screen
    else this.lineage.show(this.reveal ?? revealFrom(null, 3, "civ"), "Enter or E: take the throne"); // BAMF69 2026-11-09
    Log.info(LOG, `START rival ${kind} (your lineage leans ${primary}), harshness ${harshness.toFixed(2)}`);
    this.render();
  }

  /** Your lineage's temperament picks the rival; the Gardener's harshness makes faith harder. */
  private readLineage(): number {
    try {
      const saved = shell.saves.load("lineage").envelope?.data ?? null;
      const rv = revealFrom(saved, 3, "civ");
      this.reveal = rv;
      if (rv.fromSave) for (const row of rv.rows) this.temper[row.kind] = row.pct / 100;
      const h = (saved as { gardener?: { harshness?: number } } | null)?.gardener?.harshness;
      return typeof h === "number" && Number.isFinite(h) ? Math.max(0, Math.min(1, h)) : 0;
    } catch (err) {
      Log.warn(LOG, `could not read the lineage: ${err instanceof Error ? err.message : String(err)}`);
      return 0;
    }
  }

  private toast(s: string, secs = 3): void {
    this.toastT.setText(s).setVisible(true);
    this.toastLeft = secs;
  }

  // ---- input ----------------------------------------------------------------------------------------------
  private click(x: number, y: number): void {
    if (shell.topId !== "play" || this.done || this.lineage.isOpen) return;
    const b = this.buttons.find((bt) => bt.rect.contains(x, y));
    if (b) { this.press(b); return; }
    for (const sp of SPECS) {
      const c = hexAt(sp.q, sp.r);
      if (Math.hypot(x - c.x, y - c.y) < HEX * 0.9) { this.sel = sp.id; this.sfx.play("choose"); this.render(); return; }
    }
  }

  private press(b: Button): void {
    if (b.action === "end") { this.endTurn(); return; }
    const r = act(this.s, b.action);
    if (!r.ok) { this.sfx.play("deny"); this.toast(`Cannot: ${r.why}`, 2); return; }
    this.s = r.state;
    this.sfx.play(b.action.kind === "meteor" ? "pop" : "upgrade");
    if (b.action.kind === "meteor") this.cameras.main.shake(250, 0.01);
    this.toast(r.why, 3);
    Log.info(LOG, `ACT ${b.action.kind}${"target" in b.action ? ` ${b.action.target}` : ""}: ${r.why}`);
    this.afterChange();
  }

  private endTurn(): void {
    this.s = endTurn(this.s);
    this.sfx.play("evolve");
    if (this.s.news.length) this.toast(this.s.news.join("\n"), 4);
    Log.info(LOG, `TURN ${this.s.turn}: ${this.s.news.join("; ") || "quiet"}`);
    this.afterChange();
  }

  private afterChange(): void {
    if (won(this.s)) { this.victory(); return; }
    this.render();
  }

  // ---- drawing --------------------------------------------------------------------------------------------
  private clearDrawn(): void {
    for (const t of this.texts) t.destroy();
    for (const s of this.sprites) s.destroy();
    this.texts = []; this.sprites = []; this.buttons = [];
    this.g.clear();
  }

  private text(x: number, y: number, s: string, size = 9, color = "#e8f0e0", originX = 0): Phaser.GameObjects.Text {
    const t = this.add.text(x, y, s, { fontFamily: "monospace", fontSize: `${size}px`, color }).setOrigin(originX, 0).setResolution(2).setDepth(10);
    this.texts.push(t);
    return t;
  }

  private piece(x: number, y: number, row: string, rival: boolean, scale = 0.7): void {
    const s = this.add.sprite(x, y, "cpieces").play(animKey("cpieces", row, "front")).setScale(scale).setDepth(8);
    if (rival) s.setTint(0xff8080);
    this.sprites.push(s);
  }

  private hexPath(cx: number, cy: number, r: number): Phaser.Math.Vector2[] {
    return Array.from({ length: 6 }, (_, i) => new Phaser.Math.Vector2(cx + r * Math.cos(Math.PI / 6 + (i * Math.PI) / 3), cy + r * Math.sin(Math.PI / 6 + (i * Math.PI) / 3)));
  }

  private render(): void {
    this.clearDrawn();
    const g = this.g;
    g.fillStyle(COL.sea, 1).fillRect(0, 0, 640, 360);
    for (let i = 0; i < 50; i++) g.fillStyle(0x16304a, 1).fillRect((i * 83) % 410, (i * 47) % 360, 8, 1);
    const s = this.s;
    for (const sp of SPECS) {
      const r = region(s, sp.id), c = hexAt(sp.q, sp.r);
      const main = Object.keys(sp.yields)[0] as keyof typeof COL;
      const fill = r.owner === "you" ? COL.you : r.owner === "rival" ? COL.rival : COL[main];
      g.fillStyle(fill, 1).fillPoints(this.hexPath(c.x, c.y, HEX - 1), true);
      g.lineStyle(sp.id === this.sel ? 3 : 1, sp.id === this.sel ? 0xffffff : 0x0a0a0a, 1).strokePoints(this.hexPath(c.x, c.y, HEX - 1), true);
      this.text(c.x, c.y - 36, regionName(s, sp.id).replace(/^the /, ""), 10, "#ffffff", 0.5);
      const y = yieldOf(s, sp.id); // yields in their resource's colour: M materials, G goods, F faith
      const ys = (["materials", "goods", "faith"] as const).filter((k) => y[k]);
      ys.forEach((k, i) => this.text(c.x + (i - (ys.length - 1) / 2) * 26, c.y - 23, `${k[0].toUpperCase()}${y[k]}`, 10, RES_COL[k], 0.5));
      if (!sp.capital || r.owner !== "you") this.text(c.x, c.y + 24, `defense ${r.defense}`, 10, "#e0e0e0", 0.5);
      if (sp.capital) this.piece(c.x, c.y + 4, "city", sp.capital === "rival", 0.9);
      // progress meters: your trade dependence (teal) and belief (violet), and the rival's
      let my = c.y + 2;
      if (r.route.you) { this.meter(c.x - 20, my, r.dependence.you / priceFor(s, sp.id), 0x8ad8d0); this.piece(c.x - 26, c.y + 2, "trader", false, 0.6); my += 6; }
      if (r.mission.you) { this.meter(c.x - 20, my, r.belief.you / beliefFor(s, sp.id), 0xc0a8ff); this.piece(c.x + 26, c.y + 2, "priest", false, 0.6); }
      if (r.route.rival) { this.meter(c.x - 20, c.y + 15, r.dependence.rival / priceFor(s, sp.id), 0xff8080); this.piece(c.x - 26, c.y - 8, "trader", true, 0.6); }
      if (r.owner === "you" && r.method && r.method !== "home") this.text(c.x, c.y + 10, r.method, 10, "#fff6c8", 0.5);
    }
    if (s.march) { // the rival's announced army: a red warrior and a warning on its target
      const t = spec(s.march.target), c = hexAt(t.q, t.r);
      this.piece(c.x + 20, c.y - 4, "army", true, 0.75);
      g.lineStyle(3, 0xff3020, 0.9 * (0.6 + 0.4 * Math.sin(this.t * 6))).strokePoints(this.hexPath(c.x, c.y, HEX - 5), true);
      this.text(c.x, c.y + 36, `army ${s.march.strength} next turn!`, 10, "#ff9080", 0.5);
    }
    this.panel();
  }

  private meter(x: number, y: number, f: number, col: number): void {
    this.g.fillStyle(0x000000, 0.7).fillRect(x, y, 40, 5).fillStyle(col, 1).fillRect(x + 1, y + 1, 38 * Math.max(0, Math.min(1, f)), 3);
  }

  /** The right-hand panel: purse, tally, the selected region, and the actions with their costs. */
  private panel(): void {
    const s = this.s, x0 = 410, g = this.g;
    g.fillStyle(0x0a0e14, 0.92).fillRect(x0 - 6, 0, 646 - x0, 360).lineStyle(1, 0xe0c890, 0.6).lineBetween(x0 - 6, 0, x0 - 6, 360);
    this.text(x0, 5, `Turn ${s.turn}   Harshness ${Math.round(s.harshness * 100)} %`, 10, "#fff6c8");
    const p = s.you;
    this.text(x0, 18, `Materials ${p.materials}`, 10, RES_COL.materials);
    this.text(x0 + 110, 18, `Goods ${p.goods}`, 10, RES_COL.goods);
    this.text(x0, 30, `Faith ${p.faith}`, 10, RES_COL.faith);
    this.text(x0 + 110, 30, `Favor ${p.favor}`, 10, RES_COL.favor);
    const t = tally(s);
    this.text(x0, 44, `Taken: conquest ${t.conquest}  trade ${t.trade}  faith ${t.faith}`, 10, "#e0e0d0");
    const total = t.conquest + t.trade + t.faith;
    this.text(x0, 55, total ? `Heading for: ${METHOD_WORD[victoryType(s, this.temper)]} victory` : "Heading for: take a region to find out", 10, "#a0e0a0");
    const r = region(s, this.sel), sp = spec(this.sel);
    const owner = r.owner === "you" ? "yours" : r.owner === "rival" ? rivalName(s.rivalKind) : "free";
    this.text(x0, 70, `${regionName(s, this.sel)} (${owner})`, 10, "#ffffff");
    const info = [`defense ${r.defense}`];
    if (r.route.you) info.push(`depends ${r.dependence.you}/${priceFor(s, this.sel)}`);
    if (r.mission.you) info.push(`belief ${r.belief.you}/${beliefFor(s, this.sel)}`);
    this.text(x0, 82, info.join("  "), 10, "#c8c8c0");
    const buyLabel = r.route.you ? `Buy out (${buyoutFor(s, this.sel)} goods)` : `Trade route (${CIV.route.cost} goods)`;
    const acts: [string, string, Action][] = [
      ["1", `Army (${CIV.army.cost} materials)`, { kind: "army", target: this.sel }],
      ["2", buyLabel, r.route.you ? { kind: "buyout", target: this.sel } : { kind: "route", target: this.sel }],
      ["3", `Missionaries (${CIV.mission.cost} faith)`, { kind: "mission", target: this.sel }],
      ["4", `Reinforce (${CIV.garrison.cost} materials)`, { kind: "garrison", target: this.sel }],
      ["5", `Meteor (${CIV.meteor.favor} favor)`, { kind: "meteor", target: this.sel }],
      ["6", `Terraform (${CIV.terraform.favor} favor)`, { kind: "terraform", target: this.sel }],
    ];
    const machines: [string, Machine][] = [["7", "siege"], ["8", "ships"], ["9", "temple"]];
    let y = 96;
    for (const [key, label, a] of acts) { this.button(x0, y, key, label, a); y += 19; }
    this.text(x0, y + 2, "Machines (once each):", 10, "#c8c8c0");
    y += 13;
    for (const [key, m] of machines) {
      const cost = CIV.machine[m];
      const have = s.you.machines.includes(m);
      this.button(x0, y, key, `${MACHINE_NAME[m].split(" (")[0]}${have ? "" : ` (${cost.cost} ${cost.res})`}`, { kind: "machine", machine: m });
      y += 19;
    }
    this.button(x0, 334, "Enter", "End turn", "end");
    void sp;
  }

  private button(x: number, y: number, key: string, label: string, action: Action | "end"): void {
    const why = action === "end" ? "" : blocked(this.s, "you", action);
    const w = 224, h = 17;
    this.g.fillStyle(why ? 0x1a1a1e : 0x24402a, 1).fillRect(x, y, w, h).lineStyle(1, why ? 0x3a3a40 : 0x70c080, 1).strokeRect(x, y, w, h);
    this.text(x + 4, y + 2, `[${key}] ${label}`, 10, why ? "#7a7a7a" : "#e8ffe8");
    if (why) this.text(x + w - 4, y + 3, why, 9, "#b08070", 1);
    this.buttons.push({ key, label, action, rect: new Phaser.Geom.Rectangle(x, y, w, h) });
  }

  // ---- the end --------------------------------------------------------------------------------------------
  private victory(): void {
    this.done = true;
    this.clearDrawn();
    const s = this.s, t = tally(s), v = victoryType(s, this.temper), sh = shift(s);
    this.g.fillStyle(0x0a0e14, 1).fillRect(0, 0, 640, 360).lineStyle(2, 0xe0c890, 1).strokeRect(40, 24, 560, 312);
    const lines = [
      `${METHOD_WORD[v]} victory`, "",
      `Every region on the planet is yours, in ${s.turn} turns.`,
      `Taken by conquest ${t.conquest}, by trade ${t.trade}, by faith ${t.faith}.`,
      `Your lineage leans: aggressive +${Math.round(sh.aggressive * 100)} %, adaptable +${Math.round(sh.adaptable * 100)} %, cautious +${Math.round(sh.cautious * 100)} %`,
      `The Gardener's harshness: ${Math.round(s.harshness * 100)} % (${s.harshness > 0.3 ? "the people fear the Watcher" : "the people love the Watcher"})`,
      "", ...s.causes.slice(-8),
      "", "The civilization stage Toy is complete.   Enter: on to the space stage",
    ];
    this.text(60, 40, lines.join("\n"), 10, "#f0ead8");
    this.sfx.play("evolve");
    Log.info(LOG, `VICTORY ${v} in ${s.turn} turns (conquest ${t.conquest}, trade ${t.trade}, faith ${t.faith})`);
    this.writeLineage();
  }

  /** Victory: the regions you took, how, and the Gardener's harshness go into the lineage the space stage will read. */
  private writeLineage(): void {
    try {
      const prev = shell.saves.load("lineage").envelope?.data ?? null;
      const r = civRecord(this.s, this.temper);
      shell.saves.save("lineage", writeStage(prev, "civ", r.causes, r.block, this.s.harshness) as unknown as Parameters<typeof shell.saves.save>[1]);
      Log.info(LOG, `LINEAGE written (civ): ${r.causes.length} regions, ${String(r.block.victory)} victory`);
    } catch (err) {
      Log.error(LOG, `could not write the lineage: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ---- autoplay (smoke) -----------------------------------------------------------------------------------
  /** Takes whatever it can (buy-outs, armies, routes, missions, machines), then ends the turn. Proves the loop runs. */
  private pilot(): void {
    const s = this.s;
    const tryAct = (a: Action) => { const r = act(this.s, a); if (r.ok) { this.s = r.state; Log.debug(LOG, `PILOT ${a.kind}: ${r.why}`); } return r.ok; };
    for (const sp of SPECS) tryAct({ kind: "buyout", target: sp.id });
    for (const m of ["siege", "ships", "temple"] as Machine[]) tryAct({ kind: "machine", machine: m });
    const targets = SPECS.filter((sp) => region(this.s, sp.id).owner !== "you").sort((a, b) => region(s, a.id).defense - region(s, b.id).defense);
    for (const sp of targets) { if (tryAct({ kind: "army", target: sp.id })) break; }
    for (const sp of targets) tryAct({ kind: "route", target: sp.id });
    for (const sp of targets) tryAct({ kind: "mission", target: sp.id });
    if (s.march) tryAct({ kind: "meteor", target: s.march.target });
    this.sel = targets[0]?.id ?? this.sel;
    if (won(this.s)) { this.victory(); return; }
    this.endTurn();
  }

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 0.1);
    const playing = shell.topId === "play";
    this.t += dt;
    this.sfx.update(shell.settings.audio);
    if (this.toastLeft > 0 && (this.toastLeft -= dt) <= 0) this.toastT.setVisible(false);
    if (this.done) {
      if (playing && shell.input.takePress("ui_accept")) { // on to space: not built yet
        Log.info(LOG, "EVOLVE into the space stage (not built yet)");
        shell.quitToTitle();
        shell.toast("civ.space_soon");
      }
      return;
    }
    if (this.autoplay) { if ((this.pilotT += dt) > 0.5) { this.pilotT = 0; this.pilot(); } return; }
    if (!playing) return;
    const inp = shell.input;
    if (this.lineage.isOpen) { // the opening screen: your lineage, then the throne
      if (inp.takePress("ui_accept") || inp.takePress("interact")) { this.lineage.hide(); this.toast(this.intro, 6); this.render(); }
      return;
    }
    const order = SPECS.map((sp) => sp.id);
    if (inp.takePress("ui_right") || inp.takePress("move_right")) { this.sel = order[(order.indexOf(this.sel) + 1) % order.length]; this.render(); }
    if (inp.takePress("ui_left") || inp.takePress("move_left")) { this.sel = order[(order.indexOf(this.sel) + order.length - 1) % order.length]; this.render(); }
    if (inp.takePress("ui_accept")) this.endTurn();
    if (this.s.march && Math.floor(this.t * 6) !== Math.floor((this.t - dt) * 6)) this.render(); // the warning pulses
  }
}

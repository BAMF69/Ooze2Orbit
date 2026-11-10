// ---------------------------------------------------------------------------
// panels.ts (space)
// Purpose : The space stage's screens that are not flying: the hangar (shipyard and outfitter, with the "what
//           T0|▼| has learned" readout that makes its adaptation readable), the star map, and the end screen.
// Usage   : const buttons = drawHangar(pen, campaign, selectedRow, lastBattleNotes);  drawReadout(pen, x, y, c);
//           drawMap(pen, campaign, selectedSystem);  drawEnd(pen, campaign, causes)
// Notes   : Drawing only, through a small Pen the scene supplies (a Graphics and a text maker), so this file knows
//           nothing about scenes or input. The numbers come from the pure rules (fit.ts, campaign.ts).
// Authored: Written with Claude (Fable 5.2, claude-fable-5-2)
// ---------------------------------------------------------------------------
import type * as Phaser from "phaser";
import { FAMILY_WORD, T0 } from "./adapt";
import { SYSTEMS, patrolFor, priceOf, starSystem, type Campaign, type SystemId } from "./campaign";
import {
  FAMILIES, PART_IDS, countOf, fitProblems, isHybrid, part, powerOf, shipStats, spaceUsed, specialtyKind, type PartId,
} from "./fit";
import { SPACE } from "./tuning";

export interface Pen {
  g: Phaser.GameObjects.Graphics;
  text(x: number, y: number, s: string, size?: number, color?: string, originX?: number): Phaser.GameObjects.Text;
}
export type HangarAct = { kind: "add" | "remove" | "select"; part: PartId } | { kind: "hull" } | { kind: "launch" };
export interface HangarButton { x: number; y: number; w: number; h: number; act: HangarAct }

const KIND_WORD = { weapon: "weapons", defence: "defences", engine: "engines", power: "power" } as const;
const MAKER_COL = { home: "#e8c890", ally: "#8ad8d0" } as const;
const pct = (v: number) => `${Math.round(v * 100)} %`;

/** "What T0|▼| has learned": a bar per family; the families on your ship now are bright. */
export function drawReadout(p: Pen, x: number, y: number, c: Campaign, compact = false): void {
  p.text(x, y, `What ${T0} has learned`, 10, "#ff9080");
  FAMILIES.forEach((f, i) => {
    const ry = y + 13 + i * (compact ? 11 : 12), v = c.learned[f];
    const fitted = c.fit.parts.some((id) => part(id).family === f);
    p.text(x, ry, FAMILY_WORD[f], 10, fitted ? "#ffffff" : "#7a8088");
    p.g.fillStyle(0x201418, 1).fillRect(x + 62, ry + 3, 60, 5).fillStyle(v > 0.5 ? 0xff4030 : 0xd08040, fitted ? 1 : 0.5).fillRect(x + 62, ry + 3, 60 * (v / SPACE.adapt.cap), 5);
    p.text(x + 126, ry, pct(v), 10, fitted && v >= 0.3 ? "#ff9080" : "#a0a8b0");
  });
}

/** The hangar on Hearth. Returns what can be clicked. */
export function drawHangar(p: Pen, c: Campaign, sel: number, notes: readonly string[]): HangarButton[] {
  const g = p.g, buttons: HangarButton[] = [];
  g.fillStyle(0x070b12, 0.94).fillRect(0, 0, 640, 360).lineStyle(1, 0xe0c890, 0.5).strokeRect(4, 4, 632, 352).lineBetween(318, 24, 318, 330);
  p.text(124, 8, "Hearth: shipyard and outfitter", 12, "#fff6c8");
  p.text(628, 9, `Salvage ${c.credits}    Wins ${c.wins} of ${SPACE.winsToFinish}`, 10, "#ffe080", 1);

  // ---- left: the ship, its numbers, the readout ----
  const hull = SPACE.hulls[c.fit.hull], st = shipStats(c.fit, c.makers, c.learned), problems = fitProblems(c.fit);
  const other = c.fit.hull === "seedpod" ? SPACE.hulls.carapace : SPACE.hulls.seedpod, diff = other.cost - hull.cost;
  p.text(84, 28, `${hull.name} (${hull.blurb})`, 11, "#ffffff");
  buttons.push(button(p, 84, 42, 222, `[H] ${diff > 0 ? `Buy the ${other.name} (${diff})` : `Back to the ${other.name} (+${-diff})`}`, { kind: "hull" }, c.credits >= diff));
  const used = spaceUsed(c.fit), power = powerOf(c.fit);
  p.text(84, 62, `Space ${used}/${hull.space}`, 10, used > hull.space ? "#ff8070" : "#e0e8e0");
  p.text(190, 62, power >= 0 ? `Power ${power} spare` : `Power ${-power} short`, 10, power < 0 ? "#ff8070" : "#e0e8e0");
  const raw = st.weapons.reduce((n, w) => n + w.damage / w.every, 0);
  const felt = st.weapons.reduce((n, w) => n + (w.damage / w.every) * (1 - c.learned[w.family]), 0);
  const lines = [
    `Hull ${st.hull}   Shield ${st.shield}${st.regen ? ` (+${st.regen.toFixed(1)}/s)` : ""}`,
    `Speed ${Math.round(st.topSpeed)}   Turn ${st.turn.toFixed(1)}`,
    `Firepower ${Math.round(raw)}/s`,
  ];
  p.text(12, 78, lines.join("\n"), 10, "#e0e8e0");
  if (raw > 0 && felt < raw * 0.95) p.text(130, 102, `${T0} feels only ${Math.round(felt)}/s`, 10, "#ff9080");
  p.text(12, 116, isHybrid(c.fit) ? `Hybrid ship: ${T0} learns it slower` : "One maker's weapons and defences: easy to learn", 10, isHybrid(c.fit) ? "#a0e0a0" : "#a0a8b0");
  if (problems.length) p.text(12, 130, `Cannot launch: ${problems.join(", ")}`, 10, "#ff8070");
  drawReadout(p, 12, 148, c);
  p.text(12, 226, `Hearth ${KIND_WORD[specialtyKind(c.makers.home)]} +${pct(SPACE.specialtyBonus)} (lineage: ${c.makers.home})`, 10, MAKER_COL.home);
  p.text(12, 238, `Tidewright ${KIND_WORD[specialtyKind(c.makers.ally)]} +${pct(SPACE.specialtyBonus)} (allies: ${c.makers.ally})`, 10, MAKER_COL.ally);
  const story = notes.length ? ["After the last battle:", ...notes] : ["What your people brought to the stars:", ...(c.start.length ? c.start : ["A plain Seedpod. Fly, fight, come back and refit."])];
  p.text(12, 256, story.slice(0, 7).join("\n"), 10, notes.length ? "#ffd0b0" : "#c8d0c8").setWordWrapWidth(300);

  // ---- right: the parts ----
  p.text(326, 28, "Parts (refits refund in full)", 10, "#c8c8c0");
  PART_IDS.forEach((id, i) => {
    const sp = part(id), y = 44 + i * 30, n = countOf(c.fit, id), price = priceOf(c, id);
    if (i === sel) g.fillStyle(0x1c2a34, 1).fillRect(322, y - 2, 310, 28).lineStyle(1, 0xffffff, 0.7).strokeRect(322, y - 2, 310, 28);
    p.text(328, y, `${n ? `${n}x ` : "   "}${sp.name}`, 10, n ? "#ffffff" : "#a8b0b0");
    p.text(566, y, `${price}`, 10, c.credits >= price ? "#ffe080" : "#806840", 1);
    const what = sp.kind === "weapon" ? `${FAMILY_WORD[sp.family as keyof typeof FAMILY_WORD]} ${Math.round(sp.damage / sp.every)}/s reach ${sp.range}`
      : sp.kind === "defence" ? (sp.hull ? `adds ${sp.hull} hull` : `adds ${sp.shield} shield, ${sp.regen}/s`)
      : sp.kind === "engine" ? `thrust ${sp.thrust} turn ${sp.turn}` : `makes ${sp.power} power`;
    const learned = sp.family ? c.learned[sp.family] : 0;
    p.text(328, y + 12, `${sp.maker === "home" ? "Hearth" : "Tidewright"} ${sp.space} space${sp.power < 0 ? ` ${-sp.power} power` : ""}  ${what}`, 10, MAKER_COL[sp.maker]);
    if (learned >= 0.05) p.text(520, y, `known ${pct(learned)}`, 10, "#ff9080", 1);
    buttons.push(button(p, 574, y, 24, "-", { kind: "remove", part: id }, n > 0, 12));
    buttons.push(button(p, 602, y, 24, "+", { kind: "add", part: id }, c.credits >= price, 12));
    buttons.push({ x: 322, y: y - 2, w: 248, h: 28, act: { kind: "select", part: id } });
  });
  p.text(326, 290, "W/S: pick a part   D: fit it   A: remove it", 10, "#a0a8b0");
  buttons.push(button(p, 326, 306, 300, "[Enter] Launch", { kind: "launch" }, problems.length === 0, 22));
  return buttons;
}

function button(p: Pen, x: number, y: number, w: number, label: string, act: HangarAct, on: boolean, h = 15): HangarButton {
  p.g.fillStyle(on ? 0x24402a : 0x1a1a1e, 1).fillRect(x, y, w, h).lineStyle(1, on ? 0x70c080 : 0x3a3a40, 1).strokeRect(x, y, w, h);
  if (label === "+" || label === "-") { // drawn, not typed: a one-character label blurs at this size
    const cx = Math.round(x + w / 2), cy = Math.round(y + h / 2);
    p.g.fillStyle(on ? 0xe8ffe8 : 0x7a7a7a, 1).fillRect(cx - 3, cy - 1, 6, 2);
    if (label === "+") p.g.fillRect(cx - 1, cy - 3, 2, 6);
  } else p.text(Math.round(x + w / 2), Math.round(y + (h - 11) / 2), label, 10, on ? "#e8ffe8" : "#7a7a7a", 0.5);
  return { x, y, w, h, act };
}

/** The star map: three systems, the one you are in, the one you would jump to, and what waits there. */
export function drawMap(p: Pen, c: Campaign, sel: SystemId): void {
  const g = p.g;
  g.fillStyle(0x04060c, 0.9).fillRect(60, 50, 520, 260).lineStyle(1, 0xe0c890, 0.6).strokeRect(60, 50, 520, 260);
  p.text(320, 58, "Star map", 12, "#fff6c8", 0.5);
  for (const s of SYSTEMS) for (const l of s.links) { const o = starSystem(l); g.lineStyle(1, 0x8090a0, 0.6).lineBetween(s.x, s.y, o.x, o.y); }
  for (const s of SYSTEMS) {
    const here = s.id === c.system, patrol = patrolFor(s.id, c.wins);
    g.fillStyle(s.id === "hearth" ? 0x60c0a0 : 0xd06050, 1).fillCircle(s.x, s.y, here ? 8 : 6);
    if (s.id === sel) g.lineStyle(2, 0xffffff, 1).strokeCircle(s.x, s.y, 13);
    p.text(s.x, s.y + 16, `${s.name}${here ? " (you)" : ""}`, 10, "#ffffff", 0.5);
    p.text(s.x, s.y + 29, patrol.length ? `${T0}: ${patrol.map((k) => SPACE.t0[k].name).join(", ")}` : s.blurb, 10, patrol.length ? "#ff9080" : "#a0e0c0", 0.5).setWordWrapWidth(160).setAlign("center");
  }
  p.text(320, 290, sel === c.system ? "Left/Right: pick a linked system   U: close" : `Enter: jump to ${starSystem(sel).name}   Left/Right: pick   U: close`, 10, "#c8d0c8", 0.5);
}

/** The Toy's end: what you did, what T0|▼| knows, and what goes into the lineage. */
export function drawEnd(p: Pen, c: Campaign, causes: readonly string[]): void {
  p.g.fillStyle(0x070b12, 1).fillRect(0, 0, 640, 360).lineStyle(2, 0xe0c890, 1).strokeRect(40, 24, 560, 312);
  const lines = [
    `${T0}'s patrols are broken`, "",
    `${c.wins} patrols destroyed in ${c.battles} battles; ${c.losses} ship${c.losses === 1 ? "" : "s"} lost.`,
    `You refitted ${c.refits} time${c.refits === 1 ? "" : "s"}. Your last ship: the ${SPACE.hulls[c.fit.hull].name}${isHybrid(c.fit) ? ", a hybrid" : ""}.`,
    `Salvage banked: ${c.credits}`, "",
    ...(causes.length ? ["Into your lineage:", ...causes.map((s) => `- ${s}`)] : ["Your ship was built around nothing in particular: the lineage did not lean."]),
  ];
  p.text(60, 40, lines.join("\n"), 10, "#f0ead8").setWordWrapWidth(330);
  drawReadout(p, 420, 60, c);
  p.text(60, 312, "The space stage Toy is complete.   Enter: back to the title", 10, "#fff6c8");
}

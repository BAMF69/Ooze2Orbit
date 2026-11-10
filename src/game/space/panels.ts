// ---------------------------------------------------------------------------
// panels.ts (space)
// Purpose : The space stage's screens that are not flying: the hangar (your ship drawn large with every slot around
//           it, part icons in the slots, and the world's outfitter and shipyard as a palette of icons; BAMF69
//           2026-11-10: icons and open slots, not a text list), the "what T0|▼| has learned" readout that makes its
//           adaptation readable, the star map, and the end screen.
// Usage   : const buttons = drawHangar(pen, campaign, selectedItem, lastBattleNotes);  drawReadout(pen, x, y, c);
//           drawMap(pen, campaign, selectedSystem);  drawEnd(pen, campaign, causes);  hangarItems(campaign)
// Notes   : Drawing only, through a small Pen the scene supplies (a Graphics, a text maker and a sprite maker), so
//           this file knows nothing about scenes or input. The numbers come from the pure rules (fit.ts,
//           campaign.ts). The layout is this game's own: same idea as Endless Sky's ship panel, not its look.
// Authored: Written with Claude (Fable 5.2, claude-fable-5-2)
// ---------------------------------------------------------------------------
import type * as Phaser from "phaser";
import { FAMILY_WORD, T0 } from "./adapt";
import {
  SYSTEMS, escortFit, escortPrice, escortsSoldAt, install, nextWave, partsSoldAt, patrolFor, priceOf, recruit, routeTo, starSystem, worldOf,
  type Campaign, type EscortId, type SystemId,
} from "./campaign";
import {
  FAMILIES, HULL_IDS, SLOT_TYPES, bonusFor, countOf, fitProblems, isHybrid, part, partsIn, powerOf, shipStats, slotsOf,
  type HullId, type PartId, type SlotType,
} from "./fit";
import { SPACE } from "./tuning";

export interface Pen {
  g: Phaser.GameObjects.Graphics;
  text(x: number, y: number, s: string, size?: number, color?: string, originX?: number): Phaser.GameObjects.Text;
  /** An atlas row drawn as a sprite (ships, part icons); pose is the row's name. */
  sprite(x: number, y: number, atlas: string, pose: string, scale?: number, alpha?: number): void;
}
export type HangarItem = { kind: "part"; id: PartId } | { kind: "escort"; id: EscortId };
export type HangarAct = { kind: "add" | "remove"; part: PartId } | { kind: "recruit"; escort: EscortId } | { kind: "hull" } | { kind: "launch" };
/** A clickable box. hover: the palette item it shows when the pointer is over it. */
export interface HangarButton { x: number; y: number; w: number; h: number; act?: HangarAct; hover?: number }

const SHIP = { x: 168, y: 140 };
const SLOT_COL: Record<SlotType, number> = { gun: 0xe0c890, turret: 0x60c0f0, defence: 0x70d0a0, engine: 0xf0a050, power: 0xf0d860 };
const SLOT_WORD: Record<SlotType, string> = { gun: "guns", turret: "turrets", defence: "defences", engine: "engines", power: "power" };
const MAKER_COL = { home: "#e8c890", ally: "#8ad8d0" } as const;
const pct = (v: number) => `${Math.round(v * 100)} %`;
/** Which atlas a hull's sprite lives in (yours, or the allies'). */
export const hullAtlas = (hull: HullId): string => (hull === "skiff" || hull === "warden" ? "space_allies" : "space_ships");

/** What this world's outfitter and shipyard offer, in palette order: its parts, then its ships. */
export const hangarItems = (c: Campaign): HangarItem[] => [
  ...partsSoldAt(c.system).map((id): HangarItem => ({ kind: "part", id })),
  ...escortsSoldAt(c.system).map((id): HangarItem => ({ kind: "escort", id })),
];

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

/** Where each slot of a hull is drawn around the ship: guns at the nose, engines at the tail, the rest at the sides. */
export function slotSpots(hull: HullId): { type: SlotType; i: number; x: number; y: number }[] {
  const n = slotsOf(hull), out: { type: SlotType; i: number; x: number; y: number }[] = [];
  for (let i = 0; i < n.gun; i++) out.push({ type: "gun", i, x: SHIP.x + (i - (n.gun - 1) / 2) * 38, y: 48 });
  for (let i = 0; i < n.engine; i++) out.push({ type: "engine", i, x: SHIP.x + (i - (n.engine - 1) / 2) * 38, y: 234 });
  for (let i = 0; i < n.turret; i++) out.push({ type: "turret", i, x: 40, y: 72 + i * 36 });
  for (let i = 0; i < n.power; i++) out.push({ type: "power", i, x: 40, y: 160 + i * 36 });
  for (let i = 0; i < n.defence; i++) out.push({ type: "defence", i, x: 296, y: 72 + i * 40 });
  return out;
}

/** The ship with its slots: a filled slot shows its part (click: remove it), an open one its type's colour. */
function drawShip(p: Pen, c: Campaign, buttons: HangarButton[]): void {
  const g = p.g;
  const labelAt: Record<SlotType, [number, number]> = { gun: [SHIP.x, 20], engine: [SHIP.x, 252], turret: [40, 44], power: [40, 132], defence: [296, 44] };
  for (const t of SLOT_TYPES) if (slotsOf(c.fit.hull)[t]) p.text(labelAt[t][0], labelAt[t][1], SLOT_WORD[t], 10, `#${SLOT_COL[t].toString(16)}`, 0.5);
  for (const s of slotSpots(c.fit.hull)) {
    const id = partsIn(c.fit, s.type)[s.i] as PartId | undefined, col = SLOT_COL[s.type];
    const dx = SHIP.x - s.x, dy = SHIP.y - s.y, d = Math.hypot(dx, dy) || 1;
    g.lineStyle(1, col, id ? 0.8 : 0.3).lineBetween(s.x + (dx / d) * 17, s.y + (dy / d) * 17, SHIP.x - (dx / d) * 40, SHIP.y - (dy / d) * 40); // slot -> ship
    g.fillStyle(id ? 0x16222c : 0x0a0e14, 1).fillRect(s.x - 16, s.y - 16, 32, 32).lineStyle(1, col, id ? 1 : 0.45).strokeRect(s.x - 16, s.y - 16, 32, 32);
    if (id) { p.sprite(s.x, s.y, "space_parts", id); buttons.push({ x: s.x - 16, y: s.y - 16, w: 32, h: 32, act: { kind: "remove", part: id } }); }
    else g.fillStyle(col, 0.35).fillRect(s.x - 5, s.y - 1, 10, 2).fillRect(s.x - 1, s.y - 5, 2, 10); // an open slot: a faint plus
  }
  p.sprite(SHIP.x, SHIP.y, hullAtlas(c.fit.hull), c.fit.hull, 4);
}

/** The picked palette item, in words: what it is, what it does, why it cannot be bought. */
function drawDetail(p: Pen, c: Campaign, item: HangarItem | undefined, x: number, y: number): void {
  p.g.fillStyle(0x0c141c, 1).fillRect(x, y, 290, 58).lineStyle(1, 0x405060, 1).strokeRect(x, y, 290, 58);
  if (!item) { p.text(x + 6, y + 4, "Nothing is sold here.", 10, "#a0a8b0"); return; }
  const lines: [string, string][] = [];
  let title: string, why: string;
  if (item.kind === "part") {
    const sp = part(item.id), n = countOf(c.fit, item.id);
    title = `${sp.name}  (${sp.slot} slot, ${sp.power > 0 ? `makes ${sp.power}` : sp.power < 0 ? `uses ${-sp.power}` : "no"} power)`;
    const b = bonusFor(item.id, c.makers) > 1 ? `, +${pct(SPACE.specialtyBonus)} (${c.makers[sp.maker]})` : "";
    lines.push([sp.kind === "weapon" ? `${FAMILY_WORD[sp.family as keyof typeof FAMILY_WORD]} ${Math.round(sp.damage / sp.every)}/s, reach ${sp.range}${b}`
      : sp.kind === "defence" ? `${sp.hull ? `adds ${sp.hull} hull` : `adds ${sp.shield} shield, ${sp.regen}/s back`}${b}`
      : sp.kind === "engine" ? `thrust ${sp.thrust}, turn ${sp.turn}${b}` : "feeds weapons, shields and engines", "#e0e8e0"]);
    lines.push([sp.mount === "turret" ? "Tracks and fires on its own, in any direction" : sp.mount === "missile" ? "Launches on its own and homes on its target" : sp.mount === "gun" ? "Fires forward when you fire" : n ? `${n} fitted` : "", "#c8d0c8"]);
    const known = sp.family ? c.learned[sp.family] : 0;
    why = install(c, item.id).ok ? "" : install(c, item.id).why;
    lines.push(why ? [`Cannot fit: ${why}`, "#ff8070"] : known >= 0.05 ? [`${T0} knows ${FAMILY_WORD[sp.family as keyof typeof FAMILY_WORD]}: ${pct(known)} weaker`, "#ff9080"] : ["", ""]);
  } else {
    const e = SPACE.escorts[item.id], st = shipStats(escortFit(item.id), c.makers, c.learned);
    title = `${e.name}  (allied ship: ${e.blurb})`;
    lines.push([`Hull ${st.hull}  Shield ${st.shield}  Speed ${Math.round(st.topSpeed)}`, "#e0e8e0"]);
    lines.push(["Flies and fights on its own. A lost ship is gone for good.", "#c8d0c8"]);
    why = recruit(c, item.id).ok ? "" : recruit(c, item.id).why;
    lines.push(why ? [`Cannot recruit: ${why}`, "#ff8070"] : [`${T0} sends a Shard more for every escort`, "#ff9080"]);
  }
  p.text(x + 6, y + 4, title, 10, "#ffffff");
  lines.forEach(([s, col], i) => { if (s) p.text(x + 6, y + 17 + i * 12, s, 10, col); });
}

/** The hangar of the world you landed on. Returns what can be clicked or hovered. */
export function drawHangar(p: Pen, c: Campaign, sel: number, notes: readonly string[]): HangarButton[] {
  const g = p.g, buttons: HangarButton[] = [], world = worldOf(c.system);
  g.fillStyle(0x070b12, 0.96).fillRect(0, 0, 640, 360).lineStyle(1, 0xe0c890, 0.5).strokeRect(4, 4, 632, 352).lineBetween(334, 24, 334, 352);
  p.text(124, 8, `${world?.name ?? "Orbit"}: shipyard and outfitter`, 12, "#fff6c8");
  p.text(628, 9, `Salvage ${c.credits}    Wins ${c.wins}${c.bossDown ? "    Mothership destroyed" : ""}`, 10, "#ffe080", 1);

  // ---- left: the ship and its slots, then its numbers and the fleet ----
  drawShip(p, c, buttons);
  const hull = SPACE.hulls[c.fit.hull], st = shipStats(c.fit, c.makers, c.learned), problems = fitProblems(c.fit);
  const other = SPACE.hulls[HULL_IDS[(HULL_IDS.indexOf(c.fit.hull) + 1) % HULL_IDS.length]], diff = other.cost - hull.cost;
  buttons.push(button(p, 8, 268, 230, `[H] ${hull.name}: ${diff > 0 ? `buy the ${other.name} (${diff})` : `back to the ${other.name}`}`, { kind: "hull" }, c.credits >= diff));
  const power = powerOf(c.fit);
  p.text(246, 270, power >= 0 ? `Power ${power} spare` : `Power ${-power} short`, 10, power < 0 ? "#ff8070" : "#e0e8e0");
  const raw = st.weapons.reduce((n, w) => n + w.damage / w.every, 0);
  const felt = st.weapons.reduce((n, w) => n + (w.damage / w.every) * (1 - c.learned[w.family]), 0);
  p.text(8, 288, `Hull ${st.hull}  Shield ${st.shield}${st.regen ? ` (${st.regen.toFixed(1)}/s)` : ""}  Speed ${Math.round(st.topSpeed)}  Turn ${st.turn.toFixed(1)}`, 10, "#e0e8e0");
  p.text(8, 300, `Firepower ${Math.round(raw)}/s`, 10, "#e0e8e0");
  if (raw > 0 && felt < raw * 0.95) p.text(110, 300, `${T0} feels only ${Math.round(felt)}/s`, 10, "#ff9080");
  if (problems.length) p.text(8, 312, `Cannot launch: ${problems.join(", ")}`, 10, "#ff8070");
  else p.text(8, 312, isHybrid(c.fit) ? `Hybrid ship: ${T0} learns it slower` : "One maker's weapons and defences: easy to learn", 10, isHybrid(c.fit) ? "#a0e0a0" : "#a0a8b0");
  p.text(8, 332, `Fleet ${c.fleet.length}/${SPACE.fleet.max}:`, 10, "#c8d0c8");
  c.fleet.forEach((id, i) => p.sprite(92 + i * 36, 338, hullAtlas(SPACE.escorts[id].hull), SPACE.escorts[id].hull, 1));
  if (!c.fleet.length) p.text(74, 332, "no escorts yet (recruit them at a shipyard)", 10, "#7a8088");

  // ---- right: this world's outfitter and shipyard, as icons ----
  const items = hangarItems(c), x0 = 342;
  p.text(x0, 26, world ? `${world.people} parts and ships` : "", 10, world ? MAKER_COL[world.maker] : "#ffffff");
  items.forEach((it, i) => {
    const x = x0 + (i % 6) * 48, y = 40 + Math.floor(i / 6) * 50;
    const ok = it.kind === "part" ? install(c, it.id).ok : recruit(c, it.id).ok;
    const price = it.kind === "part" ? priceOf(c, it.id) : escortPrice(c, it.id);
    g.fillStyle(i === sel ? 0x1c2a34 : 0x0c141c, 1).fillRect(x, y, 44, 46).lineStyle(1, i === sel ? 0xffffff : it.kind === "part" ? SLOT_COL[part(it.id).slot] : 0x8ad8d0, i === sel ? 1 : 0.5).strokeRect(x, y, 44, 46);
    if (it.kind === "part") p.sprite(x + 22, y + 18, "space_parts", it.id, 1, ok ? 1 : 0.4);
    else p.sprite(x + 22, y + 18, hullAtlas(SPACE.escorts[it.id].hull), SPACE.escorts[it.id].hull, 1, ok ? 1 : 0.4);
    p.text(x + 22, y + 34, `${price}`, 10, ok ? "#ffe080" : "#806840", 0.5);
    const n = it.kind === "part" ? countOf(c.fit, it.id) : c.fleet.filter((e) => e === it.id).length;
    if (n) p.text(x + 3, y + 1, `${n}`, 10, "#ffffff");
    buttons.push({ x, y, w: 44, h: 46, hover: i, act: it.kind === "part" ? { kind: "add", part: it.id } : { kind: "recruit", escort: it.id } });
  });
  drawDetail(p, c, items[sel], x0, 142);
  drawReadout(p, x0, 204, c);
  const story = notes.length ? notes : c.start.length ? c.start : ["Fit your ship, launch, and find a patrol on the star map."];
  p.text(x0 + 156, 204, story.slice(0, 5).join("\n"), 10, notes.length ? "#ffd0b0" : "#c8d0c8").setWordWrapWidth(134);
  p.text(x0, 318, "WASD pick  E buy  Q remove  click slot: empty", 10, "#a0a8b0");
  buttons.push(button(p, x0, 334, 290, "[Enter] Launch", { kind: "launch" }, problems.length === 0, 20));
  return buttons;
}

function button(p: Pen, x: number, y: number, w: number, label: string, act: HangarAct, on: boolean, h = 15): HangarButton {
  p.g.fillStyle(on ? 0x24402a : 0x1a1a1e, 1).fillRect(x, y, w, h).lineStyle(1, on ? 0x70c080 : 0x3a3a40, 1).strokeRect(x, y, w, h);
  p.text(Math.round(x + w / 2), Math.round(y + (h - 11) / 2), label, 10, on ? "#e8ffe8" : "#7a7a7a", 0.5);
  return { x, y, w, h, act };
}

/** How close a click must be to a system on the star map to pick it. */
export const MAP_PICK = 20;

/** The star map: the systems, the one you are in, the one you picked (with the jumps to it), and what waits there. */
export function drawMap(p: Pen, c: Campaign, sel: SystemId): void {
  const g = p.g;
  g.fillStyle(0x04060c, 0.9).fillRect(60, 50, 520, 260).lineStyle(1, 0xe0c890, 0.6).strokeRect(60, 50, 520, 260);
  p.text(320, 58, "Star map", 12, "#fff6c8", 0.5);
  for (const s of SYSTEMS) for (const l of s.links) { const o = starSystem(l); g.lineStyle(1, 0x8090a0, 0.6).lineBetween(s.x, s.y, o.x, o.y); }
  const route = routeTo(c.system, sel);
  let from = starSystem(c.system);
  for (const id of route) { const to = starSystem(id); g.lineStyle(2, 0x80f0ff, 0.9).lineBetween(from.x, from.y, to.x, to.y); from = to; } // the jumps you would make
  for (const s of SYSTEMS) {
    const here = s.id === c.system;
    const patrol = here ? nextWave(c) : patrolFor(s.id, c.wins, c.fleet.length); // elsewhere: what waits on arrival (the Driftfield: its easiest)
    g.fillStyle(s.world ? (s.world.maker === "home" ? 0xe0b060 : 0x60c0c0) : 0xd06050, 1).fillCircle(s.x, s.y, here ? 8 : 6);
    if (s.id === sel) g.lineStyle(2, 0xffffff, 1).strokeCircle(s.x, s.y, 13);
    p.text(s.x, s.y + 16, `${s.name}${here ? " (you)" : ""}`, 10, "#ffffff", 0.5);
    const drift = s.id === "driftfield" ? (here ? (c.visitWins ? `, wave ${c.visitWins + 1}: it grows while you stay` : ", easiest on arrival") : " (easiest on every arrival)") : "";
    const streak = (s.id === "lattice" && here && c.latticeStreak ? `, streak ${c.latticeStreak}/${SPACE.boss.streak}` : "") + drift;
    p.text(s.x, s.y + 29, patrol.length ? `${T0}: ${patrol.length > 3 ? `${patrol.length} ships` : patrol.map((k) => SPACE.t0[k].name).join(", ")}${streak}` : s.blurb, 10, patrol.length ? "#ff9080" : "#a0e0c0", 0.5).setWordWrapWidth(150).setAlign("center");
  }
  const hops = route.length > 1 ? ` (${route.length} jumps)` : "";
  p.text(320, 278, sel === c.system ? "Click a system to pick it" : `Enter, or click it again: jump to ${starSystem(sel).name}${hops}`, 10, "#ffffff", 0.5);
  p.text(320, 292, "Click or Left/Right: pick   U: close", 10, "#c8d0c8", 0.5);
}

/** The stage's end: the Mothership is down. What you did, what T0|▼| knows, and what goes into the lineage. */
export function drawEnd(p: Pen, c: Campaign, causes: readonly string[]): void {
  p.g.fillStyle(0x070b12, 1).fillRect(0, 0, 640, 360).lineStyle(2, 0xe0c890, 1).strokeRect(40, 24, 560, 312);
  const lines = [
    `${T0}'s Mothership is destroyed`, "",
    `${c.wins} waves beaten in ${c.battles} battles; ${c.losses} flagship${c.losses === 1 ? "" : "s"} lost.`,
    `You refitted ${c.refits} time${c.refits === 1 ? "" : "s"}. Your last ship: the ${SPACE.hulls[c.fit.hull].name}${isHybrid(c.fit) ? ", a hybrid" : ""}.`,
    `Fleet: ${c.fleet.length ? c.fleet.map((id) => SPACE.escorts[id].name).join(", ") : "none"}${c.escortsLost ? ` (${c.escortsLost} lost for good)` : ""}`,
    `Salvage banked: ${c.credits}`, "",
    ...(causes.length ? ["Into your lineage:", ...causes.map((s) => `- ${s}`)] : ["Your ship was built around nothing in particular: the lineage did not lean."]),
  ];
  p.text(60, 40, lines.join("\n"), 10, "#f0ead8").setWordWrapWidth(330);
  drawReadout(p, 420, 60, c);
  p.text(60, 300, `The space stage is won. ${T0} is not gone: its patrols keep coming.`, 10, "#f0ead8");
  p.text(60, 314, "Enter: keep flying", 10, "#fff6c8");
}

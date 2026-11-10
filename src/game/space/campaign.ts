// ---------------------------------------------------------------------------
// campaign.ts (space)
// Purpose : The space stage's Toy 1 around the fights, as pure rules (docs/stages/05-space.md): three star systems
//           in a line, what the civilization stage hands in (victory type, machines, harshness, T0|▼| tech), the
//           outfitter (parts cost salvage and refund in full, so a refit is never punished), what a battle's end
//           changes (T0|▼| adapts, salvage banked or lost with the ship), the end of the Toy and what it writes
//           into the lineage. Also the autoplay pilot's refit.
// Usage   : let c = startCampaign({ temper, civ, harshness });  c = install(c, "lance").c;  c = launch(c);
//           const r = afterBattle(c, "won", dealt, salvage);  finished(r.c);  spaceRecord(r.c)
// Notes   : Pure and immutable (each rule returns a new campaign). Tested in tests/space.test.ts. Numbers: SPACE.
// Authored: Written with Claude (Fable 5.2, claude-fable-5-2)
// ---------------------------------------------------------------------------
import type { StageCause, TemperamentKind } from "../../core/lineage";
import { T0, adapt } from "./adapt";
import type { T0Kind } from "./combat";
import {
  WEAPON_FAMILIES, countOf, fitProblems, noLearning, part, spaceByKind, isHybrid, PART_IDS,
  type Fit, type HullId, type Learned, type Makers, type PartId, type WeaponFamily,
} from "./fit";
import { SPACE } from "./tuning";

export type SystemId = "hearth" | "driftfield" | "lattice";
export interface StarSystem { id: SystemId; name: string; x: number; y: number; links: SystemId[]; blurb: string }
export const SYSTEMS: readonly StarSystem[] = [
  { id: "hearth", name: "Hearth", x: 150, y: 200, links: ["driftfield"], blurb: "home: shipyard and outfitter" },
  { id: "driftfield", name: "the Driftfield", x: 320, y: 140, links: ["hearth", "lattice"], blurb: "a Shard patrol" },
  { id: "lattice", name: "the Lattice", x: 490, y: 210, links: ["driftfield"], blurb: "a Lattice and its escort" },
];
export const starSystem = (id: SystemId): StarSystem => SYSTEMS.find((s) => s.id === id) as StarSystem;

export type Outcome = "won" | "lost" | "fled";
export interface Campaign {
  credits: number; // banked salvage
  fit: Fit;
  learned: Learned;
  makers: Makers;
  harshness: number;
  system: SystemId;
  battles: number; wins: number; losses: number; refits: number;
  flownFit: string; // the fit at the last launch, to count refits
  leans: Record<TemperamentKind, number>; // wins by what the ship was built around
  start: string[]; // what the civilization stage handed in, in the player's words
}

/** The ally is a species of a temperament you are not, so its parts cover what yours do not. */
export const allyFor = (primary: TemperamentKind): TemperamentKind => (primary === "cautious" ? "aggressive" : primary === "aggressive" ? "adaptable" : "cautious");
export const primaryOf = (t: Record<TemperamentKind, number>): TemperamentKind => (Object.entries(t) as [TemperamentKind, number][]).reduce((a, b) => (b[1] > a[1] ? b : a))[0];

const HERITAGE: Record<string, { part: PartId; why: string }> = {
  siege: { part: "spine", why: "siege engines became a second Spine Launcher" },
  ships: { part: "fin", why: "trade ships became a second Fin Drive" },
  temple: { part: "plating", why: "temple walls became Shell Plating" },
};
const fitKey = (f: Fit) => `${f.hull}:${[...f.parts].sort().join(",")}`;

/** A new campaign from what the civilization stage handed in (docs/HANDOFF_CONTRACT.md); all of it optional. */
export function startCampaign(o: { temper: Record<TemperamentKind, number>; civ?: Record<string, unknown> | null; harshness?: number }): Campaign {
  const primary = primaryOf(o.temper);
  const parts: PartId[] = ["spine", "fin", "gland"];
  const start: string[] = [];
  let credits: number = SPACE.economy.start;
  const civ = o.civ ?? {};
  const first = Array.isArray(civ.machines) ? HERITAGE[String(civ.machines[0])] : undefined;
  if (first) { parts.push(first.part); start.push(`Heritage: ${first.why}`); }
  if (civ.victory === "conquest") { parts.push("spine"); start.push("Conquest victory: a war fleet's extra Spine Launcher"); }
  else if (civ.victory === "trade") { credits += SPACE.economy.tradeBonus; start.push(`Economic victory: ${SPACE.economy.tradeBonus} more salvage to spend`); }
  else if (civ.victory === "faith") { parts.push("membrane"); start.push("Faith victory: loyal allies gave a Tide Membrane"); }
  const learned = noLearning();
  if (civ.tookT0Tech === true) { for (const f of Object.keys(learned) as (keyof Learned)[]) learned[f] = SPACE.adapt.t0TechStart; start.push(`You took ${T0} tech: it already knows you a little`); }
  const fit: Fit = { hull: "seedpod", parts };
  const harshness = Math.max(0, Math.min(1, o.harshness ?? 0));
  if (harshness > 0.3) start.push("The allies resent a harsh Gardener: their parts cost more");
  return { credits, fit, learned, makers: { home: primary, ally: allyFor(primary) }, harshness, system: "hearth", battles: 0, wins: 0, losses: 0, refits: 0, flownFit: fitKey(fit), leans: { cautious: 0, aggressive: 0, adaptable: 0 }, start };
}

/** What a part costs here: the ally's parts cost more the harsher the Gardener was. */
export const priceOf = (c: Campaign, id: PartId): number => Math.round(part(id).cost * (part(id).maker === "ally" ? 1 + SPACE.economy.harshMarkup * c.harshness : 1));

export interface Deal { ok: boolean; why: string; c: Campaign }
export function install(c: Campaign, id: PartId): Deal {
  const price = priceOf(c, id);
  if (c.credits < price) return { ok: false, why: `needs ${price} salvage`, c };
  return { ok: true, why: `Fitted a ${part(id).name}`, c: { ...c, credits: c.credits - price, fit: { ...c.fit, parts: [...c.fit.parts, id] } } };
}
export function uninstall(c: Campaign, id: PartId): Deal {
  const i = c.fit.parts.lastIndexOf(id);
  if (i < 0) return { ok: false, why: "none fitted", c };
  return { ok: true, why: `Removed a ${part(id).name}`, c: { ...c, credits: c.credits + priceOf(c, id), fit: { ...c.fit, parts: c.fit.parts.filter((_, j) => j !== i) } } };
}
/** Trade the hull for the other one (the price difference is paid or refunded); the parts move across. */
export function swapHull(c: Campaign): Deal {
  const to: HullId = c.fit.hull === "seedpod" ? "carapace" : "seedpod";
  const diff = SPACE.hulls[to].cost - SPACE.hulls[c.fit.hull].cost;
  if (c.credits < diff) return { ok: false, why: `needs ${diff} salvage`, c };
  return { ok: true, why: `Moved into the ${SPACE.hulls[to].name}`, c: { ...c, credits: c.credits - diff, fit: { ...c.fit, hull: to } } };
}

/** Leaving the hangar: a ship that changed since the last launch counts as a refit. */
export function launch(c: Campaign): Campaign {
  const key = fitKey(c.fit);
  return key === c.flownFit ? c : { ...c, refits: c.refits + 1, flownFit: key };
}

/** The T0|▼| patrol waiting in a system: it grows with your wins (stakes rise). */
export function patrolFor(system: SystemId, wins: number): T0Kind[] {
  if (system === "hearth") return [];
  const P = SPACE.patrol;
  const shards = Math.min(P.shardsMax, P.shardsBase + Math.floor(wins / P.shardsPerWins));
  const out: T0Kind[] = system === "lattice" ? ["lattice"] : [];
  while (out.length < shards) out.push("shard");
  return out;
}

const LEAN: Record<"weapon" | "defence" | "engine", TemperamentKind> = { weapon: "aggressive", defence: "cautious", engine: "adaptable" };
/** What the ship is built around (most space), or null on a tie. */
export function builtAround(f: Fit): "weapon" | "defence" | "engine" | null {
  const s = spaceByKind(f);
  const kinds = ["weapon", "defence", "engine"] as const;
  const top = Math.max(...kinds.map((k) => s[k]));
  const tied = kinds.filter((k) => s[k] === top);
  return tied.length === 1 ? tied[0] : null;
}

/** A battle ended: T0|▼| adapts whatever the outcome; salvage is banked unless the ship was lost. */
export function afterBattle(c: Campaign, outcome: Outcome, dealt: Readonly<Record<WeaponFamily, number>>, salvage: number): { c: Campaign; notes: string[] } {
  const a = adapt(c.learned, c.fit, dealt);
  let next: Campaign = { ...c, learned: a.learned, battles: c.battles + 1 };
  const notes: string[] = [];
  if (outcome === "lost") {
    const lost = Math.floor(c.credits * SPACE.economy.podLoss);
    next = { ...next, losses: c.losses + 1, credits: c.credits - lost, system: "hearth" };
    notes.push(`Ship lost. The escape pod reached Hearth without ${salvage + lost} salvage.`);
  } else {
    next = { ...next, credits: c.credits + salvage };
    if (outcome === "won") {
      const k = builtAround(c.fit);
      next = { ...next, wins: c.wins + 1, leans: k ? { ...c.leans, [LEAN[k]]: c.leans[LEAN[k]] + 1 } : c.leans };
      notes.push(`Patrol destroyed: +${salvage} salvage (${next.wins} of ${SPACE.winsToFinish} wins)`);
    } else notes.push(salvage ? `You broke off with ${salvage} salvage` : "You broke off");
  }
  return { c: next, notes: [...notes, ...a.notes] };
}

export const finished = (c: Campaign): boolean => c.wins >= SPACE.winsToFinish;

const AROUND_WORD: Record<TemperamentKind, string> = { aggressive: "weapons", cautious: "defences", adaptable: "engines" };
/** What the space stage writes into the lineage: a cause per way of winning, and the campaign's state. */
export function spaceRecord(c: Campaign): { causes: StageCause[]; block: Record<string, unknown> } {
  const causes = (Object.keys(c.leans) as TemperamentKind[]).filter((k) => c.leans[k] > 0)
    .map((k) => ({ cause: `Won ${c.leans[k]} space battle${c.leans[k] === 1 ? "" : "s"} in a ship built around ${AROUND_WORD[k]}`, effect: { [k]: c.leans[k] * SPACE.temperPerWin } }));
  return { causes, block: { battles: c.battles, wins: c.wins, losses: c.losses, refits: c.refits, hull: c.fit.hull, parts: [...c.fit.parts], hybrid: isHybrid(c.fit), salvage: c.credits, t0Learned: { ...c.learned }, ally: c.makers.ally } };
}

/** The autoplay pilot's refit (smoke): when T0|▼| knows its weapons well, it trades them for the least-known one. */
export function pilotRefit(c: Campaign): { c: Campaign; note: string } {
  const fitted = WEAPON_FAMILIES.filter((f) => c.fit.parts.some((id) => part(id).family === f));
  const worst = Math.max(...fitted.map((f) => c.learned[f]));
  if (worst < 0.3) return { c, note: "" };
  let stripped = c;
  for (const id of c.fit.parts.filter((p) => part(p).kind === "weapon")) stripped = uninstall(stripped, id).c;
  const weapons = PART_IDS.filter((id) => part(id).kind === "weapon").sort((a, b) => c.learned[part(a).family as WeaponFamily] - c.learned[part(b).family as WeaponFamily]);
  for (const id of weapons) {
    let d = install(stripped, id);
    if (d.ok && fitProblems(d.c.fit).some((p) => p.includes("power"))) d = install(d.c, "gland"); // a hungrier weapon needs a gland
    if (!d.ok || fitProblems(d.c.fit).length) continue;
    const twice = install(d.c, id); // a second one if it fits and is paid for
    const out = twice.ok && !fitProblems(twice.c.fit).length ? twice.c : d.c;
    return countOf(out.fit, id) === countOf(c.fit, id) && out.fit.parts.length === c.fit.parts.length ? { c, note: "" } : { c: out, note: `refit to ${part(id).name} x${countOf(out.fit, id)}` };
  }
  return { c, note: "" };
}

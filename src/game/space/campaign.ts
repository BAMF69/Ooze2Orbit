// ---------------------------------------------------------------------------
// campaign.ts (space)
// Purpose : The space stage's Toy around the fights, as pure rules (docs/stages/05-space.md): four star systems (two
//           friendly worlds, Hearth and the allies' Tidereach, and two T0|▼| patrols), what the civilization stage
//           hands in, the outfitters (each world sells its own species' parts; parts refund in full, so a refit is
//           never punished), the shipyards (recruit escorts that fly and fight on their own; BAMF69 2026-11-10),
//           what a battle's end changes (T0|▼| adapts, salvage banked or lost, escorts lost for good), the waves
//           a hostile system keeps sending, the ending (three wins in a row at the Lattice summon T0|▼|'s
//           Mothership; BAMF69 2026-11-10) and what it writes into the lineage. Also routes between systems and
//           the autoplay pilot's choices.
// Usage   : let c = startCampaign({ temper, civ, harshness });  c = install(c, "plating").c;  c = launch(c);
//           const r = afterBattle(c, "won", dealt, salvage, lostEscorts);  finished(r.c);  spaceRecord(r.c)
// Notes   : Pure and immutable (each rule returns a new campaign). Tested in tests/space.test.ts. Numbers: SPACE.
// Authored: Written with Claude (Fable 5.2, claude-fable-5-2)
// ---------------------------------------------------------------------------
import type { StageCause, TemperamentKind } from "../../core/lineage";
import { T0, adapt } from "./adapt";
import type { EscortSpec, T0Kind } from "./combat";
import {
  HULL_IDS, PART_IDS, WEAPON_FAMILIES, countOf, fitProblems, freeSlots, isHybrid, noLearning, part, shipStats, spaceByKind,
  type Fit, type HullId, type Learned, type Maker, type Makers, type PartId, type WeaponFamily,
} from "./fit";
import { SPACE } from "./tuning";

export type SystemId = "hearth" | "tidereach" | "driftfield" | "lattice";
export interface World { name: string; maker: Maker; sprite: string; people: string }
export interface StarSystem { id: SystemId; name: string; x: number; y: number; links: SystemId[]; blurb: string; world?: World }
export const SYSTEMS: readonly StarSystem[] = [
  { id: "hearth", name: "Hearth", x: 140, y: 215, links: ["tidereach", "driftfield"], blurb: "home: shipyard and outfitter", world: { name: "Hearth", maker: "home", sprite: "hearth", people: "Hearth" } },
  { id: "tidereach", name: "Tidereach", x: 250, y: 110, links: ["hearth", "driftfield"], blurb: "allies: shipyard and outfitter", world: { name: "Tidereach", maker: "ally", sprite: "tidereach", people: "Tidewright" } },
  { id: "driftfield", name: "the Driftfield", x: 375, y: 185, links: ["hearth", "tidereach", "lattice"], blurb: "a Shard patrol" },
  { id: "lattice", name: "the Lattice", x: 505, y: 225, links: ["driftfield"], blurb: "a Lattice and its escort" },
];
export const starSystem = (id: SystemId): StarSystem => SYSTEMS.find((s) => s.id === id) as StarSystem;
export const worldOf = (id: SystemId): World | undefined => starSystem(id).world;

export type EscortId = keyof typeof SPACE.escorts;
export const ESCORT_IDS = Object.keys(SPACE.escorts) as EscortId[];
export const escortFit = (id: EscortId): Fit => ({ hull: SPACE.escorts[id].hull, parts: [...SPACE.escorts[id].parts] });

export type Outcome = "won" | "lost" | "fled";
export interface Campaign {
  credits: number; // banked salvage
  fit: Fit;
  fleet: EscortId[]; // recruited escorts, in the order they joined
  learned: Learned;
  makers: Makers;
  harshness: number;
  system: SystemId;
  battles: number; wins: number; losses: number; refits: number; escortsLost: number;
  latticeStreak: number; // wins in a row at the Lattice without leaving: at SPACE.boss.streak the Mothership comes
  visitWins: number; // waves won since arriving in this system (the Driftfield starts easy on every arrival)
  bossDown: boolean; // the Mothership has been destroyed at least once: the stage is won (you can keep playing)
  bosses: number;
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
  if (civ.victory === "conquest") { parts.push("needle"); start.push("Conquest victory: a war fleet's Needle Turret"); }
  else if (civ.victory === "trade") { credits += SPACE.economy.tradeBonus; start.push(`Economic victory: ${SPACE.economy.tradeBonus} more salvage to spend`); }
  else if (civ.victory === "faith") { parts.push("membrane"); start.push("Faith victory: loyal allies gave a Tide Membrane"); }
  const learned = noLearning();
  if (civ.tookT0Tech === true) { for (const f of Object.keys(learned) as (keyof Learned)[]) learned[f] = SPACE.adapt.t0TechStart; start.push(`You took ${T0} tech: it already knows you a little`); }
  const fit: Fit = { hull: "seedpod", parts };
  const harshness = Math.max(0, Math.min(1, o.harshness ?? 0));
  if (harshness > 0.3) start.push("The allies resent a harsh Gardener: their parts and ships cost more");
  return { credits, fit, fleet: [], learned, makers: { home: primary, ally: allyFor(primary) }, harshness, system: "hearth", battles: 0, wins: 0, losses: 0, refits: 0, escortsLost: 0, latticeStreak: 0, visitWins: 0, bossDown: false, bosses: 0, flownFit: fitKey(fit), leans: { cautious: 0, aggressive: 0, adaptable: 0 }, start };
}

/** The ally's goods cost more the harsher the Gardener was. */
const markup = (c: Campaign, maker: Maker): number => (maker === "ally" ? 1 + SPACE.economy.harshMarkup * c.harshness : 1);
export const priceOf = (c: Campaign, id: PartId): number => Math.round(part(id).cost * markup(c, part(id).maker));
export const escortPrice = (c: Campaign, id: EscortId): number => Math.round(SPACE.escorts[id].cost * markup(c, SPACE.escorts[id].maker));

/** What the world you are at sells: its own species' parts and ships (so the other world is worth the trip). */
export const partsSoldAt = (system: SystemId): PartId[] => PART_IDS.filter((id) => part(id).maker === worldOf(system)?.maker);
export const escortsSoldAt = (system: SystemId): EscortId[] => ESCORT_IDS.filter((id) => SPACE.escorts[id].maker === worldOf(system)?.maker);

export interface Deal { ok: boolean; why: string; c: Campaign }
export function install(c: Campaign, id: PartId): Deal {
  const sp = part(id), price = priceOf(c, id);
  if (sp.maker !== worldOf(c.system)?.maker) return { ok: false, why: `${sp.name} is not sold here`, c };
  if (freeSlots(c.fit, sp.slot) <= 0) return { ok: false, why: `no free ${sp.slot} slot`, c };
  if (c.credits < price) return { ok: false, why: `needs ${price} salvage`, c };
  return { ok: true, why: `Fitted a ${sp.name}`, c: { ...c, credits: c.credits - price, fit: { ...c.fit, parts: [...c.fit.parts, id] } } };
}
/** Any world buys any part back at full price. */
export function uninstall(c: Campaign, id: PartId): Deal {
  const i = c.fit.parts.lastIndexOf(id);
  if (i < 0) return { ok: false, why: "none fitted", c };
  return { ok: true, why: `Removed a ${part(id).name}`, c: { ...c, credits: c.credits + priceOf(c, id), fit: { ...c.fit, parts: c.fit.parts.filter((_, j) => j !== i) } } };
}
/** Trade the hull for the other one (the price difference is paid or refunded); the parts move across. */
export function swapHull(c: Campaign): Deal {
  const to: HullId = HULL_IDS[(HULL_IDS.indexOf(c.fit.hull) + 1) % HULL_IDS.length];
  const diff = SPACE.hulls[to].cost - SPACE.hulls[c.fit.hull].cost;
  if (c.credits < diff) return { ok: false, why: `needs ${diff} salvage`, c };
  return { ok: true, why: `Moved into the ${SPACE.hulls[to].name}`, c: { ...c, credits: c.credits - diff, fit: { ...c.fit, hull: to } } };
}

/** Recruit an allied ship at its species' world: it joins the fleet and flies itself. No refund: a real commitment. */
export function recruit(c: Campaign, id: EscortId): Deal {
  const e = SPACE.escorts[id], price = escortPrice(c, id);
  if (e.maker !== worldOf(c.system)?.maker) return { ok: false, why: `the ${e.name} is not built here`, c };
  if (c.fleet.length >= SPACE.fleet.max) return { ok: false, why: `the fleet is full (${SPACE.fleet.max} escorts)`, c };
  if (c.credits < price) return { ok: false, why: `needs ${price} salvage`, c };
  return { ok: true, why: `A ${e.name} joins your fleet`, c: { ...c, credits: c.credits - price, fleet: [...c.fleet, id] } };
}

/** The fleet as combat sees it: each escort's ship, with its maker's specialty and what T0|▼| has learned. */
export const escortSpecs = (c: Campaign): EscortSpec[] => c.fleet.map((id) => ({ stats: shipStats(escortFit(id), c.makers, c.learned), hullId: SPACE.escorts[id].hull }));

/** Leaving the hangar: a ship that changed since the last launch counts as a refit. */
export function launch(c: Campaign): Campaign {
  const key = fitKey(c.fit);
  return key === c.flownFit ? c : { ...c, refits: c.refits + 1, flownFit: key };
}

/**
 * The T0|▼| patrol waiting in a system. The Lattice grows with your wins and with the fleet you bring (stakes rise).
 * The Driftfield starts at its easiest on every arrival (BAMF69 2026-11-10), whatever your wins or fleet, and grows one
 * step per wave won since you arrived (visitWins); jumping away and back resets it.
 */
export function patrolFor(system: SystemId, wins: number, fleet = 0, visitWins = 0): T0Kind[] {
  if (worldOf(system)) return [];
  const P = SPACE.patrol;
  const shards = system === "driftfield"
    ? Math.min(P.shardsMax, P.shardsBase + visitWins * P.driftStep)
    : Math.min(P.shardsMax, P.shardsBase + Math.floor(wins / P.shardsPerWins)) + fleet * SPACE.fleet.patrolPerEscort;
  const out: T0Kind[] = system === "lattice" ? ["lattice"] : [];
  while (out.length < shards) out.push("shard");
  return out;
}

/** The Mothership answers a streak of wins at the Lattice. */
export const bossDue = (c: Campaign): boolean => c.system === "lattice" && c.latticeStreak >= SPACE.boss.streak;
/** What T0|▼| sends next in the system you are in: the usual patrol, or the Mothership and its escort. */
export function nextWave(c: Campaign): T0Kind[] {
  if (!bossDue(c)) return patrolFor(c.system, c.wins, c.fleet.length, c.visitWins);
  return ["mothership", ...Array.from({ length: SPACE.boss.escort }, (): T0Kind => "shard")];
}

/**
 * Jump to another system. Leaving the Lattice breaks the streak: the three wins must be in a row, without leaving.
 * Arriving anywhere new starts its count of waves won over (the Driftfield is easy again).
 */
export const travel = (c: Campaign, to: SystemId): Campaign => {
  const stay = to === c.system;
  return { ...c, system: to, latticeStreak: to === "lattice" && c.system === "lattice" ? c.latticeStreak : 0, visitWins: stay ? c.visitWins : 0 };
};

/** The systems to jump through from one to another, in order (not counting the start); empty when already there. */
export function routeTo(from: SystemId, to: SystemId): SystemId[] {
  const prev = new Map<SystemId, SystemId | null>([[from, null]]);
  const queue: SystemId[] = [from];
  while (queue.length) {
    const at = queue.shift() as SystemId;
    if (at === to) break;
    for (const l of starSystem(at).links) if (!prev.has(l)) { prev.set(l, at); queue.push(l); }
  }
  const out: SystemId[] = [];
  for (let at: SystemId | null | undefined = to; at && at !== from; at = prev.get(at)) out.unshift(at);
  return prev.has(to) ? out : [];
}

/** The linked system just after (dir 1) or before (dir -1) this one in the map's order: the next / previous jump keys. */
export function neighbour(system: SystemId, dir: 1 | -1): SystemId | null {
  const order = SYSTEMS.map((s) => s.id), i = order.indexOf(system);
  const linked = starSystem(system).links.map((l) => order.indexOf(l)).filter((j) => (dir > 0 ? j > i : j < i));
  if (!linked.length) return null;
  return order[dir > 0 ? Math.min(...linked) : Math.max(...linked)];
}

const LEAN: Record<"weapon" | "defence" | "engine", TemperamentKind> = { weapon: "aggressive", defence: "cautious", engine: "adaptable" };
/** What the ship is built around (most bulk), or null on a tie. */
export function builtAround(f: Fit): "weapon" | "defence" | "engine" | null {
  const s = spaceByKind(f);
  const kinds = ["weapon", "defence", "engine"] as const;
  const top = Math.max(...kinds.map((k) => s[k]));
  const tied = kinds.filter((k) => s[k] === top);
  return tied.length === 1 ? tied[0] : null;
}

/** A battle ended: T0|▼| adapts whatever the outcome; salvage is banked unless the ship was lost; lost escorts are gone. */
export function afterBattle(c: Campaign, outcome: Outcome, dealt: Readonly<Record<WeaponFamily, number>>, salvage: number, lostEscorts: readonly number[] = [], boss = false): { c: Campaign; notes: string[] } {
  const a = adapt(c.learned, c.fit, dealt);
  const gone = c.fleet.filter((_, i) => lostEscorts.includes(i));
  let next: Campaign = { ...c, learned: a.learned, battles: c.battles + 1, fleet: c.fleet.filter((_, i) => !lostEscorts.includes(i)), escortsLost: c.escortsLost + gone.length };
  const notes: string[] = [];
  if (outcome === "lost") {
    const lost = Math.floor(c.credits * SPACE.economy.podLoss);
    next = { ...next, losses: c.losses + 1, credits: c.credits - lost, system: "hearth", latticeStreak: 0, visitWins: 0 };
    notes.push(`Ship lost. The escape pod reached Hearth without ${salvage + lost} salvage.`);
  } else {
    next = { ...next, credits: c.credits + salvage };
    if (outcome === "won") {
      const k = builtAround(c.fit);
      next = { ...next, wins: c.wins + 1, visitWins: c.visitWins + 1, leans: k ? { ...c.leans, [LEAN[k]]: c.leans[LEAN[k]] + 1 } : c.leans };
      if (boss) {
        next = { ...next, bossDown: true, bosses: c.bosses + 1, latticeStreak: 0 };
        notes.push(`${T0}'s Mothership is destroyed: +${salvage} salvage`);
      } else {
        notes.push(`Patrol destroyed: +${salvage} salvage`);
        if (c.system === "lattice") {
          next = { ...next, latticeStreak: c.latticeStreak + 1 };
          notes.push(next.latticeStreak >= SPACE.boss.streak ? `${SPACE.boss.streak} in a row at the Lattice: ${T0}'s Mothership is coming` : `Lattice streak ${next.latticeStreak} of ${SPACE.boss.streak}: stay to summon the Mothership`);
        }
      }
    } else { next = { ...next, latticeStreak: 0 }; notes.push(salvage ? `You broke off with ${salvage} salvage` : "You broke off"); }
  }
  if (gone.length) notes.push(`Lost for good: ${gone.map((id) => SPACE.escorts[id].name).join(", ")}`);
  return { c: next, notes: [...notes, ...a.notes] };
}

/** The stage is won once the Mothership has fallen (the player may keep playing). */
export const finished = (c: Campaign): boolean => c.bossDown;

const AROUND_WORD: Record<TemperamentKind, string> = { aggressive: "weapons", cautious: "defences", adaptable: "engines" };
/** What the space stage writes into the lineage: a cause per way of winning, and the campaign's state. */
export function spaceRecord(c: Campaign): { causes: StageCause[]; block: Record<string, unknown> } {
  const causes = (Object.keys(c.leans) as TemperamentKind[]).filter((k) => c.leans[k] > 0)
    .map((k) => ({ cause: `Won ${c.leans[k]} space battle${c.leans[k] === 1 ? "" : "s"} in a ship built around ${AROUND_WORD[k]}`, effect: { [k]: c.leans[k] * SPACE.temperPerWin } }));
  return { causes, block: { battles: c.battles, wins: c.wins, losses: c.losses, refits: c.refits, hull: c.fit.hull, parts: [...c.fit.parts], hybrid: isHybrid(c.fit), fleet: [...c.fleet], escortsLost: c.escortsLost, bossDown: c.bossDown, motherships: c.bosses, salvage: c.credits, t0Learned: { ...c.learned }, ally: c.makers.ally } };
}

// ---- the autoplay pilot's choices (smoke) ---------------------------------------------------------------------
/** Where the pilot lands: the world that sells the weapon family T0|▼| knows least. */
export function pilotWorld(c: Campaign): SystemId {
  const best = [...WEAPON_FAMILIES].sort((a, b) => c.learned[a] - c.learned[b])[0];
  return best === "kinetic" ? "hearth" : "tidereach";
}

/** When T0|▼| knows its guns well, the pilot trades them for the least-known gun this world sells. */
export function pilotRefit(c: Campaign): { c: Campaign; note: string } {
  const guns = c.fit.parts.filter((id) => part(id).slot === "gun");
  const worst = Math.max(0, ...guns.map((id) => c.learned[part(id).family as WeaponFamily]));
  if (worst < 0.3) return { c, note: "" };
  let stripped = c;
  for (const id of guns) stripped = uninstall(stripped, id).c;
  const sold = partsSoldAt(c.system).filter((id) => part(id).slot === "gun").sort((a, b) => c.learned[part(a).family as WeaponFamily] - c.learned[part(b).family as WeaponFamily]);
  for (const id of sold) {
    if (c.learned[part(id).family as WeaponFamily] >= worst) break; // nothing better here
    const d = install(stripped, id);
    if (!d.ok || fitProblems(d.c.fit).length) continue; // (a hungrier gun than the glands can feed is skipped)
    const twice = install(d.c, id); // a second one if it fits and is paid for
    const out = twice.ok && !fitProblems(twice.c.fit).length ? twice.c : d.c;
    return { c: out, note: `refit to ${part(id).name} x${countOf(out.fit, id)}` };
  }
  return { c, note: "" };
}

/** Where the pilot fights: the Driftfield until it has wins and a wing behind it, then the Lattice. */
export const pilotFight = (c: Campaign): SystemId => (c.wins >= 3 && c.fleet.length >= 2 ? "lattice" : "driftfield");
/** Between waves the pilot goes shopping when T0|▼| knows its guns well or it is hurt; otherwise it stays for the next wave. */
export function pilotWantsShop(c: Campaign, hullFrac: number): boolean {
  const guns = c.fit.parts.filter((id) => part(id).slot === "gun");
  const worst = Math.max(0, ...guns.map((id) => c.learned[part(id).family as WeaponFamily]));
  return hullFrac < 0.5 || worst >= 0.5;
}

/** The pilot recruits the cheapest escort built here while it can keep a little salvage back. */
export function pilotRecruit(c: Campaign, reserve = 60): { c: Campaign; note: string } {
  const here = escortsSoldAt(c.system).sort((a, b) => escortPrice(c, a) - escortPrice(c, b))[0];
  if (!here || c.credits < escortPrice(c, here) + reserve) return { c, note: "" };
  const d = recruit(c, here);
  return d.ok ? { c: d.c, note: `recruited a ${SPACE.escorts[here].name}` } : { c, note: "" };
}

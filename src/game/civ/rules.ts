// ---------------------------------------------------------------------------
// rules.ts (civ)
// Purpose : The civilization stage's Toy 1 as pure rules (docs/stages/04-civilization.md): a 9-region hex planet,
//           fixed visible yields (materials, goods, faith), three ways to take a region (conquest with armies,
//           trade routes then a buy-out, missionaries until it converts to the Watcher), three machines (siege
//           engine, trade ships, temple), two acts of god (meteor, terraform) paid with favor, one rival that plays
//           a temperament you are not, a live tally, and the victory named by the method that took the most regions.
// Usage   : let s = newGame("aggressive", 0); s = act(s, { kind: "army", target: "fernhills" }).state; s = endTurn(s)
//           tally(s); victoryType(s, temper)
// Notes   : Pure and immutable (each rule returns a new state), tested in tests/civ.test.ts. Numbers: CIV below.
//           Your capital cannot fall (no elimination, pillar 1). A rival army is announced a turn before it strikes,
//           so every threat is readable on the map first.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import type { TemperamentKind } from "../../core/lineage";

export type Method = "conquest" | "trade" | "faith";
export type Side = "you" | "rival";
export type Owner = Side | null;
export type Res = "materials" | "goods" | "faith";
export type Machine = "siege" | "ships" | "temple";
export type RivalKind = "aggressive" | "adaptable";

export const CIV = {
  start: { materials: 3, goods: 3, faith: 3, favor: 2 },
  army: { cost: 3, strength: 2, siegeBonus: 1 }, // materials
  route: { cost: 2, growth: 1, shipsBonus: 1 }, // goods; dependence per turn
  mission: { cost: 2, growth: 1, templeBonus: 1 }, // faith; belief per turn
  garrison: { cost: 2, add: 1 }, // materials: +1 defense on a region of yours
  machine: { siege: { res: "materials", cost: 5 }, ships: { res: "goods", cost: 5 }, temple: { res: "faith", cost: 5 } } as Record<Machine, { res: Res; cost: number }>,
  meteor: { favor: 6, defense: 2, harshness: 0.1 },
  terraform: { favor: 4, harshness: -0.05 },
  favorPerTurn: 1, // plus one per region taken by faith
  heldExtra: 2, // buying out or converting a region someone holds costs this much more
  captured: { defense: 2 }, // a region's defense right after it changes hands
  harshFaith: 1, // belief needed x (1 + harshness x this): a harsh Gardener is feared, not loved
  temperPerRegion: 0.03, // each region taken moves its temperament (the 50 % stage cap still applies)
} as const;

export interface RegionSpec {
  id: string;
  name: string;
  q: number; // axial hex coordinates
  r: number;
  yields: Partial<Record<Res, number>>;
  defense: number;
  price: number; // dependence needed before a buy-out
  buyout: number; // goods to buy it out
  belief: number; // belief needed to convert
  capital?: Side;
}

export interface Region {
  id: string;
  owner: Owner;
  method: Method | "home" | null;
  defense: number;
  bonus: number; // terraformed: +1 per act to its main yield
  route: Record<Side, boolean>;
  dependence: Record<Side, number>;
  mission: Record<Side, boolean>;
  belief: Record<Side, number>;
}

export interface Purse { materials: number; goods: number; faith: number; favor: number; machines: Machine[] }
export interface March { target: string; strength: number }

export interface CivState {
  turn: number;
  rivalKind: RivalKind;
  regions: Region[];
  you: Purse;
  rival: Purse;
  march: March | null; // the rival army on its way (announced; it strikes on the rival's next turn)
  harshness: number;
  causes: string[]; // one line per region taken and per act of god
  news: string[]; // what happened last turn
}

export const SPECS: RegionSpec[] = [
  { id: "hearthhold", name: "Hearthhold", q: -2, r: 1, yields: { materials: 2, goods: 1, faith: 1 }, defense: 9, price: 99, buyout: 99, belief: 99, capital: "you" },
  { id: "saltcoast", name: "the Salt Coast", q: -1, r: 1, yields: { goods: 2 }, defense: 2, price: 3, buyout: 4, belief: 4 },
  { id: "fernhills", name: "the Fernhills", q: -1, r: 0, yields: { materials: 2 }, defense: 2, price: 3, buyout: 4, belief: 4 },
  { id: "stillwater", name: "Stillwater", q: 0, r: 1, yields: { faith: 2 }, defense: 2, price: 3, buyout: 4, belief: 3 },
  { id: "heartwood", name: "Heartwood", q: 0, r: 0, yields: { materials: 1, faith: 1 }, defense: 3, price: 4, buyout: 5, belief: 5 },
  { id: "redmesa", name: "the Red Mesa", q: 0, r: -1, yields: { materials: 2 }, defense: 3, price: 4, buyout: 5, belief: 5 },
  { id: "ambershore", name: "the Amber Shore", q: 1, r: 0, yields: { goods: 2 }, defense: 3, price: 4, buyout: 5, belief: 5 },
  { id: "moonwell", name: "Moonwell", q: 1, r: -1, yields: { faith: 2 }, defense: 3, price: 4, buyout: 5, belief: 4 },
  { id: "rivalseat", name: "the Rival Seat", q: 2, r: -1, yields: { materials: 2, goods: 1, faith: 1 }, defense: 5, price: 6, buyout: 8, belief: 7, capital: "rival" },
];

export const spec = (id: string): RegionSpec => {
  const s = SPECS.find((x) => x.id === id);
  if (!s) throw new Error(`no region ${id}`);
  return s;
};

/** The rival's capital is named for what it is (the rival stands for a temperament you are not). */
export const rivalName = (k: RivalKind) => (k === "aggressive" ? "Ironmaw" : "Brassport");
export const regionName = (s: CivState, id: string) => (id === "rivalseat" ? rivalName(s.rivalKind) : spec(id).name);

const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
export function neighbours(id: string): string[] {
  const a = spec(id);
  return SPECS.filter((b) => DIRS.some(([dq, dr]) => b.q === a.q + dq && b.r === a.r + dr)).map((b) => b.id);
}

/** The rival is the temperament you are not: aggressive unless your lineage leans aggressive, then a trader. */
export function rivalFor(primary: TemperamentKind): RivalKind {
  return primary === "aggressive" ? "adaptable" : "aggressive";
}

export function newGame(rivalKind: RivalKind, harshness: number): CivState {
  const purse = (): Purse => ({ ...CIV.start, machines: [] });
  return {
    turn: 1, rivalKind, you: purse(), rival: purse(), march: null, harshness, causes: [], news: [],
    regions: SPECS.map((sp) => ({
      id: sp.id, owner: sp.capital ?? null, method: sp.capital ? "home" : null, defense: sp.defense, bonus: 0,
      route: { you: false, rival: false }, dependence: { you: 0, rival: 0 }, mission: { you: false, rival: false }, belief: { you: 0, rival: 0 },
    })),
  };
}

export const region = (s: CivState, id: string): Region => s.regions.find((r) => r.id === id)!;
const setRegion = (s: CivState, r: Region): CivState => ({ ...s, regions: s.regions.map((x) => (x.id === r.id ? r : x)) });

/** Can `side` reach this region (it borders one of theirs, and is not theirs)? */
export function reachable(s: CivState, side: Side, id: string): boolean {
  return region(s, id).owner !== side && neighbours(id).some((n) => region(s, n).owner === side);
}

export const priceFor = (s: CivState, id: string) => spec(id).price + (region(s, id).owner ? CIV.heldExtra : 0);
export const buyoutFor = (s: CivState, id: string) => spec(id).buyout + (region(s, id).owner ? CIV.heldExtra : 0);
export const beliefFor = (s: CivState, id: string) =>
  Math.ceil((spec(id).belief + (region(s, id).owner ? CIV.heldExtra : 0)) * (1 + s.harshness * CIV.harshFaith));

/** A region changes hands: the new owner, how it was taken, a fresh defense, and everyone's progress on it reset. */
function capture(s: CivState, id: string, side: Side, method: Method): CivState {
  const r = region(s, id);
  if (r.owner === "you" && spec(id).capital === "you") return s; // your capital cannot fall
  const taken: Region = { ...r, owner: side, method, defense: CIV.captured.defense, route: { you: false, rival: false }, dependence: { you: 0, rival: 0 }, mission: { you: false, rival: false }, belief: { you: 0, rival: 0 } };
  const how = method === "conquest" ? "by conquest" : method === "trade" ? "by trade" : "by faith";
  const line = side === "you" ? `Took ${regionName(s, id)} ${how}` : `${rivalName(s.rivalKind)} took ${regionName(s, id)} ${how}`;
  return { ...setRegion(s, taken), causes: side === "you" ? [...s.causes, line] : s.causes, news: [...s.news, line] };
}

const pay = (p: Purse, res: Res | "favor", n: number): Purse | null => (p[res] >= n ? { ...p, [res]: p[res] - n } : null);

export type Action =
  | { kind: "army"; target: string }
  | { kind: "route"; target: string }
  | { kind: "buyout"; target: string }
  | { kind: "mission"; target: string }
  | { kind: "garrison"; target: string }
  | { kind: "machine"; machine: Machine }
  | { kind: "meteor"; target: string }
  | { kind: "terraform"; target: string };

export interface ActResult { state: CivState; ok: boolean; why: string }

/** Why an action cannot be done right now ("" = it can). Shared by the panel (greyed buttons) and act(). */
export function blocked(s: CivState, side: Side, a: Action): string {
  const p = s[side];
  const need = (res: Res | "favor", n: number) => (p[res] < n ? `need ${n} ${res}` : "");
  switch (a.kind) {
    case "army": return !reachable(s, side, a.target) ? "not adjacent" : need("materials", CIV.army.cost);
    case "route": return !reachable(s, side, a.target) ? "not adjacent" : region(s, a.target).route[side] ? "route open" : need("goods", CIV.route.cost);
    case "buyout": return !region(s, a.target).route[side] ? "no route yet" : region(s, a.target).dependence[side] < priceFor(s, a.target) ? `depends ${region(s, a.target).dependence[side]}/${priceFor(s, a.target)}` : need("goods", buyoutFor(s, a.target));
    case "mission": return !reachable(s, side, a.target) ? "not adjacent" : region(s, a.target).mission[side] ? "already sent" : need("faith", CIV.mission.cost);
    case "garrison": return region(s, a.target).owner !== side ? "not yours" : need("materials", CIV.garrison.cost);
    case "machine": return p.machines.includes(a.machine) ? "built" : need(CIV.machine[a.machine].res, CIV.machine[a.machine].cost);
    case "meteor": return need("favor", CIV.meteor.favor);
    case "terraform": return region(s, a.target).owner !== side ? "not yours" : need("favor", CIV.terraform.favor);
  }
}

/** Do one action now (the player's, or the rival's during its turn). */
export function act(s0: CivState, a: Action, side: Side = "you"): ActResult {
  const why = blocked(s0, side, a);
  if (why) return { state: s0, ok: false, why };
  let s = s0;
  const spend = (res: Res | "favor", n: number) => { s = { ...s, [side]: pay(s[side], res, n)! }; };
  const name = "target" in a ? regionName(s, a.target) : "";
  switch (a.kind) {
    case "army": {
      spend("materials", CIV.army.cost);
      const strength = CIV.army.strength + (s[side].machines.includes("siege") ? CIV.army.siegeBonus : 0);
      const r = region(s, a.target);
      if (strength > r.defense) return { state: capture(s, a.target, side, "conquest"), ok: true, why: `Your army takes ${name}` };
      s = setRegion(s, { ...r, defense: r.defense - strength });
      return { state: s, ok: true, why: `Your army breaks on ${name}'s walls: defense ${r.defense} -> ${r.defense - strength}` };
    }
    case "route": {
      spend("goods", CIV.route.cost);
      const r = region(s, a.target);
      s = setRegion(s, { ...r, route: { ...r.route, [side]: true } });
      return { state: s, ok: true, why: `A trade route to ${name}: it comes to depend on you, turn by turn` };
    }
    case "buyout":
      spend("goods", buyoutFor(s, a.target));
      return { state: capture(s, a.target, side, "trade"), ok: true, why: `You buy out ${name}` };
    case "mission": {
      spend("faith", CIV.mission.cost);
      const r = region(s, a.target);
      s = setRegion(s, { ...r, mission: { ...r.mission, [side]: true } });
      return { state: s, ok: true, why: `Missionaries of the Watcher go to ${name}` };
    }
    case "garrison": {
      spend("materials", CIV.garrison.cost);
      const r = region(s, a.target);
      s = setRegion(s, { ...r, defense: r.defense + CIV.garrison.add });
      return { state: s, ok: true, why: `${name} is reinforced: defense ${r.defense + CIV.garrison.add}` };
    }
    case "machine":
      spend(CIV.machine[a.machine].res, CIV.machine[a.machine].cost);
      s = { ...s, [side]: { ...s[side], machines: [...s[side].machines, a.machine] } };
      return { state: s, ok: true, why: `Built: ${MACHINE_NAME[a.machine]}` };
    case "meteor": {
      spend("favor", CIV.meteor.favor);
      const r = region(s, a.target);
      const hitMarch = s.march?.target === a.target;
      s = setRegion(s, { ...r, defense: Math.max(0, r.defense - CIV.meteor.defense) });
      s = { ...s, march: hitMarch ? null : s.march, harshness: clamp01(s.harshness + CIV.meteor.harshness) };
      s = { ...s, causes: [...s.causes, `Called down a meteor on ${name}${hitMarch ? ", scattering the army marching there" : ""}`] };
      return { state: s, ok: true, why: `A meteor strikes ${name}${hitMarch ? ": the army marching there is scattered" : ""}. The people fear the Watcher a little more` };
    }
    case "terraform": {
      spend("favor", CIV.terraform.favor);
      const r = region(s, a.target);
      s = setRegion(s, { ...r, bonus: r.bonus + 1 });
      s = { ...s, harshness: clamp01(s.harshness + CIV.terraform.harshness), causes: [...s.causes, `Terraformed ${name}`] };
      return { state: s, ok: true, why: `${name} is reshaped: +1 yield every turn` };
    }
  }
}

export const MACHINE_NAME: Record<Machine, string> = { siege: "Siege engine (armies +1 strength)", ships: "Trade ships (dependence grows faster)", temple: "Temple (belief grows faster)" };
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** What a region gives its owner each turn (its main yield gets the terraform bonus). */
export function yieldOf(s: CivState, id: string): Record<Res, number> {
  const y = { materials: 0, goods: 0, faith: 0, ...spec(id).yields };
  const r = region(s, id);
  if (r.bonus) {
    const main = (Object.keys(spec(id).yields) as Res[])[0];
    y[main] += r.bonus;
  }
  return y;
}

/** Routes and missions grow; regions that depend enough wait for a buy-out, believers convert. */
function grow(s0: CivState, side: Side): CivState {
  let s = s0;
  const p = s[side];
  for (const r0 of s.regions) {
    let r = r0;
    if (r.owner === side) continue;
    if (r.route[side]) r = { ...r, dependence: { ...r.dependence, [side]: r.dependence[side] + CIV.route.growth + (p.machines.includes("ships") ? CIV.route.shipsBonus : 0) } };
    if (r.mission[side]) r = { ...r, belief: { ...r.belief, [side]: r.belief[side] + CIV.mission.growth + (p.machines.includes("temple") ? CIV.mission.templeBonus : 0) } };
    s = setRegion(s, r);
    if (r.mission[side] && r.belief[side] >= beliefFor(s, r.id)) s = capture(s, r.id, side, "faith");
  }
  return s;
}

function collect(s: CivState, side: Side): CivState {
  const p = { ...s[side] };
  for (const r of s.regions) {
    if (r.owner !== side) continue;
    const y = yieldOf(s, r.id);
    p.materials += y.materials; p.goods += y.goods; p.faith += y.faith;
  }
  if (side === "you") p.favor += CIV.favorPerTurn + s.regions.filter((r) => r.owner === "you" && r.method === "faith").length;
  return { ...s, [side]: p };
}

/** The rival's turn: its announced army strikes, then it plays its way (armies, or trade and buy-outs). */
export function rivalTurn(s0: CivState): CivState {
  let s = s0;
  if (s.march) { // the army announced last turn strikes now
    const r = region(s, s.march.target);
    if (r.owner !== "rival") {
      if (s.march.strength > r.defense && !(spec(r.id).capital === "you")) s = capture(s, r.id, "rival", "conquest");
      else { s = setRegion(s, { ...r, defense: Math.max(0, r.defense - s.march.strength) }); s = { ...s, news: [...s.news, `${rivalName(s.rivalKind)}'s army breaks on ${regionName(s, r.id)}`] }; }
    }
    s = { ...s, march: null };
  }
  const targets = s.regions.filter((r) => reachable(s, "rival", r.id) && spec(r.id).capital !== "you");
  if (s.rivalKind === "aggressive") {
    if (!s.rival.machines.includes("siege") && s.rival.materials >= CIV.machine.siege.cost + CIV.army.cost) s = act(s, { kind: "machine", machine: "siege" }, "rival").state;
    if (s.rival.materials >= CIV.army.cost && targets.length) {
      const t = [...targets].sort((a, b) => a.defense - b.defense || (a.owner ? 1 : 0) - (b.owner ? 1 : 0))[0];
      s = { ...s, rival: { ...s.rival, materials: s.rival.materials - CIV.army.cost } };
      const strength = CIV.army.strength + (s.rival.machines.includes("siege") ? CIV.army.siegeBonus : 0);
      s = { ...s, march: { target: t.id, strength }, news: [...s.news, `${rivalName(s.rivalKind)} sends an army against ${regionName(s, t.id)} (strength ${strength}): it strikes next turn`] };
    }
  } else {
    for (const r of s.regions) if (!blocked(s, "rival", { kind: "buyout", target: r.id })) s = act(s, { kind: "buyout", target: r.id }, "rival").state;
    if (!s.rival.machines.includes("ships") && s.rival.goods >= CIV.machine.ships.cost + CIV.route.cost) s = act(s, { kind: "machine", machine: "ships" }, "rival").state;
    const open = s.regions.filter((r) => r.route.rival).length;
    const next = targets.find((r) => !r.route.rival);
    if (open < 2 && next && !blocked(s, "rival", { kind: "route", target: next.id })) {
      s = act(s, { kind: "route", target: next.id }, "rival").state;
      s = { ...s, news: [...s.news, `${rivalName(s.rivalKind)} opens a trade route to ${regionName(s, next.id)}`] };
    }
  }
  return grow(s, "rival");
}

/** End your turn: your routes and missions grow, the rival plays, both collect their yields. */
export function endTurn(s0: CivState): CivState {
  let s: CivState = { ...s0, news: [] };
  s = grow(s, "you");
  s = rivalTurn(s);
  s = collect(collect(s, "you"), "rival");
  return { ...s, turn: s.turn + 1 };
}

/** Regions you took by each method (your capital does not count). */
export function tally(s: CivState): Record<Method, number> {
  const t: Record<Method, number> = { conquest: 0, trade: 0, faith: 0 };
  for (const r of s.regions) if (r.owner === "you" && r.method && r.method !== "home") t[r.method]++;
  return t;
}

export const METHOD_TEMPER: Record<Method, TemperamentKind> = { conquest: "aggressive", trade: "adaptable", faith: "cautious" };

/** The victory's name: the method that took the most regions; a tie goes to your species' strongest temperament. */
export function victoryType(s: CivState, temper: Record<TemperamentKind, number>): Method {
  const t = tally(s);
  const methods: Method[] = ["conquest", "trade", "faith"];
  const top = Math.max(...methods.map((m) => t[m]));
  const tied = methods.filter((m) => t[m] === top);
  return tied.reduce((a, b) => (temper[METHOD_TEMPER[b]] > temper[METHOD_TEMPER[a]] ? b : a));
}

export const won = (s: CivState) => s.regions.every((r) => r.owner === "you");

/** The temperament shift the regions you took add up to (each one, toward its method's temperament). */
export function shift(s: CivState): Record<TemperamentKind, number> {
  const t = tally(s);
  return { aggressive: t.conquest * CIV.temperPerRegion, adaptable: t.trade * CIV.temperPerRegion, cautious: t.faith * CIV.temperPerRegion };
}

/** What the civilization stage writes into the lineage on victory: one cause per region you took, and the victory. */
export function civRecord(s: CivState, temper: Record<TemperamentKind, number>): { causes: { cause: string; effect: Partial<Record<TemperamentKind, number>> }[]; block: Record<string, unknown> } {
  const causes = s.regions
    .filter((r) => r.owner === "you" && r.method && r.method !== "home")
    .map((r) => {
      const m = r.method as Method;
      return { cause: `Took ${regionName(s, r.id)} by ${m === "conquest" ? "conquest" : m === "trade" ? "trade" : "faith"}`, effect: { [METHOD_TEMPER[m]]: CIV.temperPerRegion } };
    });
  const v = victoryType(s, temper);
  return { causes, block: { victory: v, tally: tally(s), turns: s.turn, rival: s.rivalKind, machines: [...s.you.machines], acts: s.causes.filter((c) => !c.startsWith("Took ")) } };
}

// ---------------------------------------------------------------------------
// space.test.ts
// Purpose : Locks the space stage's Toy 1 rules (docs/stages/05-space.md): fitting (space, power, the makers'
//           specialty bonus), T0|▼| adapting after every battle (learns what it saw, forgets what it did not, slower
//           against a hybrid ship, never past the cap), combat (resistance cuts damage, the gulper rhythm, the pilot
//           can win the first patrol), the campaign (the civilization hand-in, full-refund refits, patrols growing,
//           the escape pod, the end) and what goes into the lineage.
// Authored: Written with Claude (Fable 5.2, claude-fable-5-2)
// ---------------------------------------------------------------------------
import { describe, expect, it } from "vitest";
import { temperamentOf, writeStage } from "../src/core/lineage";
import { revealFrom } from "../src/game/aquatic/reveal";
import { adapt, shown } from "../src/game/space/adapt";
import {
  afterBattle, allyFor, builtAround, finished, install, launch, patrolFor, pilotRefit, priceOf, spaceRecord, startCampaign, swapHull, uninstall,
  SYSTEMS, type Campaign,
} from "../src/game/space/campaign";
import { angleTo, newBattle, pilotControls, step, type Battle } from "../src/game/space/combat";
import { bonusFor, fitProblems, isHybrid, noLearning, powerOf, shipStats, spaceUsed, type Fit, type Makers } from "../src/game/space/fit";
import { SPACE } from "../src/game/space/tuning";

const makers: Makers = { home: "cautious", ally: "aggressive" };
const temper = { cautious: 0.5, aggressive: 0.2, adaptable: 0.1 };
const starter: Fit = { hull: "seedpod", parts: ["spine", "fin", "gland"] };
const none = { kinetic: 0, beam: 0, spore: 0 };
const fresh = (civ: Record<string, unknown> | null = null, harshness = 0): Campaign => startCampaign({ temper, civ, harshness });

/** Fly the autoplay pilot until the battle ends or the clock runs out. */
function fight(b: Battle, secs = 120): Battle {
  for (let t = 0; t < secs && !b.over; t += 1 / 60) step(b, pilotControls(b), 1 / 60);
  return b;
}

describe("fitting a ship", () => {
  it("counts space and power, and says why a ship cannot launch", () => {
    expect(spaceUsed(starter)).toBe(6);
    expect(powerOf(starter)).toBe(SPACE.flight.basePower - 1 - 1 + 5);
    expect(fitProblems(starter)).toEqual([]);
    expect(fitProblems({ hull: "seedpod", parts: ["gland"] })).toEqual(["no engine", "no weapon"]);
    expect(fitProblems({ hull: "seedpod", parts: ["lance", "lance", "fin"] })).toContain("4 power short");
    expect(fitProblems({ hull: "seedpod", parts: ["spine", "fin", "gland", "burn", "spore"] })).toContain("2 space too many");
  });
  it("a maker's strongest temperament makes its specialty 25 % better", () => {
    expect(bonusFor("plating", makers)).toBe(1.25); // cautious home: defences
    expect(bonusFor("spine", makers)).toBe(1); // a home weapon gets nothing
    expect(bonusFor("lance", makers)).toBe(1.25); // aggressive ally: weapons
    const st = shipStats({ hull: "seedpod", parts: ["spine", "fin", "plating"] }, makers, noLearning());
    expect(st.hull).toBe(SPACE.hulls.seedpod.hull + Math.round(SPACE.parts.plating.hull * 1.25));
  });
  it("a learned defence family protects less; a heavier ship is slower", () => {
    const f: Fit = { hull: "seedpod", parts: ["spine", "fin", "gland", "membrane"] };
    const open = shipStats(f, makers, noLearning()), known = shipStats(f, makers, { ...noLearning(), membrane: 0.5 });
    expect(known.shield).toBe(open.shield / 2);
    expect(shipStats({ ...starter, hull: "carapace" }, makers, noLearning()).topSpeed).toBeLessThan(shipStats(starter, makers, noLearning()).topSpeed);
  });
  it("hybrid means weapons and defences from both makers", () => {
    expect(isHybrid(starter)).toBe(false);
    expect(isHybrid({ hull: "seedpod", parts: ["spine", "fin", "burn"] })).toBe(false); // engines do not count
    expect(isHybrid({ hull: "seedpod", parts: ["spine", "fin", "membrane"] })).toBe(true);
  });
});

describe("T0 adapts", () => {
  it("learns the family that did the damage and the defence it faced", () => {
    const f: Fit = { hull: "seedpod", parts: ["spine", "fin", "gland", "plating"] };
    const r = adapt(noLearning(), f, { ...none, kinetic: 300 });
    expect(r.learned.kinetic).toBeCloseTo(SPACE.adapt.learn);
    expect(r.learned.plating).toBeCloseTo(SPACE.adapt.defLearn);
    expect(r.learned.beam).toBe(0);
    expect(r.notes[0]).toMatch(/learned your spines: 0 % -> 35 %/);
  });
  it("splits its learning by share of the damage", () => {
    const s = shown({ hull: "carapace", parts: ["spine", "lance", "fin"] }, { kinetic: 100, beam: 300, spore: 0 });
    expect(s.kinetic).toBeCloseTo(0.25);
    expect(s.beam).toBeCloseTo(0.75);
  });
  it("forgets what you stop using, and never learns past the cap", () => {
    let l = noLearning();
    for (let i = 0; i < 6; i++) l = adapt(l, starter, { ...none, kinetic: 100 }).learned;
    expect(l.kinetic).toBe(SPACE.adapt.cap);
    const lance: Fit = { hull: "seedpod", parts: ["lance", "fin", "gland"] };
    const r = adapt(l, lance, { ...none, beam: 100 });
    expect(r.learned.kinetic).toBeCloseTo(SPACE.adapt.cap - SPACE.adapt.fade);
    expect(r.notes.join("\n")).toMatch(/forgetting spines/);
  });
  it("learns a hybrid ship slower", () => {
    const hybrid: Fit = { hull: "seedpod", parts: ["spine", "fin", "gland", "membrane"] };
    const r = adapt(noLearning(), hybrid, { ...none, kinetic: 100 });
    expect(r.learned.kinetic).toBeCloseTo(SPACE.adapt.learn * SPACE.adapt.hybrid);
    expect(r.notes.at(-1)).toMatch(/Hybrid/);
  });
  it("a ship that never landed a hit still showed what it carried", () => {
    expect(adapt(noLearning(), starter, none).learned.kinetic).toBeCloseTo(SPACE.adapt.learn);
  });
});

describe("combat", () => {
  it("angleTo takes the short way round", () => {
    expect(angleTo(0.1, -0.1)).toBeCloseTo(-0.2);
    expect(angleTo(3, -3)).toBeCloseTo(Math.PI * 2 - 6);
  });
  it("thrust speeds the ship up to its top speed and no further", () => {
    const st = shipStats(starter, makers, noLearning());
    const b = newBattle(st, [], noLearning());
    for (let i = 0; i < 600; i++) step(b, { turn: 0, thrust: true, brake: false, fire: false }, 1 / 60);
    expect(Math.hypot(b.you.vx, b.you.vy)).toBeGreaterThan(st.topSpeed * 0.95);
    expect(Math.hypot(b.you.vx, b.you.vy)).toBeLessThanOrEqual(st.topSpeed * 1.01);
    expect(b.over).toBeNull(); // a quiet system is never "won"
  });
  it("the pilot destroys the first patrol with the starter ship, and collects its salvage", () => {
    const b = fight(newBattle(shipStats(starter, makers, noLearning()), patrolFor("driftfield", 0), noLearning()));
    expect(b.over).toBe("won");
    expect(b.salvage).toBe(2 * SPACE.t0.shard.salvage);
    expect(b.dealt.kinetic).toBeGreaterThan(0);
  });
  it("a learned weapon family does less: the same fight takes longer", () => {
    const st = shipStats(starter, makers, noLearning());
    const open = fight(newBattle(st, ["shard"], noLearning()));
    const known = fight(newBattle(st, ["shard"], { ...noLearning(), kinetic: SPACE.adapt.cap }));
    expect(open.over).toBe("won");
    expect(known.over === "won" ? known.t : Infinity).toBeGreaterThan(open.t);
  });
  it("T0 strikes a burst, then pauses (the gulper rhythm)", () => {
    const b = newBattle(shipStats({ hull: "carapace", parts: ["spine", "fin", "plating", "plating", "plating"] }, makers, noLearning()), ["shard"], noLearning());
    let paused = false;
    for (let i = 0; i < 60 * 30 && !paused; i++) { step(b, { turn: 0, thrust: false, brake: true, fire: false }, 1 / 60); paused = b.foes[0]?.mode === "pause"; }
    expect(paused).toBe(true);
  });
  it("gives up a long chase it cannot win, and rests", () => {
    const fast = shipStats({ hull: "seedpod", parts: ["spine", "burn", "gland"] }, { home: "cautious", ally: "adaptable" }, noLearning());
    const b = newBattle(fast, ["lattice"], noLearning());
    b.you.a = Math.PI; // run straight away from it
    let gaveUp = false;
    for (let i = 0; i < 60 * 40 && !gaveUp; i++) gaveUp = step(b, { turn: 0, thrust: true, brake: false, fire: false }, 1 / 60).some((e) => e.kind === "giveup");
    expect(gaveUp).toBe(true);
    expect(b.foes[0].mode).toBe("rest");
  });
  it("shields soak damage before the hull, and a destroyed ship loses", () => {
    const b = newBattle(shipStats({ hull: "seedpod", parts: ["spine", "fin", "gland", "membrane"] }, makers, noLearning()), ["lattice", "shard", "shard", "shard"], noLearning());
    let shieldHit = false;
    for (let i = 0; i < 60 * 120 && !b.over; i++) shieldHit = step(b, { turn: 0, thrust: false, brake: true, fire: false }, 1 / 60).some((e) => e.kind === "hurt" && e.shield) || shieldHit;
    expect(shieldHit).toBe(true);
    expect(b.over).toBe("lost");
  });
});

describe("the campaign", () => {
  it("three systems in a line, home first; only home is quiet", () => {
    expect(SYSTEMS.map((s) => s.id)).toEqual(["hearth", "driftfield", "lattice"]);
    expect(patrolFor("hearth", 9)).toEqual([]);
    expect(patrolFor("driftfield", 0)).toEqual(["shard", "shard"]);
    expect(patrolFor("lattice", 0)).toEqual(["lattice", "shard"]);
    expect(patrolFor("driftfield", 4)).toHaveLength(4); // stakes rise with your wins
    expect(patrolFor("driftfield", 99)).toHaveLength(SPACE.patrol.shardsMax);
  });
  it("the ally is a temperament you are not", () => {
    expect(allyFor("cautious")).toBe("aggressive");
    expect(allyFor("aggressive")).toBe("adaptable");
    expect(allyFor("adaptable")).toBe("cautious");
  });
  it("the civilization stage's victory and machines set the starting position", () => {
    expect(fresh().fit.parts).toEqual(["spine", "fin", "gland"]);
    const war = fresh({ victory: "conquest", machines: ["siege", "temple"] });
    expect(war.fit.parts.filter((p) => p === "spine")).toHaveLength(3);
    expect(fitProblems(war.fit)).toEqual([]);
    expect(fresh({ victory: "trade", machines: [] }).credits).toBe(SPACE.economy.start + SPACE.economy.tradeBonus);
    const faith = fresh({ victory: "faith", machines: ["temple"] });
    expect(faith.fit.parts).toEqual(["spine", "fin", "gland", "plating", "membrane"]);
    expect(fitProblems(faith.fit)).toEqual([]);
    expect(faith.start).toHaveLength(2);
  });
  it("taking T0 tech starts it partly adapted; a harsh Gardener's allies charge more", () => {
    expect(fresh({ tookT0Tech: true }).learned.beam).toBe(SPACE.adapt.t0TechStart);
    const harsh = fresh(null, 1);
    expect(priceOf(harsh, "lance")).toBe(Math.round(SPACE.parts.lance.cost * (1 + SPACE.economy.harshMarkup)));
    expect(priceOf(harsh, "spine")).toBe(SPACE.parts.spine.cost);
  });
  it("a refit refunds in full, and only a changed ship counts as a refit", () => {
    const c = fresh();
    const d = install(c, "plating");
    expect(d.c.credits).toBe(c.credits - SPACE.parts.plating.cost);
    expect(uninstall(d.c, "plating").c).toEqual(c);
    expect(uninstall(c, "lance").ok).toBe(false);
    expect(install({ ...c, credits: 10 }, "lance").ok).toBe(false);
    expect(launch(c).refits).toBe(0);
    expect(launch(launch(d.c)).refits).toBe(1);
    const rich = { ...c, credits: 500 };
    expect(swapHull(swapHull(rich).c).c).toEqual(rich);
    expect(swapHull(c).ok).toBe(false);
  });
  it("a win banks the salvage and T0 adapts; losing the ship costs the salvage and sends the pod home", () => {
    const c = { ...fresh(), system: "driftfield" as const };
    const won = afterBattle(c, "won", { ...none, kinetic: 80 }, 90);
    expect(won.c).toMatchObject({ credits: c.credits + 90, wins: 1, battles: 1 });
    expect(won.c.learned.kinetic).toBeGreaterThan(0);
    expect(won.notes.join("\n")).toMatch(/learned your spines/);
    const lost = afterBattle(c, "lost", none, 90);
    expect(lost.c).toMatchObject({ credits: c.credits - Math.floor(c.credits * SPACE.economy.podLoss), losses: 1, wins: 0, system: "hearth" });
    expect(lost.c.learned.kinetic).toBeGreaterThan(0); // it adapts even when it wins
    expect(afterBattle(c, "fled", none, 45).c).toMatchObject({ credits: c.credits + 45, wins: 0 });
  });
  it("the pilot refits once T0 knows its weapon, to the one T0 knows least", () => {
    const c = fresh();
    expect(pilotRefit(c).note).toBe("");
    const r = pilotRefit({ ...c, learned: { ...c.learned, kinetic: 0.7, beam: 0.2 } });
    expect(r.note).toMatch(/Spore Bloom/);
    expect(fitProblems(r.c.fit)).toEqual([]);
    expect(r.c.credits).toBeGreaterThanOrEqual(0);
  });
  it("five wins end the Toy; the wins lean the lineage toward what the ship was built around", () => {
    expect(builtAround({ hull: "seedpod", parts: ["spine", "spine", "fin", "gland"] })).toBe("weapon");
    expect(builtAround(starter)).toBeNull(); // weapon 2, engine 2: no lean
    let c = install(fresh(), "spine").c;
    for (let i = 0; i < SPACE.winsToFinish; i++) { expect(finished(c)).toBe(false); c = afterBattle(c, "won", { ...none, kinetic: 50 }, 40).c; }
    expect(finished(c)).toBe(true);
    const r = spaceRecord(c);
    expect(r.causes).toEqual([{ cause: "Won 5 space battles in a ship built around weapons", effect: { aggressive: 5 * SPACE.temperPerWin } }]);
    expect(r.block).toMatchObject({ wins: 5, hull: "seedpod", hybrid: false, ally: "aggressive" });
    const lineage = writeStage(null, "space", r.causes, r.block);
    expect(lineage.lastStage).toBe("space");
    expect(temperamentOf(lineage.species[0].influence).aggressive).toBeCloseTo(5 * SPACE.temperPerWin);
  });
});

describe("the opening screen", () => {
  it("words the lineage for the space stage", () => {
    expect(revealFrom(null, 3, "space").leaning).toMatch(/the stars will decide/);
  });
});

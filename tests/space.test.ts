// ---------------------------------------------------------------------------
// space.test.ts
// Purpose : Locks the space stage's Toy rules (docs/stages/05-space.md): fitting (slots, power, the makers'
//           specialty bonus), T0|▼| adapting after every battle (learns what it saw, forgets what it did not, slower
//           against a hybrid ship, never past the cap), combat (resistance cuts damage, the gulper rhythm, turrets
//           and missiles that fire on their own, escorts that fly themselves and can be lost), the campaign (the
//           civilization hand-in, each world's shop, full-refund refits, recruiting, patrols growing, the escape
//           pod, waves, routes, the Lattice streak and the Mothership) and what goes into the lineage.
// Authored: Written with Claude (Fable 5.2, claude-fable-5-2)
// ---------------------------------------------------------------------------
import { describe, expect, it } from "vitest";
import { temperamentOf, writeStage } from "../src/core/lineage";
import { revealFrom } from "../src/game/aquatic/reveal";
import { adapt, shown } from "../src/game/space/adapt";
import {
  afterBattle, allyFor, bossDue, builtAround, neighbour, nextWave, routeTo, travel, escortFit, escortPrice, escortSpecs, escortsSoldAt, finished, install, launch, partsSoldAt, patrolFor, pilotRecruit,
  pilotRefit, pilotWorld, priceOf, recruit, spaceRecord, startCampaign, swapHull, uninstall, ESCORT_IDS, SYSTEMS, type Campaign,
} from "../src/game/space/campaign";
import { IDLE, angleTo, approachControls, newBattle, pilotControls, reinforce, step, type Battle, type Controls } from "../src/game/space/combat";
import { bonusFor, fitProblems, freeSlots, isHybrid, noLearning, partsIn, powerOf, shipStats, HULL_IDS, type Fit, type Makers } from "../src/game/space/fit";
import { SPACE } from "../src/game/space/tuning";

const makers: Makers = { home: "cautious", ally: "aggressive" };
const temper = { cautious: 0.5, aggressive: 0.2, adaptable: 0.1 };
const starter: Fit = { hull: "seedpod", parts: ["spine", "fin", "gland"] };
const none = { kinetic: 0, beam: 0, spore: 0 };
const idle: Controls = IDLE;
const GO: Controls = { ...IDLE, thrust: 1, brake: false };
const fresh = (civ: Record<string, unknown> | null = null, harshness = 0): Campaign => startCampaign({ temper, civ, harshness });
const stats = (f: Fit) => shipStats(f, makers, noLearning());

/** Fly the autoplay pilot until the battle ends or the clock runs out. */
function fight(b: Battle, secs = 120): Battle {
  for (let t = 0; t < secs && !b.over; t += 1 / 60) step(b, pilotControls(b), 1 / 60);
  return b;
}
/** Sit still (no pilot firing) until the battle ends or the clock runs out. */
function drift(b: Battle, secs = 120): Battle {
  for (let t = 0; t < secs && !b.over; t += 1 / 60) step(b, idle, 1 / 60);
  return b;
}

describe("fitting a ship", () => {
  it("a part takes one slot of its type; power must balance; it says why a ship cannot launch", () => {
    expect(freeSlots(starter, "gun")).toBe(SPACE.hulls.seedpod.slots.gun - 1);
    expect(partsIn({ hull: "seedpod", parts: ["spine", "fin", "lance"] }, "gun")).toEqual(["spine", "lance"]);
    expect(powerOf(starter)).toBe(SPACE.flight.basePower - 1 - 1 + 5);
    expect(fitProblems(starter)).toEqual([]);
    expect(fitProblems({ hull: "seedpod", parts: ["gland"] })).toEqual(["no engine", "no weapon"]);
    expect(fitProblems({ hull: "seedpod", parts: ["lance", "lance", "fin"] })).toContain("4 power short");
    expect(fitProblems({ hull: "seedpod", parts: ["spine", "spine", "spine", "fin", "gland"] })).toContain("1 gun slot too few");
    expect(fitProblems({ hull: "carapace", parts: ["spine", "spine", "spine", "fin", "gland"] })).toEqual([]); // the big hull has room
  });
  it("only the flagship hulls can be flown by you", () => {
    expect(HULL_IDS).toEqual(["seedpod", "carapace"]);
  });
  it("a maker's strongest temperament makes its specialty 25 % better", () => {
    expect(bonusFor("plating", makers)).toBe(1.25); // cautious home: defences
    expect(bonusFor("spine", makers)).toBe(1); // a home weapon gets nothing
    expect(bonusFor("lance", makers)).toBe(1.25); // aggressive ally: weapons
    expect(stats({ hull: "seedpod", parts: ["spine", "fin", "plating"] }).hull).toBe(SPACE.hulls.seedpod.hull + Math.round(SPACE.parts.plating.hull * 1.25));
  });
  it("a learned defence family protects less; a heavier ship is slower", () => {
    const f: Fit = { hull: "seedpod", parts: ["spine", "fin", "gland", "membrane"] };
    const open = stats(f), known = shipStats(f, makers, { ...noLearning(), membrane: 0.5 });
    expect(known.shield).toBe(open.shield / 2);
    expect(stats({ ...starter, hull: "carapace" }).topSpeed).toBeLessThan(stats(starter).topSpeed);
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
    const r = adapt(l, { hull: "seedpod", parts: ["lance", "fin", "gland"] }, { ...none, beam: 100 });
    expect(r.learned.kinetic).toBeCloseTo(SPACE.adapt.cap - SPACE.adapt.fade);
    expect(r.notes.join("\n")).toMatch(/forgetting spines/);
  });
  it("learns a hybrid ship slower", () => {
    const r = adapt(noLearning(), { hull: "seedpod", parts: ["spine", "fin", "gland", "membrane"] }, { ...none, kinetic: 100 });
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
    const st = stats(starter);
    const b = newBattle(st, [], noLearning());
    for (let i = 0; i < 600; i++) step(b, GO, 1 / 60);
    expect(Math.hypot(b.you.vx, b.you.vy)).toBeGreaterThan(st.topSpeed * 0.95);
    expect(Math.hypot(b.you.vx, b.you.vy)).toBeLessThanOrEqual(st.topSpeed * 1.01);
    expect(b.over).toBeNull(); // a quiet system is never "won"
  });
  it("the pilot destroys the first patrol with the starter ship, and collects its salvage", () => {
    const b = fight(newBattle(stats(starter), patrolFor("driftfield", 0), noLearning()));
    expect(b.over).toBe("won");
    expect(b.salvage).toBe(2 * SPACE.t0.shard.salvage);
    expect(b.dealt.kinetic).toBeGreaterThan(0);
  });
  it("a learned weapon family does less: the same fight takes longer", () => {
    const open = fight(newBattle(stats(starter), ["shard"], noLearning()));
    const known = fight(newBattle(stats(starter), ["shard"], { ...noLearning(), kinetic: SPACE.adapt.cap }));
    expect(open.over).toBe("won");
    expect(known.over === "won" ? known.t : Infinity).toBeGreaterThan(open.t);
  });
  it("T0 strikes a burst, then pauses (the gulper rhythm)", () => {
    const b = newBattle(stats({ hull: "carapace", parts: ["spine", "fin", "plating", "plating", "plating"] }), ["shard"], noLearning());
    let paused = false;
    for (let i = 0; i < 60 * 30 && !paused; i++) { step(b, idle, 1 / 60); paused = b.foes[0]?.mode === "pause"; }
    expect(paused).toBe(true);
  });
  it("gives up a long chase it cannot win, and rests", () => {
    const fast = shipStats({ hull: "seedpod", parts: ["spine", "burn", "gland"] }, { home: "cautious", ally: "adaptable" }, noLearning());
    const b = newBattle(fast, ["lattice"], noLearning());
    b.you.a = Math.PI; // run straight away from it
    let gaveUp = false;
    for (let i = 0; i < 60 * 40 && !gaveUp; i++) gaveUp = step(b, GO, 1 / 60).some((e) => e.kind === "giveup");
    expect(gaveUp).toBe(true);
    expect(b.foes[0].mode).toBe("rest");
  });
  it("shields soak damage before the hull, and a destroyed ship loses", () => {
    const b = newBattle(stats({ hull: "seedpod", parts: ["spine", "fin", "gland", "membrane"] }), ["lattice", "shard", "shard", "shard"], noLearning());
    let shieldHit = false;
    for (let i = 0; i < 60 * 120 && !b.over; i++) shieldHit = step(b, idle, 1 / 60).some((e) => e.kind === "hurt" && e.shield) || shieldHit;
    expect(shieldHit).toBe(true);
    expect(b.over).toBe("lost");
  });
});

describe("weapons that fire on their own", () => {
  const turretShip = stats({ hull: "carapace", parts: ["needle", "needle", "fin", "gland", "plating", "plating", "plating", "plating"] });
  it("a turret hits a ship behind you without the pilot firing or turning", () => {
    const b = newBattle(turretShip, ["shard"], noLearning());
    b.you.a = Math.PI; // facing away from the patrol the whole fight
    drift(b);
    expect(b.dealt.kinetic).toBeGreaterThan(0);
    expect(b.over).toBe("won");
  });
  it("a gun stays silent unless the pilot fires", () => {
    const b = newBattle(stats({ hull: "carapace", parts: ["spine", "fin", "gland", "plating", "plating", "plating", "plating"] }), ["shard"], noLearning());
    for (let i = 0; i < 60 * 20 && !b.over; i++) step(b, idle, 1 / 60);
    expect(b.dealt.kinetic).toBe(0);
  });
  it("a missile launches on its own and homes on a ship that is not ahead", () => {
    const b = newBattle(shipStats({ hull: "carapace", parts: ["seeker", "seeker", "fin", "gland", "plating", "plating", "plating", "plating"] }, makers, noLearning()), ["shard"], noLearning());
    b.you.a = Math.PI / 2; // side-on: a plain gun would never hit
    drift(b);
    expect(b.dealt.spore).toBeGreaterThan(0);
    expect(b.over).toBe("won");
  });
});

describe("escorts", () => {
  const wing = (c: Campaign) => escortSpecs(c);
  it("fly and fight on their own: a fleet wins while the flagship holds fire", () => {
    const c = { ...fresh(), fleet: ["spineling", "spineling"] as Campaign["fleet"] };
    const b = newBattle(stats({ hull: "carapace", parts: ["spine", "fin", "gland", "plating", "plating", "plating", "plating"] }), ["shard", "shard"], noLearning(), 1, undefined, wing(c));
    expect(b.allies).toHaveLength(2);
    drift(b);
    expect(b.over).toBe("won");
    expect(b.dealt.kinetic).toBeGreaterThan(0); // T0 saw the escorts' spines
  });
  it("T0 goes for the nearest of you, and an escort it destroys is gone for good", () => {
    const c = { ...fresh(), fleet: ["skiff"] as Campaign["fleet"] };
    const b = newBattle(stats(starter), ["lattice", "shard", "shard", "shard", "shard"], noLearning(), 1, undefined, wing(c));
    b.you.x -= 2000; // the flagship hangs far back: the Skiff is the nearest target
    let lost = false;
    for (let i = 0; i < 60 * 90 && !lost; i++) lost = step(b, idle, 1 / 60).some((e) => e.kind === "allylost");
    expect(lost).toBe(true);
    expect(b.lostEscorts).toEqual([0]);
    expect(b.allies).toHaveLength(0);
    const after = afterBattle(c, "fled", b.dealt, b.salvage, b.lostEscorts);
    expect(after.c.fleet).toEqual([]);
    expect(after.c.escortsLost).toBe(1);
    expect(after.notes.join("\n")).toMatch(/Lost for good: Skiff/);
  });
  it("with no enemy left they keep station near the flagship", () => {
    const c = { ...fresh(), fleet: ["skiff"] as Campaign["fleet"] };
    const b = newBattle(stats(starter), [], noLearning(), 1, undefined, wing(c));
    for (let i = 0; i < 60 * 20; i++) step(b, GO, 1 / 60);
    expect(Math.hypot(b.allies[0].x - b.you.x, b.allies[0].y - b.you.y)).toBeLessThan(200);
  });
  it("every escort's fit is a ship that can fly", () => {
    for (const id of ESCORT_IDS) expect(fitProblems(escortFit(id))).toEqual([]);
  });
});

describe("the campaign", () => {
  it("four systems: two friendly worlds and two patrols", () => {
    expect(SYSTEMS.map((s) => s.id)).toEqual(["hearth", "tidereach", "driftfield", "lattice"]);
    for (const s of SYSTEMS) for (const l of s.links) expect(SYSTEMS.find((o) => o.id === l)?.links).toContain(s.id); // every link goes both ways
    expect(patrolFor("hearth", 9)).toEqual([]);
    expect(patrolFor("tidereach", 9, 3)).toEqual([]);
    expect(patrolFor("driftfield", 0)).toEqual(["shard", "shard"]);
    expect(patrolFor("lattice", 0)).toEqual(["lattice", "shard"]);
    expect(patrolFor("driftfield", 4)).toHaveLength(4); // stakes rise with your wins
    expect(patrolFor("driftfield", 99)).toHaveLength(SPACE.patrol.shardsMax);
    expect(patrolFor("driftfield", 0, 2)).toHaveLength(4); // and with the fleet you bring
  });
  it("each world sells its own species' parts and ships", () => {
    expect(partsSoldAt("hearth")).toEqual(["spine", "needle", "plating", "fin", "gland"]);
    expect(partsSoldAt("tidereach")).toEqual(["lance", "lanceturret", "spore", "seeker", "membrane", "burn"]);
    expect(partsSoldAt("driftfield")).toEqual([]);
    expect(escortsSoldAt("hearth")).toEqual(["spineling"]);
    expect(escortsSoldAt("tidereach")).toEqual(["skiff", "warden"]);
  });
  it("the ally is a temperament you are not", () => {
    expect(allyFor("cautious")).toBe("aggressive");
    expect(allyFor("aggressive")).toBe("adaptable");
    expect(allyFor("adaptable")).toBe("cautious");
  });
  it("the civilization stage's victory and machines set the starting position", () => {
    expect(fresh().fit.parts).toEqual(["spine", "fin", "gland"]);
    const war = fresh({ victory: "conquest", machines: ["siege", "temple"] });
    expect(war.fit.parts).toEqual(["spine", "fin", "gland", "spine", "needle"]);
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
    expect(escortPrice(harsh, "skiff")).toBeGreaterThan(SPACE.escorts.skiff.cost);
  });
  it("a part needs a free slot, the right world and the salvage; a refit refunds in full", () => {
    const c = fresh();
    const d = install(c, "plating");
    expect(d.c.credits).toBe(c.credits - SPACE.parts.plating.cost);
    expect(uninstall(d.c, "plating").c).toEqual(c);
    expect(uninstall(c, "lance").ok).toBe(false);
    expect(install(c, "lance").why).toMatch(/not sold here/);
    expect(install({ ...c, system: "tidereach" }, "lance").ok).toBe(true);
    expect(install({ ...c, credits: 10 }, "plating").why).toMatch(/needs 50 salvage/);
    expect(install(install(c, "spine").c, "spine").why).toMatch(/no free gun slot/);
    expect(launch(c).refits).toBe(0);
    expect(launch(launch(d.c)).refits).toBe(1);
    const rich = { ...c, credits: 500 };
    expect(swapHull(swapHull(rich).c).c).toEqual(rich);
    expect(swapHull(c).ok).toBe(false);
  });
  it("escorts are recruited at their species' world, up to the fleet's limit, and are not refunded", () => {
    const rich = { ...fresh(), credits: 5000 };
    expect(recruit(rich, "skiff").why).toMatch(/not built here/);
    const r = recruit(rich, "spineling");
    expect(r.c.fleet).toEqual(["spineling"]);
    expect(r.c.credits).toBe(rich.credits - SPACE.escorts.spineling.cost);
    expect(recruit(fresh(), "spineling").why).toMatch(/needs 160 salvage/);
    let full: Campaign = { ...rich, system: "tidereach" };
    for (let i = 0; i < SPACE.fleet.max; i++) full = recruit(full, "warden").c;
    expect(full.fleet).toHaveLength(SPACE.fleet.max);
    expect(recruit(full, "skiff").why).toMatch(/fleet is full/);
    expect(escortSpecs(full)[0].stats.shield).toBeGreaterThan(0); // a Warden is shielded
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
  it("the pilot lands where the least-known weapon is sold, refits to it, and recruits when it can pay", () => {
    const c = fresh();
    expect(pilotRefit(c).note).toBe("");
    const known = { ...c, learned: { ...c.learned, kinetic: 0.7, beam: 0.2 } };
    expect(pilotWorld(c)).toBe("hearth");
    expect(pilotWorld(known)).toBe("tidereach");
    expect(pilotRefit(known).note).toBe(""); // Hearth only sells spines
    const r = pilotRefit({ ...known, system: "tidereach" });
    expect(r.note).toMatch(/Spore Bloom x2/);
    expect(fitProblems(r.c.fit)).toEqual([]);
    expect(pilotRecruit(c).note).toBe(""); // cannot pay yet
    expect(pilotRecruit({ ...c, credits: 400 }).c.fleet).toEqual(["spineling"]);
  });
  it("wins lean the lineage toward what the ship was built around", () => {
    expect(builtAround({ hull: "seedpod", parts: ["spine", "spine", "fin", "gland"] })).toBe("weapon");
    expect(builtAround(starter)).toBeNull(); // weapon 2, engine 2: no lean
    let c = install(fresh(), "spine").c;
    for (let i = 0; i < 5; i++) c = afterBattle(c, "won", { ...none, kinetic: 50 }, 40).c;
    expect(finished(c)).toBe(false); // wins alone do not end the stage
    const r = spaceRecord(c);
    expect(r.causes).toEqual([{ cause: "Won 5 space battles in a ship built around weapons", effect: { aggressive: 5 * SPACE.temperPerWin } }]);
    expect(r.block).toMatchObject({ wins: 5, hull: "seedpod", hybrid: false, ally: "aggressive", fleet: [], bossDown: false });
    const lineage = writeStage(null, "space", r.causes, r.block);
    expect(lineage.lastStage).toBe("space");
    expect(temperamentOf(lineage.species[0].influence).aggressive).toBeCloseTo(5 * SPACE.temperPerWin);
  });
});

describe("getting around", () => {
  it("finds the jumps from one system to another", () => {
    expect(routeTo("hearth", "lattice")).toEqual(["driftfield", "lattice"]);
    expect(routeTo("lattice", "tidereach")).toEqual(["driftfield", "tidereach"]);
    expect(routeTo("hearth", "tidereach")).toEqual(["tidereach"]);
    expect(routeTo("hearth", "hearth")).toEqual([]);
  });
  it("next and previous follow the map's order along its links", () => {
    expect(neighbour("hearth", 1)).toBe("tidereach");
    expect(neighbour("tidereach", 1)).toBe("driftfield");
    expect(neighbour("driftfield", 1)).toBe("lattice");
    expect(neighbour("lattice", 1)).toBeNull();
    expect(neighbour("lattice", -1)).toBe("driftfield");
    expect(neighbour("driftfield", -1)).toBe("tidereach");
    expect(neighbour("hearth", -1)).toBeNull();
  });
  it("reverse thrusters back the ship up, slower than the main engine; side thrusters strafe", () => {
    const st = stats(starter);
    const back = newBattle(st, [], noLearning()), side = newBattle(st, [], noLearning());
    const x0 = back.you.x, y0 = side.you.y;
    for (let i = 0; i < 300; i++) { step(back, { ...IDLE, thrust: -1, brake: false }, 1 / 60); step(side, { ...IDLE, strafe: 1, brake: false }, 1 / 60); }
    expect(back.you.x).toBeLessThan(x0 - 50); // facing +x, it moved -x
    const backSpeed = Math.hypot(back.you.vx, back.you.vy), cap = st.topSpeed * SPACE.flight.reverse;
    expect(backSpeed).toBeGreaterThan(cap * 0.95);
    expect(backSpeed).toBeLessThanOrEqual(cap * 1.01);
    expect(side.you.y).toBeGreaterThan(y0 + 50); // facing +x, its right is +y
    expect(Math.abs(side.you.x - x0)).toBeLessThan(1);
    expect(back.you.a).toBe(0); // neither turned the ship
  });
  it("the landing autopilot flies to the planet and stops there", () => {
    const b = newBattle(stats(starter), [], noLearning(), 1, { x: -600, y: 350 });
    b.you.a = 2; // pointing the wrong way
    let t = 0;
    for (; t < 60 && Math.hypot(b.you.x, b.you.y) > SPACE.landRange; t += 1 / 60) step(b, approachControls(b.you, 0, 0, SPACE.landRange * 0.6), 1 / 60);
    expect(t).toBeLessThan(30);
    for (let i = 0; i < 180; i++) step(b, approachControls(b.you, 0, 0, SPACE.landRange * 0.6), 1 / 60);
    expect(Math.hypot(b.you.x, b.you.y)).toBeLessThan(SPACE.landRange); // it did not overshoot
    expect(Math.hypot(b.you.vx, b.you.vy)).toBeLessThan(20);
  });
});

describe("waves and the Mothership", () => {
  it("the next wave arrives ahead of you without leaving, with the new learning", () => {
    const b = fight(newBattle(stats(starter), ["shard"], noLearning()));
    expect(b.over).toBe("won");
    const learned = { ...noLearning(), kinetic: 0.35 };
    reinforce(b, ["shard", "shard"], learned);
    expect(b).toMatchObject({ over: null, hostile: true, salvage: 0, learned });
    expect(b.dealt.kinetic).toBe(0);
    expect(b.foes.map((f) => f.id)).toEqual([2, 3]); // ids keep counting up
    for (const f of b.foes) expect(Math.hypot(f.x - b.you.x, f.y - b.you.y)).toBeCloseTo(SPACE.patrol.spawnDist, 0);
    expect(fight(b).over).toBe("won");
  });
  it("escorts are renumbered for the fleet that is left", () => {
    const c = { ...fresh(), fleet: ["skiff", "spineling"] as Campaign["fleet"] };
    const b = newBattle(stats(starter), [], noLearning(), 1, undefined, escortSpecs(c));
    b.allies.shift(); // the Skiff (fleet index 0) was lost in the last wave
    reinforce(b, ["shard"], noLearning());
    expect(b.allies.map((s) => s.escort)).toEqual([0]);
    expect(b.lostEscorts).toEqual([]);
  });
  it("three wins in a row at the Lattice summon the Mothership; leaving or losing breaks the streak", () => {
    let c = travel(travel(fresh(), "driftfield"), "lattice");
    expect(nextWave(c)).toEqual(["lattice", "shard"]);
    c = afterBattle(c, "won", none, 0).c;
    c = afterBattle(c, "won", none, 0).c;
    expect(c.latticeStreak).toBe(2);
    expect(bossDue(c)).toBe(false);
    expect(travel(c, "driftfield").latticeStreak).toBe(0);
    expect(afterBattle(c, "lost", none, 0).c.latticeStreak).toBe(0);
    expect(afterBattle(c, "fled", none, 0).c.latticeStreak).toBe(0);
    const r = afterBattle(c, "won", none, 0);
    expect(r.notes.join("\n")).toMatch(/Mothership is coming/);
    expect(bossDue(r.c)).toBe(true);
    expect(nextWave(r.c)).toEqual(["mothership", "shard", "shard"]);
    expect(afterBattle({ ...fresh(), system: "driftfield" }, "won", none, 0).c.latticeStreak).toBe(0); // only the Lattice counts
  });
  it("destroying the Mothership wins the stage, and the campaign goes on", () => {
    let c: Campaign = { ...fresh(), system: "lattice", latticeStreak: 3 };
    expect(finished(c)).toBe(false);
    c = afterBattle(c, "won", none, 700, [], true).c;
    expect(finished(c)).toBe(true);
    expect(c).toMatchObject({ bossDown: true, bosses: 1, latticeStreak: 0 });
    expect(nextWave(c)).toEqual(patrolFor("lattice", c.wins)); // patrols keep coming
    expect(spaceRecord(c).block).toMatchObject({ bossDown: true, motherships: 1 });
  });
  it("the Mothership launches Shards while it lives", () => {
    const tank = stats({ hull: "carapace", parts: ["spine", "fin", "gland", "plating", "plating", "plating", "plating"] });
    const b = newBattle(tank, ["mothership"], noLearning());
    b.you.x -= 5000; // far out of its reach: just watch it
    let spawned = 0;
    for (let i = 0; i < 60 * (SPACE.boss.spawnEvery * 3 + 1); i++) spawned += step(b, idle, 1 / 60).filter((e) => e.kind === "spawn").length;
    expect(spawned).toBe(3);
    expect(b.foes.filter((f) => f.kind === "shard")).toHaveLength(3);
  });
});

describe("the opening screen", () => {
  it("words the lineage for the space stage", () => {
    expect(revealFrom(null, 3, "space").leaning).toMatch(/the stars will decide/);
  });
});

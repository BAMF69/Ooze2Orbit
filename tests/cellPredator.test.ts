// ---------------------------------------------------------------------------
// cellPredator.test.ts
// Purpose : Locks the gulper's state machine (src/game/cell/predator.ts): distracted by prey, sticky, tires of
//           chasing the player, rests after eating; plus a small scenario: a gulper between you and a snail eats
//           the snail first (the distraction the player can use).
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import { describe, expect, it } from "vitest";
import { PLAYER_ID, ate, newBrain, think, type GulperBrain, type Seen } from "../src/game/cell/predator";
import { TUNING } from "../src/game/cell/tuning";

const P = TUNING.gulper;
const me = { x: 0, y: 0 };
const you = (x: number): Seen => ({ id: PLAYER_ID, x, y: 0 });
const prey = (id: number, x: number): Seen => ({ id, x, y: 0 });

describe("gulper choices", () => {
  it("wanders when nothing is in sight", () => {
    expect(think(newBrain(), me, [you(P.sight + 50)], 0.016, P).state).toBe("wander");
  });

  it("at equal distance it goes for the small cell, not you (distracted)", () => {
    const b = think(newBrain(), me, [you(150), prey(7, 150)], 0.016, P);
    expect(b).toMatchObject({ state: "hunt", targetId: 7 });
  });

  it("still comes for you when you are much closer than any prey", () => {
    const b = think(newBrain(), me, [you(60), prey(7, 300)], 0.016, P);
    expect(b.targetId).toBe(PLAYER_ID);
  });

  it("sticks to its target unless another is clearly better", () => {
    let b = think(newBrain(), me, [you(100), prey(7, 200)], 0.016, P);
    expect(b.targetId).toBe(PLAYER_ID);
    b = think({ ...b, thinkIn: 0 }, me, [you(100), prey(7, 120)], 0.016, P); // prey barely better: keep you
    expect(b.targetId).toBe(PLAYER_ID);
    b = think({ ...b, thinkIn: 0 }, me, [you(100), prey(7, 30)], 0.016, P); // prey much better: switch
    expect(b.targetId).toBe(7);
  });

  it("gives up a target that leaves its sight", () => {
    const b = think(newBrain(), me, [prey(7, 100)], 0.016, P);
    expect(think(b, me, [prey(7, P.loseSight + 10)], 0.016, P).state).toBe("wander");
    expect(think(b, me, [], 0.016, P).state).toBe("wander"); // eaten by someone else, or popped
  });
});

describe("gulper limits (SOP-14: a chase that never ends makes any mistake fatal)", () => {
  it("tires after chasing you for huntPlayerMaxS, then rests, then hunts again", () => {
    let b: GulperBrain = newBrain();
    const dt = 0.1;
    let t = 0;
    while (b.state !== "tired" && t < 60) { b = think(b, me, [you(100)], dt, P); t += dt; }
    expect(b.state).toBe("tired");
    expect(t).toBeCloseTo(P.huntPlayerMaxS, 0);
    b = think(b, me, [you(100)], P.tiredS / 2, P);
    expect(b.state).toBe("tired"); // ignores you while resting
    b = think(b, me, [you(100)], P.tiredS, P);
    b = think({ ...b, thinkIn: 0 }, me, [you(100)], 0.016, P);
    expect(b).toMatchObject({ state: "hunt", targetId: PLAYER_ID });
  });

  it("rests after eating and ignores everything until satedS is over", () => {
    let b = ate(think(newBrain(), me, [prey(7, 50)], 0.016, P), P);
    expect(think(b, me, [you(20)], P.satedS / 2, P).state).toBe("sated");
    b = think(b, me, [you(20)], P.satedS + 0.1, P);
    expect(b.state).not.toBe("sated");
  });
});

describe("scenario: lure it onto a snail", () => {
  it("a gulper between you and a snail goes for the snail when it is about as close", () => {
    // you 160 px to its right, a snail 140 px to its left: it turns away from you
    const b = think(newBrain(), me, [you(160), prey(3, -140)], 0.016, P);
    expect(b.targetId).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// cellPilot.test.ts
// Purpose : Locks the autoplay pilot's choices (src/game/cell/pilot.ts), so smoke recordings play each diet sensibly.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import { describe, expect, it } from "vitest";
import { pilotBuy, pilotTarget } from "../src/game/cell/pilot";
import { newCreature } from "../src/game/cell/rules";

const me = { x: 0, y: 0 };
const far = { x: 500, y: 0 };
const near = { x: 50, y: 0 };
const cell = { x: 300, y: 0 };

describe("pilot", () => {
  it("goes for a part when a slot is free", () => {
    const orb = { x: 900, y: 0 };
    expect(pilotTarget(newCreature("herbivore"), me, { orbs: [orb], food: [near], cells: [cell] })).toBe(orb);
  });

  it("a hungry carnivore hunts; a hungry herbivore grazes", () => {
    const full = (c: ReturnType<typeof newCreature>) => ({ ...c, parts: ["spikes" as const] });
    expect(pilotTarget(full(newCreature("carnivore")), me, { orbs: [], food: [far], cells: [cell] })).toBe(cell);
    expect(pilotTarget(full(newCreature("herbivore")), me, { orbs: [], food: [far], cells: [cell] })).toBe(far);
  });

  it("buys the first affordable upgrade", () => {
    expect(pilotBuy(newCreature())).toBeNull();
    expect(pilotBuy({ ...newCreature(), points: { algae: 10, meat: 0 } })).toBe("defense");
  });
});

// Purpose: Every control is drawn where it can be used (BAMF69 playtest 2026-11-18, seed 7: the shaft relay was drawn
//          on the floor 76 px below its use point), F bites in the creature stage again, and the status names the room.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { generateWaterV2 } from "../src/game/creature/levelgen/world";
import { roomLabel } from "../src/game/creature/levelgen/roomSpec";
import { CONTROL_REACH_Y } from "../src/game/creature/levelgen/geometry";
import { controlPlacement } from "../src/game/creature/waterView";
import { valves, newObjective } from "../src/game/creature/waterObjectives";
import { freshExpedition } from "../src/game/creature/expedition";

describe("Control drawings", () => {
  it("draws every control of 60 worlds inside its use band, in every basin state", () => {
    let hanging = 0, standing = 0;
    for (let seed = 0; seed < 60; seed++) for (const r of generateWaterV2(seed).rooms) for (const raised of [false, true]) {
      const e = { ...freshExpedition(seed), basinRaised: raised }, o = newObjective();
      for (const v of valves(r)) {
        const p = controlPlacement(r, e, o, v);
        expect(Math.abs(p.ground - v.y), `seed ${seed} room ${r.id} ${v.text}`).toBeLessThan(CONTROL_REACH_Y);
        if (p.hanging) hanging++; else standing++;
      }
    }
    expect(hanging).toBeGreaterThan(0); expect(standing).toBeGreaterThan(hanging);
  });
  it("hangs the seed 7 shaft relay at its own height instead of on the floor", () => {
    const w = generateWaterV2(7), shaft = w.rooms.find(r => r.spec!.puzzle === "shaft")!, relay = valves(shaft)[0];
    const p = controlPlacement(shaft, { ...freshExpedition(7), basinRaised: true }, newObjective(), relay);
    expect(p.hanging).toBe(true); expect(p.ground).toBe(relay.y + 6);
  });
});
describe("Playtest aids", () => {
  it("names the exact room in the status line", () => {
    const w = generateWaterV2(7);
    const r = w.rooms[5]; expect(roomLabel(r, 7)).toBe(`Room 5 · ${r.name} · ${r.tier} ${r.spec!.puzzle} · seed 7`);
  });
  it("lets F (the aquatic Shock key) bite in the creature stage, beside J and the old sink key", () => {
    const scene = readFileSync(new URL("../src/game/CreatureGenerationScene.ts", import.meta.url), "utf8");
    expect(scene).toMatch(/takePress\("electric"\)/);
    const bindings = readFileSync(new URL("../src/core/bindings.ts", import.meta.url), "utf8");
    expect(bindings).toMatch(/electric: \["key:f"/);
  });
});

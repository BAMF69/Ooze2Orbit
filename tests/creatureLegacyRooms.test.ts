// Purpose: Golden fingerprints of every room rule the seed-v1 Water world exposes (collision in every state,
//          controls, barriers, enemies, reeds, nets, vents, pits, vertical openings/arrivals, returns), so the
//          room-ID tables can move onto one generated model with zero behavior change (CREATURE_LEVELGEN.md §7 step 0).
// Usage  : UPDATE_GOLDEN=1 npx vitest run tests/creatureLegacyRooms.test.ts  rewrites data/golden/creatureLegacyRooms.json.
// Notes  : The probe set is deliberately exhaustive over tiles and objective states; any drift is a real behavior change.
import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { generateWater } from "../src/game/creature/waterWorld";
import { roomRecord, hash } from "./helpers/roomRecord";

const GOLDEN = new URL("../data/golden/creatureLegacyRooms.json", import.meta.url);
const SEEDS = [...Array(48).keys()].concat([255, 1001, 4242, 0x7fffffff, 0xffffffff]);
describe("Legacy Water room rules are frozen by golden fingerprints", () => {
  const actual: Record<string, Record<string, string>> = {};
  for (const seed of SEEDS) {
    const w = generateWater(seed); actual[seed] = {};
    for (const r of w.rooms) actual[seed][r.id] = hash(roomRecord(w.rooms, r));
  }
  if (process.env.UPDATE_GOLDEN) writeFileSync(GOLDEN, JSON.stringify(actual, null, 1) + "\n");
  const golden = JSON.parse(readFileSync(GOLDEN, "utf8")) as typeof actual;
  for (const seed of SEEDS) it(`seed ${seed} matches the pinned room rules`, () => {
    expect(actual[seed], `seed ${seed}`).toEqual(golden[String(seed)]);
  });
});

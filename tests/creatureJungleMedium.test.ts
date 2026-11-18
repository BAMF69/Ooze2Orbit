import { describe, expect, it } from "vitest";
import { biteJungleEnemy, JUNGLE, JUNGLE_MEDIUM, jungleEnemy, jungleStrikePoint, stepJungleEnemy } from "../src/game/creature/jungleMedium";

describe.each(JUNGLE_MEDIUM)("$name", spec => {
  const ground = (x: number, crouch = false) => ({ x, y: JUNGLE.floor, crouch });
  it("places a reproducible patrol and keeps the arrival outside perception", () => {
    for (let seed = 0; seed < 12; seed++) {
      const e = jungleEnemy(spec, seed);
      expect(e).toEqual(jungleEnemy(spec, seed));
      stepJungleEnemy(spec, e, ground(JUNGLE.spawn), 1, false);
      expect(e.phase).toBe("patrol");
    }
  });
  it("warns, commits to the original target, and gives a reachable recovery bite", () => {
    const e = jungleEnemy(spec, 7);
    stepJungleEnemy(spec, e, ground(JUNGLE.start), 0.02, false);
    expect(e.phase).toBe("tell");
    biteJungleEnemy(e, ground(e.at.x), 2);
    expect(e.hp).toBe(spec.hp);
    expect(stepJungleEnemy(spec, e, ground(spec.roost.x), spec.tell, false)).toBe(0);
    expect(e.target.x).toBe(JUNGLE.start);
    expect(stepJungleEnemy(spec, e, ground(spec.roost.x), spec.strike, false)).toBe(0);
    stepJungleEnemy(spec, e, ground(spec.roost.x), 0.25, false);
    biteJungleEnemy(e, ground(spec.roost.x), 2);
    biteJungleEnemy(e, ground(spec.roost.x), 2);
    expect(e.verdict).toBe("fight");
  });
  it("can be trapped at full health, or passed with continuous cover", () => {
    const e = jungleEnemy(spec, 7);
    e.armed = true;
    stepJungleEnemy(spec, e, ground(JUNGLE.trapX), 0.02, false);
    stepJungleEnemy(spec, e, ground(JUNGLE.start), spec.tell, false);
    stepJungleEnemy(spec, e, ground(JUNGLE.start), spec.strike, false);
    expect(e.verdict).toBe("trap");
    expect(e.hp).toBe(spec.hp);
    const sneak = jungleEnemy(spec, 7);
    for (let x = JUNGLE.start; x <= JUNGLE.pass; x++) stepJungleEnemy(spec, sneak, ground(x, true), 0.02, false);
    expect(sneak.verdict).toBe("sneak");
  });
  it("does not grant a verdict for sprinting through or crouching only at the end", () => {
    const e = jungleEnemy(spec, 7);
    for (let x = JUNGLE.spawn; x <= JUNGLE.exit; x += 3) stepJungleEnemy(spec, e, ground(x), 0.02, false);
    for (let t = 0; t < 180; t++) stepJungleEnemy(spec, e, ground(JUNGLE.pass, true), 0.02, false);
    expect(e.verdict).toBeNull();
  });
});

it("gives the thrower an actual overhead fruit arc", () => {
  const spec = JUNGLE_MEDIUM[0], e = jungleEnemy(spec, 7);
  stepJungleEnemy(spec, e, { x: JUNGLE.start, y: JUNGLE.floor, crouch: false }, 0.02, false);
  expect(jungleStrikePoint(spec, e, 0.5).y).toBeLessThan((e.from.y + e.target.y) / 2);
});

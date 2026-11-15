import { describe, expect, it } from "vitest";
import { PresentationPause } from "../src/game/civ/presentationPause";
describe("civilization Details presentation pause", () => {
  it("freezes timers and tweens, then restores their independent prior states", () => {
    const scene = { time: { paused: false }, tweens: { paused: true } }, pause = new PresentationPause(scene);
    pause.set(true); pause.set(true); expect(scene.time.paused).toBe(true); expect(scene.tweens.paused).toBe(true);
    pause.set(false); expect(scene.time.paused).toBe(false); expect(scene.tweens.paused).toBe(true);
    pause.set(false); expect(scene.time.paused).toBe(false);
  });
});

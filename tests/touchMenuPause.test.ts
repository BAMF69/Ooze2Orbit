import { expect, it } from 'vitest';
import { TouchMenuPause } from '../src/game/touchMenuPause';
it('freezes scene clocks while purchases remain interactive, then restores their previous state', () => {
  const scene = { time: { paused: false }, tweens: { paused: true } }, pause = new TouchMenuPause(scene);
  pause.set(true); pause.set(true);
  expect(scene.time.paused).toBe(true); expect(scene.tweens.paused).toBe(true);
  pause.set(false); pause.set(false);
  expect(scene.time.paused).toBe(false); expect(scene.tweens.paused).toBe(true);
  pause.set(true); pause.set(false); expect(scene.time.paused).toBe(false);
});

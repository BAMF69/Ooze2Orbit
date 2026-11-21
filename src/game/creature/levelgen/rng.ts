// Purpose: Deterministic integer PRNG for generation (SOP-17 §2): same seed, same level, on every runtime.
// Notes: Same mixing as waterWorld.ts rng; decisions only use integers, never float ranges.
// Authored: Written with Claude (Fable 5.1).
export interface Rng { next(): number; int(n: number): number; chance(p: number): boolean; pick<T>(items: readonly T[]): T; fork(salt: number): Rng }
export function makeRng(seed: number): Rng {
  let s = seed >>> 0;
  const next = (): number => { s = (s + 0x6d2b79f5) >>> 0; let n = Math.imul(s ^ s >>> 15, 1 | s); n ^= n + Math.imul(n ^ n >>> 7, 61 | n); return (n ^ n >>> 14) >>> 0; };
  return {
    next, int: n => n <= 0 ? 0 : next() % n,
    chance: p => next() % 1000 < Math.round(p * 1000), // p is a tunable with at most three decimals
    pick: items => items[next() % items.length],
    fork: salt => makeRng((next() ^ Math.imul(salt, 0x9e3779b9)) >>> 0),
  };
}

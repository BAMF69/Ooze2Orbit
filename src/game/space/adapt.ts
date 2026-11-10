// ---------------------------------------------------------------------------
// adapt.ts (space)
// Purpose : T0|▼| adapts (docs/stages/05-space.md, approved 2026-11-08): after every battle it learns the weapon
//           families that hurt it (by their share of the damage) and the defence families the ship flew with (by
//           their share of the defence), and forgets families you did not use. A hybrid ship is learned slower.
//           Every change comes back as a line the player can read (pillar 1: it must be readable).
// Usage   : const r = adapt(learned, fit, dealt);  r.learned, r.notes
// Notes   : Pure. Tested in tests/space.test.ts. Numbers: SPACE.adapt. `dealt` is the damage your shots would have
//           done before T0|▼|'s resistance, so a family it already resists still counts as used.
// Authored: Written with Claude (Fable 5.2, claude-fable-5-2)
// ---------------------------------------------------------------------------
import { DEFENCE_FAMILIES, WEAPON_FAMILIES, isHybrid, part, type Family, type Fit, type Learned, type WeaponFamily } from "./fit";
import { SPACE } from "./tuning";

export const FAMILY_WORD: Record<Family, string> = { kinetic: "spines", beam: "lances", spore: "spores", plating: "plating", membrane: "membranes" };
export const T0 = "T0|▼|";

/** How much of each family the battle showed T0|▼|: shares that add up to 1 per group (weapons, defences). */
export function shown(fit: Fit, dealt: Readonly<Record<WeaponFamily, number>>): Record<Family, number> {
  const out: Record<Family, number> = { kinetic: 0, beam: 0, spore: 0, plating: 0, membrane: 0 };
  const total = WEAPON_FAMILIES.reduce((n, f) => n + dealt[f], 0);
  const fitted = fit.parts.map(part);
  const weapons = fitted.filter((p) => p.kind === "weapon");
  // no hit landed: it still saw what you carried
  for (const f of WEAPON_FAMILIES) out[f] = total > 0 ? dealt[f] / total : weapons.filter((p) => p.family === f).length / Math.max(1, weapons.length);
  const defences = fitted.filter((p) => p.kind === "defence");
  for (const f of DEFENCE_FAMILIES) out[f] = defences.filter((p) => p.family === f).length / Math.max(1, defences.length);
  return out;
}

/** One battle's learning. Returns the new readout and what changed, biggest change first. */
export function adapt(learned: Learned, fit: Fit, dealt: Readonly<Record<WeaponFamily, number>>): { learned: Learned; notes: string[] } {
  const A = SPACE.adapt;
  const share = shown(fit, dealt);
  const slow = isHybrid(fit) ? A.hybrid : 1;
  const next = { ...learned };
  const changes: { d: number; note: string }[] = [];
  const pct = (v: number) => `${Math.round(v * 100)} %`;
  for (const f of [...WEAPON_FAMILIES, ...DEFENCE_FAMILIES] as Family[]) {
    const rate = (WEAPON_FAMILIES as readonly Family[]).includes(f) ? A.learn : A.defLearn;
    const to = share[f] > 0 ? Math.min(A.cap, learned[f] + rate * share[f] * slow) : Math.max(0, learned[f] - A.fade);
    next[f] = Math.round(to * 1000) / 1000;
    const d = next[f] - learned[f];
    if (Math.abs(d) < 0.005) continue;
    changes.push({ d: Math.abs(d), note: d > 0 ? `${T0} learned your ${FAMILY_WORD[f]}: ${pct(learned[f])} -> ${pct(next[f])}` : `${T0} is forgetting ${FAMILY_WORD[f]}: ${pct(learned[f])} -> ${pct(next[f])}` });
  }
  const notes = changes.sort((a, b) => b.d - a.d).map((c) => c.note);
  if (slow < 1 && notes.length) notes.push("Hybrid ship: it learned slower");
  return { learned: next, notes };
}

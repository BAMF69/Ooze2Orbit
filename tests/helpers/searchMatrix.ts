// Purpose: Run the search solver over a room in every relevant Gardener state at its tier's minimum traits, memoized
//          by the room's content (generated rooms repeat across seeds), and say what each failure is missing.
import type { WaterRoom, Difficulty } from "../../src/game/creature/waterWorld";
import { searchRoom, type SearchResult, type SearchOptions } from "../../src/game/creature/levelgen/search";
import { freshExpedition } from "../../src/game/creature/expedition";
import { newGarden, type Traits } from "../../src/game/creature/generations";
import { keysOf, type Key } from "../../src/game/creature/levelgen/keys";

export const MIN_TRAITS: Record<Difficulty, Traits> = (() => { const b = newGarden().traits; return { easy: { ...b }, medium: { ...b, gills: true }, hard: { ...b, gills: true, fins: true } }; })();
export type GardenState = { raised: boolean; diverted: boolean };
export const GARDEN_STATES: GardenState[] = [{ raised: false, diverted: false }, { raised: true, diverted: false }, { raised: true, diverted: true }];
const memo = new Map<string, SearchResult>();
/** What decides how the body moves and what solves the room. Food, reeds, nets, hints and names do not. */
export function signature(r: WaterRoom): string {
  const s = r.spec!;
  return JSON.stringify([r.gate ? r.gateX : -1, r.tunnel, r.current, r.goal, r.reward ?? null, s.base.platforms ? r.platforms : [],
    s.puzzle, s.controls.map(c => [c.x, c.y, c.guarded]), s.timed, s.leftHatch, s.sealed, s.pits, s.collision, s.base,
    s.openings.map(o => [o.side, o.tiles, o.probe, o.when ?? null]), s.keyed && [s.keyed.x, s.keyed.y, s.keyed.opens, s.keyed.requires],
    s.returnArrival, s.geometry ?? null]);
}
/** Movement plus where threats stand: for runs that read enemies (threat avoidance, the enemy-ignoring bot). */
export const threatSignature = (r: WaterRoom): string => signature(r) + JSON.stringify(r.spec!.enemies);
export function run(r: WaterRoom, st: GardenState, traits: Traits, keys: ReadonlySet<Key>, opt: SearchOptions = {}): SearchResult {
  const base = opt.avoid || opt.threatsHandled === false ? threatSignature(r) : signature(r);
  const key = base + JSON.stringify([st, traits, [...keys].sort(), opt.threatsHandled ?? false, !!opt.collect, !!opt.avoid]);
  let res = memo.get(key);
  if (!res) {
    const start = r.spec!.returnArrival ? { x: 152, y: 298 } : undefined;
    // Collecting positions explores every layer fully, so relation rules see everything reachable.
    res = searchRoom(r, { ...freshExpedition(0), basinRaised: st.raised, torrentDiverted: st.diverted }, traits, keys, { start, ...(opt.collect ? { exhaustive: true } : {}), ...opt });
    memo.set(key, res);
  }
  return res;
}
/** What the room itself declares it needs: a sluice needs the raised basin; a current needs diversion and fins. */
export function expectedSolvable(r: WaterRoom, st: GardenState, t: Traits): boolean {
  return (!r.gate || st.raised) && (!r.current || st.diverted && !!t.fins);
}
/** The keys a minimal lineage of this tier holds for the room: its class door (built for it) and nothing else. */
export function minimalKeys(r: WaterRoom): Set<Key> {
  const k = keysOf({ ...MIN_TRAITS[r.tier], classSkills: r.spec?.variant ? [r.spec.variant as "roar"] : [] }, { basinRaised: true, torrentDiverted: true });
  return new Set<Key>([...k].filter(x => !x.startsWith("gardener:")));
}
export const memoSize = (): number => memo.size;

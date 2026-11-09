// ---------------------------------------------------------------------------
// population.ts
// Purpose : Toy 3 "one lever, one trait": your kin breed over generations and their body thickness drifts with the
//           water temperature the Gardener sets. Every generation returns a cause in plain words (pillar 2: the
//           player must see how their influence shaped the trait).
// Usage   : let pop = newPopulation(AQ.population, rng); const g = nextGeneration(pop, tempC, AQ.population, rng)
//           g.population, g.cause ("The water is cold (6 °C): thicker bodies kept warm and had more young...")
// Notes   : Pure, seeded (pass any () => [0,1) rng; mulberry32 below). Tested in tests/aquaticPopulation.test.ts.
//           Thickness 0 = slender, 1 = thick. Fitness: cold favours thick, warm favours slender, at neutralTemp
//           nothing is favoured, so drift there is only mutation noise.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
//
// Pseudocode
//   fitness(t) = exp(selection * (neutral - temp) * (t - 0.5) * 4)   // cold: thick wins; warm: thin wins
//   next generation: pick each child's parent with probability ~ fitness; child = parent + gaussian * mutation
//   cause = what the water was, which bodies did better, and the average before -> after

export interface PopulationTuning {
  size: number;
  neutralTemp: number;
  selection: number;
  mutation: number;
  startThickness: number;
}

export interface Population {
  generation: number;
  thickness: number[]; // one per individual
}

export interface GenerationResult {
  population: Population;
  before: number; // average thickness
  after: number;
  cause: string;
}

/** Small seeded RNG (mulberry32): same seed, same lake. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function gaussian(rng: () => number): number {
  const u = Math.max(1e-9, rng());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

export function average(p: Population): number {
  return p.thickness.reduce((s, v) => s + v, 0) / Math.max(1, p.thickness.length);
}

export function newPopulation(t: PopulationTuning, rng: () => number): Population {
  return {
    generation: 0,
    thickness: Array.from({ length: t.size }, () => clamp01(t.startThickness + gaussian(rng) * t.mutation)),
  };
}

/** How well a body of this thickness does in water of this temperature (relative; only ratios matter). */
export function fitness(thickness: number, tempC: number, t: PopulationTuning): number {
  return Math.exp(t.selection * (t.neutralTemp - tempC) * (thickness - 0.5) * 4);
}

/** Words for a thickness: what the HUD and the cause lines say. */
export function bodyWord(thickness: number): string {
  if (thickness < 0.3) return "slender";
  if (thickness < 0.45) return "lean";
  if (thickness <= 0.55) return "medium";
  if (thickness <= 0.7) return "stocky";
  return "thick";
}

/** One generation: parents chosen by fitness, children vary a little. The cause says why the average moved. */
export function nextGeneration(p: Population, tempC: number, t: PopulationTuning, rng: () => number): GenerationResult {
  const before = average(p);
  const w = p.thickness.map((th) => fitness(th, tempC, t));
  const total = w.reduce((s, v) => s + v, 0);
  const pick = (): number => {
    let r = rng() * total;
    for (let i = 0; i < w.length; i++) {
      r -= w[i];
      if (r <= 0) return p.thickness[i];
    }
    return p.thickness[p.thickness.length - 1];
  };
  const thickness = p.thickness.map(() => clamp01(pick() + gaussian(rng) * t.mutation));
  const population = { generation: p.generation + 1, thickness };
  const after = average(population);
  return { population, before, after, cause: causeLine(tempC, before, after, t) };
}

function causeLine(tempC: number, before: number, after: number, t: PopulationTuning): string {
  const pct = (v: number) => `${Math.round(v * 100)} %`;
  const moved = `Average body thickness ${pct(before)} -> ${pct(after)} (${bodyWord(after)}).`;
  const temp = Math.round(tempC);
  if (Math.abs(tempC - t.neutralTemp) < 1) return `The water is mild (${temp} °C): no body shape had the edge, so it only drifted. ${moved}`;
  // say what really happened: with a dozen kin, chance sometimes beats the water for a generation (pillar 2: truthful causes)
  const favoured = tempC < t.neutralTemp ? 1 : -1;
  const delta = after - before;
  const luck = Math.abs(delta) < 0.01 ? " This time the change was too small to see." : Math.sign(delta) !== favoured ? " But chance went the other way this generation." : "";
  if (tempC < t.neutralTemp) return `The water is cold (${temp} °C): thicker bodies kept warm and had more young.${luck} ${moved}`;
  return `The water is warm (${temp} °C): slender bodies stayed cool and quick, and had more young.${luck} ${moved}`;
}

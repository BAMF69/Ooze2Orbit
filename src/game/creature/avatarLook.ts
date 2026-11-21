// ---------------------------------------------------------------------------
// avatarLook.ts (creature)
// Purpose : Decide what the creature avatar looks like from the lineage: body family from the dominant
//           temperament, palette from diet, and the worn traits the player has (story adaptations, class
//           skill, grotto parts). Also owns the HD sheet layout shared with assets_src/sprites/creature_hd/bake.mjs.
// Usage   : avatarLook(temperamentPct, traits) -> AvatarLook; bodyKey/wornKey/wornFrame for textures.
// Notes   : Pure and import-free (bake.mjs loads it through Node's type stripping). Family ties follow the aquatic
//           bodyLook order (aggressive, cautious, adaptable). Concepts: docs/CONCEPTS.md C-0101..C-0104.
// Authored: Written with Claude (Opus 5.5) for BAMF69.
// ---------------------------------------------------------------------------

export type AvatarFamily = "aggressive" | "cautious" | "adaptable";
export type AvatarDiet = "herbivore" | "carnivore" | "omnivore";
export type WornTrait = "gills" | "fins" | "claws" | "roar" | "burrow" | "toolUse" | "fullArmor" | "iceBreath";
export interface WornStrip { trait: WornTrait; layer: "back" | "front" }
export interface AvatarLook { family: AvatarFamily; diet: AvatarDiet; worn: WornTrait[] }

export const AVATAR_FAMILIES: readonly AvatarFamily[] = ["aggressive", "cautious", "adaptable"];
export const AVATAR_DIETS: readonly AvatarDiet[] = ["herbivore", "carnivore", "omnivore"];

/** Sheet layout. Frames match the legacy walker: idle 0-3, walk 4-7, jump 8-11, bite 12-15, crouch 16-19. */
export const HD_AVATAR = { cell: 96, display: 32, frames: 20, bodyColumns: 4, wornColumns: 8, version: 1 } as const;

/** Overlay strips in draw order, bottom to top. Back strips sit behind the body sprite, front strips above it. */
export const WORN_STRIPS: readonly WornStrip[] = [
  { trait: "fullArmor", layer: "back" },
  { trait: "fins", layer: "front" }, { trait: "roar", layer: "front" }, { trait: "burrow", layer: "front" },
  { trait: "fullArmor", layer: "front" }, { trait: "iceBreath", layer: "front" }, { trait: "gills", layer: "front" },
  { trait: "toolUse", layer: "front" }, { trait: "claws", layer: "front" },
];

export const bodyKey = (family: AvatarFamily, diet: AvatarDiet): string => `creatureHd_${family}_${diet}`;
const PAINTED_DIETS: Readonly<Record<AvatarFamily, readonly AvatarDiet[]>> = {
  aggressive: ["herbivore", "carnivore", "omnivore"],
  cautious: ["herbivore", "carnivore", "omnivore"],
  adaptable: ["herbivore", "carnivore", "omnivore"],
};
export const paintedAvatar = (family: AvatarFamily, diet: AvatarDiet): boolean => PAINTED_DIETS[family].includes(diet);
const paintedWornName = (family: AvatarFamily, diet: AvatarDiet): string =>
  family === "aggressive" && diet === "carnivore" ? "aggressive_painted_worn" : family + "_" + diet + "_painted_worn";
export const wornKey = (family: AvatarFamily, diet?: AvatarDiet): string => diet && paintedAvatar(family, diet) ? "creatureHd_" + paintedWornName(family, diet) : `creatureHd_${family}_worn`;
export const bodyFrameCount = (family: AvatarFamily, diet: AvatarDiet): number => HD_AVATAR.frames + (paintedAvatar(family, diet) ? HD_AVATAR.bodyColumns : 0);
export const bodyPath = (family: AvatarFamily, diet: AvatarDiet): string =>
  `assets/art/creature_hd_${family}_${diet}_v${paintedAvatar(family, diet) ? 2 : HD_AVATAR.version}.webp`;
export const wornPath = (family: AvatarFamily, diet?: AvatarDiet): string => diet && paintedAvatar(family, diet) ? "assets/art/creature_hd_" + paintedWornName(family, diet) + "_v1.webp" : `assets/art/creature_hd_${family}_worn_v${HD_AVATAR.version}.webp`;
/** Frame index inside a family's worn atlas for strip `strip` and pose frame `frame` (0..19). */
export const wornFrame = (strip: number, frame: number): number => strip * HD_AVATAR.frames + frame;
export const PAINTED_SWIM_TRAITS = ["roar", "gills", "burrow"] as const;
export const wornFrameCount = (painted = false): number =>
  WORN_STRIPS.length * HD_AVATAR.frames + (painted ? PAINTED_SWIM_TRAITS.length * HD_AVATAR.bodyColumns : 0);
export function paintedSwimWornFrame(strip: number, frame: number): number {
  const trait = PAINTED_SWIM_TRAITS.findIndex(candidate => candidate === WORN_STRIPS[strip].trait);
  return trait < 0 ? wornFrame(strip, frame) : wornFrameCount() + trait * HD_AVATAR.bodyColumns + frame % HD_AVATAR.bodyColumns;
}

/** Strongest temperament share; ties go aggressive, then cautious, then adaptable (as aquatic bodyLook). */
export function avatarFamily(pct: Partial<Record<AvatarFamily, number>>): AvatarFamily {
  let best: AvatarFamily = "aggressive";
  for (const f of ["cautious", "adaptable"] as const) if ((pct[f] ?? 0) > (pct[best] ?? 0)) best = f;
  return best;
}

/** Unknown or missing diets fall back to omnivore, the creature stage's standalone default. */
export const avatarDiet = (diet: string | undefined): AvatarDiet =>
  (AVATAR_DIETS as readonly string[]).includes(diet ?? "") ? diet as AvatarDiet : "omnivore";

/** The inputs the avatar reads from creature traits. `parts` is reserved for inherited grotto parts. */
export interface LookTraits { diet: string; climb: boolean; gills?: boolean; fins?: boolean; classSkills?: readonly string[]; parts?: readonly string[] }
const CLASS_TRAIT: Record<string, WornTrait> = { roar: "roar", burrow: "burrow", tool: "toolUse" };

/** Worn traits in WORN_STRIPS order, so stacking order never depends on how the lineage gained them. */
export function wornTraits(t: LookTraits): WornTrait[] {
  const have = new Set<WornTrait>();
  if (t.gills) have.add("gills");
  if (t.fins) have.add("fins");
  if (t.climb) have.add("claws");
  for (const c of t.classSkills ?? []) if (CLASS_TRAIT[c]) have.add(CLASS_TRAIT[c]);
  for (const p of t.parts ?? []) if (p === "fullArmor" || p === "iceBreath") have.add(p);
  const order: WornTrait[] = [];
  for (const s of WORN_STRIPS) if (have.has(s.trait) && !order.includes(s.trait)) order.push(s.trait);
  return order;
}

export function avatarLook(pct: Partial<Record<AvatarFamily, number>>, t: LookTraits): AvatarLook {
  return { family: avatarFamily(pct), diet: avatarDiet(t.diet), worn: wornTraits(t) };
}

/** Indices of the overlay strips a look needs, split by layer, in draw order. */
export function lookStrips(look: AvatarLook): { back: number[]; front: number[] } {
  const back: number[] = [], front: number[] = [];
  WORN_STRIPS.forEach((s, i) => { if (look.worn.includes(s.trait)) (s.layer === "back" ? back : front).push(i); });
  return { back, front };
}
export const lookKey = (l: AvatarLook): string => `${l.family}/${l.diet}/${l.worn.join(",")}`;

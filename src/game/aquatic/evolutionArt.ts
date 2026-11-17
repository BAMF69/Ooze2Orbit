// Authored body variants. Equipment fitting is tracked separately from body-art completion.
import catalog from './evolutionBodies.json';
import type { AqCreature, Diet, LookFamily } from './creature';
import type { BodyRig } from './avatarRig';
export interface EvolutionSheet { key:string;file:string;rects:number[][];offsets:number[][] }
export interface EvolutionProfile {
  family:LookFamily;form:number;label:string;bodies:Record<Diet,EvolutionSheet>;rig:BodyRig;
  attachmentStatus:'provisional'|'reviewed';
}
interface Catalog {version:1;profiles:Record<string,EvolutionProfile>}
export const EVOLUTION_CATALOG=catalog as unknown as Catalog;
export const EVOLUTION_FAMILIES=['aggressive','adaptable','cautious'] as const;
export function familyForLook(look:string):LookFamily {
  return look.startsWith('c')?'cautious':look.startsWith('a')?'adaptable':'aggressive';
}
export function evolutionProfile(family:LookFamily,form:number):EvolutionProfile|undefined {
  return EVOLUTION_CATALOG.profiles[`${family}:${form}`];
}
export function evolutionSheet(c:AqCreature,look:string):EvolutionSheet|undefined {
  return evolutionProfile(familyForLook(look),c.form)?.bodies[c.diet];
}

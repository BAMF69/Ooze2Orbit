import { evolutionSheet } from './evolutionArt';
// Presentation only. Diet, temperament and maturity select art without changing the saved organism.
import type { AqCreature } from './creature';

export const ADAPTABLE_DIETS = ['herbivore', 'carnivore', 'omnivore'] as const;
export const adaptableBody = (c: AqCreature, look: string): boolean => c.form >= 3 && look.startsWith('a');
export const illustratedBody=(c:AqCreature,look:string):boolean=>!!evolutionSheet(c,look)||adaptableBody(c,look);
export function avatarTexture(c: AqCreature, look: string): string {
  const authored=evolutionSheet(c,look);if(authored)return authored.key;
  return adaptableBody(c, look) ? `aqAdaptable-${c.diet}HD` : `aqPlayer-${c.diet}`;
}

export type AnatomyView = 'front' | 'side' | 'back';

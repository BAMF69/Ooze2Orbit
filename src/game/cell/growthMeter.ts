// Four forms, retaining the existing three food gates; final form is fully grown with no new gate.
import { evolveNeed, type Creature } from "./rules";
export const DIET_COLORS = { herbivore: "#8bd77d", carnivore: "#ef716a", omnivore: "#72b6f1" } as const;
export function growthSections(c: Creature): number[] {
  const need = evolveNeed(c);
  return [1, 2, 3, 4].map(form => form < c.form || c.form === 4 ? 1 : form === c.form ? Math.max(0, Math.min(1, c.food / need)) : 0);
}

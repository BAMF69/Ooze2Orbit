// Purpose: Blend the inherited temperament shares into a civilization-only HUD palette.
// Diet remains independent. No save fields are changed by presentation.
export interface CivTemperament { cautious: number; aggressive: number; adaptable: number }
const PALETTE = { cautious: [40, 215, 187], aggressive: [244, 133, 83], adaptable: [179, 144, 244] } as const;
export function civTheme(shares: CivTemperament): Record<string, string> {
  const kinds = ["cautious", "aggressive", "adaptable"] as const;
  const weights = kinds.map(k => Number.isFinite(shares[k]) ? Math.max(0, shares[k]) : 0);
  const total = weights.reduce((a, b) => a + b, 0);
  // A balanced lineage keeps the luminous lagoon palette. Only a clear leading
  // temperament tints it; equal shares must not average complementary colors into grey.
  const order = weights.map((weight, i) => ({ weight, kind: kinds[i] })).sort((a, b) => b.weight - a.weight);
  const leaning = total ? (order[0].weight - order[1].weight) / total : 0;
  const lagoon = [40, 215, 187];
  const rgb = lagoon.map((value, channel) => Math.round(value + (PALETTE[order[0].kind][channel] - value) * leaning));
  const color = (scale: number, lift = 0) => `rgb(${rgb.map(v => Math.round(v * scale + lift)).join(" ")})`;
  return { accent: color(1), glow: color(.65), deep: color(.13, 8), surface: color(.22, 7), soft: color(.32, 160) };
}

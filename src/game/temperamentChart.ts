// Shared chart uses actual normalized temperament shares; diet is a separate displayed trait.
// Authored: Written with Codex for Ooze2Orbit.
import type { Reveal } from "./aquatic/reveal";
import { temperamentWord } from "./aquatic/reveal";
export const TEMPER_COLORS = { aggressive: "#ef716a", cautious: "#8bd77d", adaptable: "#72b6f1" } as const;
export function temperamentChart(r: Reveal): HTMLElement {
  const root = document.createElement("div"); root.className = "temperament-chart";
  for (const kind of ["aggressive", "cautious", "adaptable"] as const) {
    const value = r.rows.find(row => row.kind === kind)?.pct ?? 0;
    const row = document.createElement("div"); row.className = `temperament-row ${kind}`;
    row.style.setProperty("--temper-color", TEMPER_COLORS[kind]);
    const label = document.createElement("span"); label.textContent = `${temperamentWord(kind)} ${value}%`;
    const track = document.createElement("div"); track.className = "temperament-track";
    track.setAttribute("role", "meter"); track.setAttribute("aria-label", temperamentWord(kind)); track.setAttribute("aria-valuemin", "0"); track.setAttribute("aria-valuemax", "100"); track.setAttribute("aria-valuenow", String(value));
    const fill = document.createElement("span"); fill.style.width = `${value}%`; track.append(fill); row.append(label, track); root.append(row);
  }
  const diet = document.createElement("div"); diet.className = `temperament-diet ${r.diet}`;
  diet.textContent = `Diet: ${r.diet}`; root.append(diet); return root;
}

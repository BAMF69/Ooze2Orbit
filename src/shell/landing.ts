// Purpose: Original illustrated game-start composition, independent of game-canvas resolution.
// Authored: Written with Codex; imagegen art is logged as A-0021.
import type { Shell } from "./app";
import { el, tl } from "./ui";
export function gameLogo(shell: Shell): HTMLImageElement {
  const img = el("img", "game-logo"); img.src = "assets/art/ooze2orbit_logo_v1.png";
  img.alt = shell.i18n.t("game.title"); img.draggable = false; return img;
}
export function landing(root: HTMLElement, shell: Shell, start: () => void): void {
  root.classList.add("game-landing");
  const hero = el("div", "landing-content");
  hero.append(tl(shell.i18n, "landing.eyebrow", "landing-eyebrow", {}, "div"), gameLogo(shell),
    tl(shell.i18n, "landing.tagline", "landing-tagline", {}, "div"), tl(shell.i18n, "landing.body", "landing-body", {}, "div"));
  const button = el("button", "landing-start"); button.append(tl(shell.i18n, "landing.start"));
  button.onclick = start;
  hero.append(button, tl(shell.i18n, "landing.input_hint", "landing-input", {}, "div"));
  const journey = el("div", "landing-journey");
  for (const stage of ["cell", "aquatic", "creature", "civilization", "space"]) journey.append(tl(shell.i18n, `landing.${stage}`, "journey-step"));
  root.append(hero, journey);
}

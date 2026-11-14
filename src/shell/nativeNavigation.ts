// Controller navigation for responsive dialogs. Scene actions still execute through their existing buttons.
// Authored: Written with Codex for Ooze2Orbit.
let dispatching = false;
const visible = (el: HTMLElement) => !el.closest("[hidden], [inert]") && getComputedStyle(el).visibility !== "hidden" && el.getClientRects().length > 0;
export function navigateNative(action: string, consume: () => void): boolean {
  if (dispatching) return true; // Button callbacks may inject a scene action; never click recursively.
  const dialogs = [...document.querySelectorAll<HTMLElement>(".stage-modal, .cell-modal, .cell-upgrades")].filter(visible);
  const dialog = dialogs.at(-1); if (!dialog) return false;
  const buttons = [...dialog.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")].filter(visible);
  if (!buttons.length) return false;
  const delta = action === "ui_right" || action === "ui_down" ? 1 : action === "ui_left" || action === "ui_up" ? -1 : 0;
  if (delta) {
    consume();
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = i < 0 ? delta > 0 ? 0 : buttons.length - 1 : (i + delta + buttons.length) % buttons.length;
    buttons[next].focus(); buttons[next].scrollIntoView({ block: "nearest" }); return true;
  }
  if (action !== "ui_accept") return false;
  consume();
  const b = buttons.includes(document.activeElement as HTMLButtonElement) ? document.activeElement as HTMLButtonElement : buttons[0];
  dispatching = true; try { b.click(); } finally { dispatching = false; } return true;
}

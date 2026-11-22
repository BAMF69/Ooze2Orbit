// ---------------------------------------------------------------------------
// touchLayoutEditor.ts
// Purpose : Settings -> Controls -> Touch layout. Shows the real touch controls above the paused game (or a
//           d-pad preview from the main menu); drag the stick or the buttons to move them, and use the panel
//           to resize each group and set stick sensitivity. Done saves touch_layout.json; Back discards.
// Why     : Playtest 2026-11-21: small-phone players found the stick too small and too sensitive.
// Usage   : shell.push(touchLayoutEditor(shell))   // from the settings screen
// Notes   : Panel rows are normal shell menu items, so keyboard and controller can also resize/reset.
//           Dragging is touch/mouse only (TouchControls edit mode). Opened from pause in a stage, the edit
//           shows that stage's exact positions; from the main menu it previews the aquatic d-pad.
// ---------------------------------------------------------------------------
import { atomicWrite } from "../core/atomicFile";
import { Log } from "../core/log";
import { TOUCH_LAYOUT, TOUCH_LAYOUT_FILE, defaultTouchLayout, stepDeadzone, stepScale, touchLayoutText, type TouchLayout } from "../core/touchLayout";
import type { Screen, Shell } from "./app";
import { TouchControls, setTouchLayout, touchLayout } from "./touchControls";
import { Menu, buttonItem, el, tl, valueRow } from "./ui";

/** The aquatic d-pad, for previews outside a stage (main menu -> Settings). */
export function previewActions(shell: Shell) {
  const t = (k: string) => shell.i18n.t(k);
  return [
    { label: t("touch.dpad_up"), action: "rise", slot: "up" as const },
    { label: t("touch.dpad_down"), action: "sink", slot: "down" as const },
    { label: t("display.dash"), action: "dash", slot: "left" as const },
    { label: t("touch.sprint"), action: "pace", slot: "right" as const },
  ];
}

export function touchLayoutEditor(shell: Shell): Screen {
  const before: TouchLayout = structuredClone(touchLayout());
  const root = el("section", "screen touch-layout-screen");
  root.dataset.screen = "touch_layout";
  let preview: TouchControls | null = null;
  let controls: TouchControls | null = null;
  const pct = (v: number) => `${Math.round(v * 100)} %`;
  // Sensitivity is shown the way players think about it: higher = reacts to a smaller thumb movement.
  const sensitivity = (dz: number) => `${Math.round((1 - (dz - TOUCH_LAYOUT.minDeadzone) / (TOUCH_LAYOUT.maxDeadzone - TOUCH_LAYOUT.minDeadzone)) * 100)} %`;
  const close = (keep: boolean) => {
    if (keep) {
      try { atomicWrite(shell.store, TOUCH_LAYOUT_FILE, touchLayoutText(touchLayout())); Log.info("touch", `layout saved ${JSON.stringify(touchLayout())}`); }
      catch (err) { Log.warn("touch", `touch layout not saved: ${String(err)}`); }
    } else setTouchLayout(before);
    shell.back();
  };
  const s: Screen = { id: "touch_layout", root, cancel: () => close(false) };
  s.enter = () => {
    document.body.classList.add("touch-layout-editing");
    controls = TouchControls.live;
    if (!controls) {
      preview = new TouchControls(shell.input, previewActions(shell));
      preview.root.classList.add("aquatic-touch", "touch-preview");
      controls = preview;
    }
    controls.edit(() => {}); // dragging changes nothing the panel shows
  };
  s.leave = () => {
    document.body.classList.remove("touch-layout-editing");
    controls?.edit(null);
    preview?.destroy(); preview = null; controls = null;
  };
  s.render = () => {
    root.replaceChildren();
    const menu = new Menu(); s.menu = menu;
    const p = el("div", "panel touch-layout-panel"); p.dataset.box = "";
    p.append(tl(shell.i18n, "touch_layout.title", "heading", {}, "div"), tl(shell.i18n, "touch_layout.hint", "muted", {}, "div"));
    const row = (key: string, get: () => string, step: (d: number) => TouchLayout) => {
      const r = valueRow(shell.i18n, key, () => { setTouchLayout(step(-1)); draw(); }, () => { setTouchLayout(step(1)); draw(); });
      const draw = () => r.set(get(), false); draw();
      p.append(menu.add(r.item).el);
    };
    row("touch_layout.stick_size", () => pct(touchLayout().stick.scale), d => stepScale(touchLayout(), "stick", d));
    row("touch_layout.button_size", () => pct(touchLayout().buttons.scale), d => stepScale(touchLayout(), "buttons", d));
    // Right = more sensitive = smaller dead zone.
    row("touch_layout.sensitivity", () => sensitivity(touchLayout().deadzone), d => stepDeadzone(touchLayout(), -d));
    const actions = el("div", "touch-layout-actions");
    actions.append(
      menu.add(buttonItem(shell.i18n, "touch_layout.reset", () => { setTouchLayout(defaultTouchLayout()); s.render?.(); })).el,
      menu.add(buttonItem(shell.i18n, "touch_layout.cancel", () => close(false))).el,
      menu.add(buttonItem(shell.i18n, "touch_layout.done", () => close(true))).el,
    );
    p.append(actions);
    root.append(p);
    menu.render();
  };
  s.render();
  return s;
}
// ---------------------------------------------------------------------------

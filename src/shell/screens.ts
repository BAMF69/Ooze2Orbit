// ---------------------------------------------------------------------------
// screens.ts
// Purpose : The front end's screens, built in code: boot, title (with the one-time telemetry question),
//           main menu, credits, loading, the gameplay HUD (play and juice demo), pause, quit and crash.
//           The settings screen lives in settingsScreen.ts.
// Usage   : shell.reset(screens.title(shell)) ; shell.push(screens.pause(shell)) ...
// Notes   : Browser only (DOM). Every string goes through tl() (tr) or val() (data), every panel is a
//           [data-box] for the pseudo-locale check. ui_cancel goes back one screen everywhere it can.
//           CREDITS.md at the project root (if present) is bundled and scrolls on the credits screen.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import { glyphName, glyphSet, promptBinding } from "../core/bindings";
import type { GameKey, Screen, Shell } from "./app";
import { GAME_VERSION } from "./meta";
import { settingsScreen } from "./settingsScreen";
import { navigateNative } from "./nativeNavigation";
import { landing, gameLogo } from "./landing";
import { uiIcon, type UiIcon } from "../game/uiIcons";
import { exportSaves, hasRun, importSaves } from "./saveFiles";
import { Menu, buttonItem, el, glyph, tl, val } from "./ui";

// ---- Tunables ----------------------------------------------------------------
const LOADING_MIN_S = 0.6; // the bar is visible at least this long (no flash of a loading screen)
const CREDITS_SPEED = 24; // pixels per second of auto-scroll (0 with reduce motion)
const HUD_ACTIONS = ["move_left", "move_right", "jump", "attack", "interact", "pause"];

const credits = import.meta.glob("/CREDITS.md", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

function screenEl(id: string, cls = "dim"): HTMLElement {
  const s = el("section", ("screen " + cls).trim());
  s.dataset.screen = id;
  return s;
}

function panel(cls = ""): HTMLElement {
  const p = el("div", ("panel " + cls).trim());
  p.dataset.box = "";
  return p;
}

/** A screen whose content is rebuilt by build() (on language change too). */
function built(id: string, cls: string, build: (root: HTMLElement, menu: Menu) => void, extra: Partial<Screen> = {}): Screen {
  const root = screenEl(id, cls);
  const s: Screen = { id, root, ...extra };
  s.render = () => {
    root.replaceChildren();
    s.menu = new Menu();
    build(root, s.menu);
    s.menu.render();
  };
  s.render();
  return s;
}

export function boot(shell: Shell): Screen {
  return built("boot", "dim", (root) => {
    root.append(tl(shell.i18n, "boot.loading", "press muted", {}, "div"));
  });
}

export function title(shell: Shell): Screen {
  const s = built("title", "", (root) => {
    landing(root, shell, () => { if (shell.topId === "title") shell.replace(menu(shell)); });
    root.append(tl(shell.i18n, "version", "corner", { v: GAME_VERSION }, "div"));
  }, {
    onAnyPress: () => {
      shell.replace(menu(shell));
      return true;
    },
    enter: () => {
      if (shell.settings.telemetry.consent === "unset" && !shell.consentAsked) {
        shell.consentAsked = true; // once per launch while undecided ("Later" asks again next time)
        queueMicrotask(() => shell.push(consent(shell)));
      }
    },
  });
  return s;
}

export function consent(shell: Shell): Screen {
  const choose = (value: "yes" | "no" | "unset") => {
    shell.settings.telemetry.consent = value;
    if (value !== "unset") shell.saveSettings();
    shell.back();
  };
  return built("consent", "dim", (root, m) => {
    const p = panel("narrow");
    p.append(tl(shell.i18n, "consent.title", "heading", {}, "div"), tl(shell.i18n, "consent.body", "text", {}, "div"));
    const row = el("div", "row");
    m.horizontal = true; // a row of buttons: left/right move between them too
    for (const [key, value] of [["consent.yes", "yes"], ["consent.no", "no"], ["consent.later", "unset"]] as const) {
      row.append(m.add(buttonItem(shell.i18n, key, () => choose(value))).el);
    }
    p.append(row);
    root.append(p);
  }, { cancel: () => choose("unset") });
}

export function menu(shell: Shell): Screen {
  return built("menu", "dim", (root, m) => {
    root.classList.add("game-menu");
    const p = panel("narrow");
    p.append(gameLogo(shell));
    const list = el("div", "list");
    const stages = el("div", "stage-select-grid"); m.horizontal = true;
    const add = (key: string, fn: () => void) => list.append(m.add(buttonItem(shell.i18n, key, fn)).el);
    if (hasRun(shell)) add("menu.continue", () => shell.continueAquatic()); // 2026-11-09: pick up where you left off
    for (const [id, game, label, icon] of [
      ["menu.play", "main", "cell", "cell"], ["menu.aquatic", "aquatic", "aquatic", "aquatic"],
      ["menu.creature", "creature", "creature", "creature"], ["menu.civ", "civ", "civilization", "civ"],
      ["menu.space", "space", "space", "space"],
    ] as const) {
      const item = buttonItem(shell.i18n, `landing.${label}`, () => shell.startGame(game), id);
      item.el.classList.add("stage-select-card"); item.el.dataset.stage = game;
      item.el.prepend(uiIcon(icon as UiIcon)); stages.append(m.add(item).el);
    }
    add("menu.export", () => exportSaves(shell));
    add("menu.import", () => importSaves(shell, () => shell.reset(menu(shell))));
    add("menu.settings", () => shell.push(settingsScreen(shell)));
    add("menu.credits", () => shell.push(creditsScreen(shell)));
    if (shell.debugBuild) add("menu.juice", () => shell.startGame("juice"));
    add("menu.quit", () => shell.quit());
    p.append(stages, list);
    if (shell.drive === "pseudo-plant") {
      const planted = tl(shell.i18n, "menu.settings", "label", {}, "div"); // a label far too small for its text
      planted.dataset.id = "drive.planted_label";
      planted.style.width = "2.5em";
      p.append(planted);
    }
    root.append(p, tl(shell.i18n, "version", "corner", { v: GAME_VERSION }, "div"));
  }, { cancel: () => shell.reset(title(shell)) });
}

export function creditsScreen(shell: Shell): Screen {
  let box: HTMLElement | null = null;
  return built("credits", "dim", (root, m) => {
    const p = panel();
    p.append(tl(shell.i18n, "credits.title", "heading", {}, "div"));
    box = el("div", "credits");
    const text = Object.values(credits)[0];
    box.append(text ? val(text, "credits-body", "credits.body") : tl(shell.i18n, "credits.placeholder", "credits-body", {}, "div"));
    p.append(box, m.add(buttonItem(shell.i18n, "credits.back", () => shell.back())).el);
    root.append(p);
  }, {
    cancel: () => shell.back(),
    onAction: (a) => {
      if (!box || (a !== "ui_up" && a !== "ui_down")) return false;
      box.scrollTop += a === "ui_down" ? 40 : -40;
      return true;
    },
    tick: (dt) => {
      if (!box || shell.settings.access.reduce_motion) return;
      box.scrollTop += CREDITS_SPEED * dt;
      if (box.scrollTop + box.clientHeight >= box.scrollHeight - 1) box.scrollTop = 0;
    },
  });
}

export function loading(shell: Shell, key: GameKey): Screen {
  let fill: HTMLElement | null = null;
  let pct: HTMLElement | null = null;
  let t = 0;
  let loaded = 0;
  let created = false;
  const s = built("loading", "dim", (root) => {
    const p = panel("narrow");
    const bar = el("div", "bar");
    fill = el("div", "fill");
    bar.append(fill);
    pct = val("0 %", "muted");
    p.append(tl(shell.i18n, "loading.title", "heading", {}, "div"), bar, pct);
    root.append(p);
  }, {
    enter: () => {
      const game = shell.game;
      if (!game || created) return;
      const scene = game.scene.getScene(key);
      const onProgress = (v: number) => (loaded = v);
      scene.load.on("progress", onProgress);
      scene.events.once("create", () => {
        scene.load.off("progress", onProgress);
        loaded = 1;
        created = true;
      });
      game.scene.start(key);
    },
    tick: (dt) => {
      t += dt;
      const shown = Math.min(loaded, t / LOADING_MIN_S, 1);
      if (fill) fill.style.width = `${Math.round(shown * 100)}%`;
      if (pct) pct.textContent = `${Math.round(shown * 100)} %`;
      if (created && shown >= 1) shell.enterGame(key);
    },
  });
  return s;
}

/** The HUD over a running scene: prompts with glyphs for the current device. */
export function gameplay(shell: Shell, key: GameKey): Screen {
  let lastSet = "";
  let updateFullscreen = () => {};
  const s = built(key === "juice" ? "juice" : "play", "hud", (root) => { // both stages are "play": scenes gate input on it
    const hud = el("div", "hudbar");
    const set = glyphSet(shell.settings.input.glyphs, shell.input.promptDevice);
    lastSet = set;
    for (const action of key === "juice" ? HUD_ACTIONS : ["pause"]) {
      const pr = el("span", "prompt");
      pr.append(glyph(shell.i18n, glyphName(set, promptBinding(shell.settings.input.bindings, action, set))), tl(shell.i18n, `action.${action}`, ""));
      hud.append(pr);
    }
    root.append(hud);
    if (key !== "juice") {
      hud.classList.add("cell-toolbar");
      hud.replaceChildren();
      const pauseButton = el("button", "display-control"); pauseButton.textContent = shell.i18n.t("action.pause");
      pauseButton.dataset.tr = "action.pause";
      pauseButton.onclick = () => { pauseButton.blur(); shell.pauseGame(); };
      const full = el("button", "display-control");
      const update = () => { full.dataset.tr = document.fullscreenElement ? "display.exit_fullscreen" : "display.fullscreen"; full.textContent = shell.i18n.t(full.dataset.tr); };
      updateFullscreen = update;
      update(); full.disabled = !document.fullscreenEnabled;
      full.onclick = (event) => { shell.settings.display.mode = document.fullscreenElement ? "windowed" : "fullscreen"; shell.applyDisplayMode(); if (event.detail > 0) full.blur(); };
      full.onpointerenter = update; full.onfocus = update;
      hud.append(pauseButton, full);
    }
  }, {
    gameplay: true,
    onAction: (a) => {
      if (shell.input.scheme === "controller" && ["ui_up", "ui_down", "ui_left", "ui_right", "ui_accept"].includes(a)) {
        if (navigateNative(a, () => shell.input.clearPresses())) return true;
      }
      const focused = document.activeElement;
      if (key !== "juice" && (a === "ui_accept" || a === "jump") && focused instanceof HTMLElement &&
        focused.matches("button, summary") && focused.getClientRects().length > 0 && getComputedStyle(focused).visibility !== "hidden" && !focused.closest("[hidden], [inert]") && focused.closest(".cell-ui-layer, .cell-toolbar, .stage-ui-layer")) {
        shell.input.clearPresses(); focused.click(); return true;
      }
      if (a !== "pause") return false;
      shell.pauseGame();
      return true;
    },
    tick: () => {
      // prompts follow the last device used (keyboard <-> gamepad)
      if (glyphSet(shell.settings.input.glyphs, shell.input.promptDevice) !== lastSet) shell.rerender();
    },
  });
  if (key !== "juice") {
    const changed = () => updateFullscreen(); document.addEventListener("fullscreenchange", changed);
    s.leave = () => document.removeEventListener("fullscreenchange", changed);
  }
  return s;
}

export function pause(shell: Shell): Screen {
  return built("pause", "dim", (root, m) => {
    const p = panel("narrow");
    p.append(tl(shell.i18n, "pause.title", "heading", {}, "div"));
    if (shell.displayPause) p.append(el("p", "display-pause-note"));
    const note = p.querySelector(".display-pause-note");
    if (note instanceof HTMLElement) { note.dataset.tr = "display.rotated"; note.textContent = shell.i18n.t("display.rotated"); }
    const list = el("div", "list");
    list.append(
      m.add(buttonItem(shell.i18n, "pause.resume", () => shell.resumeGame())).el,
      m.add(buttonItem(shell.i18n, "pause.settings", () => shell.push(settingsScreen(shell)))).el,
      m.add(buttonItem(shell.i18n, "pause.quit", () => shell.quitToTitle())).el,
    );
    p.append(list);
    root.append(p);
  }, { cancel: () => shell.resumeGame() });
}

export function quit(shell: Shell): Screen {
  return built("quit", "dim", (root, m) => {
    const p = panel("narrow");
    p.append(tl(shell.i18n, "quit.title", "heading", {}, "div"), tl(shell.i18n, "quit.body", "text", {}, "div"));
    p.append(m.add(buttonItem(shell.i18n, "quit.again", () => shell.reset(title(shell)))).el);
    root.append(p);
  });
}

export function crashed(shell: Shell, file: string): Screen {
  return built("crash", "dim", (root) => {
    const p = panel("narrow");
    p.append(tl(shell.i18n, "crash.title", "heading", {}, "div"), tl(shell.i18n, "crash.body", "text", { file }, "div"));
    root.append(p);
  });
}

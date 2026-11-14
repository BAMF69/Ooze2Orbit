// Shared device policy, old-settings migration and independent held inputs.
import { describe, it, expect } from "vitest";
import { ControlIntent, stickDirections } from "../src/core/controlScheme";
import { settingsLoad, settingsText, defaultSettings } from "../src/core/settings";
import { ShellInput } from "../src/shell/input";
import { defaultBindings } from "../src/core/bindings";
describe("control schemes", () => {
  it("starts by pointer capability and ignores isolated accidental taps", () => {
    const p = new ControlIntent(false); expect(p.resolve("auto")).toBe("keyboard");
    p.observe("touch", 10, false); expect(p.resolve("auto")).toBe("keyboard");
    p.observe("touch", 500, false); expect(p.resolve("auto")).toBe("touch");
    p.observe("controller", 600); p.observe("touch", 700, false); expect(p.resolve("auto")).toBe("controller");
    p.observe("touch", 3000, true); expect(p.resolve("auto")).toBe("touch");
    expect(new ControlIntent(true).resolve("auto")).toBe("touch");
  });
  it("honors overrides, retains detection, and falls back when a pad disconnects", () => {
    const p = new ControlIntent(true); p.observe("controller", 1);
    expect(p.resolve("keyboard")).toBe("keyboard"); expect(p.resolve("auto")).toBe("controller");
    p.disconnected(); expect(p.resolve("auto")).toBe("touch");
    expect(p.resolve("controller")).toBe("controller");
  });
  it("migrates old settings to Auto and validates and persists overrides", () => {
    const old = defaultSettings(); delete (old.input as Record<string, unknown>).scheme;
    expect(settingsLoad(JSON.stringify(old)).settings.input.scheme).toBe("auto");
    old.input.scheme = "touch"; expect(settingsLoad(settingsText(old)).settings.input.scheme).toBe("touch");
    old.input.scheme = "unknown"; expect(settingsLoad(settingsText(old)).problems).toContain("input.scheme");
  });
  it("uses a deadzone and diagonal directions for the thumb stick", () => {
    expect(stickDirections(.1, -.1)).toEqual([]); expect(stickDirections(.8, -.7)).toEqual(["move_right", "move_up"]);
  });
  it("releases only the intended virtual source and clears everything on transitions", () => {
    const i = new ShellInput(defaultBindings, () => .2);
    i.hold("stick", ["move_right"]); i.hold("button", ["jump"]);
    expect(i.takePress("jump")).toBe(true); expect(i.takePress("jump")).toBe(false);
    i.hold("button", ["jump"]); expect(i.takePress("jump")).toBe(false);
    i.releaseVirtual("button"); expect(i.isDown("jump")).toBe(false); expect(i.isDown("move_right")).toBe(true);
    i.clearHeld(); expect(i.isDown("move_right")).toBe(false); expect(i.takePress("move_right")).toBe(false);
    expect(i.actionsFor("pad_axis:leftx-")).toContain("move_left");
  });
});

// Input intent is independent of viewport size. Passive pointer movement cannot change a scheme.
// Authored: Written with Codex for Ooze2Orbit.
export const CONTROL_SCHEMES = ["auto", "keyboard", "touch", "controller"] as const;
export type ControlScheme = Exclude<typeof CONTROL_SCHEMES[number], "auto">;
export const CONTROL = { touchRepeatMs: 1000, dragIntent: 16, stickDeadzone: 0.18, stickRadius: 44 };
export class ControlIntent {
  detected: ControlScheme;
  private lastTap = -Infinity;
  constructor(readonly coarse: boolean) { this.detected = coarse ? "touch" : "keyboard"; }
  observe(scheme: ControlScheme, now: number, deliberate = true): void {
    if (scheme !== "touch") this.lastTap = -Infinity;
    if (scheme === "touch" && !deliberate) {
      const repeated = now - this.lastTap < CONTROL.touchRepeatMs; this.lastTap = now;
      if (!repeated) return;
    }
    this.detected = scheme;
  }
  resolve(preference: string): ControlScheme {
    return preference === "touch" || preference === "keyboard" || preference === "controller" ? preference : this.detected;
  }
  disconnected(): void { if (this.detected === "controller") this.detected = this.coarse ? "touch" : "keyboard"; }
}
export function stickDirections(x: number, y: number): string[] {
  const a: string[] = [], dz = CONTROL.stickDeadzone;
  if (x < -dz) a.push("move_left"); if (x > dz) a.push("move_right");
  if (y < -dz) a.push("move_up"); if (y > dz) a.push("move_down");
  return a;
}

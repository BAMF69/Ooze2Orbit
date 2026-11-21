// ---------------------------------------------------------------------------
// surfaceBreach.ts
// Purpose : Touch d-pad "up" doubles as breach: holding up rises, and arriving at (or pressing up at) the
//           surface breaches once. Release up to arm the next breach, so a held thumb does not bounce out of
//           the water again and again after each splash.
// Why     : Playtest 2026-11-21: the separate Breach button was not intuitive; players expect "up at the top
//           = jump out". Keyboard and controller keep their own jump binding; this is only fed by the d-pad.
// Usage   : const b = new SurfaceBreach(); if (b.update(heldUp, atSurface, airborne)) doJump = true;
// Notes   : Engine-free (Vitest: tests/touchControls.test.ts). reset() on pause, menus and stage exits.
// ---------------------------------------------------------------------------
export class SurfaceBreach {
  private armed = true;
  /** True on the one frame a breach should start. */
  update(heldUp: boolean, atSurface: boolean, airborne: boolean): boolean {
    if (!heldUp) { this.armed = true; return false; }
    if (!this.armed || airborne || !atSurface) return false;
    this.armed = false;
    return true;
  }
  reset(): void { this.armed = true; }
}
// ---------------------------------------------------------------------------

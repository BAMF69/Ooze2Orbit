// Space-specific gestures feed the existing turn, thrust, strafe and brake controls.
import type { Controls } from "./combat";

const DEAD_ZONE = 12;
const FULL_TRAVEL = 48;

export function flightGesture(pad: "helm" | "thrusters", dx: number, dy: number): Partial<Controls> {
  const axis = (value: number) => Math.sign(value) * Math.min(1, Math.max(0, (Math.abs(value) - DEAD_ZONE) / (FULL_TRAVEL - DEAD_ZONE)));
  if (pad === "helm") return { turn: axis(dx), thrust: Math.max(0, axis(-dy)) };
  // Dominant direction keeps a diagonal swipe from engaging both secondary thrusters.
  if (Math.abs(dx) > Math.abs(dy)) return { strafe: axis(dx) };
  return { thrust: dy > DEAD_ZONE ? -axis(dy) : 0 };
}

export class SpaceTouchFlight {
  private root = document.createElement("div");
  private listeners = new AbortController();
  private helm: Partial<Controls> = {};
  private thrusters: Partial<Controls> = {};
  private fire = false;
  private brake = false;
  private cancelPointers: (() => void)[] = [];

  constructor(host: HTMLElement, private enabled: () => boolean) {
    this.root.className = "space-touch-flight";
    this.root.hidden = true;
    this.pad("helm", "Helm", "Drag up to thrust, left or right to turn", (dx, dy) => { this.helm = flightGesture("helm", dx, dy); });
    this.pad("thrusters", "Thrusters", "Swipe sideways to strafe, down to reverse. Hold to sustain.", (dx, dy) => { this.thrusters = flightGesture("thrusters", dx, dy); });
    this.control("Brake", "Hold to brake", held => { this.brake = held; });
    this.control("Fire", "Hold to fire forward guns", held => { this.fire = held; });
    host.append(this.root);
    const { signal } = this.listeners;
    window.addEventListener("blur", () => this.clear(), { signal });
    window.addEventListener("resize", () => this.clear(), { signal });
    document.addEventListener("visibilitychange", () => this.clear(), { signal });
  }

  private pad(id: string, label: string, hint: string, move: (dx: number, dy: number) => void): void {
    this.control(label, hint, (held, dx, dy) => move(held ? dx : 0, held ? dy : 0), id);
  }

  private control(label: string, hint: string, update: (held: boolean, dx: number, dy: number) => void, id = label.toLowerCase()): void {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.flight = id;
    button.textContent = label;
    button.setAttribute("aria-label", label + ". " + hint);
    this.root.append(button);
    let pointer: number | null = null;
    let x = 0, y = 0;
    const clear = () => {
      const previous = pointer;
      pointer = null;
      if (previous !== null && button.hasPointerCapture(previous)) button.releasePointerCapture(previous);
      update(false, 0, 0);
      delete button.dataset.held;
    };
    this.cancelPointers.push(clear);
    const { signal } = this.listeners;
    button.addEventListener("pointerdown", event => {
      if (event.pointerType !== "touch" || pointer !== null || !this.enabled()) return;
      event.preventDefault();
      pointer = event.pointerId;
      x = event.clientX;
      y = event.clientY;
      button.setPointerCapture(pointer);
      button.dataset.held = "true";
      update(true, 0, 0);
    }, { signal });
    button.addEventListener("pointermove", event => {
      if (event.pointerId === pointer && this.enabled()) update(true, event.clientX - x, event.clientY - y);
    }, { signal });
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
      button.addEventListener(type, event => {
        if ((event as PointerEvent).pointerId === pointer) clear();
      }, { signal });
    }
  }

  clear(): void { this.cancelPointers.forEach(cancel => cancel()); }

  refresh(): void {
    const hidden = !this.enabled();
    if (hidden && !this.root.hidden) this.clear();
    this.root.hidden = hidden;
  }

  read(): Controls {
    return { turn: this.helm.turn ?? 0, thrust: (this.thrusters.thrust || this.helm.thrust) ?? 0,
      strafe: this.thrusters.strafe ?? 0, fire: this.fire, brake: this.brake };
  }

  destroy(): void { this.clear(); this.listeners.abort(); this.root.remove(); }
}

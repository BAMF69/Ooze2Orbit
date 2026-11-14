// Purpose: Shared CSS-pixel status, commands and scrollable dialogs; stage rules/cameras remain in adapters.
// Notes: Updates preserve scroll/focus. All native controls use the same shell actions or scene commands.
import type * as Phaser from "phaser";
import { shell } from "../shell/app";
export interface StageAction { id: string; label: string; run: () => void; disabled?: boolean; icon?: { texture: string; frame: number } }
export const action = (id: string, key: string, label: string): StageAction => ({ id, label, run: () => { shell.input.clearPresses(); shell.input.inject(key); } });
export class StageUi {
  readonly root = document.createElement("div");
  readonly status = document.createElement("div");
  private statusText = document.createElement("span");
  readonly meters = document.createElement("div");
  readonly details = document.createElement("pre");
  readonly message = document.createElement("div");
  readonly footer = document.createElement("div");
  readonly modal = document.createElement("div");
  readonly modalText = document.createElement("div");
  readonly modalActions = document.createElement("div");
  constructor(private scene: Phaser.Scene, chrome = true) {
    this.root.className = "stage-ui-layer"; this.status.className = "stage-status"; this.message.className = "stage-message";
    this.status.append(this.statusText, this.meters);
    const more = document.createElement("details"), summary = document.createElement("summary");
    summary.textContent = shell.i18n.t("display.details"); more.className = "stage-details"; more.append(summary, this.details);
    more.ontoggle = () => shell.input.clearHeld();
    this.footer.className = "stage-footer"; this.modal.className = "stage-modal"; this.modal.hidden = true;
    this.modal.setAttribute("role", "dialog"); this.modal.setAttribute("aria-label", shell.i18n.t("display.panel"));
    const panel = document.createElement("section"); panel.className = "stage-dialog";
    this.modalText.className = "stage-modal-text"; this.modalActions.className = "stage-actions"; panel.append(this.modalText, this.modalActions); this.modal.append(panel);
    if (chrome) this.root.append(this.status, more, this.message, this.footer);
    this.root.append(this.modal); document.body.append(this.root);
    scene.events.once("shutdown", () => this.root.remove());
  }
  setStatus(summary: string, details = summary): void { if (this.statusText.textContent !== summary) this.statusText.textContent = summary; if (this.details.textContent !== details) this.details.textContent = details; }
  setMessage(s: string): void { this.message.hidden = !s; if (this.message.textContent !== s) this.message.textContent = s; }
  actions(actions: readonly StageAction[]): void { this.buttons(this.footer, actions); }
  show(text: string, actions: readonly StageAction[] = []): void {
    this.modal.hidden = false; this.footer.inert = true; if (this.modalText.textContent !== text) this.modalText.textContent = text; this.buttons(this.modalActions, actions);
  }
  hide(): void { this.modal.hidden = true; this.footer.inert = false; }
  get detailsOpen(): boolean { return this.root.querySelector("details")?.open ?? false; }
  private buttons(host: HTMLElement, actions: readonly StageAction[]): void {
    const ids = actions.map(a => a.id).join("|");
    if (host.dataset.actions !== ids) { host.replaceChildren(...actions.map(() => document.createElement("button"))); host.dataset.actions = ids; }
    actions.forEach((a, i) => {
      const b = host.children[i] as HTMLButtonElement;
      const iconKey = a.icon ? `${a.icon.texture}:${a.icon.frame}` : "";
      if (a.icon && b.dataset.icon !== iconKey) {
        const f = this.scene.textures.getFrame(a.icon.texture, a.icon.frame), canvas = document.createElement("canvas"); canvas.width = canvas.height = 64;
        canvas.className = "stage-icon"; canvas.setAttribute("aria-hidden", "true"); const ctx = canvas.getContext("2d");
        if (f && ctx) { ctx.imageSmoothingEnabled = false; ctx.drawImage(f.source.image as CanvasImageSource, f.cutX, f.cutY, f.cutWidth, f.cutHeight, 0, 0, 64, 64); }
        b.replaceChildren(canvas, document.createElement("span")); b.dataset.icon = iconKey;
      }
      if (a.icon) { const span = b.lastElementChild!; if (span.textContent !== a.label) span.textContent = a.label; }
      else if (b.textContent !== a.label) b.textContent = a.label;
      b.disabled = a.disabled ?? false;
      b.dataset.action = a.id;
      b.onclick = e => { if (e.detail > 0) b.blur(); if (shell.topId === "play") a.run(); };
    });
  }
}
// ---------------------------------------------------------------------------

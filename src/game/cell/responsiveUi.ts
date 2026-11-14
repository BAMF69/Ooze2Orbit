// Purpose: Responsive native cell panels. Scene shutdown owns cleanup; preview clocks follow scene updates.
import type * as Phaser from "phaser";
export function cellUi(scene: Phaser.Scene, className: string): HTMLDivElement {
  const root = document.createElement("div"); root.className = `cell-ui-layer ${className}`;
  document.body.append(root); scene.events.once("shutdown", () => root.remove()); return root;
}
export function node<K extends keyof HTMLElementTagNameMap>(tag: K, text = "", className = ""): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag); n.textContent = text; n.className = className;
  if (tag === "button") n.addEventListener("click", e => { if (e instanceof MouseEvent && e.detail > 0) n.blur(); });
  return n;
}
export function preview(scene: Phaser.Scene, parent: HTMLElement, layers: { texture: string; first: number; animated?: boolean }[], decorate?: (ctx: CanvasRenderingContext2D) => void): () => void {
  const size = layers.some(l => l.texture === "cellIllustrated") ? 384 : 96;
  const canvas = node("canvas"); canvas.width = size; canvas.height = size; canvas.className = "cell-preview"; canvas.setAttribute("aria-hidden", "true"); parent.append(canvas);
  const ctx = canvas.getContext("2d");
  const draw = () => {
    if (!ctx) return; ctx.clearRect(0, 0, size, size);
    for (const l of layers) {
      ctx.imageSmoothingEnabled = l.texture === "cellIllustrated";
      const f = scene.textures.getFrame(l.texture, l.first + (l.animated ? Math.floor(scene.time.now / 160) % 4 : 0));
      if (f) ctx.drawImage(f.source.image as CanvasImageSource, f.cutX, f.cutY, f.cutWidth, f.cutHeight, 0, 0, size, size);
    }
    if (decorate) { ctx.save(); ctx.scale(size / 128, size / 128); decorate(ctx); ctx.restore(); }
  };
  draw();
  if (layers.some(l => l.animated)) scene.events.on("postupdate", draw);
  return () => scene.events.off("postupdate", draw);
}
// ---------------------------------------------------------------------------

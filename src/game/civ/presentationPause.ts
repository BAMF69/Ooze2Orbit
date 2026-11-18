// Preserve pre-existing clock states when the native Details panel freezes civilization presentation.
interface Clocks { time: { paused: boolean }; tweens: { paused: boolean } }
export class PresentationPause {
  private saved: { time: boolean; tweens: boolean } | null = null;
  constructor(private scene: Clocks) {}
  set(paused: boolean): void {
    if (paused && !this.saved) {
      this.saved = { time: this.scene.time.paused, tweens: this.scene.tweens.paused };
      this.scene.time.paused = this.scene.tweens.paused = true;
    } else if (!paused && this.saved) {
      this.scene.time.paused = this.saved.time; this.scene.tweens.paused = this.saved.tweens; this.saved = null;
    }
  }
}

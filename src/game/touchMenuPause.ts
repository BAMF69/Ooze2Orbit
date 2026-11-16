// UI remains interactive while scene simulation returns early. Freeze presentation clocks too.
interface SceneClocks { time: { paused: boolean }; tweens: { paused: boolean } }
export class TouchMenuPause {
  private saved: { time: boolean; tweens: boolean } | null = null;
  constructor(private scene: SceneClocks) {}
  set(paused: boolean): void {
    if (paused && !this.saved) {
      this.saved = { time: this.scene.time.paused, tweens: this.scene.tweens.paused };
      this.scene.time.paused = this.scene.tweens.paused = true;
    } else if (!paused && this.saved) {
      this.scene.time.paused = this.saved.time; this.scene.tweens.paused = this.saved.tweens; this.saved = null;
    }
  }
}

// Diet is authoritative; temperament shares keep their independent red/green/blue meaning.
import './hudDock.css';
import type * as Phaser from 'phaser';
import type { Diet } from './cell/tuning';
let owner: DietOverlay | undefined;
export class DietOverlay {
  constructor(scene: Phaser.Scene) {
    scene.events.once('shutdown', () => {
      if (owner === this) { delete document.body.dataset.overlayDiet; owner = undefined; }
    });
  }
  update(diet: Diet): void {
    owner = this;
    if (document.body.dataset.overlayDiet !== diet) document.body.dataset.overlayDiet = diet;
  }
}

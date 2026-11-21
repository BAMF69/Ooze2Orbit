// Fade native menus only where the rendered player overlaps them; input remains available.
// Perf (2026-11-21, older-tablet playtest): the mask position used to be rewritten on every frame for every menu,
// even with the player nowhere near it. Custom properties inherit, so each write restyled the whole HUD subtree.
// Now the position is written only while the player overlaps a menu, rounded to whole pixels, and only on change.
import type * as Phaser from 'phaser';
import { setVar } from './domPatch';
export function trackHudOcclusion(scene: Phaser.Scene, subject: () => Phaser.GameObjects.Sprite): void {
  const update = () => {
    const sprite = subject(); if (!sprite?.active) return;
    const b = sprite.getBounds(), camera = scene.cameras.main, canvas = scene.game.canvas.getBoundingClientRect();
    const sx = canvas.width / scene.scale.width, sy = canvas.height / scene.scale.height;
    const left = canvas.left + (camera.x + (b.x-camera.worldView.x)*camera.zoom)*sx;
    const top = canvas.top + (camera.y + (b.y-camera.worldView.y)*camera.zoom)*sy;
    const right = left + b.width*camera.zoom*sx, bottom = top + b.height*camera.zoom*sy;
    document.querySelectorAll<HTMLElement>('.hud-dock,.upgrade-quarter,.dock-control-tray').forEach(menu => {
      if(!menu.classList.contains('hud-dock')&&menu.closest('.hud-dock')){ if (menu.classList.contains('hud-occluded')) menu.classList.remove('hud-occluded');return;}
      const r = menu.getBoundingClientRect();
      const hit = !menu.hidden && r.width>0 && r.height>0 && left<r.right && right>r.left && top<r.bottom && bottom>r.top;
      if (hit) {
        setVar(menu,'--occlusion-x',`${Math.round((left+right)/2-r.left)}px`);
        setVar(menu,'--occlusion-y',`${Math.round((top+bottom)/2-r.top)}px`);
        setVar(menu,'--occlusion-rx',`${Math.round(Math.max(35,(right-left)*.75))}px`);
        setVar(menu,'--occlusion-ry',`${Math.round(Math.max(35,(bottom-top)*.75))}px`);
      }
      if (menu.classList.contains('hud-occluded') !== hit) menu.classList.toggle('hud-occluded', hit);
    });
  };
  scene.events.on('postupdate', update);
  scene.events.once('shutdown', () => { scene.events.off('postupdate', update); document.querySelectorAll('.hud-occluded').forEach(e=>e.classList.remove('hud-occluded')); });
}

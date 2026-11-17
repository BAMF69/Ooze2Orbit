// Fade native menus only where the rendered player overlaps them; input remains available.
import type * as Phaser from 'phaser';
export function trackHudOcclusion(scene: Phaser.Scene, subject: () => Phaser.GameObjects.Sprite): void {
  const update = () => {
    const sprite = subject(); if (!sprite?.active) return;
    const b = sprite.getBounds(), camera = scene.cameras.main, canvas = scene.game.canvas.getBoundingClientRect();
    const sx = canvas.width / scene.scale.width, sy = canvas.height / scene.scale.height;
    const left = canvas.left + (camera.x + (b.x-camera.worldView.x)*camera.zoom)*sx;
    const top = canvas.top + (camera.y + (b.y-camera.worldView.y)*camera.zoom)*sy;
    const right = left + b.width*camera.zoom*sx, bottom = top + b.height*camera.zoom*sy;
    document.querySelectorAll<HTMLElement>('.hud-dock,.upgrade-quarter,.dock-control-tray').forEach(menu => {
      if(!menu.classList.contains('hud-dock')&&menu.closest('.hud-dock')){menu.classList.remove('hud-occluded');return;}
      const r = menu.getBoundingClientRect();
      menu.style.setProperty('--occlusion-x',`${(left+right)/2-r.left}px`);
      menu.style.setProperty('--occlusion-y',`${(top+bottom)/2-r.top}px`);
      menu.style.setProperty('--occlusion-rx',`${Math.max(35,(right-left)*.75)}px`);
      menu.style.setProperty('--occlusion-ry',`${Math.max(35,(bottom-top)*.75)}px`);
      menu.classList.toggle('hud-occluded', !menu.hidden && r.width>0 && r.height>0 && left<r.right && right>r.left && top<r.bottom && bottom>r.top);
    });
  };
  scene.events.on('postupdate', update);
  scene.events.once('shutdown', () => { scene.events.off('postupdate', update); document.querySelectorAll('.hud-occluded').forEach(e=>e.classList.remove('hud-occluded')); });
}

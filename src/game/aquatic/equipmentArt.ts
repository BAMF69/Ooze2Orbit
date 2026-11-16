// Organic inked equipment follows the body's view and remains legible at gameplay size.
import * as Phaser from 'phaser';
import { partTier, type AqCreature } from './creature';
import type { AqArtView } from './illustrated';
export function paintAquaticEquipment(ctx: CanvasRenderingContext2D, c: AqCreature, view: AqArtView, look = ''): void {
  const parts = new Set([...c.parts, ...c.uniques]), side = view === 'side';
  ctx.lineWidth = 2; ctx.strokeStyle = '#102636'; ctx.lineJoin = 'round';
  const shape = (color: string, points: number[][]) => { ctx.fillStyle = color; ctx.beginPath(); points.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.closePath(); ctx.fill(); ctx.stroke(); };
  // Temperament still changes the silhouette independently of the diet palette.
  const tier = Number(look.slice(-1)) || 0;
  if (tier > 0) {
    if (look.startsWith('c')) for (let n=0;n<tier;n++) {
      const x=side?42+n*10:64, y=side?44:36+n*12;
      shape('#c8ba7e',[[x-12,y],[x+12,y],[x+9,y+10],[x,y+16],[x-9,y+10]]);
    }
    else if (look.startsWith('a')) {
      ctx.strokeStyle='#c5edc8';ctx.lineWidth=1.8;
      for(let n=0;n<tier;n++) {ctx.beginPath();ctx.moveTo(side?27:46+n*5,side?52+n*5:40);ctx.quadraticCurveTo(side?62:40+n*7,side?45+n*5:65,side?92:49+n*5,side?49+n*5:90);ctx.stroke();}
      ctx.strokeStyle='#102636';
    } else for(let n=0;n<tier;n++) shape('#dd826f', side ? [[46+n*10,49],[49+n*10,27-n*3],[60+n*10,49]] : [[59,31+n*13],[64,16+n*13],[69,31+n*13]]);
  }
  if (parts.has('fins')) {
    shape(partTier(c,'fins')>1?'#b2f7df':'#7cd6c0', side ? [[43,74],[65,69],[44,102],[34,99]] : [[36,66],[20,63],[5,91],[35,81]]);
    if (!side) shape('#7cd6c0', [[92,66],[108,63],[123,91],[93,81]]);
  }
  if (parts.has('plates')) for (let i = 0; i < 2+partTier(c,'plates'); i++) {
    const x = side ? 42 + i * 13 : 64, y = side ? 64 : 38 + i * 16;
    shape(i % 2 ? '#86c4bc' : '#4f9caa', [[x-12,y-8],[x+12,y-8],[x+15,y+3],[x,y+12],[x-15,y+3]]);
  }
  if (parts.has('gills')) { ctx.strokeStyle = '#ff9d88'; ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(side ? 83-i*5 : 39-i*3, 58+i*3); ctx.lineTo(side ? 79-i*5 : 41-i*3, 73+i*3); ctx.stroke(); if (!side) { ctx.beginPath();ctx.moveTo(89+i*3,58+i*3);ctx.lineTo(87+i*3,73+i*3);ctx.stroke(); } } ctx.strokeStyle = '#102636'; }
  if (parts.has('jaws')) for (let i=0;i<4;i++) { const x=side ? 95+i*4 : 47+i*11, y=side ? 65 : view==='front' ? 85 : 47; shape('#fff0c6',[[x-4,y],[x+4,y],[x,y+8+partTier(c,"jaws")*3]]); }
  if (parts.has('endurance')) { ctx.fillStyle='#e9af4e';ctx.beginPath();ctx.arc(side?41:64,side?62:69,6,0,Math.PI*2);ctx.fill();ctx.stroke(); }
  if(parts.has('toxicTendrils')) { ctx.strokeStyle='#91ffb3';ctx.lineWidth=3;for(let n=0;n<4;n++){ctx.beginPath();ctx.moveTo(40+n*15,75);ctx.bezierCurveTo(25+n*21,95,63+n*8,100,28+n*23,121);ctx.stroke();}ctx.strokeStyle='#102636'; }
  if(parts.has('electricOrgan')) {shape('#d6f984',[[57,48],[73,49],[64,64],[74,62],[56,83],[62,65],[53,66]]);}
  if(partTier(c,'fins')>1) for(let n=1;n<partTier(c,'fins');n++) {shape('#d0fff0',[[34,70+n*7],[14-n*3,87+n*4],[30,81+n*5]]);if(!side)shape('#d0fff0',[[94,70+n*7],[114+n*3,87+n*4],[98,81+n*5]]);}
  if (parts.has('torrent')) shape('#9beaff',side ? [[18,60],[3,43],[7,62],[2,83],[23,72]] : [[56,99],[41,124],[64,115],[86,124],[72,99]]);
}
export function equipmentTexture(scene: Phaser.Scene, c: AqCreature, view: AqArtView, look = ''): string {
  const key = `aqEquipment:${look}:${view}:${[...c.parts,...c.uniques].sort().join(',')}:${JSON.stringify(c.partTiers??{})}`;
  if (!scene.textures.exists(key)) {
    const t = scene.textures.createCanvas(key,384,384);
    if (!t) throw new Error('Cannot create aquatic equipment texture');
    const ctx=t.context;ctx.scale(3,3);paintAquaticEquipment(ctx,c,view,look);t.refresh();t.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
  return key;
}

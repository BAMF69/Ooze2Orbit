import { visualRank } from './playerMotion';
// Organic inked equipment follows the body's view and remains legible at gameplay size.
import * as Phaser from 'phaser';
import { partTier, type AqCreature } from './creature';
import type { AqArtView } from './illustrated';
export function paintAquaticEquipment(ctx: CanvasRenderingContext2D, c: AqCreature, view: AqArtView, look = '', pose=1, tucked=false): void {
  const parts = new Set([...c.parts, ...c.uniques]), side = view === 'side';
  ctx.lineWidth = 2; ctx.strokeStyle = '#102636'; ctx.lineJoin = 'round';
  const shape = (color:string,points:number[][]) => {
    const ys=points.map(p=>p[1]),xs=points.map(p=>p[0]);
    const gradient=ctx.createLinearGradient(Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys));
    gradient.addColorStop(0,'#f3e5b4');gradient.addColorStop(.3,color);gradient.addColorStop(1,'#285b68');
    ctx.fillStyle=gradient;ctx.shadowColor=color;ctx.shadowBlur=2;ctx.beginPath();
    const last=points[points.length-1];ctx.moveTo((last[0]+points[0][0])/2,(last[1]+points[0][1])/2);
    points.forEach(([x,y],i)=>{const next=points[(i+1)%points.length];ctx.quadraticCurveTo(x,y,(x+next[0])/2,(y+next[1])/2);});
    ctx.closePath();ctx.fill();ctx.stroke();
    const [x,y]=points[0],other=points[Math.floor(points.length/2)];
    ctx.save();ctx.strokeStyle='#edffec';ctx.globalAlpha=.4;ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(x,y+2);ctx.quadraticCurveTo((x+other[0])/2,(y+other[1])/2-2,other[0],other[1]-2);ctx.stroke();ctx.restore();
  };
  const ranks=Object.fromEntries(Object.entries(c.ups).map(([k,v])=>[k,visualRank(v)]));
  const accent=c.diet==='carnivore'?'#ed8f78':c.diet==='herbivore'?'#b7df63':'#efc966';
  const swing=tucked?-7:pose===0?-4:pose===2?4:0;
  // Stat anatomy is additive: equipment remains identifiable on top of it.
  for(let n=0;n<ranks.attack;n++){
    const x=side?48+n*7:64,y=side?46:34+n*8;
    shape(accent,[[x-4,y+5],[x,y-8-ranks.attack],[x+5,y+5]]);
  }
  for(let n=0;n<ranks.defense;n++){
    const x=side?48+n*9:48+(n%2)*32,y=side?60:48+Math.floor(n/2)*13;
    shape(accent,[[x-3,y-3],[x+3,y-3],[x+4,y+1],[x,y+5],[x-4,y+1]]);
  }
  if(ranks.mobility>0){
    const span=4+ranks.mobility*2;
    shape(accent,side?[[45,73],[49,82+span+swing],[32,91+swing]]:[[36,66],[19-span,77+swing],[34,83+swing]]);
    if(!side)shape(accent,[[92,66],[109+span,77-swing],[94,83-swing]]);
  }
  if(ranks.speed>0){
    ctx.strokeStyle='#d8f6dc';ctx.lineWidth=1.2;
    for(let n=0;n<ranks.speed;n++){ctx.beginPath();ctx.moveTo(side?42:58+n*3,side?64+n*3:87);ctx.quadraticCurveTo(side?21:55+n*3,side?70+n*3:103,side?8:45+n*7,side?80+n*3:120);ctx.stroke();}
    ctx.strokeStyle='#102636';
  }
  if(ranks.health>0){ctx.fillStyle='#f7d787';for(let n=0;n<ranks.health;n++){ctx.beginPath();ctx.ellipse(side?52+n*8:49+(n%2)*30,side?74:54+Math.floor(n/2)*12,2.5,1.5,0,0,Math.PI*2);ctx.fill();}}
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
    ctx.save();ctx.translate(0,swing);
    shape(partTier(c,'fins')>1?'#b2f7df':'#7cd6c0', side ? [[43,74],[65,69],[44,102],[34,99]] : [[36,66],[20,63],[5,91],[35,81]]);
    if (!side) shape('#7cd6c0', [[92,66],[108,63],[123,91],[93,81]]);
  }
  if(parts.has('fins'))ctx.restore();
  if (parts.has('plates')) for (let i = 0; i < 2+partTier(c,'plates'); i++) {
    const x = side ? 43 + i * 10 : 64+Math.sin(i*.8)*swing, y = side ? 62 : 40 + i * 11;
    shape(i % 2 ? '#86c4bc' : '#4f9caa', [[x-8,y-5],[x+8,y-5],[x+10,y+2],[x,y+8],[x-10,y+2]]);
  }
  if (parts.has('gills')) { ctx.strokeStyle = '#ff9d88'; ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(side ? 83-i*5 : 39-i*3, 58+i*3); ctx.lineTo(side ? 79-i*5 : 41-i*3, 73+i*3); ctx.stroke(); if (!side) { ctx.beginPath();ctx.moveTo(89+i*3,58+i*3);ctx.lineTo(87+i*3,73+i*3);ctx.stroke(); } } ctx.strokeStyle = '#102636'; }
  if (parts.has('jaws')&&view!=='back') for (let i=0;i<4;i++) { const x=side ? 95+i*4 : 47+i*11, y=side ? 65+(pose===3?5:0) : 85+(pose===3?4:0); shape('#fff0c6',[[x-4,y],[x+4,y],[x,y+8+partTier(c,"jaws")*3]]); }
  if (parts.has('endurance')) { ctx.fillStyle='#e9af4e';ctx.beginPath();ctx.arc(side?41:64,side?62:69,6,0,Math.PI*2);ctx.fill();ctx.stroke(); }
  if(parts.has('toxicTendrils')) { ctx.strokeStyle='#91ffb3';ctx.shadowColor='#b7fa75';ctx.shadowBlur=3;ctx.lineWidth=4;for(let n=0;n<4;n++){ctx.beginPath();ctx.moveTo(40+n*15,75);ctx.bezierCurveTo(25+n*21+swing,95,63+n*8-swing,100,28+n*23+swing,121);ctx.stroke();}ctx.strokeStyle='#102636'; }
  ctx.shadowBlur=0;
  if(parts.has('electricOrgan')) { for(let n=0;n<3;n++){ctx.shadowColor='#d4ffff';ctx.shadowBlur=4;shape('#e9c759',[[54,51+n*9],[65,46+n*9],[74,53+n*9],[65,60+n*9]]);}ctx.shadowBlur=0;}
  if(partTier(c,'fins')>1) for(let n=1;n<partTier(c,'fins');n++) {shape('#d0fff0',[[34,70+n*7],[14-n*3,87+n*4],[30,81+n*5]]);if(!side)shape('#d0fff0',[[94,70+n*7],[114+n*3,87+n*4],[98,81+n*5]]);}
  if (parts.has('torrent')) shape('#9beaff',side ? [[18,60],[3,43],[7,62],[2,83],[23,72]] : [[56,99],[41,124],[64,115],[86,124],[72,99]]);
}
export function equipmentTexture(scene: Phaser.Scene, c: AqCreature, view: AqArtView, look = '', pose=1, tucked=false): string {
  const key = `aqEquipment:${look}:${view}:${pose}:${tucked}:${c.diet}:${Object.values(c.ups).map(visualRank).join(',')}:${[...c.parts,...c.uniques].sort().join(',')}:${JSON.stringify(c.partTiers??{})}`;
  if (!scene.textures.exists(key)) {
    const t = scene.textures.createCanvas(key,384,384);
    if (!t) throw new Error('Cannot create aquatic equipment texture');
    const ctx=t.context;ctx.scale(3,3);paintAquaticEquipment(ctx,c,view,look,pose,tucked);t.refresh();t.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
  return key;
}

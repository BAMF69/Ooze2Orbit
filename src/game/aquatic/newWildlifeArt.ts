// Original canvas illustrations: bold ink, luminous biological color and clear loot silhouettes.
import type * as Phaser from 'phaser';
export function prepareWildlifeArt(scene:Phaser.Scene):void {
  for(const kind of ['toxicTendrils','electricOrgan']) {
    const key=`aq-${kind}`;if(scene.textures.exists(key))continue;
    const texture=scene.textures.createCanvas(key,384,384);if(!texture)throw new Error('Cannot create aquatic wildlife art');
    const c=texture.context;c.scale(3,3);c.lineCap='round';c.lineJoin='round';c.strokeStyle='#102435';c.lineWidth=3;
    const gradient=c.createLinearGradient(30,20,80,110);gradient.addColorStop(0,kind==='electricEel'||kind==='electricOrgan'?'#e9ff93':'#f7b7ff');gradient.addColorStop(.5,kind==='electricEel'||kind==='electricOrgan'?'#62e2d7':'#bc68e4');gradient.addColorStop(1,'#3b377c');c.fillStyle=gradient;
    if(kind==='jellyfish'||kind==='toxicTendrils') {
      for(let n=0;n<6;n++){c.strokeStyle='#18263e';c.lineWidth=6;c.beginPath();c.moveTo(37+n*10,61);c.bezierCurveTo(18+n*16,81,58+n*5,91,31+n*12,119-n%2*7);c.stroke();c.strokeStyle=n%2?'#79ffbe':'#df9efa';c.lineWidth=3;c.stroke();}
      if(kind==='jellyfish'){c.strokeStyle='#14263e';c.lineWidth=3;c.beginPath();c.moveTo(22,64);c.bezierCurveTo(8,9,118,4,106,64);c.quadraticCurveTo(65,82,22,64);c.fill();c.stroke();c.strokeStyle='#ffe5ff';c.lineWidth=2;c.beginPath();c.moveTo(36,49);c.quadraticCurveTo(42,26,64,26);c.stroke();c.fillStyle='#693d91';for(let n=0;n<4;n++){c.beginPath();c.arc(43+n*14,57,4,0,Math.PI*2);c.fill();}}
    } else if(kind==='electricEel') {
      c.strokeStyle='#14263e';c.lineWidth=22;c.beginPath();c.moveTo(103,37);c.bezierCurveTo(58,14,31,60,69,74);c.bezierCurveTo(116,92,40,107,18,96);c.stroke();c.strokeStyle='#65d6bd';c.lineWidth=15;c.stroke();c.strokeStyle='#e8ff95';c.lineWidth=3;c.stroke();c.fillStyle=gradient;c.strokeStyle='#14263e';c.lineWidth=2;c.beginPath();c.ellipse(101,37,17,12,-.1,0,Math.PI*2);c.fill();c.stroke();c.fillStyle='#fff7ab';c.beginPath();c.arc(108,32,4,0,Math.PI*2);c.fill();c.fillStyle='#101d2f';c.beginPath();c.arc(109,32,2,0,Math.PI*2);c.fill();
    } else {
      c.beginPath();c.ellipse(64,64,27,39,.35,0,Math.PI*2);c.fill();c.stroke();for(let n=0;n<4;n++){c.fillStyle=n%2?'#ffdd72':'#b9fff0';c.beginPath();c.ellipse(61+n%2*7,38+n*16,13,7,.35,0,Math.PI*2);c.fill();c.stroke();}c.strokeStyle='#fff6b3';c.lineWidth=2;c.beginPath();c.moveTo(57,32);c.quadraticCurveTo(85,63,62,97);c.stroke();
    }
    texture.refresh();
  }
}

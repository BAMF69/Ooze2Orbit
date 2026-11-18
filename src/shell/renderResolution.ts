// Phaser4.2 adapter: logical scale/culling/input remain unchanged; only draw transforms and targets grow.
import * as Phaser from 'phaser';
import {renderTarget,type RenderQuality} from '../core/renderQuality';
export class RenderResolution {
 private width=0;private height=0;private active=false;
 private quality:RenderQuality='auto';
 constructor(private game:Phaser.Game){
  const renderer=game.renderer;
  if(!(renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer))return;
  this.active=true;
  renderer.on(Phaser.Renderer.Events.RESTORE_WEBGL,()=>this.resize(this.quality));
  const draw=renderer.render.bind(renderer);
  renderer.render=(scene,children,camera)=>{
   const rx=game.canvas.width/game.scale.width,ry=game.canvas.height/game.scale.height;
   if(rx===1&&ry===1){draw(scene,children,camera);return;}
   const {x,y,width,height}=camera;
   // Phaser4.2 exposes the render matrix at runtime but omits it from Camera's typings.
   const cam=camera as typeof camera & {matrix:Phaser.GameObjects.Components.TransformMatrix;matrixCombined:Phaser.GameObjects.Components.TransformMatrix;matrixExternal:Phaser.GameObjects.Components.TransformMatrix};
   const matrices=[cam.matrix,cam.matrixCombined];
   const saved=matrices.map(m=>[m.a,m.b,m.c,m.d,m.tx,m.ty]);
   const ex=cam.matrixExternal.tx,ey=cam.matrixExternal.ty;
   try{
    // CameraManager has already done logical following/culling before this boundary.
    camera.x=x*rx;camera.y=y*ry;camera.width=width*rx;camera.height=height*ry;
    matrices.forEach((m,i)=>{const [a,b,c,d,tx,ty]=saved[i];m.setTransform(a*rx,b*ry,c*rx,d*ry,tx*rx,ty*ry);});
    cam.matrixExternal.tx=ex*rx;cam.matrixExternal.ty=ey*ry;
    draw(scene,children,camera);
   }finally{
    camera.x=x;camera.y=y;camera.width=width;camera.height=height;
    matrices.forEach((m,i)=>{const [a,b,c,d,tx,ty]=saved[i];m.setTransform(a,b,c,d,tx,ty);});
    cam.matrixExternal.tx=ex;cam.matrixExternal.ty=ey;
   }
  };
 }
 resize(quality:RenderQuality):void{
  this.quality=quality;
  const g=this.game;if(!this.active)return;
  const r=g.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
  if(r.gl.isContextLost())return;
  const bounds=g.canvas.getBoundingClientRect();if(bounds.width<1||bounds.height<1)return;
  const maxEdge=Math.min(r.gl.getParameter(r.gl.MAX_RENDERBUFFER_SIZE),...r.gl.getParameter(r.gl.MAX_VIEWPORT_DIMS));
  const next=renderTarget(bounds.width,bounds.height,g.scale.width,g.scale.height,window.devicePixelRatio,quality,matchMedia('(pointer:coarse)').matches,maxEdge);
  if(g.canvas.width!==next.width||g.canvas.height!==next.height){g.canvas.width=next.width;g.canvas.height=next.height;}
  if(r.width!==next.width||r.height!==next.height)r.resize(next.width,next.height);
  this.width=next.width;this.height=next.height;
  g.canvas.dataset.renderResolution=`${this.width}×${this.height}`;g.canvas.dataset.renderQuality=quality;
 }
}

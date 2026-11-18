export const RENDER_QUALITIES=['auto','performance','high','ultra'] as const;
export type RenderQuality=typeof RENDER_QUALITIES[number];
export function renderTarget(cssWidth:number,cssHeight:number,logicalWidth:number,logicalHeight:number,dpr:number,quality:RenderQuality,touch:boolean,maxEdge=8192){
 const policy=quality==='performance'?{dpr:1,edge:1280,pixels:1280*720}:quality==='high'?{dpr:2,edge:3840,pixels:3840*2160}:quality==='ultra'?{dpr:3,edge:5120,pixels:5120*2880}:touch?{dpr:2,edge:1920,pixels:1920*1080}:{dpr:2,edge:2560,pixels:2560*1440};
 const density=Math.min(policy.dpr,Math.max(1,Number.isFinite(dpr)?dpr:1));
 const w=Math.max(1,cssWidth)*density,h=Math.max(1,cssHeight)*density;
 const fit=Math.min(1,Math.min(maxEdge,policy.edge)/Math.max(w,h),Math.sqrt(policy.pixels/(w*h)));
 const scale=Math.max(1,Math.min(w*fit/logicalWidth,h*fit/logicalHeight));
 return {width:Math.max(1,Math.round(logicalWidth*scale)),height:Math.max(1,Math.round(logicalHeight*scale))};
}

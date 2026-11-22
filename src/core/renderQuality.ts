export const RENDER_QUALITIES=['auto','performance','high','ultra'] as const;
export type RenderQuality=typeof RENDER_QUALITIES[number];
// Draw-buffer budgets. Performance was dpr 1 / 1280x720 until the 2026-11-21 older-tablet playtest ("choppy even on
// performance"): it now draws at most ~960x540 and lets the browser scale up. Auto on a low-end touch device
// (few cores or little memory, see isLowEndDevice) uses a budget between that and normal Auto.
export const RENDER_BUDGET={performance:{dpr:1,edge:1024,pixels:960*540},lowEndAuto:{dpr:1.25,edge:1440,pixels:1280*720}};
/** A conservative guess from what browsers report; false when unknown (Safari reports no deviceMemory). */
export function isLowEndDevice(cores:number|undefined,memoryGB:number|undefined):boolean{
 return (typeof cores==='number'&&cores>0&&cores<=4)||(typeof memoryGB==='number'&&memoryGB>0&&memoryGB<=3);
}
export function renderTarget(cssWidth:number,cssHeight:number,logicalWidth:number,logicalHeight:number,dpr:number,quality:RenderQuality,touch:boolean,maxEdge=8192,lowEnd=false){
 const policy=quality==='performance'?RENDER_BUDGET.performance:quality==='auto'&&touch&&lowEnd?RENDER_BUDGET.lowEndAuto:quality==='high'?{dpr:2,edge:3840,pixels:3840*2160}:quality==='ultra'?{dpr:3,edge:5120,pixels:5120*2880}:touch?{dpr:2,edge:1920,pixels:1920*1080}:{dpr:2,edge:2560,pixels:2560*1440};
 const density=Math.min(policy.dpr,Math.max(1,Number.isFinite(dpr)?dpr:1));
 const w=Math.max(1,cssWidth)*density,h=Math.max(1,cssHeight)*density;
 const fit=Math.min(1,Math.min(maxEdge,policy.edge)/Math.max(w,h),Math.sqrt(policy.pixels/(w*h)));
 const scale=Math.max(1,Math.min(w*fit/logicalWidth,h*fit/logicalHeight));
 return {width:Math.max(1,Math.round(logicalWidth*scale)),height:Math.max(1,Math.round(logicalHeight*scale))};
}

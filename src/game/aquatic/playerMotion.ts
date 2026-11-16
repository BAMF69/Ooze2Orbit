import type { AqCreature } from './creature';
export interface PlayerMotion { speed:number; dash:boolean; airborne:boolean; rising:boolean; stunned:boolean }
export const visualRank=(level:number)=>Math.min(5,Math.max(0,Math.ceil(level/2)));
export function bodyWidth(c:AqCreature):number {return 1+visualRank(c.ups.health)*.025-visualRank(c.ups.speed)*.012;}
export function playerPose(m:PlayerMotion,age:number,clock:number,reduced:boolean,row:number){
 const state=m.stunned?'stunned':m.airborne?'breach':m.dash?'dash':age<260?'attack':m.speed>8?'swim':'idle';
 const column=state==='attack'?3:state==='stunned'||state==='idle'||state==='dash'||reduced?1:[0,1,2,1][Math.floor(clock/160)%4];
 return {state,row:state==='breach'?1:row,column,
  rate:state==='stunned'?0:state==='idle'?.25:state==='dash'?2:Math.min(1.6,.5+m.speed/240),
  width:state==='dash'?.82:state==='attack'?1.08:1,
  height:state==='dash'?1.16:1,
  tilt:reduced?0:state==='breach'?(m.rising?-1.05:.75):0};
}

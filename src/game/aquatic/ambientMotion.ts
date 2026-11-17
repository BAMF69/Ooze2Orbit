export const FOOD_KINDS=new Set(['algae','plankton','meat','meatM','meatL','pod','bloom']);
export function foodPulse(clock:number,phase:number,reduced:boolean):number {
 return reduced?1.06:1.08+.08*Math.sin(clock/720+phase);
}
export function murkAlpha(left:number):number {return Math.min(1,Math.max(0,left)/.35)*.76;}

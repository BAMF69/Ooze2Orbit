import { AQ } from './tuning';
export interface EelAttackState { shockCd?:number; shockWindup?:number; fleeLeft?:number; shockLeft?:number }
export function armEelShock(s:EelAttackState):void {
 if((s.shockCd??0)<=0&&s.shockWindup===undefined&&(s.fleeLeft??0)<=0)s.shockWindup=.22;
}
// Discharge and retreat start together, once per wind-up, on simulation time.
export function stepEelAttack(s:EelAttackState,dt:number,canAttack:boolean):boolean {
 s.shockCd=Math.max(0,(s.shockCd??0)-dt);
 s.fleeLeft=Math.max(0,(s.fleeLeft??0)-dt);
 s.shockLeft=Math.max(0,(s.shockLeft??0)-dt);
 if(!canAttack){s.shockWindup=undefined;return false;}
 if(s.shockWindup===undefined)return false;
 s.shockWindup-=dt;
 if(s.shockWindup>0)return false;
 s.shockWindup=undefined;s.shockCd=AQ.combat.eelShockCooldownS;
 s.fleeLeft=AQ.combat.eelFleeS;s.shockLeft=.48;return true;
}

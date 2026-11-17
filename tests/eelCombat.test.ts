import {it,expect} from 'vitest';
import {armEelShock,stepEelAttack,type EelAttackState} from '../src/game/aquatic/eelCombat';
it('winds up once, discharges, flees and enforces a five-second cooldown',()=>{
 const s:EelAttackState={};armEelShock(s);expect(stepEelAttack(s,.1,true)).toBe(false);
 expect(stepEelAttack(s,.12,true)).toBe(true);expect(s.shockCd).toBe(5);expect(s.fleeLeft).toBeGreaterThan(0);
 armEelShock(s);expect(s.shockWindup).toBeUndefined();
 stepEelAttack(s,4.99,true);armEelShock(s);expect(s.shockWindup).toBeUndefined();
 stepEelAttack(s,.02,true);armEelShock(s);expect(s.shockWindup).toBe(.22);
});
it('stunning an eel interrupts its wind-up without discharging',()=>{
 const s:EelAttackState={};armEelShock(s);expect(stepEelAttack(s,.3,false)).toBe(false);
 expect(s.shockLeft).toBe(0);expect(s.shockWindup).toBeUndefined();
});

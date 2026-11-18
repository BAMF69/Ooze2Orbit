// Timed effects share one simulation-clock path for fauna, sharks and sisters.
import { AQ } from './tuning';
export interface CombatStatus { toxicLeft?:number; stunLeft?:number }
export function tickCombatStatus(s: CombatStatus,dt:number): {damage:number;speed:number} {
  const damage=Math.min(dt,s.toxicLeft??0)*AQ.combat.toxicDps;
  const stunned=(s.stunLeft??0)>0, slowed=(s.toxicLeft??0)>0;
  s.toxicLeft=Math.max(0,(s.toxicLeft??0)-dt);s.stunLeft=Math.max(0,(s.stunLeft??0)-dt);
  return {damage,speed:stunned?0:slowed?AQ.combat.toxicSlow:1};
}
export function toxicRetaliation(s: CombatStatus): void { s.toxicLeft=AQ.combat.toxicS; }
export function shock(s: CombatStatus): void { s.stunLeft=AQ.combat.electricStunS; }

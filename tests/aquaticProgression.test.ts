import {it,expect} from 'vitest';
import {addPart,creatureFromLineage,partTier,ramDamage,damageTaken,movement} from '../src/game/aquatic/creature';
import {readAqCreature} from '../src/game/aquatic/runSave';
import {tickCombatStatus,shock,toxicRetaliation,type CombatStatus} from '../src/game/aquatic/combatEffects';
import {KINDS,MAPS} from '../src/game/aquatic/tuning';
import {purchaseMeters} from '../src/game/purchaseMeters';
import {settingsLoad} from '../src/core/settings';
it('later maps offer new prey and guaranteed organ drops',()=>{
 expect(MAPS[0].counts.jellyfish).toBe(0);expect(MAPS[1].counts.jellyfish).toBeGreaterThan(0);
 expect(MAPS[1].counts.electricEel).toBe(0);expect(MAPS[2].counts.electricEel).toBeGreaterThan(0);
 expect(KINDS.jellyfish.part).toBe('toxicTendrils');expect(KINDS.electricEel.part).toBe('electricOrgan');
});
it('upgrades existing parts without losing a slot, persists tiers and never downgrades',()=>{
 let c=creatureFromLineage(null,'omnivore');c=addPart(c,'jaws').creature;const base=ramDamage(c);
 c=addPart(c,'jaws',3).creature;expect(c.parts).toEqual(['jaws']);expect(partTier(c,'jaws')).toBe(3);expect(ramDamage(c)).toBe(base+12);
 expect(partTier(addPart(c,'jaws',1).creature,'jaws')).toBe(3);expect(partTier(readAqCreature(JSON.parse(JSON.stringify(c))),'jaws')).toBe(3);
 const one=addPart(creatureFromLineage(null,'herbivore'),'plates').creature;const three=addPart(one,'plates',3).creature;expect(damageTaken(three,20)).toBeLessThan(damageTaken(one,20));
 const fins=addPart(creatureFromLineage(null,'herbivore'),'fins').creature;expect(movement(addPart(fins,'fins',3).creature).turnRate).toBeGreaterThan(movement(fins).turnRate);
});
it('toxin deals bounded damage and expires; shock stops movement then recovers',()=>{
 const s:CombatStatus={};toxicRetaliation(s);let damage=0;for(let n=0;n<40;n++)damage+=tickCombatStatus(s,.1).damage;expect(damage).toBeCloseTo(15);expect(tickCombatStatus(s,.1).speed).toBe(1);
 shock(s);expect(tickCombatStatus(s,.1).speed).toBe(0);tickCombatStatus(s,3);expect(tickCombatStatus(s,.1).speed).toBe(1);
});
it('meters use the cheapest uncapped purchase and support mixed health payments',()=>{
 expect(purchaseMeters({algae:3,meat:2},[{cost:null,pay:'algae'},{cost:8,pay:'algae'},{cost:4,pay:'meat'}])).toEqual({costs:{algae:8,meat:4},affordable:false,ready:{algae:false,meat:false}});
 expect(purchaseMeters({algae:2,meat:2},[{cost:4,pay:'either'}])).toEqual({costs:{algae:4,meat:4},affordable:true,ready:{algae:true,meat:true}});
 expect(purchaseMeters({algae:999,meat:999},[{cost:null,pay:'either'}]).affordable).toBe(false);
});
it('migrates old default F descent and keeps custom descent bindings',()=>{
 expect(settingsLoad(JSON.stringify({input:{bindings:{sink:['key:f','pad:l2']}}})).settings.input.bindings.sink[0]).toBe('key:c');
 expect(settingsLoad(JSON.stringify({input:{bindings:{sink:['key:v','pad:l2']}}})).settings.input.bindings.sink[0]).toBe('key:v');
});

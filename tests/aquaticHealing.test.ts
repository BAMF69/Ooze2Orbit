import {it,expect} from 'vitest';
import {creatureFromLineage,eatFood,buyUpgrade,maxHp} from '../src/game/aquatic/creature';
import {AQ} from '../src/game/aquatic/tuning';
it('scales food and health purchase recovery across pond, lake, coast while capping HP',()=>{
 const base={...creatureFromLineage(null,'omnivore'),hp:0,points:{algae:999,meat:999}};
 for(const factor of [2,4,8]){
  expect(eatFood(base,'algae',1,factor).creature.hp).toBe(Math.min(maxHp(base),AQ.food.heal*factor));
  const r=buyUpgrade(base,'health',factor);expect(r.ok).toBe(true);
  if(r.ok)expect(r.creature.hp).toBe(Math.min(maxHp(r.creature),AQ.stats.hpPerLevel*factor));
 }
});

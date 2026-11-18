import {it,expect} from 'vitest';
import {critterIntent,jellyRetaliates} from '../src/game/aquatic/critters';
import {KINDS} from '../src/game/aquatic/tuning';
it('never chases even after being provoked',()=>{
 const jelly={x:0,y:0,z:60},player={x:1,y:0,z:60},wander={x:0,y:1};
 for(const provoked of [false,true])expect(critterIntent(KINDS.jellyfish,jelly,player,provoked,wander)).toMatchObject({mode:'wander',dir:wander});
});
it('retaliates to a bump or ram, but not idle overlap, cooldown or stun',()=>{
 expect(jellyRetaliates(20,false,true,false)).toBe(true);
 expect(jellyRetaliates(0,true,true,false)).toBe(true);
 expect(jellyRetaliates(0,false,true,false)).toBe(false);
 expect(jellyRetaliates(-20,false,true,false)).toBe(false);
 expect(jellyRetaliates(20,true,false,false)).toBe(false);
 expect(jellyRetaliates(20,true,true,true)).toBe(false);
});

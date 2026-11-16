import {it,expect} from 'vitest';
import {FOOD_KINDS,foodPulse,murkAlpha} from '../src/game/aquatic/ambientMotion';
it('food alone pulses gently, with static reduced-motion emphasis',()=>{
 expect(FOOD_KINDS.has('meatL')).toBe(true);expect(FOOD_KINDS.has('rock')).toBe(false);
 expect(foodPulse(Math.PI*360,0,false)).toBeCloseTo(1.16);
 expect(foodPulse(Math.PI*1080,0,false)).toBeCloseTo(1);
 expect(foodPulse(0,0,true)).toBe(foodPulse(1000,0,true));
});
it('murk obscures vision then clears at two seconds',()=>{
 expect(murkAlpha(2)).toBe(.76);expect(murkAlpha(.175)).toBeCloseTo(.38);
 expect(murkAlpha(0)).toBe(0);expect(murkAlpha(-1)).toBe(0);
});

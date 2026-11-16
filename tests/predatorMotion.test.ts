import {it,expect} from 'vitest';
import {predatorFrame,swimRate} from '../src/game/aquatic/predatorMotion';
it('loops through tail poses and preserves view rows',()=>{expect([0,140,280,420,560].map(t=>predatorFrame(t,1,Infinity,false))).toEqual([4,5,6,5,4]);});
it('opens on a bite, recovers then returns to swimming',()=>{expect(predatorFrame(0,0,0,false)).toBe(3);expect(predatorFrame(0,2,250,false)).toBe(9);expect(predatorFrame(280,2,400,false)).toBe(10);});
it('reduced motion holds neutral while retaining the bite cue',()=>{expect(predatorFrame(280,1,Infinity,true)).toBe(5);expect(predatorFrame(280,1,20,true)).toBe(7);});

it('uses hunting, cruising and jellyfish swim cadences',()=>{
 expect(swimRate(true)).toBe(1);expect(swimRate(false)).toBe(.5);
 expect(swimRate(false,true)).toBe(.25);expect(swimRate(true,true)).toBe(.25);
});

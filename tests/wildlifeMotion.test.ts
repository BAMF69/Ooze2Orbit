import {it,expect} from 'vitest';
import {wildlifeFrame} from '../src/game/aquatic/wildlifeMotion';
it('cycles painted swimming frames in each view',()=>{
 expect([0,200,400,600].map(t=>wildlifeFrame(t,1,Infinity,false,0,true))).toEqual([4,5,6,5]);
 expect(wildlifeFrame(280,2,Infinity,false)).toBe(10);
});
it('uses tentacle sweep or bite while reduced motion holds a neutral swim pose',()=>{
 expect(wildlifeFrame(0,0,450,false,0,true)).toBe(3);
 expect(wildlifeFrame(0,0,450,false)).toBe(0);
 expect(wildlifeFrame(280,1,Infinity,true)).toBe(5);
 expect(wildlifeFrame(280,1,100,true)).toBe(7);
});

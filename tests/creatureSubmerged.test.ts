import { describe,it,expect } from 'vitest';
import { isSubmerged } from '../src/game/creature/waterPhysics';
import { newBody } from '../src/game/creature/physics';
import { freshExpedition } from '../src/game/creature/expedition';
import { generateWaterV2 } from '../src/game/creature/levelgen/world';
import { sizedGeometry } from '../src/game/creature/levelgen/geometry';

const base=generateWaterV2(0).rooms[1];
const room={...base,spec:{...base.spec!,geometry:sizedGeometry(100,40,[
  {x0:100,x1:300,low:288,raised:224},
  {x0:700,x1:1100,low:480,raised:420},
])}};
const expedition=freshExpedition(0);

describe('Shared gameplay and HUD submerged state',()=>{
  it('uses water beyond the former 640px room boundary',()=>{
    expect(isSubmerged(newBody(850,520),expedition,room)).toBe(true);
    expect(isSubmerged(newBody(850,450),expedition,room)).toBe(false);
  });
  it('does not show air over dry ground between water regions',()=>{
    expect(isSubmerged(newBody(500,550),expedition,room)).toBe(false);
  });
  it('keeps air hidden when only the feet are wet',()=>{
    const body=newBody(850,485);body.h=20;
    expect(isSubmerged(body,expedition,room)).toBe(false);
    body.y=501;expect(isSubmerged(body,expedition,room)).toBe(true);
  });
  it('follows raised water in the region occupied by the player',()=>{
    const body=newBody(850,450);body.h=20;
    expect(isSubmerged(body,expedition,room)).toBe(false);
    expect(isSubmerged(body,{...expedition,basinRaised:true},room)).toBe(true);
  });
});

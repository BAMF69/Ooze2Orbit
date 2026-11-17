import {expect,it} from 'vitest';
import {AQ_PARTS,UNIQUE_PARTS} from '../src/game/aquatic/tuning';
import {creatureFromLineage} from '../src/game/aquatic/creature';
import {PART_ATTACHMENTS} from '../src/game/aquatic/attachmentSchema';
import {ADAPTABLE_RIG,bodyRig,rigSocket} from '../src/game/aquatic/avatarRig';
import {organPlacements} from '../src/game/aquatic/organPlacements';
const c={...creatureFromLineage(null,'omnivore'),form:3};
it('defines every supported part and resolves every visible socket for all authored poses and diets',()=>{
  expect(Object.keys(PART_ATTACHMENTS).sort()).toEqual([...AQ_PARTS].sort());
  for(const diet of ['herbivore','omnivore','carnivore'] as const)for(const form of [3,4])for(const part of AQ_PARTS){
    const creature={...c,diet,form,parts:UNIQUE_PARTS.includes(part)?[]:[part],uniques:UNIQUE_PARTS.includes(part)?[part]:[]};
    for(const view of ['front','side','back'] as const)for(const pose of [0,1,2,3]){
      const placements=organPlacements(creature,view,pose,123,false,false);
      expect(placements.length>0).toBe(part!=='jaws'||view!=='back');
      for(const p of placements){
        expect([p.x,p.y,p.width,p.height,p.angle,p.alpha].every(Number.isFinite)).toBe(true);
        expect(p.width).toBeGreaterThan(0);expect(p.height).toBeGreaterThan(0);
        expect(p.mountId in ADAPTABLE_RIG.sockets||p.mountId in ADAPTABLE_RIG.paths).toBe(true);
      }
    }
  }
});
it('rejects unsupported anatomy instead of fitting it silently to a different body',()=>{
  expect(bodyRig('aggressive',0)).toBeUndefined();expect(bodyRig('adaptable',5)).toBeUndefined();
  expect(()=>organPlacements({...c,form:0},'side',1,0,false,false)).toThrow('No authored');
  expect(()=>rigSocket(ADAPTABLE_RIG,c,'back',1,'mouth.lower')).toThrow('not visible');
});
it('uses body-owned socket and curve data when fitting the same part to another rig',()=>{
  const rig=structuredClone(ADAPTABLE_RIG);rig.id='test.alternate';
  rig.sockets['shoulder.left'].positions!.back=[49,44];
  const fins={...c,parts:['fins'] as typeof c.parts};
  const original=organPlacements(fins,'back',1,0,false,false);
  const fitted=organPlacements(fins,'back',1,0,false,false,rig);
  expect(fitted[0].x).toBe(original[0].x-10);
  for(const pose of rig.paths['spine.dorsal'].points.omnivore.back!)for(const point of pose)point[0]+=10;
  const plates={...c,parts:['plates'] as typeof c.parts};
  const oldArmor=organPlacements(plates,'back',1,0,false,false);
  const newArmor=organPlacements(plates,'back',1,0,false,false,rig);
  expect(newArmor[0].x).toBeCloseTo(oldArmor[0].x+10);
});
it('keeps chomp attachment cues under reduced motion while suppressing sway and pulse',()=>{
  const creature={...c,parts:['jaws','toxicTendrils','electricOrgan'] as typeof c.parts};
  const neutral=organPlacements(creature,'front',1,0,false,true);
  const chomp=organPlacements(creature,'front',3,999,false,true);
  expect(chomp.find(p=>p.part==='jaws')!.height).toBeGreaterThan(neutral.find(p=>p.part==='jaws')!.height);
  expect(chomp.find(p=>p.part==='electricOrgan')!.alpha).toBe(1);
  expect(chomp.filter(p=>p.part==='toxicTendrils')).toEqual(neutral.filter(p=>p.part==='toxicTendrils'));
});

import {expect,it} from 'vitest';
import {AQ_PARTS,UNIQUE_PARTS} from '../src/game/aquatic/tuning';
import {creatureFromLineage} from '../src/game/aquatic/creature';
import {PART_ATTACHMENTS} from '../src/game/aquatic/attachmentSchema';
import {ADAPTABLE_RIG,bodyRig,rigSocket} from '../src/game/aquatic/avatarRig';
import {organPlacements} from '../src/game/aquatic/organPlacements';
const c={...creatureFromLineage(null,'omnivore'),form:3};
it('defines every supported part and resolves every visible socket for all authored poses and diets',()=>{
  expect(Object.keys(PART_ATTACHMENTS).sort()).toEqual([...AQ_PARTS].sort());
  for(const family of ['adaptable','aggressive','cautious'] as const)
  for(const diet of ['herbivore','omnivore','carnivore'] as const)for(const form of [1,2,3,4])for(const part of AQ_PARTS){
    const creature={...c,diet,form,parts:UNIQUE_PARTS.includes(part)?[]:[part],uniques:UNIQUE_PARTS.includes(part)?[part]:[]};
    for(const view of ['front','side','back'] as const)for(const pose of [0,1,2,3]){
      const placements=organPlacements(creature,view,pose,123,false,false,bodyRig(family,form)!);
      const hidden=(part==='jaws'&&view==='back')||
        (part==='torrent'&&family==='cautious'&&form===4&&view==='front')||
        (part==='plates'&&view==='front'&&pose===3&&family!=='adaptable');
      expect(placements.length>0).toBe(!hidden);
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
it('hinges the lower jaw at one center point only during front chomp',()=>{
  const creature={...c,parts:['jaws'] as typeof c.parts};
  const lower=(view:'front'|'side',pose:number)=>organPlacements(creature,view,pose,0,false,true)
    .filter(mount=>mount.mountId==='mouth.lower');
  expect(lower('front',1)).toHaveLength(1);
  expect(lower('side',3)).toHaveLength(1);
  const halves=lower('front',3);
  expect(halves).toHaveLength(2);
  expect(halves[0].logicalId).toBe(halves[1].logicalId);
  expect([halves[0].x,halves[0].y]).toEqual([halves[1].x,halves[1].y]);
  expect(halves[0].angle).toBeGreaterThan(0);
  expect(halves[1].angle).toBe(-halves[0].angle);
  expect(halves[0].flip).not.toBe(halves[1].flip);
});

it('keeps toxic tendril roots fixed while downstream joints follow the swim clock',()=>{
  const creature={...c,parts:['toxicTendrils'] as typeof c.parts};
  const get=(clock:number,reduced=false)=>organPlacements(creature,'side',1,clock,false,reduced);
  const early=get(0),late=get(235);
  expect(new Set(early.map(section=>section.logicalId)).size).toBe(2);
  expect(early).toHaveLength(6);
  expect([early[0].x,early[0].y]).toEqual([late[0].x,late[0].y]);
  expect(early[2]).not.toEqual(late[2]);
  expect(get(0,true)).toEqual(get(235,true));
});

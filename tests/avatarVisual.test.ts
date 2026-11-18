import { expect, it } from 'vitest';
import { creatureFromLineage } from '../src/game/aquatic/creature';
import { avatarTexture } from '../src/game/aquatic/avatarVisual';
import { organPlacements } from '../src/game/aquatic/organPlacements';
import frames from '../src/game/aquatic/avatarFrames.json';
import { spineSections } from '../src/game/aquatic/spineArticulation';
const c = {...creatureFromLineage(null,'omnivore'),form:3};
it('keeps mature adaptable anatomy across diet changes alongside distinct forms and families',()=>{
  for(const diet of ['herbivore','carnivore','omnivore'] as const) {
    expect(avatarTexture({...c,diet},'a2')).toBe(`aqAdaptable-${diet}HD`);
    expect(avatarTexture({...c,diet,form:4},'a3')).toBe(`aqBody-adaptable-f4-${diet}HD`);
    expect(avatarTexture({...c,diet},'c3')).toBe(`aqBody-cautious-f3-${diet}HD`);
  }
});
it('develops attachment structure through tiers and never draws rear-facing jaws',()=>{
  const body={...c,parts:['fins','jaws','plates'] as typeof c.parts};
  const first=organPlacements(body,'front',1,0,false,false);
  const third=organPlacements({...body,partTiers:{fins:3,jaws:3,plates:3}},'front',1,0,false,false);
  expect(third.filter(p=>p.part==='plates').length).toBeGreaterThan(first.filter(p=>p.part==='plates').length);
  expect(third.filter(p=>p.part==='fins').length).toBeGreaterThan(first.filter(p=>p.part==='fins').length);
  expect(third.filter(p=>p.part==='jaws').length).toBeGreaterThan(first.filter(p=>p.part==='jaws').length);
  expect(organPlacements(body,'back',3,0,false,false).some(p=>p.part==='jaws')).toBe(false);
});
it('keeps reduced-motion attachments steady and removes swapped organs from the desired set',()=>{
  const body={...c,parts:['toxicTendrils','electricOrgan','fins'] as typeof c.parts};
  expect(organPlacements(body,'side',0,10,false,true)).toEqual(organPlacements(body,'side',2,999,false,true));
  expect(organPlacements(body,'side',0,10,false,false)).not.toEqual(organPlacements(body,'side',2,999,false,false));
  const tucked=organPlacements(body,'side',1,0,true,false).find(p=>p.part==='fins')!;
  const open=organPlacements(body,'side',1,0,false,false).find(p=>p.part==='fins')!;
  expect(tucked.width).toBeLessThan(open.width);
  expect(organPlacements({...body,parts:[]},'side',1,0,false,false)).toEqual([]);
});
it('keeps every measured pose inside the logical frame and source gutters',()=>{
  for(const diet of ['herbivore','carnivore','omnivore'] as const) {
    expect(frames.bodies[diet]).toHaveLength(12);
    frames.bodies[diet].forEach(([x,y,w,h],i)=>{
      const [ox,oy]=frames.offsets[diet][i];
      expect(x).toBeGreaterThan(0);expect(y).toBeGreaterThan(0);
      expect(x+w).toBeLessThan(1448);expect(y+h).toBeLessThan(1086);
      expect(ox).toBeGreaterThanOrEqual(0);expect(oy).toBeGreaterThanOrEqual(0);
      expect(ox+w).toBeLessThanOrEqual(384);expect(oy+h).toBeLessThanOrEqual(384);
    });
  }
});
it('wraps tier III scutes down the curved spine and flexes each scute internally',()=>{
  for (const view of ['side','back'] as const) {
    const bent=spineSections('omnivore',view,0,3,false);
    expect(new Set(bent.map(s=>s.plate)).size).toBe(7);
    expect(bent).toHaveLength(21);
    expect(Array.from({length:7},(_,plate)=>{
      const angles=bent.filter(s=>s.plate===plate).map(s=>s.angle);
      return Math.max(...angles)-Math.min(...angles);
    }).some(flex=>flex>.08)).toBe(true);
    for (let plate=0;plate<7;plate++) {
      const sections=bent.filter(s=>s.plate===plate);
      expect(sections[0].cropY).toBe(0);
      expect(sections[2].cropY+sections[2].cropHeight).toBe(1);
      expect(sections[0].cropY+sections[0].cropHeight).toBeGreaterThan(sections[1].cropY);
      expect(sections[1].cropY+sections[1].cropHeight).toBeGreaterThan(sections[2].cropY);
    }
    expect(bent.at(-1)!.width).toBeLessThan(bent[0].width);
  }
  const tail=(pose:number)=>spineSections('omnivore','back',pose,3,false).at(-1)!;
  expect(tail(0).x).toBeLessThan(tail(1).x-5);
  expect(tail(2).x).toBeGreaterThan(tail(1).x+5);
});
it('freezes the articulated spine in reduced motion and streamlines it for dash',()=>{
  const body={...c,parts:['plates'] as typeof c.parts,partTiers:{plates:3}};
  expect(organPlacements(body,'back',0,10,false,true)).toEqual(organPlacements(body,'back',2,999,false,true));
  const normal=spineSections('omnivore','side',1,3,false);
  const tucked=spineSections('omnivore','side',1,3,true);
  expect(tucked[0].width).toBeLessThan(normal[0].width);
  expect(tucked[0].height).toBeLessThan(normal[0].height);
});

import {expect,it} from 'vitest';
import {EVOLUTION_CATALOG,EVOLUTION_FAMILIES,evolutionProfile,evolutionSheet} from '../src/game/aquatic/evolutionArt';
import {bodyRig} from '../src/game/aquatic/avatarRig';
import {creatureFromLineage} from '../src/game/aquatic/creature';
import {organPlacements} from '../src/game/aquatic/organPlacements';
const diets=['herbivore','omnivore','carnivore'] as const;
it('provides twelve distinct maturation profiles with all independent diet variants',()=>{
 expect(Object.keys(EVOLUTION_CATALOG.profiles)).toHaveLength(12);
 const keys=new Set<string>();
 for(const family of EVOLUTION_FAMILIES)for(const form of [1,2,3,4]){
  const profile=evolutionProfile(family,form)!;
  expect(profile.family).toBe(family);expect(profile.form).toBe(form);
  expect(bodyRig(family,form)).toBe(profile.rig);
  expect(profile.attachmentStatus).toBe('provisional');
  for(const diet of diets){keys.add(profile.bodies[diet].key);expect(profile.bodies[diet].rects).toHaveLength(12);}
 }
 expect(keys.size).toBe(36);
});
it('keeps complete measured silhouettes inside their logical frames and source sheets',()=>{
 for(const profile of Object.values(EVOLUTION_CATALOG.profiles))for(const diet of diets){
  const sheet=profile.bodies[diet];
  sheet.rects.forEach(([x,y,w,h],i)=>{
   const [ox,oy]=sheet.offsets[i];expect([x,y,w,h,ox,oy].every(Number.isFinite)).toBe(true);
   expect(x).toBeGreaterThan(0);expect(y).toBeGreaterThan(0);
   expect(x+w).toBeLessThan(1448);expect(y+h).toBeLessThan(1086);
   expect(ox).toBeGreaterThanOrEqual(0);expect(oy).toBeGreaterThanOrEqual(0);
   expect(ox+w).toBeLessThanOrEqual(384);expect(oy+h).toBeLessThanOrEqual(384);
  });
 }
});
it('selects diet, form and temperament independently without changing inherited gameplay anatomy',()=>{
 const body={...creatureFromLineage(null,'omnivore'),form:4,parts:['toxicTendrils','electricOrgan'] as const};
 const before=JSON.stringify(body);
 for(const [family,look] of [['aggressive','3'],['adaptable','a3'],['cautious','c3']] as const){
  for(const diet of diets){
   const c={...body,diet,parts:[...body.parts]};
   expect(evolutionSheet(c,look)).toBe(evolutionProfile(family,4)!.bodies[diet]);
   expect(evolutionSheet({...c,form:3},look)!.key).not.toBe(evolutionSheet(c,look)!.key);
   for(const view of ['front','side','back'] as const)for(const pose of [0,1,2,3]){
    const placements=organPlacements(c,view,pose,123,false,false,bodyRig(family,4));
    expect(placements.some(p=>p.part==='toxicTendrils')).toBe(true);
    expect(placements.some(p=>p.part==='electricOrgan')).toBe(true);
    expect(placements.every(p=>[p.x,p.y,p.angle].every(Number.isFinite))).toBe(true);
   }
  }
 }
 expect(JSON.stringify(body)).toBe(before);
});

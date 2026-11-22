// Purpose: Browser regression for graph-generated Water worlds in the REAL scene: a fresh garden gets a version 2
//          world; a class door refuses the wrong lineage and opens for the right one; a grotto shaft opens for a
//          vitality lineage and its top shaft arrives in the vault room; the finale's hatch drops into the underchannel,
//          which crosses under the shaft and climbs into the drain; desktop and phone screenshots.
// Usage  : start a dev server on 5186 (npx vite --port 5186 --strictPort), then node tools/creature-levelgen-playtest.mjs
// Notes  : Uses scene/input fixtures like creature-stakes-playtest.mjs. Proves wiring, not fun or balance.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const out = 'build/creature-levelgen'; await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
async function open(viewport) {
  const page = await browser.newPage({ viewport }); page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://localhost:5186/?data-dir=levelgen-${viewport.width}&creatureSeed=14`);
  await page.getByRole('button', { name: 'No thanks', exact: true }).click();
  await page.getByRole('button', { name: 'Enter the garden', exact: true }).click();
  await page.getByRole('button', { name: 'Creature', exact: true }).click();
  await page.getByRole('button', { name: 'Begin exploring', exact: true }).click();
  await page.evaluate(async () => {
    const entry = document.querySelector('script[type=module][src*="/src/main.ts"]').src;
    const { game } = await import(entry), source = await (await fetch(entry)).text();
    const app = source.match(/from\s*["']([^"']*\/shell\/app\.ts[^"']*)["']/)[1];
    const { shell } = await import(app); game.loop.sleep();
    window.levelTest = { game, shell, scene: game.scene.getScene('creature') };
  });
  return page;
}
const fixture = (page, room, traits = {}) => page.evaluate(({ room, traits }) => {
  const { scene: c } = window.levelTest;
  c.close(); c.rooms.clear(); Object.assign(c.garden.traits, { gills: true, fins: true }, traits);
  Object.assign(c.garden.expedition, { basinRaised: true, torrentDiverted: true });
  c.hp = 20; c.hunger = 0; c.stun = 0; c.hurt = 0; c.enter(room, 48);
  c.enemies.forEach(e => { e.incapacitated = true; });
}, { room, traits });
const drive = (page, x, y, leap = false) => page.evaluate(({ x, y, leap }) => {
  const { scene: c, shell } = window.levelTest, start = c.room;
  for (let n = 0; n < 1800; n++) {
    const actions = [];
    if (Math.abs(c.body.x - x) > 3) actions.push(c.body.x < x ? 'move_right' : 'move_left');
    if (c.body.y > y + 3) actions.push('move_up'); else if (!leap && c.body.y < y - 3) actions.push('move_down');
    shell.input.hold('levelgen', actions); if (leap && n % 40 === 0) shell.input.inject('jump');
    c.update(0, 1000 / 60);
    if (c.room !== start || Math.abs(c.body.x - x) < 5 && Math.abs(c.body.y - y) < 20 && (!leap || c.body.onGround)) { shell.input.clearHeld(); return c.room; }
  }
  throw Error(`Route stuck in room ${c.room}: ${c.body.x},${c.body.y} -> ${x},${y}`);
}, { x, y, leap });
const use = page => page.evaluate(() => { const { scene: c, shell } = window.levelTest; shell.input.inject('interact'); c.update(0, 1000 / 60); return c.message; });
const state = page => page.evaluate(() => { const c = window.levelTest.scene; return { room: c.room, x: c.body.x, y: c.body.y, objective: c.objective, version: c.world.version, rooms: c.world.rooms.length, keyed: c.currentRoom?.spec?.keyed ?? null, name: c.currentRoom?.name }; });
const shot = async (page, name) => { await page.evaluate(() => window.levelTest.game.loop.wake()); await page.waitForTimeout(150); await page.screenshot({ path: `${out}/${name}.png` }); await page.evaluate(() => window.levelTest.game.loop.sleep()); };
try {
  const page = await open({ width: 1440, height: 900 });
  const s0 = await state(page); assert.equal(s0.version, 2, 'fresh garden plays a graph-generated world');
  // Seed 14 (step 2): rooms are found by what they are, not by number; stitched galleries shift the numbering.
  const ids = await page.evaluate(() => { const w = window.levelTest.scene.world, find = f => w.rooms.find(f);
    const host = find(r => r.spec.keyed?.opens === 'bonusOpen' && r.tier === 'easy');
    return { door: find(r => r.spec.keyed?.opens === 'keyOpen').id, host: host.id, vault: host.spec.openings.find(o => o.when === 'bonusOpen').to.room,
      current: find(r => r.current && !r.spec.stitched && r.spec.puzzle === 'lever').id, easy: w.rooms.filter(r => r.tier === 'easy').map(r => r.id),
      medium: w.rooms.filter(r => r.tier === 'medium').map(r => r.id), gallery: find(r => r.tier === 'medium' && r.spec.stitched && r.spec.puzzle === 'lever').id }; });
  assert.ok(s0.rooms > 15, `stitched world has more rooms: ${s0.rooms}`);
  // Class door (room 11, built for this lineage's class). The wrong class is refused; the right one opens it.
  await fixture(page, ids.door, { classSkills: [] });
  const door = (await state(page)).keyed; assert.equal(door.opens, 'keyOpen');
  await drive(page, door.x, door.y); assert.match(await use(page), /Only a lineage/); assert.equal((await state(page)).objective.keyOpen, undefined);
  const variant = await page.evaluate(() => window.levelTest.scene.currentRoom.spec.variant);
  await page.evaluate(v => { window.levelTest.scene.garden.traits.classSkills = [v]; }, variant);
  await use(page); assert.equal((await state(page)).objective.keyOpen, true, `${variant} opens the class door`);
  await shot(page, '01-class-door-open');
  // Grotto shaft (room 0, vitality 8). Weak lineage refused; vitality 8 opens it; climbing out the top reaches the vault.
  await fixture(page, ids.host, { vitality: 0 });
  const shaft = (await state(page)).keyed; assert.equal(shaft.opens, 'bonusOpen');
  await drive(page, shaft.x, shaft.y); assert.match(await use(page), /vitality 8/);
  await page.evaluate(() => { window.levelTest.scene.garden.traits.vitality = 8; }); await use(page);
  assert.equal((await state(page)).objective.bonusOpen, true);
  await shot(page, '02-grotto-shaft-open');
  // The climb's last jump may already carry the creature through the top shaft. Injected jump presses are
  // occasionally missed on a ledge edge in this harness, so a fall back to the floor retries the climb.
  let arrived = 0, attempts = 0;
  while (arrived === 0 && attempts++ < 4) {
    for (const [x, y, leap] of [[60, 304, false], [96, 240, true], [128, 176, true], [128, 60, true]]) {
      try { arrived = await drive(page, x, y, leap); } catch { break; }
      if (arrived !== 0) break;
    }
  }
  console.log(`grotto climb attempts: ${attempts}`);
  assert.equal(arrived, ids.vault, 'the top shaft arrives in the vault room'); const v = await state(page);
  assert.equal(v.name, 'Hidden grotto'); assert.ok(v.y > 280, 'arrives on the vault floor');
  for (let n = 0; n < 30; n++) await page.evaluate(() => window.levelTest.scene.update(0, 1000 / 60));
  assert.ok((await state(page)).y < 338, 'the arrival is stable ground');
  await shot(page, '03-hidden-grotto');
  await page.evaluate(easy => { const c = window.levelTest.scene; c.garden.expedition.visited.push(...easy); c.enter(1, 48); c.draw(); }, ids.easy);
  await shot(page, '09-minimap-explored-easy');
  // Guidance (playtest 2026-11-17): a Reedheart lineage without fins in a diverted current room is told why.
  await fixture(page, ids.current, { fins: false, gills: true });
  await page.evaluate(() => { const c = window.levelTest.scene; c.garden.expedition.unlocked = ['gills']; });
  // Without fins the current holds the creature at the water's edge, so step in and read the message.
  await page.evaluate(() => { const { scene: c, shell } = window.levelTest; shell.input.hold('levelgen', ['move_right']); for (let n = 0; n < 240; n++) c.update(0, 1000 / 60); shell.input.clearHeld(); });
  const advice = await page.evaluate(() => window.levelTest.scene.message);
  assert.match(advice, /no swimming fins/, 'current room explains missing fins');
  const rack = await page.evaluate(() => [...document.querySelectorAll('.creature-icon-rack [data-icon]')].map(b => b.dataset.icon));
  const labels = await page.evaluate(() => [...document.querySelectorAll('.creature-icon-rack .icon-row-label')].map(l => getComputedStyle(l).display !== 'none' && l.getBoundingClientRect().width > 0 ? l.textContent : null));
  assert.ok(labels.length && labels.every(Boolean), `rack row labels are visible: ${JSON.stringify(labels)}`);
  assert.ok(rack.includes('gills') && !rack.includes('fins'), `rack shows equipped gills only: ${rack}`);
  await shot(page, '05-current-guidance-and-rack');
  // Minimap: visible in rooms with explored + adjoining rooms, hidden in the hubs.
  const map = await page.evaluate(() => { const p = document.querySelector('.creature-minimap'); const c = p?.querySelector('canvas'); return { hidden: p?.hidden, w: c?.width ?? 0, label: p?.getAttribute('aria-label') }; });
  assert.ok(!map.hidden && map.w > 0, `minimap shown in a room: ${JSON.stringify(map)}`); assert.match(map.label, /Map of Water hard/);
  // Review finding 12: the nursery sample cannot be taken with the lever shut, and can once it is open.
  const pick = await page.evaluate(() => {
    const { scene: c, shell } = window.levelTest, nursery = c.world.rooms.find(r => r.name === 'Ripplefin nursery');
    c.close(); c.rooms.clear(); c.cargo = { samples: [], clears: [] }; c.garden.expedition.unlocked = []; c.enter(nursery.id, 552, 304);
    shell.input.inject('interact'); c.update(0, 1000 / 60); const shut = [...c.cargo.samples];
    c.objective.open = true; shell.input.inject('interact'); c.update(0, 1000 / 60);
    return { shut, open: [...c.cargo.samples], message: c.message };
  });
  assert.deepEqual(pick.shut, [], 'no sample while the lever is shut'); assert.deepEqual(pick.open, ['fins'], `sample once solved: ${JSON.stringify(pick)}`);
  // Hard gate on the shoreline names the missing trait and the generation route.
  await page.evaluate(() => { const c = window.levelTest.scene; c.close(); c.enter(-2, 832); c.update(0, 1000 / 60); });
  assert.match(await page.evaluate(() => window.levelTest.scene.message), /Hard needs gills and swimming fins.*Reedheart/, 'Hard gate guidance');
  assert.equal(await page.evaluate(() => document.querySelector('.creature-minimap').hidden), true, 'minimap hidden on the shoreline');
  await shot(page, '06-hard-gate-guidance');
  // Nest daughter screen: both banked, neither expressed: plan two generations.
  await page.evaluate(() => { const c = window.levelTest.scene; Object.assign(c.garden.traits, { gills: false, fins: false }); c.garden.expedition.unlocked = ['gills', 'fins']; c.heirs = []; c.enter(-1, 112); c.explored = true; c.endLife('Nest fixture.'); c.mode = 'heir'; c.draw(); });
  assert.match(await page.evaluate(() => document.body.innerText), /PLAN YOUR LINEAGE/, 'daughter screen plans the generations');
  await shot(page, '07-daughter-plan');
  // Step 1 (size-agnostic rooms): a generated lever room stretched to two screens scrolls, draws and exits correctly.
  await page.evaluate(() => {
    const c = window.levelTest.scene, r = c.world.rooms[1], width = 1280;
    c.world.rooms[1] = { ...r, spec: { ...r.spec, geometry: { cols: 80, rows: 23, width, height: 360, openTop: 6, floorRow: 19,
      water: [{ x0: 144, x1: width - 96, low: 288, raised: 224 }], enemyMinX: 72, enemyMaxX: width - 60 } } };
    c.close(); c.rooms.clear(); c.enter(1, 48); c.enemies.forEach(e => { e.incapacitated = true; });
  });
  await page.evaluate(() => { const { scene: c, shell } = window.levelTest; shell.input.hold('levelgen', ['move_right', 'pace']); for (let n = 0; n < 600 && c.body.x < 1000; n++) c.update(0, 1000 / 60); shell.input.clearHeld(); for (let n = 0; n < 60; n++) c.update(0, 1000 / 60); });
  await page.evaluate(() => window.levelTest.game.loop.wake()); await page.waitForTimeout(400); // camera follow runs in Phaser's loop
  const wide = await page.evaluate(() => { const c = window.levelTest.scene, cam = c.cameras.main; return { x: c.body.x, scroll: cam.scrollX, bounds: cam.getBounds().width, room: c.room }; });
  assert.ok(wide.x > 900 && wide.room === 1, `walked into the second screen: ${JSON.stringify(wide)}`);
  assert.ok(wide.scroll > 300 && wide.bounds === 1280, `camera follows across the wide room: ${JSON.stringify(wide)}`);
  await page.evaluate(() => window.levelTest.game.loop.sleep());
  await shot(page, '10-two-screen-room');
  // Step 1.6 loop: once the Medium seal is claimed, the hatch behind the exit wall drops into the underchannel; the
  // channel crosses under the shaft and its near climb rises into the (solved) drain chamber.
  const loop = await page.evaluate(() => {
    const { scene: c } = window.levelTest, w = c.world, finale = w.rooms.find(r => r.tier === 'medium' && r.goal), drain = w.rooms.find(r => r.tier === 'medium' && r.spec.puzzle === 'drain');
    const channel = w.rooms.find(r => r.tier === 'medium' && r.spec.puzzle === 'channel');
    c.close(); c.rooms.clear(); c.rooms.set(drain.id, { objective: { first: true, open: true, remaining: 0 } });
    c.enter(finale.id, 592, 280); c.objective = { ...c.objective, first: true, open: true, remaining: 0 }; c.enemies.forEach(e => { e.incapacitated = true; });
    for (let n = 0; n < 240 && c.room === finale.id; n++) c.update(0, 1000 / 60);
    return { room: c.room, channel: channel.id, drain: drain.id, farOpen: c.objective.farOpen, verticalOpen: c.objective.verticalOpen, width: channel.spec.geometry.width };
  });
  assert.equal(loop.room, loop.channel, `the claimed finale's hatch drops into the underchannel: ${JSON.stringify(loop)}`);
  assert.ok(loop.farOpen && loop.verticalOpen, 'both channel hatches open (finale claimed, drain solved)');
  await shot(page, '11-underchannel-arrival');
  // The stitched channel is several screens of pillars and kelp: carry the creature to the near end, then climb.
  await page.evaluate(() => { const c = window.levelTest.scene; c.body.x = 430; c.body.y = 300; c.body.vx = 0; c.body.vy = 0; for (let n = 0; n < 30; n++) c.update(0, 1000 / 60); });
  let risen = loop.channel, tries = 0;
  while (risen === loop.channel && tries++ < 4) {
    for (const [x, y, leap] of [[404, 304, false], [368, 240, true], [320, 176, true], [320, 60, true]]) {
      try { risen = await drive(page, x, y, leap); } catch { break; }
      if (risen !== loop.channel) break;
    }
  }
  console.log(`underchannel climb attempts: ${tries}`);
  assert.equal(risen, loop.drain, 'the near climb rises into the drain chamber');
  await page.evaluate(medium => { const c = window.levelTest.scene; c.garden.expedition.visited.push(...medium); c.draw(); }, ids.medium);
  await shot(page, '12-drain-after-shortcut-minimap');
  // Step 2: a stitched gallery several screens wide. Its lever opens the far exit wall; the camera follows across it.
  const gal = await page.evaluate(id => { const c = window.levelTest.scene, r = c.world.rooms.find(q => q.id === id), v = r.spec.controls[0];
    c.close(); c.rooms.clear(); c.enter(id, 48); c.enemies.forEach(e => { e.incapacitated = true; });
    const shut = c.objective.open; c.body.x = v.x; c.body.y = v.y - 2; c.body.vx = c.body.vy = 0; for (let n = 0; n < 20; n++) c.update(0, 1000 / 60);
    return { id, width: r.spec.geometry.width, segments: r.spec.stitched, shut, lever: v, right: r.right }; }, ids.gallery);
  assert.equal(gal.shut, false, 'the gallery starts closed');
  const pulled = await use(page); assert.equal((await state(page)).objective.open, true, `the stitched lever opens the gallery: ${pulled}`);
  await page.evaluate(() => window.levelTest.game.loop.wake()); await page.waitForTimeout(600);
  const galCam = await page.evaluate(() => { const cam = window.levelTest.scene.cameras.main; return { scroll: cam.scrollX, bounds: cam.getBounds().width }; });
  assert.equal(galCam.bounds, gal.width, 'camera bounds span the stitched gallery');
  await page.evaluate(() => window.levelTest.game.loop.sleep()); await shot(page, '13-stitched-gallery-lever');
  const leftGallery = await page.evaluate(w => { const { scene: c, shell } = window.levelTest; c.body.x = w - 70; c.body.y = 300; c.body.vx = c.body.vy = 0;
    shell.input.hold('levelgen', ['move_right']); for (let n = 0; n < 240 && c.room !== null; n++) { c.update(0, 1000 / 60); if (c.body.x < 100) break; } shell.input.clearHeld(); return c.room; }, gal.width);
  assert.equal(leftGallery, gal.right, `the open exit leads on: ${JSON.stringify(gal)}`);
  console.log(`stitched gallery ${gal.id}: ${gal.segments.join(' + ')}, ${gal.width}px`);
  // Seed refresh: a cleared level's entrance offers a fresh map (S + E); the level's rooms change, the others do not.
  const refresh = await page.evaluate(() => { const { scene: c, shell } = window.levelTest, w0 = c.world;
    const sig = (w, t) => JSON.stringify(w.rooms.filter(r => r.tier === t).map(r => [r.spec.stitched ?? r.spec.puzzle, r.food]));
    c.close(); c.rooms.clear(); c.mode = 'play'; Object.assign(c.garden.traits, { gills: true, fins: true }); c.garden.expedition.completed = ['easy', 'medium']; c.enter(-2, 64);
    return { before: { medium: sig(w0, 'medium'), hard: sig(w0, 'hard') } }; });
  const entrance = await page.evaluate(() => { const c = window.levelTest.scene; for (let x = 64; x < 3000; x += 8) { c.body.x = x; c.body.y = 304; c.update(0, 1000 / 60); if (/medium · completed/.test(c.message)) return { x, message: c.message }; } return null; });
  assert.ok(entrance && /S\+E: fresh map/.test(entrance.message), `cleared entrance offers a fresh map: ${JSON.stringify(entrance)}`);
  const after = await page.evaluate(() => { const { scene: c, shell } = window.levelTest; shell.input.hold('levelgen', ['move_down']); shell.input.inject('interact'); c.update(0, 1000 / 60); shell.input.clearHeld();
    const sig = (w, t) => JSON.stringify(w.rooms.filter(r => r.tier === t).map(r => [r.spec.stitched ?? r.spec.puzzle, r.food]));
    return { medium: sig(c.world, 'medium'), hard: sig(c.world, 'hard'), rerolls: c.garden.expedition.rerolls, message: c.message }; });
  assert.deepEqual(after.rerolls, { medium: 1 }); assert.notEqual(after.medium, refresh.before.medium, 'medium has a fresh map'); assert.equal(after.hard, refresh.before.hard, 'hard is unchanged');
  assert.match(after.message, /fresh path/); await shot(page, '14-seed-refresh');
  const phone = await open({ width: 390, height: 844 }); await fixture(phone, ids.door); await shot(phone, '04-phone-class-door');
  await fixture(phone, ids.current, { fins: true, gills: true }); await shot(phone, '08-phone-rack');
  assert.deepEqual(errors, []);
  console.log('Levelgen browser regression: v2 world, class door refuse/open, grotto shaft refuse/open/climb, underchannel shortcut, stitched gallery, seed refresh, desktop + phone captures, no page errors');
} finally { await browser.close(); }

// Purpose: Browser regression for damage/stun, trap-only clears, ceiling threats and reciprocal vertical routes.
// Uses explicit evolved-anatomy/room fixtures; does not claim a full progression playthrough.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const out = 'build/creature-depth'; await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto('http://localhost:5184/?data-dir=creature-depth-browser&creatureSeed=42');
  await page.getByRole('button', { name: 'No thanks', exact: true }).click();
  await page.getByRole('button', { name: 'Enter the garden', exact: true }).click();
  await page.getByRole('button', { name: 'Creature', exact: true }).click();
  await page.getByRole('button', { name: 'Begin exploring', exact: true }).click();
  await page.evaluate(async () => {
    const entry = document.querySelector('script[type=module][src*="/src/main.ts"]').src;
    const { game } = await import(entry), source = await (await fetch(entry)).text();
    const app = source.match(/from\s*["']([^"']*\/shell\/app\.ts[^"']*)["']/)[1];
    const { shell } = await import(app); game.loop.sleep();
    window.waterTest = { game, shell, scene: game.scene.getScene('creature') };
  });
  assert.equal(await page.getByRole('button', { name: 'Return to nest', exact: true }).count(), 0);
  const fixture = async room => page.evaluate(room => {
    const { scene: c } = window.waterTest;
    c.close(); c.rooms.clear(); c.cargo = { samples: [], clears: [] };
    Object.assign(c.garden.traits, { gills: true, fins: true, vitality: 20 });
    Object.assign(c.garden.expedition, { basinRaised: true, torrentDiverted: true });
    c.hp = 26; c.hunger = 0; c.stun = 0; c.hurt = 0; c.bite = 0; c.enter(room, 48);
  }, room);
  const drive = async (x, y, leap = false) => page.evaluate(({ x, y, leap }) => {
    const { scene: c, shell } = window.waterTest;
    for (let n = 0; n < 1800; n++) {
      const actions = [];
      if (Math.abs(c.body.x - x) > 3) actions.push(c.body.x < x ? 'move_right' : 'move_left');
      if (c.body.y > y + 3) actions.push('move_up');
      else if (!leap && c.body.y < y - 3) actions.push('move_down');
      shell.input.hold('stakes', actions);
      if (leap && n % 40 === 0) shell.input.inject('jump');
      c.update(0, 1000 / 60);
      if (c.mode !== 'play') throw Error(`Died en route to ${x},${y}`);
      if (Math.abs(c.body.x - x) < 5 && Math.abs(c.body.y - y) < 20) { shell.input.clearHeld(); return; }
    }
    throw Error(`Route stuck ${c.room}: ${c.body.x},${c.body.y} -> ${x},${y}`);
  }, { x, y, leap });
  const use = () => page.evaluate(() => { const { scene: c, shell } = window.waterTest; shell.input.inject('interact'); c.update(0, 1000 / 60); for (let n = 0; n < 140 && c.operation; n++) c.update(0, 1000 / 60); });
  const state = () => page.evaluate(() => { const c = window.waterTest.scene; return { room: c.room, hp: c.hp, x: c.body.x, objective: c.objective, cargo: c.cargo, garden: c.garden, mode: c.mode }; });
  const render = async name => { await page.evaluate(() => window.waterTest.game.loop.wake()); await page.waitForTimeout(100); await page.screenshot({ path: `${out}/${name}.png` }); await page.evaluate(() => window.waterTest.game.loop.sleep()); };

  await fixture(2);
  await page.evaluate(() => { const c = window.waterTest.scene; c.body.x = 104; c.body.y = 304; });
  await use(); assert.equal((await state()).objective.rigging, true);
  await drive(368, 288); await use(); assert.equal((await state()).objective.netArmed, true);
  await render('01-armed-net'); await drive(330, 288);
  await page.evaluate(() => {
    const { scene: c, shell } = window.waterTest;
    shell.input.hold('lure', ['move_down']);
    for (let n = 0; n < 1200 && !c.enemies.every(e => e.incapacitated); n++) c.update(0, 1000 / 60);
    shell.input.clearHeld();
    if (!c.objective.arenaCleared || c.enemies[0].hp !== 3 || !c.enemies[0].trapped || c.evidence.fights) throw Error('Healthy trap-only clear failed');
  });
  await render('02-trap-only-clear'); console.log('PASS collect rigging, arm net, lure actual AI: healthy arena enemy immobilized, zero bites');
  await fixture(10);
  await page.evaluate(() => { const c = window.waterTest.scene; c.body.x = 104; c.body.y = 304; });
  await use(); await drive(160, 226, true);
  for (let cycle = 0; cycle < 5; cycle++) {
    if (await page.evaluate(() => window.waterTest.scene.enemies.every(e => e.incapacitated))) break;
    await drive(352, 280); await use();
    await page.evaluate(() => {
      const { scene: c, shell } = window.waterTest;
      for (let n = 0; n < 1200 && c.objective.netArmed && c.mode === 'play'; n++) {
        // Actively hold position against the torrent and stay submerged above reed cover.
        shell.input.hold('lure', [...(c.body.x < 352 ? ['move_right'] : []), c.body.y > 280 ? 'move_up' : 'move_down']);
        c.update(0, 1000 / 60);
      }
      shell.input.clearHeld();
      if (c.mode !== 'play') throw Error('Trap-only Hard encounter died');
    });
  }
  await page.evaluate(() => { const c = window.waterTest.scene; if (!c.objective.arenaCleared || c.evidence.fights || !c.enemies.every(e => e.trapped)) throw Error(`Hard trap-only clear failed: ${c.hp}, ${c.objective.netCaught}, ${JSON.stringify(c.enemies.map(({kind,x,y,phase,incapacitated}) => ({kind,x,y,phase,incapacitated})))}, armed=${c.objective.netArmed}`); });
  await render('02b-hard-trap-only-clear'); console.log('PASS three-enemy Hard sealed encounter cleared by rig/arm/lure/rearm, zero bites');
  await fixture(7);
  await page.evaluate(() => {
    const { scene: c, shell } = window.waterTest, e = c.enemies[0];
    c.food = []; c.hp = 6; c.body.x = 276; c.body.y = 304; e.x = 296; e.phase = 'strike'; e.timer = 0.65; e.facing = -1;
    c.update(0, 1000 / 60);
    if (c.hp !== 3 || c.stun <= 0) throw Error(`Charger impact failed: ${c.hp}, ${c.stun}`);
    const fights = c.evidence.fights, jumps = c.evidence.jumps;
    shell.input.hold('stun', ['move_right', 'move_up']); shell.input.inject('attack'); shell.input.inject('jump');
    c.update(0, 1000 / 60); shell.input.clearHeld();
    if (c.evidence.fights !== fights || c.evidence.jumps !== jumps) throw Error('Stun allowed attack/jump');
    const stun = c.stun; c.open('journal'); for (let n = 0; n < 180; n++) c.update(0, 1000 / 60);
    if (c.stun !== stun) throw Error('Paused stun advanced'); c.close();
    c.stun = 0; c.hurt = 0; e.x = c.body.x + 20; e.y = c.body.y - 16; e.phase = 'strike'; e.timer = 0.65; e.facing = -1;
    c.update(0, 1000 / 60);
    if (c.mode !== 'climate') throw Error('Second charger impact was not lethal at base health');
  });
  console.log('PASS charger deals 3, suppresses controls while stunned, pause freezes stun, two hits end base-health life');
  await fixture(6);
  await page.evaluate(() => { const c = window.waterTest.scene; c.enemies[1].incapacitated = true; c.food = []; c.clock = 2; c.body.x = 368; c.body.y = 288; c.update(0, 1000 / 60); if (c.enemies[0].phase !== 'tell') throw Error('Ceiling threat did not warn'); });
  await render('03-ceiling-warning'); const beforeDodge = (await state()).hp;
  await drive(330, 288);
  await page.evaluate(() => { const c = window.waterTest.scene; for (let n = 0; n < 55; n++) c.update(0, 1000 / 60); });
  assert.equal((await state()).hp, beforeDodge); console.log('PASS ceiling shadow/tell gives a real dodge window');
  await fixture(1);
  await page.evaluate(() => {
    const { scene: c, shell } = window.waterTest; c.enemies.forEach(e => e.incapacitated = true); c.body.x = 64;
    for (const [x, y] of [[96, 240], [128, 176], [128, 80]]) {
      let reached = false;
      for (let n = 0; n < 1800; n++) {
        shell.input.hold('climb', Math.abs(c.body.x - x) > 3 ? [c.body.x < x ? 'move_right' : 'move_left'] : []);
        if (n % 40 === 0) shell.input.inject('jump'); c.update(0, 1000 / 60);
        if (c.room === 3 || Math.abs(c.body.x - x) < 5 && Math.abs(c.body.y - y) < 7 && c.body.onGround) { reached = true; break; }
      }
      if (!reached) throw Error(`Climb failed: ${c.room} ${c.body.x},${c.body.y}`);
    }
    shell.input.clearHeld();
    if (c.room !== 3 || c.body.y < 280) throw Error('Top exit did not arrive from nursery bottom');
  });
  await render('04-nursery-bottom-arrival');
  await page.evaluate(() => { const { scene: c, shell } = window.waterTest; for (let n = 0; n < 240 && c.room === 3; n++) { shell.input.hold('return', c.body.x > 129 ? ['move_left'] : []); c.update(0, 1000 / 60); } shell.input.clearHeld(); if (c.room !== 1 || c.body.y > 140) throw Error('Bottom exit did not return from parent top'); });
  await render('05-reed-top-arrival'); console.log('PASS actual jumping up ledges crosses top edge, arrives at bottom, returns through reciprocal top entrance');
  await fixture(4);
  await page.evaluate(() => {
    const { scene: c, shell } = window.waterTest; c.objective.open = true; c.body.x = 328; c.body.y = 298;
    shell.input.hold('drain', ['move_down']);
    for (let n = 0; n < 120 && c.room === 4; n++) c.update(0, 1000 / 60); shell.input.clearHeld();
    if (c.room !== 5 || c.body.y > 140 || !c.objective.verticalOpen) throw Error('Lower drain did not arrive from gallery ceiling');
    for (let n = 0; n < 25; n++) c.update(0, 1000 / 60);
    for (let n = 0; n < 150 && c.room === 5; n++) { if (n % 40 === 0) shell.input.inject('jump'); c.update(0, 1000 / 60); }
    if (c.room !== 4 || c.body.y < 280 || c.body.x !== 328) throw Error(`Gallery return failed: ${c.room}, ${c.body.x},${c.body.y}`);
  });
  console.log('PASS solved lower drain and gallery top route work both ways through real scene movement');
  await fixture(7);
  await page.evaluate(() => { const c = window.waterTest.scene; c.enemies.forEach(e => e.incapacitated = true); c.food = []; c.hp = 6; c.body.x = 128; c.body.y = 300; for (let n = 0; n < 90 && c.hp === 6; n++) c.update(0, 1000 / 60); if (c.hp !== 3 || c.body.x !== 96) throw Error(`Pit did not damage/recover: ${c.hp}, ${c.body.x}`); });
  await render('06-pit-recovery'); console.log('PASS marked pit costs 3 HP and returns to near recovery ledge');
  await fixture(6);
  await page.evaluate(() => { const c = window.waterTest.scene; c.body.x = 18; c.update(0, 1000 / 60); if (c.room !== 5 || c.body.x !== 128 || c.body.y !== 236 || c.facing !== -1) throw Error('Backtracking lost hatch side/height/facing'); });
  await fixture(2);
  await page.evaluate(() => { const c = window.waterTest.scene; c.body.x = 18; c.update(0, 1000 / 60); if (c.room !== 1 || c.body.x !== 600 || c.facing !== -1) throw Error('Standard return did not enter from right'); });
  console.log('PASS horizontal return entrances preserve direction and hatch elevation');
  await fixture(10);
  await page.evaluate(() => { const c = window.waterTest.scene; c.body.x = 352; c.body.y = 280; c.objective.rigging = true; c.objective.netArmed = true; c.update(0, 1000 / 60); });
  await page.setViewportSize({ width: 390, height: 844 }); await page.locator('[data-item="pause.resume"]').click(); await render('07-phone-depth');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.setViewportSize({ width: 844, height: 390 }); await page.locator('[data-item="pause.resume"]').click(); await render('08-landscape-depth');
  assert.deepEqual(errors, []); console.log('PASS mobile trap cues, rotation pause, no browser errors');
} catch (e) { await page.screenshot({ path: `${out}/failure.png` }); throw e; }
finally { await browser.close(); }

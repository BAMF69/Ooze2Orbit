// Purpose: Browser integration regression for physical objectives and risky cargo.
// Uses explicit evolved-anatomy/room fixtures; does not claim a full progression playthrough.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const out = 'build/creature-stakes'; await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto('http://localhost:5184/?data-dir=creature-stakes-browser&creatureSeed=42');
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
  await fixture(4);
  await page.evaluate(() => { const { scene: c, shell } = window.waterTest; shell.input.hold('stakes', ['move_right', 'pace']); for (let n = 0; n < 900; n++) c.update(0, 1000 / 60); shell.input.clearHeld(); });
  assert.ok((await state()).x < 560); assert.equal((await state()).objective.open, false);
  await fixture(4); await page.evaluate(() => window.waterTest.scene.enemies.forEach(e => e.incapacitated = true)); await drive(480, 288); await use();
  assert.equal((await state()).objective.first, true);
  await drive(140, 304); await drive(200, 236, true); await use();
  assert.equal((await state()).objective.open, true);
  await render('desktop-solved-sluice'); await drive(600, 288); await drive(48, 304);
  console.log('PASS scene D+Shift blocked, drain/backtrack/upper control solved, return route traversable');
  await page.evaluate(() => { const c = window.waterTest.scene; c.cargo = { samples: ['gills'], clears: ['easy'] }; c.endLife('Death fixture.', true); });
  let s = await state(); assert.deepEqual(s.cargo, { samples: [], clears: [] }); assert.deepEqual(s.garden.expedition.unlocked, []);
  await fixture(0);
  await page.evaluate(() => { const c = window.waterTest.scene; c.cargo = { samples: ['gills'], clears: ['easy'] }; c.enter(-1, 96); c.endLife('Nest fixture.'); });
  s = await state(); assert.ok(s.garden.expedition.unlocked.includes('gills')); assert.ok(s.garden.expedition.completed.includes('easy'));
  console.log('PASS scene death loses cargo, nest banks samples and seals');
  await fixture(5); await drive(152, 288); await drive(252, 288); await drive(280, 228); await use();
  assert.equal((await state()).objective.first, true);
  await drive(372, 244); await drive(400, 288); await drive(496, 288); await use();
  assert.equal((await state()).objective.open, true);
  await drive(400, 288); await drive(372, 244); await drive(252, 244); await drive(152, 288); await drive(96, 304);
  await drive(128, 236, true); await render('desktop-return-hatch'); await use(); assert.equal((await state()).room, 6);
  console.log('PASS switchback dive/rise/dive, lower latch, backtracking to LEFT onward hatch');
  await fixture(6);
  // Combat fixtures isolate the new rules; the bite and subdue use real scene actions.
  await fixture(7);
  await page.evaluate(() => { const c = window.waterTest.scene; c.body.x = 100; c.update(0, 1000 / 60); c.enemies.forEach(e => e.passed = true); });
  assert.equal((await state()).objective.arenaActive, true);
  assert.equal((await state()).objective.arenaCleared, false);
  await render('desktop-sealed-encounter');
  await page.evaluate(() => {
    const { scene: c, shell } = window.waterTest, e = c.enemies[0];
    e.x = 548; c.body.x = e.x - 24; c.body.y = e.y + 16; c.facing = 1;
    e.phase = 'recover'; e.timer = 1.5;
    shell.input.inject('attack'); c.update(0, 1000 / 60);
    if (e.x > 552) throw Error('Bite knocked the guard into the sealed wall');
    if (e.hp !== 1) throw Error(`Recovery bite failed: ${e.hp}`);
    shell.input.inject('interact'); c.update(0, 1000 / 60);
    if (!e.incapacitated || !c.objective.arenaCleared) throw Error('Subdual did not release seal');
    c.remember(); c.enter(7, 100); c.update(0, 1000 / 60);
    if (!c.enemies[0].incapacitated || !c.objective.arenaCleared) throw Error('Subdual did not survive revisit');
  });
  await render('desktop-subdued-encounter');
  console.log('PASS evasion cannot clear seal; actual recovery bite + E subdues, unlocks, persists on revisit');
  await fixture(4);
  await page.evaluate(() => {
    const { scene: c, shell } = window.waterTest;
    c.body.x = 480; c.body.y = 288; c.body.vx = 0;
    shell.input.inject('interact'); c.update(0, 1000 / 60); c.update(0, 1000 / 60);
    if (c.objective.first || c.operation) throw Error('Guard failed to interrupt control');
    c.enemies.forEach(e => e.incapacitated = true);
    shell.input.inject('interact'); c.update(0, 1000 / 60);
    for (let n = 0; n < 30; n++) c.update(0, 1000 / 60);
    if (c.objective.first) throw Error('Guarded control completed instantly');
    const before = c.operation.elapsed; c.open('journal');
    for (let n = 0; n < 180; n++) c.update(0, 1000 / 60);
    if (c.operation.elapsed !== before) throw Error('Paused control advanced');
    c.close();
  });
  await render('desktop-guarded-control');
  await page.evaluate(() => { const c = window.waterTest.scene; for (let n = 0; n < 120; n++) c.update(0, 1000 / 60); if (!c.objective.first) throw Error('Uncontested control did not complete'); });
  console.log('PASS guard interrupts switch; disabling guards permits timed operation; menus freeze progress');
  await fixture(6);
  await page.evaluate(() => { const c = window.waterTest.scene; c.objective = { first: true, open: true, remaining: 12 }; c.open('journal'); for (let n = 0; n < 120; n++) c.update(0, 1000 / 60); });
  assert.equal((await state()).objective.remaining, 12);
  await page.evaluate(() => window.waterTest.scene.close());
  await page.evaluate(() => { const c = window.waterTest.scene; c.body.x = 600; c.objective = { first: true, open: false, remaining: 0 }; });
  await use(); s = await state(); assert.equal(s.objective.remaining, -1); assert.equal(s.objective.open, true);
  assert.deepEqual(s.cargo.clears, []);
  console.log('PASS expired pressure offers return without granting a seal, even with uncleared enemies');
  await fixture(10);
  await page.evaluate(() => { const c = window.waterTest.scene; c.body.x = 100; c.update(0, 1000 / 60); });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-item="pause.resume"]').click(); await render('phone-objectives');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.locator('[data-item="pause.resume"]').click(); await render('landscape-objectives');
  assert.deepEqual(errors, []); console.log('PASS paused pressure clock, portrait/landscape captures, no browser errors');
} catch (e) { await page.screenshot({ path: `${out}/failure.png` }); throw e; }
finally { await browser.close(); }

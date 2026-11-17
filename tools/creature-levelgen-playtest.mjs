// Purpose: Browser regression for graph-generated Water worlds in the REAL scene: a fresh garden gets a version 2
//          world; a class door refuses the wrong lineage and opens for the right one; a grotto shaft opens for a
//          vitality lineage and its top shaft arrives in the vault room; desktop and phone screenshots.
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
  await page.goto(`http://localhost:5186/?data-dir=levelgen-${viewport.width}&creatureSeed=7`);
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
  const s0 = await state(page); assert.equal(s0.version, 2, 'fresh garden plays a graph-generated world'); assert.equal(s0.rooms, 13);
  // Class door (room 11, built for this lineage's class). The wrong class is refused; the right one opens it.
  await fixture(page, 11, { classSkills: [] });
  const door = (await state(page)).keyed; assert.equal(door.opens, 'keyOpen');
  await drive(page, door.x, door.y); assert.match(await use(page), /Only a lineage/); assert.equal((await state(page)).objective.keyOpen, undefined);
  const variant = await page.evaluate(() => window.levelTest.scene.currentRoom.spec.variant);
  await page.evaluate(v => { window.levelTest.scene.garden.traits.classSkills = [v]; }, variant);
  await use(page); assert.equal((await state(page)).objective.keyOpen, true, `${variant} opens the class door`);
  await shot(page, '01-class-door-open');
  // Grotto shaft (room 0, vitality 8). Weak lineage refused; vitality 8 opens it; climbing out the top reaches the vault.
  await fixture(page, 0, { vitality: 0 });
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
  assert.equal(arrived, 4, 'the top shaft arrives in the vault room'); const v = await state(page);
  assert.equal(v.name, 'Hidden grotto'); assert.ok(v.y > 280, 'arrives on the vault floor');
  for (let n = 0; n < 30; n++) await page.evaluate(() => window.levelTest.scene.update(0, 1000 / 60));
  assert.ok((await state(page)).y < 338, 'the arrival is stable ground');
  await shot(page, '03-hidden-grotto');
  const phone = await open({ width: 390, height: 844 }); await fixture(phone, 11); await shot(phone, '04-phone-class-door');
  assert.deepEqual(errors, []);
  console.log('Levelgen browser regression: v2 world, class door refuse/open, grotto shaft refuse/open/climb, desktop + phone captures, no page errors');
} finally { await browser.close(); }

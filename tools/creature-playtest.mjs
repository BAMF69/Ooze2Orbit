// HISTORICAL: pre-stakes full-progression script; assumes the removed Return to nest button.
// Current integration regression: tools/creature-stakes-playtest.mjs.
// Purpose: Interactive regression for the creature Water slice on its isolated dev server.
// Usage: node tools/creature-playtest.mjs [http://localhost:5184/]. Run dev.py check/test/smoke first.
// Notes: Uses a separate browser save prefix. Advances the real scene/actions deterministically for long lives;
//        initial keyboard movement, native menus, screenshots and rotation run through the browser.
// Authored: Written with Codex (GPT-6).
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const out = 'build/creature-playtest'; await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: chromium.executablePath(), args: ['--enable-unsafe-webgpu'] });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', e => errors.push(e.stack));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); if (m.type() === 'warning') console.log('BROWSER WARNING', m.text()); });
const url = new URL(process.argv[2] || 'http://localhost:5184/');
url.search = 'data-dir=creature-water-browser&creatureSeed=42';
try {
  await page.goto(url.href);
  await page.getByRole('button', { name: 'No thanks', exact: true }).click();
  await page.getByRole('button', { name: 'Enter the garden', exact: true }).click();
  await page.getByRole('button', { name: 'Creature', exact: true }).click();
  await page.getByRole('button', { name: 'Begin exploring', exact: true }).click();
  await page.locator('.creature-expedition .stage-modal[hidden]').waitFor({ state: 'attached' });
  assert.equal(await page.getByRole('button', { name: 'Water biome', exact: true }).count(), 0);
  await page.screenshot({ path: `${out}/01-overworld.png` });
  await page.keyboard.down('d');
  for (let n = 0; n < 4; n++) { await page.waitForTimeout(120); await page.screenshot({ path: `${out}/motion-${n}.png` }); }
  await page.keyboard.up('d');
  await page.keyboard.press('Space'); await page.keyboard.press('s'); await page.keyboard.press('j');
  console.log('FIXTURE', await page.evaluate(async () => {
    const entry = document.querySelector('script[type=module][src*="/src/main.ts"]').src;
    const { game } = await import(entry);
    const source = await (await fetch(entry)).text();
    const app = source.match(/from\s*["']([^"']*\/shell\/app\.ts[^"']*)["']/)?.[1];
    if (!app) throw Error('Cannot locate the entry module shell import');
    const { shell } = await import(app);
    const scene = game.scene.getScene('creature'); game.loop.sleep();
    window.waterTest = { game, shell, scene };
    if (scene.player.texture.key !== 'genWalker') throw Error('Player avatar texture is missing');
    return { entry, app, top: shell.topId, sameGame: shell.game === game, room: scene.room, x: scene.body?.x };
  }));
  const step = async (actions = [], frames = 1) => page.evaluate(({ actions, frames }) => {
    const { scene: c, shell } = window.waterTest;
    shell.input.hold('water-test', actions);
    for (let n = 0; n < frames; n++) c.update(0, 1000 / 60);
    shell.input.releaseVirtual('water-test');
    return { room: c.room, x: c.body.x, hp: c.hp, mode: c.mode, seed: c.world.seed, oxygen: c.oxygen, gateX: c.room >= 0 ? c.currentRoom.gateX : 0,
      weather: c.weather.remaining, generation: c.garden.generation, expedition: c.garden.expedition, traits: c.garden.traits };
  }, { actions, frames });
  const use = async () => { await page.evaluate(() => window.waterTest.shell.input.inject('interact')); return step(); };
  const go = async (targetRoom, x, dir = 1) => page.evaluate(({ targetRoom, x, dir }) => {
    const { scene: c, shell } = window.waterTest;
    shell.input.clearHeld(); shell.input.hold('water-test', [dir > 0 ? 'move_right' : 'move_left', 'move_down']);
    let n = 0;
    while (n++ < 8000 && (c.room !== targetRoom || (dir > 0 ? c.body.x < x : c.body.x > x)) && c.mode === 'play') {
      const shaft = c.room === 5 || c.room === 9;
      const targetY = shaft && c.body.x >= 250 && c.body.x < 365 ? 244 : (c.room === 6 || c.room === 10) && c.body.x >= 328 && c.body.x < 560 ? 228 : 288;
      shell.input.hold('water-test', [dir > 0 ? 'move_right' : 'move_left', c.body.y > targetY + 2 ? 'move_up' : 'move_down']);
      c.update(0, 1000 / 60);
    }
    shell.input.clearHeld();
    if (c.player.texture.key !== 'genWalker' || c.enemies.some(e => e.sprite.texture.key !== 'genFoe')) throw Error('An avatar has a missing texture');
    if (c.room !== targetRoom || c.mode !== 'play' || (dir > 0 ? c.body.x < x : c.body.x > x)) throw Error(`Traversal failed: room=${c.room}, target=${targetRoom}, x=${c.body.x}, hp=${c.hp}, mode=${c.mode}`);
    return c.body.x;
  }, { targetRoom, x, dir });
  const click = async name => { await page.getByRole('button', { name, exact: true }).click(); return step(); };
  const render = async file => { await page.evaluate(() => window.waterTest.game.loop.wake()); await page.waitForTimeout(120); await page.screenshot({ path: `${out}/${file}.png` }); await page.evaluate(() => window.waterTest.game.loop.sleep()); };

  const enterTier = async tier => {
    await click('Return to nest');
    await go(-1, 384); await use(); assert.equal((await step()).room, -2);
    const x = { easy: 256, medium: 544, hard: 832 }[tier];
    await go(-2, x); await use();
  };
  await go(-1, 384); await use(); assert.equal((await step()).room, -2);
  await go(-2, 544); await use(); assert.equal((await step()).room, -2);
  assert.match(await page.locator('.stage-message').innerText(), /Needs inherited gills/);
  await go(-2, 256, -1); await use(); assert.equal((await step()).room, 0);
  await go(1, 125); await use(); assert.equal((await step()).room, 3);
  await go(3, 575); await use();
  assert.deepEqual((await step()).expedition.unlocked, ['fins']);
  assert.equal((await step()).traits.fins, false);
  await go(1, 126, -1); // returning through the nursery must remain on the sluice's entrance side
  const blocked = await step(['move_right', 'move_down'], 900);
  assert.equal(blocked.room, 1); assert.ok(blocked.x < blocked.gateX);
  await render('02-sealed-sluice');
  await click('Gardener');
  const before = await step(); await step([], 120); const after = await step();
  assert.equal(after.x, before.x); assert.equal(after.hp, before.hp);
  await render('03-gardener');
  await click('Raise basin · permanent'); assert.equal((await step()).expedition.basinRaised, true);
  await go(2, 96); await use(); // environmental solution rather than combat
  await go(2, 575); await use();
  assert.equal((await step()).room, -2); assert.deepEqual((await step()).expedition.completed, ['easy']);
  assert.equal((await step()).traits.gills, false);
  await click('Return to nest'); await use(); await click('Flood · shelter and plants');
  await render('04-daughters'); await click('Tidefoot');
  assert.equal((await step()).traits.gills, true); assert.equal((await step()).generation, 2);
  assert.equal((await step()).expedition.seed, 42);
  await enterTier('medium');
  await go(4, 300); await render('09-medium-encounter');
  for (let n = 0; n < 4; n++) await render(`encounter-motion-${n}`);
  await page.setViewportSize({width:375,height:812}); await page.locator('[data-item="pause.resume"]').click(); await render('11-medium-phone');
  await page.setViewportSize({width:1440,height:900}); await page.locator('[data-item="pause.resume"]').click(); await go(5, 96); await use(); await render('10-medium-shaft'); await go(6, 96); await use(); await go(6, 575); await use();
  assert.deepEqual((await step()).expedition.completed, ['easy', 'medium']);
  await click('Return to nest'); await use(); await click('Drought · meat and stronger bites'); await click('Reedheart');
  assert.equal((await step()).traits.gills && (await step()).traits.fins, true);
  await enterTier('hard');
  await click('Gardener'); await click('Call rain · 60s');
  const rain = await step([], 60); assert.ok(rain.weather < 60 && rain.weather > 58);
  await click('Gardener'); const paused = await step([], 600); assert.equal(paused.weather, rain.weather);
  await click('Divert torrent · permanent');
  for (const id of [8, 9, 10]) { await go(id, 96); await use(); }
  await go(10, 575); await use();
  assert.equal((await step()).mode, 'won');
  const record = await page.evaluate(() => window.waterTest.shell.saves.load('lineage').envelope.data);
  assert.equal(record.species[0].stages.creature.hero.gills, true);
  assert.equal(record.species[0].stages.creature.hero.fins, true);
  assert.equal(record.species[0].diet, 'omnivore');
  assert.deepEqual(record.species[0].stages.creature.expedition.completed, ['easy', 'medium', 'hard']);
  await render('05-water-complete');
  console.log('PASS Water progression: actual-controller traversal, mandatory Gardener, two heirs, three levels and hero record');

  const saved = await page.evaluate(() => window.waterTest.shell.saves.load('creature_generations').envelope.data);
  await click('Continue to civilization');
  await page.waitForFunction(() => !document.querySelector('.creature-expedition'));
  assert.equal(await page.locator('.creature-expedition').count(), 0);
  console.log('PASS creature-to-civilization transition and native panel cleanup');
  await page.reload();
  await page.getByRole('button', { name: 'Enter the garden', exact: true }).click();
  await page.getByRole('button', { name: 'Creature', exact: true }).click();
  await page.getByRole('button', { name: 'Begin exploring', exact: true }).click();
  await page.locator('.creature-expedition .stage-modal[hidden]').waitFor({ state: 'attached' });
  const resumed = await page.evaluate(async () => {
    const entry = document.querySelector('script[type=module][src*="/src/main.ts"]').src;
    const source = await (await fetch(entry)).text();
    const app = source.match(/from\s*["']([^"']*\/shell\/app\.ts[^"']*)["']/)[1];
    const { game } = await import(entry), { shell } = await import(app);
    window.waterTest = { game, shell, scene: game.scene.getScene('creature') }; game.loop.sleep();
    return shell.saves.load('creature_generations').envelope.data;
  });
  assert.deepEqual(resumed, saved);
  console.log('PASS Water checkpoint reload after hero handoff');

  // Run viewport/pause checks on the normal browser clock, independently of deterministic scene advancement.
  await enterTier('easy');
  await page.evaluate(() => window.waterTest.game.loop.wake());
  await page.getByRole('button', { name: 'Gardener', exact: true }).click();
  await page.getByRole('button', { name: 'Call rain · 60s', exact: true }).click();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.locator('[data-item="pause.resume"]').waitFor();
  const clock = () => page.evaluate(() => { const c = window.waterTest.scene; return [c.weather.remaining, c.clock, c.body.x, c.hunger]; });
  const frozen = await clock(); await page.waitForTimeout(350); assert.deepEqual(await clock(), frozen);
  await page.locator('[data-item="pause.resume"]').click();
  await page.getByRole('button', { name: 'Gardener', exact: true }).click();
  const modalFrozen = await clock(); await page.waitForTimeout(350); assert.deepEqual(await clock(), modalFrozen);
  await page.screenshot({ path: `${out}/06-phone-gardener.png` });
  await page.getByRole('button', { name: 'Return to creature', exact: true }).click();
  await page.screenshot({ path: `${out}/07-phone-water.png` });
  await page.setViewportSize({ width: 812, height: 375 });
  await page.locator('[data-item="pause.resume"]').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/08-landscape-water.png` });
  console.log('PASS portrait/landscape layout, Gardener and rotation clock freeze');
  const upstream = await page.evaluate(async () => {
    const { shell } = window.waterTest;
    const { writeStage } = await import('/src/core/lineage.ts');
    const lineage = writeStage(undefined, 'aquatic', [{ cause: 'Aquatic regression ancestor', effect: { cautious: 0.2, adaptable: 0.1 } }], { diet: 'herbivore', parts: ['gills', 'fins'], futureAquaticField: 'keep' });
    lineage.futureTopField = { keep: true };
    shell.saves.save('lineage', lineage); shell.startGame('creature');
    return lineage;
  });
  await page.getByRole('button', { name: 'Begin exploring', exact: true }).click();
  await page.locator('.creature-expedition .stage-modal[hidden]').waitFor({ state: 'attached' });
  const incoming = await page.evaluate(() => {
    const { game, shell } = window.waterTest, c = game.scene.getScene('creature');
    return { generation: c.garden.generation, traits: c.garden.traits, data: shell.saves.load('lineage').envelope.data };
  });
  assert.equal(incoming.generation, 1); assert.equal(incoming.traits.diet, 'herbivore');
  assert.equal(incoming.traits.gills && incoming.traits.fins, true);
  assert.deepEqual(incoming.data, upstream);
  console.log('PASS different incoming aquatic lineage resets creature progress and retains diet, temperament, parts and unknown fields');
  await page.getByRole('button', { name: 'Journal', exact: true }).click();
  await page.getByRole('button', { name: 'Start a different world…', exact: true }).click();
  await page.getByRole('button', { name: 'Keep this world', exact: true }).click();
  await page.getByRole('button', { name: 'Journal', exact: true }).click();
  await page.getByRole('button', { name: 'Start a different world…', exact: true }).click();
  await page.getByRole('button', { name: 'Replace creature world', exact: true }).click();
  const newSeed = await page.evaluate(() => window.waterTest.game.scene.getScene('creature').garden.expedition.seed);
  assert.notEqual(newSeed, 42);
  console.log('PASS explicit new-world confirmation selects a different seed');
  assert.deepEqual(errors, []); console.log('PASS no browser errors');
} catch (err) { console.log('FAIL BODY', await page.locator('body').innerText()); await page.screenshot({ path: `${out}/failure.png` }); throw err; } finally { await browser.close(); }

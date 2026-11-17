// Purpose: Browser check of the creature HD avatar: each family in a real Water room, desktop and iPhone 13 mini sizes,
//          worn traits on/off, every pose frame, Reduced Motion, and a daughter (look) change, with no page errors.
// Usage  : start a dev server on 5188 (node node_modules/vite/bin/vite.js --port 5188 --strictPort), then
//          node tools/creature-hd-playtest.mjs   -> captures in build/creature-hd/
// Notes  : Proves wiring and readability in a real browser (SwiftShader), not fun, feel or device performance.
// Authored: Written with Claude (Opus 5.5) for BAMF69.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const out = 'build/creature-hd'; await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
const VIEWS = [{ name: 'desktop', width: 1440, height: 900 }, { name: 'phone-portrait', width: 375, height: 812 }, { name: 'phone-landscape', width: 812, height: 375 }];

async function open(view, family, diet) {
  const page = await browser.newPage({ viewport: { width: view.width, height: view.height } });
  page.on('pageerror', e => errors.push(`${view.name}/${family}: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`${view.name}/${family}: ${m.text()}`); });
  await page.goto(`http://localhost:5188/?data-dir=hd-${view.name}-${family}&creatureSeed=0&avatarFamily=${family}&avatarDiet=${diet}`);
  await page.getByRole('button', { name: 'No thanks', exact: true }).click();
  await page.getByRole('button', { name: 'Enter the garden', exact: true }).click();
  await page.getByRole('button', { name: 'Creature', exact: true }).click();
  await page.getByRole('button', { name: 'Begin exploring', exact: true }).click();
  await page.evaluate(async () => {
    const entry = document.querySelector('script[type=module][src*="/src/main.ts"]').src;
    const { game } = await import(entry), source = await (await fetch(entry)).text();
    const app = source.match(/from\s*["']([^"']*\/shell\/app\.ts[^"']*)["']/)[1];
    const { shell } = await import(app);
    window.hd = { game, shell, scene: game.scene.getScene('creature') };
  });
  return page;
}
/** Put the creature in Easy room 1 (seed 0: sluice, charger) standing near the reeds, with chosen traits. */
const stage = (page, traits) => page.evaluate(traits => {
  const c = window.hd.scene; c.close(); c.rooms.clear();
  Object.assign(c.garden.traits, { gills: false, fins: false, climb: false, classSkills: [] }, traits);
  c.hp = 20; c.hunger = 0; c.stun = 0; c.hurt = 0; c.enter(1, 200); c.enemies.forEach(e => { e.x = 430; e.incapacitated = false; });
  for (let n = 0; n < 30; n++) c.update(0, 1000 / 60);
}, traits);
const avatar = page => page.evaluate(() => {
  const v = window.hd.scene.avatar, s = o => ({ key: o.texture.key, frame: o.frame.name, x: Math.round(o.x), y: Math.round(o.y), flip: o.flipX, w: Math.round(o.displayWidth), vis: o.visible });
  return { body: s(v.anchor), back: v.back.map(o => s(o.sprite)), front: v.front.map(o => s(o.sprite)) };
});
const shot = (page, name) => page.screenshot({ path: `${out}/${name}.png` });

try {
  const families = [['aggressive', 'carnivore'], ['cautious', 'herbivore'], ['adaptable', 'omnivore']];
  for (const view of VIEWS) for (const [family, diet] of families) {
    const page = await open(view, family, diet);
    await stage(page, {});
    let a = await avatar(page);
    assert.equal(a.body.key, `creatureHd_${family}_${diet}`, 'lineage body sheet in use');
    assert.equal(a.body.w, 32, 'drawn at the legacy 32 px footprint');
    assert.equal(a.front.length + a.back.length, 0, 'no overlays without traits');
    await shot(page, `${view.name}-${family}-plain`);
    // Daughter-style look change: story traits + claws + class skill appear as overlays aligned with the body.
    const kit = { gills: true, fins: true, climb: true, classSkills: [family === 'aggressive' ? 'roar' : family === 'cautious' ? 'burrow' : 'tool'] };
    await stage(page, kit);
    a = await avatar(page);
    assert.equal(a.front.length, 4, 'fins, class skill, gills, claws: one front strip each');
    for (const o of a.front) { assert.equal(o.key, `creatureHd_${family}_worn`); assert.deepEqual([o.x, o.y, o.flip, o.w], [a.body.x, a.body.y, a.body.flip, a.body.w], 'overlay follows body'); }
    await shot(page, `${view.name}-${family}-traits`);
    // Every pose frame selects matching overlay frames.
    const frames = await page.evaluate(() => {
      const c = window.hd.scene, seen = [];
      for (const [bite, crouch, air] of [[0, false, false], [0.3, false, false], [0, true, false], [0, false, true]]) {
        c.bite = bite; c.body.onGround = !air; window.hd.shell.input.hold('hd', crouch ? ['move_down'] : []);
        c.update(0, 1000 / 60); const v = c.avatar; seen.push([Number(v.anchor.frame.name), ...v.front.map(o => Number(o.sprite.frame.name) % 20)]);
      }
      window.hd.shell.input.clearHeld(); return seen;
    });
    for (const f of frames) assert.ok(f.every(n => n === f[0]), `overlay frames match body ${f}`);
    if (view.name === 'desktop') {
      await page.evaluate(() => { window.hd.shell.settings.access.reduce_motion = true; });
      const rm = await page.evaluate(() => { const c = window.hd.scene, s = new Set(); for (let n = 0; n < 40; n++) { c.update(0, 1000 / 60); s.add(c.avatar.anchor.frame.name); } return [...s]; });
      assert.deepEqual(rm.map(Number).map(n => n % 4), rm.map(() => 0), 'Reduced Motion holds frame 0 of the pose');
      await page.evaluate(() => { window.hd.shell.settings.access.reduce_motion = false; });
    }
    await page.close();
  }
  // Bristle charger (C-0105): HD sheet, one row per phase, down pose when netted/subdued, feet on the floor.
  for (const view of [VIEWS[0], VIEWS[2]]) {
    const page = await open(view, 'aggressive', 'carnivore');
    await stage(page, { gills: true });
    for (const phase of ['patrol', 'tell', 'strike', 'recover', 'down']) {
      const r = await page.evaluate(phase => {
        const c = window.hd.scene, e = c.enemies.find(f => f.kind === 'charger');
        e.x = 330; e.facing = -1; e.incapacitated = phase === 'down'; if (phase !== 'down') { e.phase = phase; e.timer = 99; }
        c.body.x = 210; c.stepEnemies(0, false); if (phase !== 'down') { e.phase = phase; c.stepEnemies(0, false); }
        const b = e.sprite.getBounds();
        return { key: e.sprite.texture.key, frame: Number(e.sprite.frame.name), angle: e.sprite.angle, bottom: Math.round(b.bottom), w: Math.round(b.width) };
      }, phase);
      assert.equal(r.key, 'creatureHd_charger', 'charger uses its HD sheet');
      assert.equal(Math.floor(r.frame / 4), ['patrol', 'tell', 'strike', 'recover', 'down'].indexOf(phase), `${phase} row`);
      assert.equal(r.angle, 0, 'HD charger is posed, never rotated');
      assert.ok(r.w === 40, `drawn at the scene's 40 px charger size (${r.w})`);
      await shot(page, `${view.name}-charger-${phase}`);
    }
    await page.close();
  }
  // Ambusher, swimmer, dropper: HD sheets, phase rows, down pose; rooms from the seed-0 world.
  for (const view of [VIEWS[0], VIEWS[1]]) {
    const page = await open(view, 'adaptable', 'omnivore');
    for (const [room, kind] of [[2, 'ambusher'], [5, 'swimmer'], [6, 'dropper']]) {
      await page.evaluate(room => { const c = window.hd.scene; c.close(); c.rooms.clear(); c.garden.expedition.basinRaised = true; c.hp = 20; c.enter(room, 60); }, room);
      for (const phase of ['patrol', 'tell', 'strike', 'recover', 'down']) {
        const r = await page.evaluate(({ kind, phase }) => {
          const c = window.hd.scene, e = c.enemies.find(f => f.kind === kind);
          e.incapacitated = phase === 'down'; if (phase !== 'down') { e.phase = phase; e.timer = 99; }
          c.body.x = 60; c.stepEnemies(0, false); if (phase !== 'down') { e.phase = phase; c.stepEnemies(0, false); }
          return { key: e.sprite.texture.key, frame: Number(e.sprite.frame.name), w: Math.round(e.sprite.displayWidth) };
        }, { kind, phase });
        assert.equal(r.key, `creatureHd_${kind}`); assert.equal(Math.floor(r.frame / 4), ['patrol', 'tell', 'strike', 'recover', 'down'].indexOf(phase), `${kind} ${phase}`);
        assert.equal(r.w, kind === 'ambusher' ? 27 : 32, `${kind} keeps its legacy size`);
        if (phase === 'tell') await shot(page, `${view.name}-${kind}-tell`);
      }
    }
    await page.close();
  }
  // Water terrain (C-0106): rock tiles match collision in several rooms and states; hidden outside Water rooms.
  for (const view of VIEWS) {
    const page = await open(view, 'cautious', 'herbivore');
    for (const [room, raised, name] of [[1, false, 'easy-entry'], [1, true, 'easy-raised'], [4, true, 'medium-drain'], [9, true, 'hard']]) {
      const r = await page.evaluate(({ room, raised }) => {
        const c = window.hd.scene; c.close(); c.rooms.clear(); c.garden.expedition.basinRaised = raised; c.hp = 20; c.enter(room, 60);
        c.enemies.forEach(e => { e.incapacitated = true; }); for (let n = 0; n < 5; n++) c.update(0, 1000 / 60);
        const layer = c.roomArt.room.layer; let tiles = 0; layer.forEachTile(t => { if (t.index >= 0) tiles++; });
        return { tiles, visible: layer.visible, bg: c.roomArt.bg.visible, room: c.room };
      }, { room, raised });
      assert.equal(r.room, room); assert.ok(r.visible && r.bg, 'terrain visible in a Water room'); assert.ok(r.tiles > 120, `room ${room} has rock tiles (${r.tiles})`);
      await shot(page, `${view.name}-room-${name}`);
    }
    for (const [id, x, name] of [[-1, 140, 'overworld'], [-1, 900, 'overworld-jungle'], [-2, 420, 'shoreline']]) {
      const hub = await page.evaluate(({ id, x }) => { const c = window.hd.scene; c.close(); c.enter(id, x); for (let n = 0; n < 20; n++) c.update(0, 1000 / 60);
        let tiles = 0; c.roomArt.hub.layer.forEachTile(t => { if (t.index >= 0) tiles++; });
        return { hub: c.roomArt.hub.layer.visible, room: c.roomArt.room.layer.visible, backdrop: c.roomArt.hubBg.visible, tiles }; }, { id, x });
      assert.ok(hub.hub && hub.backdrop && !hub.room && hub.tiles > 100, `${name} shows hub terrain ${JSON.stringify(hub)}`);
      await shot(page, `${view.name}-${name}`);
    }
    await page.close();
  }
  assert.deepEqual(errors, [], 'no page or console errors');
  console.log('creature-hd playtest passed:', VIEWS.length * 3, 'family/view runs; captures in', out);
} finally { await browser.close(); }

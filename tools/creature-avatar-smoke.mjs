// Purpose: Fault-injection regression: failed creature image requests cannot create missing-texture avatars.
// Usage: node tools/creature-avatar-smoke.mjs [http://localhost:5184/]. Test-only storage and network interception.
// Authored: Written with Codex (GPT-6).
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ headless: true, executablePath: chromium.executablePath() });
try {
 for (const failure of ['none', 'none', 'none', 'once', 'decode', 'persistent']) {
  const page = await browser.newPage(); let attempts = 0, blocked = failure === 'persistent'; const warnings = [];
  page.on('console', m => { if (m.text().includes('__MISSING') || m.text().includes('has no frame')) warnings.push(m.text()); });
  page.on('pageerror', e => warnings.push(e.message));
  await page.route('**/assets/art/creature_walker.png', async route => {
    attempts++;
    if (failure === 'decode' && attempts === 1) await route.fulfill({ status: 200, contentType: 'image/png', body: 'test-only corrupt image' });
    else if (blocked || failure === 'once' && attempts === 1) await route.fulfill({ status: 404, body: 'test-only unavailable image' });
    else await route.continue();
  });
  await page.goto(`${process.argv[2] || 'http://localhost:5184/'}?data-dir=creature-avatar-${failure}`);
  await page.getByRole('button', { name: 'No thanks', exact: true }).click();
  await page.getByRole('button', { name: 'Enter the garden', exact: true }).click();
  await page.getByRole('button', { name: 'Creature', exact: true }).click();
  if (blocked) {
    await page.getByRole('button', { name: 'Retry creature images', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Begin exploring', exact: true }).count(), 0);
    blocked = false; await page.getByRole('button', { name: 'Retry creature images', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Begin exploring', exact: true }).click();
  await page.locator('.creature-expedition .stage-modal[hidden]').waitFor({ state: 'attached' });
  const avatar = await page.evaluate(async () => {
    const entry = document.querySelector('script[type=module][src*="/src/main.ts"]').src;
    const { game } = await import(entry), c = game.scene.getScene('creature');
    return { key: c.player.texture.key, frames: c.player.texture.getFrameNames().length, ready: c.ready, mode: c.mode, room: c.room };
  });
  assert.equal(avatar.key, 'genWalker'); assert.equal(avatar.frames, 20); assert.equal(avatar.ready, true);
  assert.equal(avatar.mode, 'play'); assert.equal(avatar.room, -1); assert.deepEqual(warnings, []);
  if (failure !== 'none') assert.ok(attempts >= 2);
  console.log(`PASS avatar ${failure}: ${attempts} requests, complete sprite sheet, physical overworld, no missing-frame warnings`);
  await page.close();
 }
} finally { await browser.close(); }

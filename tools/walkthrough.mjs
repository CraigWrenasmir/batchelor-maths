import { chromium } from 'playwright';
const base = 'http://127.0.0.1:8077';
const out = process.argv[2];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];
async function page(ctxOpts, url, name, steps) {
  const ctx = await browser.newContext(ctxOpts);
  const p = await ctx.newPage();
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${name}: console.${m.type()}: ${m.text()}`); });
  p.on('pageerror', (e) => errors.push(`${name}: pageerror: ${e.message}`));
  p.on('requestfailed', (r) => errors.push(`${name}: requestfailed: ${r.url()}`));
  await p.goto(base + url, { waitUntil: 'networkidle' });
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/${name}.png`, fullPage: true });
  if (steps) await steps(p, name);
  await ctx.close();
}
const ipad = { viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 };
const ipadPortrait = { viewport: { width: 768, height: 1024 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 };
const board = { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 };

await page(ipad, '/index.html', 'home-ipad');
await page(ipadPortrait, '/index.html', 'home-portrait');
await page(board, '/teacher.html', 'teacher-board');

await page(ipad, '/activities/how-many.html?preset=to50&context=mounds&seed=42', 'howmany-ipad', async (p, name) => {
  await p.getByRole('button', { name: '2', exact: true }).click();
  await p.getByRole('button', { name: '3', exact: true }).click();
  await p.getByRole('button', { name: 'That is my estimate' }).click();
  await p.screenshot({ path: `${out}/${name}-count.png`, fullPage: true });
  const items = p.locator('.scene .item');
  const n = await items.count();
  for (let i = 0; i < n - 1; i++) await items.nth(i).click();
  await p.getByRole('button', { name: 'I have counted them all' }).click();
  await p.screenshot({ path: `${out}/${name}-missed.png`, fullPage: true });
  await p.getByRole('button', { name: 'Count next' }).click();
  await p.waitForTimeout(200);
  await p.screenshot({ path: `${out}/${name}-done.png`, fullPage: true });
  const fb = await p.locator('.feedback').first().innerText();
  console.log('HOWMANY feedback:', fb.replace(/\n/g, ' | '));
});
await page(board, '/activities/how-many.html?preset=arrays&context=fish&seed=7&mode=class', 'howmany-board-arrays', async (p, name) => {
  await p.keyboard.press('h');
  await p.waitForTimeout(100);
  await p.screenshot({ path: `${out}/${name}-hint.png`, fullPage: true });
  await p.keyboard.press('r');
  await p.waitForTimeout(200);
  await p.screenshot({ path: `${out}/${name}-reveal.png`, fullPage: true });
  console.log('ARRAYS feedback:', (await p.locator('.feedback').first().innerText()).replace(/\n/g, ' | '));
});
await page(ipadPortrait, '/activities/how-many.html?preset=fives&context=mangoes&seed=9', 'howmany-portrait-fives');
await page(ipad, '/activities/how-many.html?preset=to20&context=counters&seed=3&quick=on', 'howmany-quick');

await page(ipad, '/activities/where-does-it-go.html?preset=to100&seed=5', 'line-ipad', async (p, name) => {
  const svg = p.locator('#line');
  const box = await svg.boundingBox();
  // place 4 cards at increasing positions by tapping; select each card first
  const cards = p.locator('.card');
  const n = await cards.count();
  for (let i = 0; i < n; i++) {
    await cards.nth(i).click();
    await p.mouse.click(box.x + box.width * (0.15 + i * 0.2), box.y + box.height * 0.65);
  }
  await p.screenshot({ path: `${out}/${name}-placed.png`, fullPage: true });
  await p.getByRole('button', { name: 'Check', exact: true }).click();
  await p.waitForTimeout(100);
  await p.screenshot({ path: `${out}/${name}-checked.png`, fullPage: true });
  console.log('LINE feedback:', (await p.locator('.feedback').first().innerText()).replace(/\n/g, ' | '));
  // keyboard: focus line and move
  await svg.focus();
  await p.keyboard.press('ArrowRight');
  await p.keyboard.press('Shift+ArrowRight');
});
await page(board, '/activities/where-does-it-go.html?preset=to100&game=mystery&seed=5&mode=class', 'mystery-board', async (p, name) => {
  const svg = p.locator('#line');
  const box = await svg.boundingBox();
  await p.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.65);
  await p.getByRole('button', { name: /^Guess/ }).click();
  await p.mouse.click(box.x + box.width * 0.75, box.y + box.height * 0.65);
  await p.getByRole('button', { name: /^Guess/ }).click();
  await p.keyboard.press('h');
  await p.waitForTimeout(100);
  await p.screenshot({ path: `${out}/${name}-guesses.png`, fullPage: true });
  console.log('MYSTERY feedback:', (await p.locator('.feedback').first().innerText()).replace(/\n/g, ' | '));
});
await page(ipad, '/activities/where-does-it-go.html?preset=eighths&seed=11', 'line-eighths');
await page(ipad, '/activities/where-does-it-go.html?preset=roads&seed=2', 'line-roads');
await page(ipad, '/activities/where-does-it-go.html?preset=to20&seed=8', 'line-to20-dots');

await page(ipad, '/activities/grow-the-pattern.html?preset=grow&seed=4', 'pattern-ipad', async (p, name) => {
  const cells = p.locator('.cell');
  console.log('PATTERN cells:', await cells.count());
  // fill 9 cells (lshape step 4 = 9) regardless of pattern just to exercise feedback
  for (let i = 0; i < 9; i++) await cells.nth(i).click();
  await p.getByRole('button', { name: 'Check', exact: true }).click();
  await p.waitForTimeout(100);
  await p.screenshot({ path: `${out}/${name}-checked.png`, fullPage: true });
  console.log('PATTERN feedback:', (await p.locator('.feedback').first().innerText()).replace(/\n/g, ' | '));
  await p.keyboard.press('r'); // no-op in ipad mode
});
await page(board, '/activities/grow-the-pattern.html?preset=grow-rule&seed=4&mode=class', 'pattern-board', async (p, name) => {
  await p.keyboard.press('h');
  await p.waitForTimeout(100);
  await p.screenshot({ path: `${out}/${name}-hint.png`, fullPage: true });
  await p.keyboard.press('r');
  await p.waitForTimeout(100);
  await p.screenshot({ path: `${out}/${name}-reveal.png`, fullPage: true });
  console.log('PATTERN reveal:', (await p.locator('.feedback').first().innerText()).replace(/\n/g, ' | '));
});
await page(ipad, '/activities/grow-the-pattern.html?preset=repeat&seed=6', 'repeat-ipad', async (p, name) => {
  const pal = p.locator('.palette button');
  await pal.nth(0).click(); await pal.nth(1).click(); await pal.nth(0).click();
  await p.getByRole('button', { name: 'Check', exact: true }).click();
  await p.waitForTimeout(100);
  await p.screenshot({ path: `${out}/${name}-checked.png`, fullPage: true });
  console.log('REPEAT feedback:', (await p.locator('.feedback').first().innerText()).replace(/\n/g, ' | '));
});
await page(ipad, '/docs/teacher-guides.html', 'guides');
await browser.close();
console.log('ERRORS:', errors.length);
errors.forEach((e) => console.log(' -', e));

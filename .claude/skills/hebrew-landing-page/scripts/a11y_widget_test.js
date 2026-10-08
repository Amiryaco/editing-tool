// Exercises the accessibility toolbar (assets/a11y.js) on phone and desktop: open → focus on close button,
// options + text size, Esc → focus back on the button, persistence across reload, contrast/invert/font/spacing,
// reset, the statement link, and the toolbar on a legal page. Screenshots go to <outDir>; read them.
// usage: NODE_PATH=./motion/node_modules node a11y_widget_test.js <url of index.html> <outDir>
const fs = require('fs');
const { chromium, devices } = require('playwright');
const [URL, O] = process.argv.slice(2);
(async () => {
  fs.mkdirSync(O, { recursive: true });
  const b = await chromium.launch();
  const errs = [];
  for (const [n, dev] of [['m', devices['iPhone 13']], ['d', { viewport: { width: 1440, height: 900 } }]]) {
    const c = await b.newContext({ ...dev }); const p = await c.newPage();
    p.on('pageerror', (e) => errs.push(n + ' ' + e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(n + ' console ' + m.text()));
    await p.goto(URL); await p.waitForTimeout(1200);
    await p.screenshot({ path: `${O}/${n}-0.png` });
    await p.click('.a11y__fab'); await p.waitForTimeout(200);
    console.log(n, 'focused:', await p.evaluate(() => document.activeElement.className));
    await p.screenshot({ path: `${O}/${n}-panel.png` });
    await p.click('[data-k=still]'); await p.click('[data-size="1"]'); await p.click('[data-size="1"]');
    await p.keyboard.press('Escape');
    console.log(n, 'after esc focus:', await p.evaluate(() => document.activeElement.className), 'html:', await p.evaluate(() => document.documentElement.className + ' ' + document.documentElement.style.fontSize));
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${O}/${n}-still.png` });
    await p.evaluate(() => window.scrollTo(0, innerHeight * 1.2)); await p.waitForTimeout(500);
    await p.screenshot({ path: `${O}/${n}-still2.png` });
    // persistence + contrast
    await p.click('.a11y__fab'); await p.click('[data-k=contrast]'); await p.click('[data-k=links]'); await p.click('[data-k=still]');
    await p.reload(); await p.waitForTimeout(1200);
    console.log(n, 'reloaded html:', await p.evaluate(() => document.documentElement.className), 'storyH', await p.evaluate(() => (document.querySelector('#story') || {}).offsetHeight));
    await p.evaluate(() => window.scrollTo(0, innerHeight * 4.5)); await p.waitForTimeout(800);
    await p.screenshot({ path: `${O}/${n}-contrast.png` });
    await p.click('.a11y__fab'); await p.click('[data-k=invert]'); await p.waitForTimeout(200);
    await p.screenshot({ path: `${O}/${n}-invert.png` });
    await p.click('[data-k=font]'); await p.click('[data-k=spacing]'); await p.click('[data-k=invert]'); await p.click('[data-k=gray]');
    await p.click('.a11y__close');
    await p.evaluate(() => (document.querySelector('#quiz') || document.querySelector('form') || document.body).scrollIntoView()); await p.waitForTimeout(500);
    await p.screenshot({ path: `${O}/${n}-font.png` });
    await p.click('.a11y__fab'); await p.click('.a11y__reset');
    console.log(n, 'reset html:', JSON.stringify(await p.evaluate(() => document.documentElement.className)));
    await p.click('.a11y [data-legal]'); await p.waitForTimeout(800);
    await p.screenshot({ path: `${O}/${n}-stmt.png` });
    await c.close();
  }
  const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage();
  await p.goto(URL.replace(/[^/]*$/, 'privacy.html')); await p.waitForTimeout(600); await p.click('.a11y__fab'); await p.screenshot({ path: `${O}/legal.png` });
  console.log('errors', errs);
  await b.close();
})();

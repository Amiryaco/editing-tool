// Screenshots of a landing page on the standard device matrix: the first screen, then one shot per <section>,
// then the footer. Also reports horizontal overflow and page errors.
// usage: NODE_PATH=./motion/node_modules node shoot.js <url> <outDir> [deviceKeys=m,se,p,d]
const { chromium, devices } = require('playwright');
const fs = require('fs');
const [url, out, keys = 'm,se,p,d'] = process.argv.slice(2);
const DEV = {
  m: devices['iPhone 13'], se: devices['iPhone SE'], p: devices['Pixel 7'],
  d: { viewport: { width: 1440, height: 900 } },
};
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  for (const k of keys.split(',')) {
    const c = await b.newContext({ ...DEV[k] }); const p = await c.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    p.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
    await p.goto(url); await p.waitForTimeout(1500);
    await p.screenshot({ path: `${out}/${k}-00-top.png` });
    const ids = await p.evaluate(() => [...document.querySelectorAll('main section, body > section')].map((s, i) => s.id || `s${i}`));
    let i = 1;
    for (const id of ids) {
      await p.evaluate((id) => { const s = document.getElementById(id) || document.querySelectorAll('main section, body > section')[+id.slice(1)]; s.scrollIntoView(); }, id);
      await p.waitForTimeout(700);
      await p.screenshot({ path: `${out}/${k}-${String(i++).padStart(2, '0')}-${id}.png` });
    }
    await p.evaluate(() => scrollTo(0, document.body.scrollHeight)); await p.waitForTimeout(500);
    await p.screenshot({ path: `${out}/${k}-99-end.png` });
    const over = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    console.log(k, 'sections', ids.length, 'overflowX', over, errs.length ? 'ERRORS ' + JSON.stringify(errs) : 'no errors');
    await c.close();
  }
  await b.close();
})();

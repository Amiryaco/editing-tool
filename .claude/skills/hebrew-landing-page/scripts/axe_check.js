// axe-core WCAG 2.0/2.1 A + AA scan of a page (desktop and phone), printed as a short list.
// Needs axe-core next to playwright: npm i axe-core --prefix ./motion   (or wherever NODE_PATH points)
// usage: NODE_PATH=./motion/node_modules node axe_check.js <url>
const { chromium, devices } = require('playwright');
const axePath = require.resolve('axe-core/axe.min.js');
const url = process.argv[2];
(async () => {
  const b = await chromium.launch();
  for (const [n, dev] of [['desktop', { viewport: { width: 1440, height: 900 } }], ['phone', devices['iPhone 13']]]) {
    const c = await b.newContext({ ...dev }); const p = await c.newPage();
    await p.goto(url); await p.waitForTimeout(1200);
    await p.addScriptTag({ path: axePath });
    const r = await p.evaluate(() => window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }));
    console.log(`\n${n}: ${r.violations.length} violations`);
    for (const v of r.violations) console.log(`- [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length})\n    ${v.nodes.slice(0, 3).map((x) => x.target.join(' ')).join('\n    ')}`);
    await c.close();
  }
  await b.close();
})();

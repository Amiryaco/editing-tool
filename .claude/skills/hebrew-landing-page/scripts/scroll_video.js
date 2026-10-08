// Frame-by-frame capture of the scroll story, to turn into a video:
//   ffmpeg -y -framerate 30 -i <outDir>/f%04d.jpg -c:v libx264 -pix_fmt yuv420p -crf 23 story.mp4
// usage: NODE_PATH=./motion/node_modules node scroll_video.js <url> <outDir> [--device "iPhone 13"] [--steps 270] [--vh 455] [--sel #story]
const { chromium, devices } = require('playwright');
const fs = require('fs');
const a = process.argv.slice(2);
const [url, out] = a;
const opt = (k, d) => { const i = a.indexOf(k); return i > -1 ? a[i + 1] : d; };
const devName = opt('--device', 'iPhone 13'), steps = +opt('--steps', 270), total = +opt('--vh', 455), sel = opt('--sel', '#story');
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const dev = devName === 'desktop' ? { viewport: { width: 1440, height: 900 } } : { ...devices[devName], deviceScaleFactor: 2 };
  const c = await b.newContext(dev); const p = await c.newPage();
  await p.goto(url); await p.waitForTimeout(1500);
  const top = await p.evaluate((s) => document.querySelector(s).getBoundingClientRect().top + scrollY, sel);
  const vh = await p.evaluate(() => innerHeight);
  for (let i = 0; i < steps; i++) {
    const v = total * i / (steps - 1); // story vh
    await p.evaluate((y) => window.scrollTo(0, y), top + v * vh / 100);
    await p.waitForTimeout(70); // let the lerp settle a little, like a real scroll
    await p.screenshot({ path: `${out}/f${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 80 });
  }
  await b.close();
  console.log(steps, 'frames ->', out);
})();

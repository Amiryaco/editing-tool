/* AY Digital Marketing landing page.
   1. Scroll story: a pinned stage; in 'scene' mode a vector story (gold line → phone → path to a deal → results), in 'frames' mode an image sequence (media/story/).
   2. Testimonial videos, header/dock state, lead form. */
(() => {
  'use strict';

  // ---------- config ----------
  const FORM_ENDPOINT = 'https://formsubmit.co/ajax/ay.digital10@gmail.com';
  const THANKS_URL = 'thanks.html';
  // Landscape screens get the 16:9 sequence (the same clips, reframed wider); portrait screens the 9:16 one.
  // The choice follows the window live: widen or narrow it and the sequence switches.
  const SEQS = {
    wide: { dir: 'media/story-wide/', count: 241, pattern: 'f-%04d.webp', width: 1280, height: 720 },
    tall: { dir: 'media/story/', count: 241, pattern: 'f-%04d.webp', width: 640, height: 1138 },
  };
  // 'scene': the vector story (gold line → phone → path to a deal → results), drawn in the page.
  // 'frames': the earlier liquid-gold image sequence (media/story*). Switch back here at any time.
  const STORY_MODE = 'scene';
  const wantsWide = () => window.innerWidth > window.innerHeight * 1.05 && window.innerWidth >= 700;
  let seqMode = '';
  let SEQ_DIR = '';
  let gen = 0; // bumps on every sequence switch so late image loads from the old one are ignored

  // Each beat gets its own scroll distance (in viewport heights) and its own frame range.
  // from === to is a still-frame hold. Frames: 0–120 clip A (scatter → sphere), 120–240 clip B (sphere → gold bars).
  // The gold starts moving on the very first scroll (ease 'out': full speed at once, settling at the end).
  // Later motions ease in and out, so each one glides into the next still, where its copy appears.
  const BEATS = [
    { id: 'scatter',   vh: 90,  from: 0,   to: 62,  ease: 'out' },   // droplets scatter, from the first scroll
    { id: 'scatter-h', vh: 60,  from: 62,  to: 62  },                // still: where the money gets lost
    { id: 'converge',  vh: 70,  from: 62,  to: 120, ease: 'inout' }, // everything pulls into one sphere
    { id: 'focus-h',   vh: 60,  from: 120, to: 120 },                // still: the method
    { id: 'growth',    vh: 110, from: 120, to: 240, ease: 'inout' }, // sphere turns, lands in a crown splash, bars rise
    { id: 'growth-h',  vh: 60,  from: 240, to: 240 },                // still: the result + CTA
  ];
  // Copy windows in story vh. The headline leaves early in the first motion; each later chapter fades in
  // as its motion slows down (not after it stops, which felt late) and leaves as the next motion starts.
  const COPY = [
    { beat: 'open',    from: -1e9, to: 38 },
    { beat: 'scatter', from: 72,   to: 148 },  // the motions are ~80% done here and barely moving
    { beat: 'focus',   from: 200,  to: 278 },
    { beat: 'growth',  from: 362,  to: 1e9 },
  ];

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const narrow = window.matchMedia('(max-width: 860px)');

  // ---------- scroll story ----------
  const story = $('#story');
  const stage = $('.stage', story);
  const canvas = $('.stage__canvas', story);
  const ctx = canvas.getContext('2d', { alpha: false });
  const beatsEl = new Map($$('.beat', story).map((el) => [el.dataset.beat, el]));
  const progressBar = $('.stage__progress', story);
  const totalVh = BEATS.reduce((s, b) => s + b.vh, 0);

  let manifest = null;
  let frames = [];          // HTMLImageElement | undefined
  let loaded = [];          // boolean
  let vh = window.innerHeight;
  let storyTop = 0;
  let drawn = -1;
  let wanted = 0;
  let ticking = false;
  let staticMode = false;

  function setStatic(on) {
    staticMode = on;
    story.classList.toggle('is-static', on);
    for (const el of beatsEl.values()) { el.classList.toggle('is-on', on || el.dataset.beat === 'open'); el.inert = false; }
    if (on) story.style.removeProperty('--story-h');
  }

  let measuredW = 0;
  function measure() {
    // phones resize the viewport whenever the address bar slides; keep the height stable unless the width changes
    if (window.innerWidth !== measuredW || !vh) { measuredW = window.innerWidth; vh = window.innerHeight; zoneVh = 0; }
    if (!staticMode) story.style.setProperty('--story-h', `${(totalVh / 100) * vh + vh}px`);
    storyTop = story.getBoundingClientRect().top + window.scrollY;
    sizeCanvas();
  }

  function sizeCanvas() {
    const box = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(box.width * dpr));
    const h = Math.max(1, Math.round(box.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h; drawn = -1;
      // resizing clears the bitmap: paint the current frame again right away
      if (manifest) { const k = nearestLoaded(Math.round(shown)); if (k >= 0) draw(k); }
    }
  }

  // scroll position (in story vh) → frame index, beat by beat
  function frameAt(posVh) {
    let acc = 0;
    for (const b of BEATS) {
      if (posVh <= acc + b.vh) {
        let t = clamp((posVh - acc) / b.vh, 0, 1);
        if (b.ease === 'out') t = Math.sin((Math.PI / 2) * t);
        else if (b.ease) t = 0.5 - 0.5 * Math.cos(Math.PI * t);
        return b.from + (b.to - b.from) * t;
      }
      acc += b.vh;
    }
    return BEATS[BEATS.length - 1].to;
  }

  function nearestLoaded(i) {
    if (loaded[i]) return i;
    for (let d = 1; d < frames.length; d++) {
      if (loaded[i - d]) return i - d;
      if (loaded[i + d]) return i + d;
    }
    return -1;
  }

  function draw(i) {
    const img = frames[i];
    if (!img) return;
    const cw = canvas.width, ch = canvas.height;
    const iw = manifest.width, ih = manifest.height;
    let s, dx, dy;
    if (iw > ih) {
      // wide footage on desktop: fill the whole stage edge to edge, anchored to the bottom (the top of the
      // footage is empty black and sits behind the copy)
      // never taller than the stage, and small enough that the gold (which starts ~36% down the footage)
      // begins below the copy; anchored to the bottom, the black sides fade into the page
      const dpr = canvas.width / Math.max(1, canvas.getBoundingClientRect().width);
      const room = ch - (copyMaxPx + 24) * dpr; // fixed per viewport, so the gold never resizes mid-story
      s = Math.min(Math.max(cw / iw, ch / ih), ch / ih, room / (ih * 0.64));
      dx = (cw - iw * s) / 2;
      dy = ch - ih * s;
    } else {
      // tall footage on phones: the canvas fills the screen under the header and the footage is drawn a bit
      // wider than the screen, so the gold is big; its action is centred in the space under the copy, and the
      // empty black top of the footage slides behind the copy (a black fade keeps the text clean)
      const dpr = cw / Math.max(1, canvas.getBoundingClientRect().width);
      const zoneTop = clamp((copyMaxPx + 12 - mediaTopPx) * dpr, 0, ch * 0.62);
      s = Math.max((cw * 1.18) / iw, ch / ih);
      const dh = ih * s;
      dx = (cw - iw * s) / 2;
      // the window pans gently with the action (droplets, sphere, then the bars lower in the frame)
      const focus = i < 150 ? 0.56 : i > 215 ? 0.7 : 0.56 + 0.14 * (0.5 - 0.5 * Math.cos(Math.PI * (i - 150) / 65));
      dy = clamp(zoneTop + (ch - zoneTop) * 0.5 - dh * focus, ch - dh, zoneTop * 0.6);
    }
    const dw = iw * s, dh = ih * s;
    ctx.fillStyle = '#000'; // the footage background is pure black, so letterboxed edges disappear
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);
    drawn = i;
  }

  // ---------- scene mode: a vector story driven by the scroll position (in story vh) ----------
  // 0–60 every platform at once on a jumpy line, things going wrong · 60–150 the apps fly into one phone:
  // Instagram, TikTok, Google; the budget burns, the leads barely move · 152–188 the phone becomes the first
  // step of the path · 184–236 ad → landing page → lead → call → deal · 296–400 Ads Manager with the real
  // totals of the five sample accounts, and real client messages arriving.
  const scene = (() => {
    const root = $('.scene', story);
    if (!root) return null;
    const q = (k) => $(`[data-s="${k}"]`, root);
    const qa = (k) => $$(`[data-s="${k}"]`, root);
    const S = {
      chaos: q('chaos'), chaosLine: q('chaosLine'), apps: qa('app'), toasts: qa('toast'),
      phone: q('phone'), phoneBody: q('phoneBody'), phoneIn: q('phoneIn'), scr: qa('scr'),
      burnCard: q('burnCard'), leadCard: q('leadCard'), burn: q('burn'), leads: q('leads'),
      funnel: q('funnel'), flow: q('flow'), spark: q('spark'), steps: qa('step'),
      result: q('result'), lapScreen: q('lapScreen'), lapBase: q('lapBase'), lapIn: q('lapIn'),
      vLeads: q('vLeads'), vCpl: q('vCpl'), bars: q('bars'), msgs: qa('msg'),
    };
    const NS = 'http://www.w3.org/2000/svg';
    const mk = (tag, attrs, text) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (text) n.textContent = text; return n; };
    // leads per sample account (the five accounts in the results section)
    const ACC = [['א׳', 3682], ['ב׳', 637], ['ג׳', 1877], ['ד׳', 1979], ['ה׳', 2134]];
    const maxV = Math.max(...ACC.map((a) => a[1]));
    const barEls = ACC.map(([name, v], i) => {
      const x = 246 - i * 46; // right to left, like the tabs
      const g = mk('g', {});
      const r = mk('rect', { x: x - 15, y: 248, width: 30, height: 0, rx: 3, fill: '#1877f2' });
      const val = mk('text', { class: 'sc-amb', x, y: 244, 'text-anchor': 'middle' }, '0');
      const lab = mk('text', { class: 'sc-amk', x, y: 251, 'text-anchor': 'middle' }, name);
      g.append(r, val, lab); S.bars.append(g);
      return { r, val, v, h: 66 * (v / maxV) };
    });
    const pos = (el) => [parseFloat(el.dataset.x), parseFloat(el.dataset.y)];
    [S.chaosLine, S.phoneBody, S.lapScreen].forEach((p) => p.setAttribute('stroke-dasharray', '1 1'));
    const flowLen = S.flow.getTotalLength();
    S.flow.setAttribute('stroke-dasharray', `${flowLen} ${flowLen}`);

    const seg = (x, a, b) => clamp((x - a) / (b - a), 0, 1);
    const io = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const out = (t) => 1 - Math.pow(1 - t, 3);
    const pop = (t) => { const c = 1.7; return t <= 0 ? 0 : 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }; // a soft overshoot
    const show = (el, on) => { el.style.display = on ? '' : 'none'; };
    const fmt = new Intl.NumberFormat('en-US');
    // 3D camera: [story vh, rotateX°, rotateY°, translateZ px], eased between keys. The scene starts as a tilted
    // floor, the phone turns while its screens change, the path lies like a board that stands up as the line
    // runs, and the laptop opens like a lid.
    const CAM = [
      [0, 26, -12, -40], [55, 8, 10, 0], [78, 4, -30, 0], [100, 6, -24, 10], [150, 6, 24, 10], [170, 8, 0, 0],
      [184, 44, 0, -30], [240, 14, -6, 0], [264, 4, 0, 0], [286, 4, 0, 0], [300, 48, -12, -40], [342, 8, -8, 0], [400, 2, 0, 0],
    ];
    const svgEl = $('.scene__svg', root);
    function camera(x) {
      let i = 0;
      while (i < CAM.length - 2 && x > CAM[i + 1][0]) i++;
      const [x0, ...a] = CAM[i], [x1, ...b] = CAM[i + 1];
      const t = io(clamp((x - x0) / (x1 - x0), 0, 1));
      const v = a.map((n, k) => n + (b[k] - n) * t);
      svgEl.style.transform = `translateZ(${v[2].toFixed(1)}px) rotateX(${v[0].toFixed(2)}deg) rotateY(${v[1].toFixed(2)}deg)`;
    }

    function render(x) {
      camera(x);
      // 1. chaos, then the apps fly into the phone
      const draw = 0.42 + 0.58 * out(seg(x, 0, 58));
      const gather = io(seg(x, 60, 92));
      show(S.chaos, gather < 1);
      S.chaosLine.style.strokeDashoffset = 1 - draw;
      S.chaosLine.style.opacity = 1 - gather;
      S.apps.forEach((a, i) => {
        const [ax, ay] = pos(a);
        const o = clamp((draw - parseFloat(a.dataset.at)) * 6, 0, 1);
        const j = Math.sin(x * 0.17 + i * 1.9) * 5 * (1 - gather);
        const tx = ax + (200 - ax) * gather, ty = ay + j + (150 - ay) * gather;
        a.style.opacity = o * (1 - seg(x, 82, 92));
        a.setAttribute('transform', `translate(${tx} ${ty}) scale(${(0.5 + 0.5 * pop(o)) * (1 - 0.55 * gather)}) rotate(${Math.sin(x * 0.11 + i) * 6 * (1 - gather)})`);
      });
      S.toasts.forEach((t) => {
        const [tx, ty] = pos(t);
        const o = clamp((draw - parseFloat(t.dataset.at)) * 6, 0, 1) * (1 - io(seg(x, 56, 74)));
        t.style.opacity = o;
        t.setAttribute('transform', `translate(${tx} ${ty + (1 - o) * 8}) scale(${0.8 + 0.2 * o})`);
      });

      // 2. phone
      const pd = io(seg(x, 62, 96));
      const ex = io(seg(x, 152, 186));
      show(S.phone, x > 58 && x < 192);
      S.phoneBody.style.strokeDashoffset = 1 - pd;
      S.phoneBody.style.fillOpacity = seg(x, 84, 98);
      S.phoneIn.style.opacity = seg(x, 88, 102);
      const f = seg(x, 94, 150);
      S.scr.forEach((s, i) => {
        const d = f - (0.15 + i * 0.35);
        s.style.opacity = clamp(1.8 - Math.abs(d) * 7, 0, 1);
        s.setAttribute('transform', `translate(${clamp(-d * 40, -10, 10).toFixed(1)} 0)`);
      });
      const cardsOn = seg(x, 98, 110) * (1 - seg(x, 150, 164));
      show(S.burnCard, cardsOn > 0); show(S.leadCard, cardsOn > 0);
      S.burnCard.style.opacity = cardsOn; S.leadCard.style.opacity = cardsOn;
      S.burn.setAttribute('width', (112 * io(seg(x, 100, 150))).toFixed(1));
      S.leads.setAttribute('width', (112 * (0.03 + 0.05 * seg(x, 100, 150))).toFixed(1));
      const cx = 200 + (340 - 200) * ex, cy = 160 + (110 - 160) * ex, sc = 1 - 0.72 * ex;
      S.phone.setAttribute('transform', `translate(${cx} ${cy}) scale(${sc}) translate(-200 -160)`);
      S.phone.style.opacity = 1 - seg(x, 178, 190);

      // 3. the path to a deal
      const fa = io(seg(x, 170, 190));
      const l = io(seg(x, 184, 262)); // the line draws slowly; the ball rides its tip once
      const fx = io(seg(x, 280, 304));
      show(S.funnel, x > 166 && fx < 1);
      S.funnel.style.opacity = fa * (1 - fx);
      S.funnel.setAttribute('transform', `translate(200 166) scale(${(0.9 + 0.1 * fa) * (1 - 0.2 * fx)}) translate(-200 -166)`);
      S.flow.style.strokeDashoffset = flowLen * (1 - l);
      S.steps.forEach((st, i) => {
        const at = parseFloat(st.dataset.at);
        const lit = l >= at - 0.002 && (l > 0.002 || i === 0) && x > 186;
        st.classList.toggle('is-lit', lit);
        const o = clamp((fa - i * 0.12) * 3, 0, 1);
        st.style.opacity = o;
        if (!st._xy) { const b = st.transform.baseVal.consolidate(); st._xy = [b.matrix.e, b.matrix.f]; }
        const bump = lit ? 1 + 0.06 * Math.max(0, 1 - Math.abs(l - at) * 12) : 1;
        st.setAttribute('transform', `translate(${st._xy[0]} ${st._xy[1] + (1 - o) * 10}) scale(${bump})`);
      });
      const pt = S.flow.getPointAtLength(flowLen * l);
      S.spark.setAttribute('cx', pt.x.toFixed(1)); S.spark.setAttribute('cy', pt.y.toFixed(1));
      S.spark.style.opacity = l > 0.01 ? 1 - seg(x, 262, 272) : 0;

      // 4. results
      const rs = io(seg(x, 296, 328));
      show(S.result, x > 290);
      S.lapScreen.style.strokeDashoffset = 1 - rs;
      S.lapScreen.style.fillOpacity = seg(x, 312, 328);
      S.lapBase.style.opacity = seg(x, 316, 330);
      S.lapIn.style.opacity = seg(x, 320, 336);
      const c = out(seg(x, 326, 372));
      S.vLeads.textContent = fmt.format(Math.round(9811 * c));
      S.vCpl.textContent = `₪${(28.38 * c).toFixed(2)}`;
      barEls.forEach((b, i) => {
        const g = out(seg(x, 330 + i * 6, 360 + i * 6));
        const h = b.h * g;
        b.r.setAttribute('y', (240 - h + 0).toFixed(1)); b.r.setAttribute('height', h.toFixed(1));
        b.val.setAttribute('y', (236 - h).toFixed(1));
        b.val.textContent = fmt.format(Math.round(b.v * g));
        b.val.style.opacity = g;
      });
      S.msgs.forEach((m, i) => {
        const [mx, my] = pos(m);
        const p = seg(x, 342 + i * 14, 354 + i * 14);
        m.style.opacity = clamp(p * 2, 0, 1);
        m.setAttribute('transform', `translate(${mx + (1 - out(p)) * 30} ${my}) scale(${0.85 + 0.15 * pop(p)})`);
      });
    }

    let x = -1, target = 0, running = false;
    function loop() {
      const d = target - x;
      x = x < 0 || Math.abs(d) < 0.05 || reduceMotion ? target : x + d * 0.16;
      render(x);
      if (x !== target) requestAnimationFrame(loop); else running = false;
    }
    return {
      set(v) { target = v; if (!running) { running = true; requestAnimationFrame(loop); } },
    };
  })();

  function update() {
    ticking = false;
    if (staticMode) return;
    const posPx = window.scrollY - storyTop;
    const posVh = (posPx / vh) * 100;
    const p = clamp(posVh / totalVh, 0, 1);
    progressBar.style.setProperty('--p', p.toFixed(4));

    if (STORY_MODE === 'scene' && scene) scene.set(clamp(posVh, 0, totalVh));
    if (manifest) {
      wanted = clamp(frameAt(posVh), 0, manifest.count - 1);
      prioritize(Math.round(wanted));
      startGlide();
    }

    for (const c of COPY) {
      const el = beatsEl.get(c.beat);
      const on = posVh >= c.from && posVh <= c.to;
      if (el.classList.contains('is-on') !== on) {
        el.classList.toggle('is-on', on);
        el.classList.toggle('is-past', !on && posVh > c.to);
        el.inert = !on; // hidden chapters stay out of the tab order
      }
    }

    fitMask();
    fitFade();

    const pastStory = posPx > (totalVh / 100) * vh - vh * 0.2;
    document.body.classList.toggle('after-story', pastStory);
  }

  // The shown frame glides toward the scroll position instead of jumping, so fast flicks stay smooth.
  let shown = 0;
  let gliding = false;
  function glide() {
    const diff = wanted - shown;
    shown = Math.abs(diff) < 0.3 ? wanted : shown + diff * (reduceMotion ? 1 : 0.22);
    const i = nearestLoaded(Math.round(shown));
    if (i >= 0 && i !== drawn) draw(i);
    if (shown !== wanted) requestAnimationFrame(glide); else gliding = false;
  }
  function startGlide() { if (!gliding) { gliding = true; requestAnimationFrame(glide); } }

  // Phones: the copy has a fixed zone at the top and the gold a fixed window below it. Neither moves while
  // scrolling; the zone is sized once per viewport to the tallest chapter.
  let zoneVh = 0;
  let fadeFor = null;
  let copyMaxPx = 0; // bottom of the tallest chapter's copy, in stage px
  let mediaTopPx = 0; // top of the canvas, in stage px
  // wide screens: fit the black fade to the chapter on screen (kept from the last chapter during motion)
  function fitFade() {
    const on = $('.beat.is-on', story);
    if (!on || on === fadeFor) return;
    fadeFor = on;
    const top = stage.getBoundingClientRect().top;
    let bottom = 0;
    for (const c of on.children) {
      if (c.classList.contains('actions')) continue;
      bottom = Math.max(bottom, c.getBoundingClientRect().bottom - top);
    }
    stage.style.setProperty('--fade', `${Math.round(bottom + 8)}px`);
  }

  function fitMask() {
    if (staticMode || zoneVh === vh) return;
    zoneVh = vh;
    stage.style.removeProperty('--zone');
    const top = stage.getBoundingClientRect().top;
    let bottom = 0;
    for (const el of beatsEl.values()) {
      for (const c of el.children) {
        if (c.classList.contains('actions')) continue;
        bottom = Math.max(bottom, c.getBoundingClientRect().bottom - top);
      }
    }
    copyMaxPx = Math.round(bottom); drawn = -1;
    mediaTopPx = Math.round(canvas.getBoundingClientRect().top - top);
    stage.style.setProperty('--zone', `${Math.round(clamp(bottom + 20, vh * 0.36, vh * 0.58))}px`);
    sizeCanvas();
  }

  function requestUpdate() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }

  // ---------- frame loader: bounded concurrency, nearest-first ----------
  const MAX_INFLIGHT = 6;
  let inflight = 0;
  let queue = [];
  const queued = new Set();
  const retries = new Map();

  function baseOrder(n) {
    // first frames, then a coarse pass across the whole clip, then progressively finer
    const order = [];
    const seen = new Set();
    const add = (i) => { if (i >= 0 && i < n && !seen.has(i)) { seen.add(i); order.push(i); } };
    for (let i = 0; i < 40; i++) add(i); // the first motion must be ready before the first scroll
    for (const step of [16, 8, 4, 2, 1]) for (let i = 0; i < n; i += step) add(i);
    return order;
  }

  function prioritize(center) {
    // move frames near the current position to the front of the queue
    const near = [];
    for (let d = 0; d <= 10; d++) {
      for (const i of [center + d, center - d]) {
        if (i >= 0 && i < manifest.count && !loaded[i] && !frames[i]) near.push(i);
      }
    }
    if (near.length) {
      const set = new Set(near);
      queue = near.concat(queue.filter((i) => !set.has(i)));
      near.forEach((i) => queued.add(i));
      pump();
    }
  }

  function pump() {
    while (inflight < MAX_INFLIGHT && queue.length) {
      const i = queue.shift();
      if (loaded[i] || frames[i]) continue;
      load(i);
    }
  }

  function frameUrl(i) {
    return SEQ_DIR + manifest.pattern.replace('%04d', String(i).padStart(4, '0'));
  }

  function load(i) {
    inflight++;
    const img = new Image();
    img.decoding = 'async';
    frames[i] = img;
    const g = gen;
    img.onload = () => {
      if (g !== gen) return; // a frame of a sequence we already switched away from
      inflight--;
      loaded[i] = true;
      if (!stage.classList.contains('has-frames') && loaded[0]) { stage.classList.add('has-frames'); drawn = -1; }
      // redraw if this frame is closer to what the visitor is looking at
      if (drawn < 0 || Math.abs(i - Math.round(shown)) < Math.abs(drawn - Math.round(shown))) { drawn = -1; startGlide(); }
      pump();
    };
    img.onerror = () => {
      if (g !== gen) return;
      inflight--;
      frames[i] = undefined;
      const r = (retries.get(i) || 0) + 1;
      retries.set(i, r);
      if (r <= 2) setTimeout(() => { queue.push(i); pump(); }, 800 * r);
      pump();
    };
    img.src = frameUrl(i);
  }

  function useSequence(mode) {
    seqMode = mode;
    gen++;
    const seq = SEQS[mode];
    SEQ_DIR = seq.dir;
    manifest = seq;
    stage.classList.toggle('stage--wide', mode === 'wide');
    stage.classList.remove('has-frames');
    $('.stage__poster', stage).src = SEQ_DIR + 'poster.webp';
    frames = new Array(manifest.count);
    loaded = new Array(manifest.count).fill(false);
    queue = baseOrder(manifest.count);
    queued.clear(); retries.clear();
    queue.forEach((i) => queued.add(i));
    inflight = 0;
    drawn = -1;
    measure();
    pump();
    update();
  }

  async function initStory() {
    // The story only moves when the visitor scrolls (nothing autoplays), so it stays on with "reduce motion".
    // Data saver: keep the poster and show the chapters as normal sections.
    if (STORY_MODE === 'scene' && scene) {
      stage.classList.add('stage--scene');
      measure();
      update();
      return;
    }
    const conn = navigator.connection;
    if (conn && conn.saveData) { setStatic(true); return; }
    useSequence(wantsWide() ? 'wide' : 'tall');
    window.addEventListener('resize', () => {
      const m = wantsWide() ? 'wide' : 'tall';
      if (m !== seqMode) useSequence(m);
    });
  }

  // skip the story
  $('[data-skip]').addEventListener('click', () => {
    $('#content').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  // ---------- header + mobile dock ----------
  const header = $('.top');
  const dock = $('.dock');
  const leadSection = $('#lead');
  let leadVisible = false;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      leadVisible = entries[0].isIntersecting;
      chrome();
    }, { threshold: 0.15 }).observe(leadSection);
  }
  function chrome() {
    const y = window.scrollY;
    const inStory = !staticMode && y < storyTop + (totalVh / 100) * vh - vh * 0.2;
    header.classList.toggle('is-solid', staticMode ? y > 20 : !inStory);
    const storyEnd = staticMode ? vh * 0.6 : storyTop + (totalVh / 100) * vh + vh * 0.3;
    dock.classList.toggle('is-on', y > storyEnd && !leadVisible);
  }

  window.addEventListener('scroll', () => { requestUpdate(); chrome(); }, { passive: true });
  window.addEventListener('resize', () => { fadeFor = null; measure(); requestUpdate(); chrome(); });
  narrow.addEventListener?.('change', () => { drawn = -1; measure(); requestUpdate(); });

  // ---------- testimonial videos ----------
  $$('.clip').forEach((clip) => {
    const btn = $('.clip__play', clip);
    const video = $('video', clip);
    btn.addEventListener('click', () => {
      $$('.clip video').forEach((v) => { if (v !== video) v.pause(); });
      btn.hidden = true;
      video.hidden = false;
      video.play().catch(() => {});
      track('testimonial_play');
    });
  });

  // carousels (testimonials, WhatsApp): arrows scroll by one card; RTL, so "next" moves toward the left
  $$('[data-scroll]').forEach((b) => b.addEventListener('click', () => {
    const track = $(b.dataset.scroll);
    const card = track.firstElementChild;
    const step = card ? card.getBoundingClientRect().width + 18 : track.clientWidth * 0.8;
    track.scrollBy({ left: b.dataset.dir === 'next' ? -step : step, behavior: reduceMotion ? 'auto' : 'smooth' });
  }));

  // ---------- lightbox: WhatsApp screenshots and the Ads Manager breakdowns ----------
  const box = $('#box');
  const boxBody = $('.box__body', box);
  let boxOpener = null;
  function openBox(node, title) {
    boxOpener = document.activeElement;
    $('#box-h').textContent = title || 'תצוגה מוגדלת';
    boxBody.replaceChildren(node);
    if (box.showModal) box.showModal(); else box.setAttribute('open', '');
    $('[data-close]', box).focus();
  }
  // keyboard users land back on the button that opened the dialog
  box.addEventListener('close', () => { if (boxOpener && boxOpener.focus) boxOpener.focus(); });
  $('[data-close]', box).addEventListener('click', () => box.close());
  box.addEventListener('click', (e) => { if (e.target === box) box.close(); });
  $$('[data-zoom]').forEach((b) => b.addEventListener('click', () => {
    const img = new Image();
    img.src = b.dataset.zoom;
    img.alt = $('img', b).alt;
    openBox(img, 'הודעת וואטסאפ מלקוח');
  }));
  // legal pages open in the dialog, so the visitor (and a half-filled form) stays on the page.
  // The preview build embeds them as <template id="legal-privacy"> etc.; the live site fetches the page.
  const LEGAL = { 'privacy.html': 'מדיניות פרטיות', 'terms.html': 'תנאי שימוש', 'accessibility.html': 'הצהרת נגישות' };
  document.addEventListener('click', async (e) => {
    const a = e.target.closest('a[href]');
    const page = a && a.getAttribute('href').split('#')[0];
    if (!LEGAL[page] || e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault();
    let main;
    const tpl = document.getElementById('legal-' + page.replace('.html', ''));
    if (tpl) main = tpl.content.querySelector('main').cloneNode(true);
    else {
      try {
        const res = await fetch(page);
        main = new DOMParser().parseFromString(await res.text(), 'text/html').querySelector('main');
      } catch (_) { location.href = a.href; return; }
    }
    if (!main) { location.href = a.href; return; }
    const doc = document.createElement('div'); // the page already has a <main>
    doc.className = 'legal legal--box';
    doc.append(...main.childNodes);
    doc.querySelectorAll('.legal__back').forEach((n) => n.remove());
    openBox(doc, LEGAL[page]);
    box.scrollTop = 0;
  });
  $$('[data-open]').forEach((b) => b.addEventListener('click', () => {
    openBox(document.getElementById(b.dataset.open).content.cloneNode(true), 'הפירוט המלא ממנהל המודעות');
    track('results_breakdown_open', { account: b.dataset.open });
  }));

  // results: show the real Ads Manager screenshot when it exists (img/results/r-*.webp), else keep the replica
  $$('[data-shot]').forEach((img) => {
    const reveal = () => { img.hidden = false; const r = img.parentElement.querySelector('[data-replica]'); if (r) r.hidden = true; };
    if (img.complete && img.naturalWidth) reveal(); else img.addEventListener('load', reveal);
  });

  // scale each Ads Manager replica to its column, like an image
  function fitReplicas() {
    $$('.acct__panel:not([hidden]) [data-replica]').forEach((r) => {
      const w = r.parentElement.clientWidth;
      r.style.zoom = String(Math.min(1, w / 760));
    });
  }
  window.addEventListener('resize', fitReplicas);
  fitReplicas();

  // ---------- results: account tabs + numbers that count up when they come into view ----------
  const fmt = (v, dec, prefix) => (prefix || '') + v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  function countUp(el) {
    const target = parseFloat(el.dataset.count);
    const dec = el.dataset.dec ? +el.dataset.dec : (String(el.dataset.count).split('.')[1] || '').length;
    const prefix = el.dataset.prefix || '';
    if (reduceMotion) { el.textContent = fmt(target, dec, prefix); return; }
    const t0 = performance.now(), dur = 1400;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(target * e, dec, prefix);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  const countIO = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { countIO.unobserve(en.target); countUp(en.target); } });
  }, { threshold: 0.4 }) : null;
  const watchCounts = (root) => $$('[data-count]', root).forEach((el) => (countIO ? countIO.observe(el) : null));
  watchCounts($('.kpis'));
  watchCounts($('.acct__panel:not([hidden])'));

  const tabs = $$('.acct__tab');
  function selectTab(tab) {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    $$('[data-count]', document.getElementById(tab.getAttribute('aria-controls'))).forEach(countUp);
    fitReplicas();
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t));
    t.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowLeft' ? 1 : e.key === 'ArrowRight' ? -1 : 0; // RTL
      if (!d) return;
      e.preventDefault();
      const n = tabs[(i + d + tabs.length) % tabs.length];
      n.focus(); selectTab(n);
    });
  });

  // ---------- tracking hook (Google Ads / GA4 if the tag is installed) ----------
  function track(name, params = {}) {
    if (typeof window.gtag === 'function') window.gtag('event', name, params);
    (window.dataLayer = window.dataLayer || []).push({ event: name, ...params });
  }
  $$('[data-track]').forEach((a) => a.addEventListener('click', () => track('contact_click', { method: a.dataset.track })));

  // ---------- platform check: which platform to start with, by niche, budget and social presence ----------
  // A rule-based recommendation (our working rules, not market statistics). Each answer adds points to
  // Google (G), Meta (M) and TikTok (T) and may add a reason that is shown with the result.
  // The first question is free text; keywords sort it into one of the niches below.
  const NICHES = {
    service: { k: ['עו״ד', 'עו"ד', 'עורך דין', 'עורכת דין', 'משרד עורכי', 'שיפוץ', 'שיפוצים', 'אינסטלט', 'חשמלאי', 'מנעולן', 'הובל', 'מוסך', 'גנן', 'גינון', 'הדברה', 'ניקיון', 'מיזוג', 'טכנאי', 'רואה חשבון', 'הנהלת חשבונות', 'ביטוח', 'משכנתא', 'גרר', 'אלומיניום', 'נגר', 'צבעי', 'איטום', 'דלתות', 'חלונות', 'שמאי', 'מתקין'],
      s: { G: 5, M: 2 }, r: { G: 'אנשים מחפשים את השירות שלכם בגוגל ברגע שהם צריכים אותו' } },
    clinic: { k: ['קליניק', 'טיפול', 'טיפולי', 'אסתטיק', 'רופא', 'רפואה', 'שיניים', 'פסיכולוג', 'פסיכותרפ', 'דיאטנ', 'תזונ', 'פיזיותרפ', 'הסרת שיער', 'ציפורנ', 'קוסמטיקאי', 'מספרה', 'ספר', 'בוטוקס', 'מילוי', 'כירורג', 'וטרינר', 'יוגה', 'פילאטיס', 'כושר', 'עיסוי', 'רפלקס', 'נטורופת', 'איפור', 'גבות', 'ריסים', 'מכון'],
      s: { G: 3, M: 4, T: 2 }, r: { M: 'התחום שלכם נמכר דרך תמונות, לפני ואחרי ואמון, וזה המגרש של מטא' } },
    realestate: { k: ['נדל', 'דירה', 'דירות', 'יזם', 'יזמות', 'תיווך', 'מתווך', 'נכס', 'קבלן', 'פרויקט מגורים'],
      s: { G: 2, M: 4, T: 2 }, r: { M: 'במטא אפשר להגיע לקונים לפני שהם מתחילים לחפש' } },
    food: { k: ['מסעד', 'אוכל', 'קייטרינג', 'בר ', 'בית קפה', 'קפה', 'אירוע', 'חתונ', 'צימר', 'מלון', 'פנאי', 'אטרקצי', 'הפק', 'מאפי', 'פיצ', 'המבורגר', 'סושי', 'שף', 'גלידה', 'בירה', 'יין'],
      s: { G: 1, M: 4, T: 4 }, r: { T: 'תחום חוויתי וויזואלי, שמתאים לסרטונים קצרים' } },
    ecom: { k: ['חנות', 'אונליין', 'מוצר', 'איקומרס', 'שופיפיי', 'בגד', 'אופנה', 'תכשיט', 'קוסמטיקה', 'טיפוח', 'משלוח', 'אתר מכירות', 'צעצוע', 'ריהוט', 'רהיט'],
      s: { G: 3, M: 4, T: 3 }, r: { M: 'מטא חזקה במכירת מוצרים ובפרסום חוזר למי שכבר ביקר בחנות' } },
    b2b: { k: ['b2b', 'לעסקים', 'תוכנה', 'saas', 'מערכת', 'ייעוץ עסקי', 'יועץ עסקי', 'הייטק', 'it', 'סייבר', 'יבוא', 'סיטונ', 'תעשי', 'מפעל', 'לוגיסטי', 'מיתוג', 'סוכנות'],
      s: { G: 4, M: 2 }, r: { G: 'מקבלי החלטות מחפשים ספקים בגוגל' } },
    courses: { k: ['קורס', 'אימון', 'קואצ', 'מאמן', 'מאמנת', 'הרצא', 'סדנ', 'מנטור', 'ליווי', 'לימוד', 'דיגיטלי', 'תוכנית', 'מורה', 'שיעור'],
      s: { G: 1, M: 4, T: 3 }, r: { M: 'קורסים ואימון נמכרים דרך תוכן ואמון, ומטא מאפשרת לבנות את זה בהדרגה' } },
    other: { k: [], s: { G: 2, M: 3, T: 2 } },
  };
  function nicheOf(text) {
    const t = ` ${text.toLowerCase()} `;
    let best = 'other', hits = 0;
    for (const [id, N] of Object.entries(NICHES)) {
      const h = N.k.filter((w) => t.includes(w.toLowerCase())).length;
      if (h > hits) { hits = h; best = id; }
    }
    return best;
  }
  const QUIZ = [
    { id: 'niche', q: 'מה העסק שלכם?', text: true, ph: 'לדוגמה: קליניקה, עורך דין, חנות', chips: ['עורך דין', 'קליניקה', 'נדל״ן', 'חנות אונליין'] },
    { id: 'search', q: 'הלקוחות מחפשים את מה שאתם מוכרים?', a: [
      { t: 'כן, באופן פעיל', s: { G: 4 }, r: { G: 'יש ביקוש קיים בחיפוש, ושם הליד הכי חם' } },
      { t: 'לא, צריך להראות להם', s: { G: -2, M: 2, T: 2 }, r: { M: 'צריך ליצור את הביקוש ולא רק לתפוס אותו, ובשביל זה צריך פלטפורמת תוכן' } },
      { t: 'גם וגם', s: { G: 2, M: 1 } },
    ] },
    { id: 'age', q: 'מה הגיל של רוב הלקוחות?', a: [
      { t: '18–34', s: { M: 1, T: 3 }, r: { T: 'הקהל הצעיר שלכם מבלה הרבה בטיקטוק' } },
      { t: '35–54', s: { G: 1, M: 2 }, r: { M: 'בגילאים האלה פייסבוק ואינסטגרם חזקות במיוחד' } },
      { t: '55 ומעלה', s: { G: 2, M: 1, T: -3 }, r: { G: 'קהל מבוגר יותר נוטה לחפש בגוגל, ופחות נמצא בטיקטוק' } },
      { t: 'מגוון', s: { M: 1 } },
    ] },
    { id: 'budget', q: 'תקציב פרסום חודשי?', a: [
      { t: 'עד ₪3,000', v: 1 }, { t: '₪3,000–7,000', v: 2 }, { t: '₪7,000–15,000', v: 3 }, { t: 'מעל ₪15,000', v: 4 },
    ] },
    { id: 'social', q: 'הנוכחות שלכם ברשתות היום?', a: [
      { t: 'כמעט אין', s: { T: -1 }, r: { G: 'בלי נוכחות ברשתות, גוגל לא דורש תוכן כדי להתחיל להביא פניות' } },
      { t: 'יש עמוד, לא פעיל', s: { M: 1 } },
      { t: 'מעלים באופן קבוע', s: { M: 2, T: 1 }, r: { M: 'יש לכם תוכן קיים, אפשר להפוך אותו למודעות ולפרסם מחדש למי שכבר מכיר' } },
      { t: 'קהל גדול ופעיל', s: { M: 2, T: 2 }, r: { M: 'קהל קיים הוא דלק לפרסום חוזר ולקהלים דומים' } },
    ] },
    { id: 'video', q: 'אתם יכולים לצלם סרטונים קצרים?', a: [
      { t: 'כן, בקלות', s: { M: 1, T: 3 }, r: { T: 'אתם מוכנים לצלם, וזה התנאי הראשון להצליח בטיקטוק' } },
      { t: 'קצת', s: { T: 1 } },
      { t: 'לא', s: { T: -4 } },
    ] },
    { id: 'goal', q: 'מה הכי חשוב לכם עכשיו?', a: [
      { t: 'לידים, מהר', s: { G: 2, M: 1 }, r: { G: 'המטרה היא פניות מהירות, וגוגל מביא את מי שכבר מוכן לקנות' } },
      { t: 'מכירות אונליין', s: { G: 1, M: 2, T: 1 } },
      { t: 'מותג וקהל', s: { G: -1, M: 2, T: 2 }, r: { T: 'בניית קהל ומותג עובדת הכי טוב בפלטפורמות תוכן' } },
    ] },
  ];
  const PLAT = {
    G: { name: 'גוגל', full: 'Google Ads', first: 'קמפיין חיפוש על מילים שמראות כוונת קנייה, עם מעקב המרות מהיום הראשון.' },
    M: { name: 'מטא', full: 'פייסבוק ואינסטגרם', first: 'קמפיין לידים עם 3 מודעות שונות (סרטון, תמונה והמלצה), ופרסום חוזר למי שכבר ראה אתכם.' },
    T: { name: 'טיקטוק', full: 'TikTok', first: '3–5 סרטונים קצרים ואותנטיים, ורק אחרי שאחד מהם תופס, מגדילים תקציב.' },
  };

  const quizBox = $('[data-quiz]');
  if (quizBox) {
    const answers = []; // index of the picked answer, or the typed text for a text question
    let step = 0;
    const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
    const next = () => { if (step < QUIZ.length - 1) { step++; renderStep(); } else renderResult(); };

    function renderStep() {
      const Q = QUIZ[step];
      const wrap = el('div', 'quiz__step');
      const bar = el('div', 'quiz__bar'); bar.setAttribute('aria-hidden', 'true');
      const fill = el('span'); fill.style.width = `${(step / QUIZ.length) * 100}%`; bar.append(fill);
      const meta = el('p', 'quiz__meta', `שאלה ${step + 1} מתוך ${QUIZ.length}`);
      const fs = el('fieldset', 'quiz__q');
      const lg = el('legend', 'quiz__legend', Q.q);
      fs.append(lg);
      if (Q.text) {
        const row = el('form', 'quiz__text');
        const inp = el('input'); inp.type = 'text'; inp.placeholder = Q.ph; inp.value = answers[step] || '';
        inp.setAttribute('aria-label', Q.q); inp.maxLength = 80; inp.autocomplete = 'off';
        const go = el('button', 'quiz__go', 'המשך'); go.type = 'submit';
        row.append(inp, go);
        row.addEventListener('submit', (e) => {
          e.preventDefault();
          const v = inp.value.trim();
          if (!v) { inp.focus(); inp.setAttribute('aria-invalid', 'true'); return; }
          answers[step] = v; next();
        });
        const chips = el('div', 'quiz__chips');
        Q.chips.forEach((c) => {
          const b = el('button', 'quiz__chip', c); b.type = 'button';
          b.addEventListener('click', () => { answers[step] = c; next(); });
          chips.append(b);
        });
        fs.append(row, chips);
      } else {
        const opts = el('div', 'quiz__opts');
        Q.a.forEach((A, k) => {
          const b = el('button', 'quiz__opt', A.t);
          b.type = 'button';
          if (answers[step] === k) b.classList.add('is-picked');
          b.addEventListener('click', () => { answers[step] = k; next(); });
          opts.append(b);
        });
        fs.append(opts);
      }
      wrap.append(bar, meta, fs);
      if (step > 0) {
        const back = el('button', 'quiz__back', 'חזרה לשאלה הקודמת');
        back.type = 'button';
        back.addEventListener('click', () => { step--; renderStep(); });
        wrap.append(back);
      }
      quizBox.replaceChildren(wrap);
      if (quizBox.dataset.started) { lg.setAttribute('tabindex', '-1'); lg.focus({ preventScroll: true }); }
      if (quizBox.dataset.started) track('platform_check_step', { step: step + 1 });
      quizBox.dataset.started = '1';
    }

    function compute() {
      const sc = { G: 0, M: 0, T: 0 };
      const reasons = { G: [], M: [], T: [] };
      let budget = 1;
      const add = (A) => {
        for (const k in A.s || {}) sc[k] += A.s[k];
        for (const k in A.r || {}) reasons[k].push(A.r[k]);
      };
      QUIZ.forEach((Q, i) => {
        if (Q.text) { add(NICHES[nicheOf(answers[i])]); return; }
        const A = Q.a[answers[i]];
        if (Q.id === 'budget') { budget = A.v; return; }
        add(A);
      });
      const order = Object.keys(sc).sort((a, b) => sc[b] - sc[a]);
      const top = sc[order[0]];
      // how many platforms the budget can carry: a small budget spread thin learns nothing
      const maxN = budget === 1 ? 1 : budget === 2 ? 2 : 3;
      const keep = order.filter((k, i) => i === 0 || (i < maxN && sc[k] >= Math.max(3, top * (budget === 2 ? 0.75 : 0.55))));
      let split;
      if (keep.length === 1) split = { [keep[0]]: 100 };
      else if (budget === 2) split = { [keep[0]]: 70, [keep[1]]: 30 };
      else {
        const sum = keep.reduce((s, k) => s + Math.max(1, sc[k]), 0);
        split = {};
        keep.forEach((k) => { split[k] = Math.max(15, Math.round((Math.max(1, sc[k]) / sum) * 20) * 5); });
        split[keep[0]] += 100 - keep.reduce((s, k) => s + split[k], 0);
      }
      return { keep, split, reasons, budget };
    }

    function summary(res) {
      return QUIZ.map((Q, i) => `${Q.q} ${Q.text ? answers[i] : Q.a[answers[i]].t}`).join(' | ') +
        ` || המלצה: ${res.keep.map((k) => `${PLAT[k].name} ${res.split[k]}%`).join(', ')}`;
    }

    function renderResult() {
      const res = compute();
      const { keep, split, reasons, budget } = res;
      const P = PLAT[keep[0]];
      const wrap = el('div', 'quiz__result');
      wrap.append(el('p', 'quiz__meta', 'ההמלצה שלנו'));
      const h = el('h3', 'quiz__title');
      h.append(document.createTextNode('להתחיל ב'), el('span', 'gold', P.name));
      h.setAttribute('tabindex', '-1');
      wrap.append(h);
      const to = /^[A-Za-z]/.test(P.full) ? 'ל-' : 'ל';
      wrap.append(el('p', 'quiz__lead', keep.length === 1
        ? (budget === 1 ? `בתקציב הזה עדיף להתרכז בפלטפורמה אחת ולעשות אותה טוב: ${P.full}.` : `כל התקציב ${to}${P.full}, עד שהיא עובדת ומביאה תוצאות.`)
        : 'ככה הייתי מחלק את התקציב בהתחלה:'));
      if (keep.length > 1) {
        const bars = el('div', 'quiz__split');
        keep.forEach((k) => {
          const row = el('div', 'quiz__row');
          row.append(el('span', 'quiz__pname', PLAT[k].name));
          const tr = el('span', 'quiz__track'); const f = el('span'); f.style.width = `${split[k]}%`; tr.append(f);
          row.append(tr, el('span', 'quiz__pct', `${split[k]}%`));
          bars.append(row);
        });
        wrap.append(bars);
      }
      const why = [...new Set(keep.flatMap((k) => reasons[k]))].slice(0, 4);
      if (why.length) {
        wrap.append(el('p', 'quiz__h4', 'למה'));
        const ul = el('ul', 'quiz__why');
        why.forEach((r) => ul.append(el('li', '', r)));
        wrap.append(ul);
      }
      wrap.append(el('p', 'quiz__h4', 'הצעד הראשון'));
      wrap.append(el('p', 'quiz__first', P.first));

      // short capture: the full plan in a call, with every answer sent along
      const cap = el('form', 'quiz__cap'); cap.noValidate = true;
      cap.append(el('p', 'quiz__h4', 'רוצים תוכנית מלאה לעסק שלכם? נחזור אליכם עם הכל.'));
      const fields = el('div', 'quiz__fields');
      const nm = el('input'); nm.type = 'text'; nm.placeholder = 'שם'; nm.autocomplete = 'name'; nm.setAttribute('aria-label', 'שם');
      const ph = el('input'); ph.type = 'tel'; ph.placeholder = 'טלפון'; ph.autocomplete = 'tel'; ph.inputMode = 'tel'; ph.dir = 'ltr'; ph.setAttribute('aria-label', 'טלפון');
      fields.append(nm, ph);
      const ok = el('label', 'check');
      const cb = el('input'); cb.type = 'checkbox';
      const okTxt = el('span'); okTxt.append(document.createTextNode('קראתי ואני מאשר/ת את '));
      const pl = el('a', '', 'מדיניות הפרטיות'); pl.href = 'privacy.html'; okTxt.append(pl);
      ok.append(cb, okTxt);
      const send = el('button', 'btn btn--gold', 'שלחו לי תוכנית'); send.type = 'submit';
      const msg = el('p', 'form__msg'); msg.setAttribute('role', 'status');
      cap.append(fields, ok, send, msg);
      cap.addEventListener('submit', async (e) => {
        e.preventDefault();
        const miss = [];
        if (!nm.value.trim()) miss.push('שם');
        if (!validPhone(ph.value.trim())) miss.push('טלפון תקין');
        if (!cb.checked) miss.push('אישור מדיניות הפרטיות');
        if (miss.length) { msg.textContent = `חסר: ${miss.join(', ')}.`; msg.className = 'form__msg is-error'; return; }
        send.disabled = true; msg.textContent = 'שולחים…'; msg.className = 'form__msg';
        try {
          const r = await fetch(FORM_ENDPOINT, {
            method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
              name: nm.value.trim(), phone: ph.value.trim(), business: answers[0],
              platform_check: summary(res), privacy_consent: 'כן', consent_time: new Date().toISOString(),
              consent_text: okTxt.textContent.trim(),
              _subject: `ליד מבדיקת הפלטפורמה: ${nm.value.trim()}`, _template: 'table', _captcha: 'false', page: location.href,
            }),
          });
          const d = await r.json().catch(() => ({}));
          if (!r.ok || d.success === 'false' || d.success === false) throw new Error(d.message || r.status);
          track('generate_lead', { method: 'platform_check' });
          try { sessionStorage.setItem('ay_lead_name', nm.value.trim()); } catch (_) {}
          location.href = THANKS_URL;
        } catch (err) {
          send.disabled = false;
          msg.textContent = 'משהו השתבש בשליחה. נסו שוב, או כתבו לנו בוואטסאפ.'; msg.className = 'form__msg is-error';
        }
      });
      wrap.append(cap);
      wrap.append(el('p', 'quiz__note', 'זו המלצה ראשונית לפי כללי העבודה שלנו. בשיחת האסטרטגיה נבדוק לעומק את המספרים, המתחרים והקהל שלכם.'));
      const again = el('button', 'quiz__back', 'לעשות את הבדיקה מחדש');
      again.type = 'button';
      again.addEventListener('click', () => { answers.length = 0; step = 0; renderStep(); });
      wrap.append(again);
      quizBox.replaceChildren(wrap);
      h.focus({ preventScroll: true });
      quizBox.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });

      // the main lead form carries the answers too, if they use it instead
      const hid = $('#f-quiz'); if (hid) hid.value = summary(res);
      track('platform_check_done', { platform: keep[0], split: keep.map((k) => `${k}${split[k]}`).join('-'), niche: nicheOf(answers[0]) });
    }

    renderStep();
  }

  // ---------- lead form ----------
  const form = $('#lead-form');
  const msg = $('.form__msg', form);
  const submitBtn = $('button[type="submit"]', form);
  const fName = $('#f-name'), fPhone = $('#f-phone'), fBiz = $('#f-biz'), fOk = $('#f-ok'), fHoney = $('input[name="_honey"]', form);

  function setMsg(text, kind) {
    msg.textContent = text;
    msg.className = 'form__msg' + (kind ? ` is-${kind}` : '');
  }
  function validPhone(v) {
    const d = v.replace(/[^\d+]/g, '').replace(/^\+972/, '0').replace(/^972/, '0');
    return /^0(5\d|[2-4]|[89]|7\d)\d{7}$/.test(d);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = fName.value.trim();
    const phone = fPhone.value.trim();
    const errors = [];
    fName.setAttribute('aria-invalid', String(!name));
    if (!name) errors.push('שם');
    const phoneOk = validPhone(phone);
    fPhone.setAttribute('aria-invalid', String(!phoneOk));
    if (!phoneOk) errors.push('מספר טלפון תקין');
    if (!fOk.checked) errors.push('אישור מדיניות הפרטיות');
    if (errors.length) {
      setMsg(`חסר: ${errors.join(', ')}.`, 'error');
      (form.querySelector('[aria-invalid="true"]') || fOk).focus();
      return;
    }
    if (fHoney.value) return; // bot

    submitBtn.disabled = true;
    setMsg('שולחים…');
    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name, phone,
          business: fBiz.value.trim(),
          platform_check: ($('#f-quiz') || {}).value || '',
          privacy_consent: 'כן',
          consent_time: new Date().toISOString(),
          consent_text: $('label[for="f-ok"] span').textContent.trim(),
          _subject: `ליד חדש מדף הנחיתה: ${name}`,
          _template: 'table',
          _captcha: 'false',
          page: location.href,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === 'false' || data.success === false) throw new Error(data.message || res.status);
      track('generate_lead', { method: 'form' });
      try { sessionStorage.setItem('ay_lead_name', name); } catch (_) {}
      location.href = THANKS_URL;
    } catch (err) {
      submitBtn.disabled = false;
      setMsg('הפרטים לא נשלחו. נסו שוב, או כתבו לנו בוואטסאפ: 052-898-9324.', 'error');
    }
  });

  // ---------- sections come alive as they enter the viewport ----------
  // Elements start visible in the HTML; JS only adds the "from" state, so nothing is lost without JS.
  if ('IntersectionObserver' in window && !reduceMotion) {
    const groups = [
      ['.section__head > *', 0.08],
      ['.kpis > div', 0.1], ['.acct', 0], ['.wall', 0], ['.reel', 0], // side-scrolling rows reveal as one, so swiped-in cards are never blank
      ['.versus__col', 0.12], ['.versus__col li', 0.06],
      ['.step', 0.14], ['.call__photo', 0], ['.about__photo', 0], ['.about__text > *', 0.08],
      ['.fit__list li', 0.08], ['.faq details', 0.05], ['.signup__pitch > *', 0.08], ['.form', 0.1],
    ];
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    for (const [sel, step] of groups) {
      const byParent = new Map();
      $$(sel).forEach((el) => {
        const k = byParent.get(el.parentElement) || 0;
        byParent.set(el.parentElement, k + 1);
        el.style.setProperty('--d', `${(k * step).toFixed(2)}s`);
        el.classList.add('rv');
        io.observe(el);
      });
    }
  }

  // ---------- 3D tilt: cards lean toward the mouse on desktop ----------
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduceMotion) {
    $$('.acct__panel, .quiz__box, .chat, .clip, .step, .versus__col, .form').forEach((card) => {
      card.classList.add('tilt');
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        const k = r.width > 600 ? 3 : 7; // big panels lean less
        card.style.transform = `perspective(1000px) rotateX(${(-py * k).toFixed(2)}deg) rotateY(${(px * k).toFixed(2)}deg) translateZ(0)`;
        card.style.setProperty('--gx', `${((px + 0.5) * 100).toFixed(1)}%`);
        card.style.setProperty('--gy', `${((py + 0.5) * 100).toFixed(1)}%`);
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }

  // ---------- screen readers: the whole story as plain text (only the current chapter is on screen) ----------
  (() => {
    const sr = document.createElement('div');
    sr.className = 'sr-only';
    for (const id of ['scatter', 'focus', 'growth']) {
      const el = beatsEl.get(id);
      if (!el) continue;
      const h = document.createElement('h2');
      h.textContent = $('h2', el).textContent.replace(/\s+/g, ' ').trim();
      sr.appendChild(h);
      $$('.lead, .facts, .pillars', el).forEach((p) => {
        const t = document.createElement('p');
        t.textContent = p.innerText.replace(/\s+/g, ' ').trim();
        sr.appendChild(t);
      });
    }
    story.after(sr);
    // the visual copy of those chapters duplicates the text above, so hide it from assistive tech
    ['scatter', 'focus', 'growth'].forEach((id) => { const el = beatsEl.get(id); if (el) $$('h2, .lead, .facts, .pillars', el).forEach((n) => n.setAttribute('aria-hidden', 'true')); });
  })();

  // carousels: announce position ("3 מתוך 7")
  ['[data-reel] > .clip', '[data-wall] > .chat'].forEach((sel) => {
    const items = $$(sel);
    items.forEach((it, i) => { it.setAttribute('role', 'group'); it.setAttribute('aria-roledescription', 'פריט'); it.setAttribute('aria-label', `${i + 1} מתוך ${items.length}`); });
  });

  // ---------- boot ----------
  measure();
  chrome();
  initStory();
})();

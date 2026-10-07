/* AY Digital Marketing landing page.
   1. Scroll story: a pinned canvas scrubs an image sequence (media/story/) through piecewise beats.
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

  function update() {
    ticking = false;
    if (staticMode) return;
    const posPx = window.scrollY - storyTop;
    const posVh = (posPx / vh) * 100;
    const p = clamp(posVh / totalVh, 0, 1);
    progressBar.style.setProperty('--p', p.toFixed(4));

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

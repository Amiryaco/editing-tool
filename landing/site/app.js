/* AY Digital Marketing landing page.
   1. Scroll story: a pinned canvas scrubs an image sequence (media/story/) through piecewise beats.
   2. Testimonial videos, header/dock state, lead form. */
(() => {
  'use strict';

  // ---------- config ----------
  const FORM_ENDPOINT = 'https://formsubmit.co/ajax/ay.digital10@gmail.com';
  const THANKS_URL = 'thanks.html';
  const SEQ_DIR = 'media/story/';
  const FALLBACK_MANIFEST = { count: 241, pattern: 'f-%04d.webp', width: 640, height: 1138 };

  // Each beat gets its own scroll distance (in viewport heights) and its own frame range.
  // from === to is a still-frame hold. Frames: 0–120 clip A (scatter → sphere), 120–240 clip B (sphere → gold bars).
  // Stills carry the copy; motions carry no copy and are short, so each transition reads as one quick, smooth move.
  // Motion frames follow an ease-in-out curve, so every transition settles softly into the next still.
  const BEATS = [
    { id: 'open',      vh: 50,  from: 0,   to: 0   }, // still: headline
    { id: 'scatter',   vh: 70,  from: 0,   to: 62,  ease: true }, // droplets scatter
    { id: 'scatter-h', vh: 60,  from: 62,  to: 62  }, // still: where the money gets lost
    { id: 'converge',  vh: 70,  from: 62,  to: 120, ease: true }, // everything pulls into one sphere
    { id: 'focus-h',   vh: 60,  from: 120, to: 120 }, // still: the method
    { id: 'growth',    vh: 110, from: 120, to: 240, ease: true }, // sphere turns, lands in a crown splash, bars rise
    { id: 'growth-h',  vh: 60,  from: 240, to: 240 }, // still: the result + CTA
  ];
  // Copy windows in story vh. Each chapter starts fading in as its motion settles (last ~8%) and leaves
  // the moment the next motion starts.
  const COPY = [
    { beat: 'open',    from: -1e9, to: 46 },
    { beat: 'scatter', from: 114,  to: 178 },
    { beat: 'focus',   from: 244,  to: 308 },
    { beat: 'growth',  from: 412,  to: 1e9 },
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

  function measure() {
    vh = window.innerHeight;
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
        if (b.ease) t = 0.5 - 0.5 * Math.cos(Math.PI * t);
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
    const cover = narrow.matches;
    // phones: fill the window, but never crop away more than ~30% of the height (the black edges blend in)
    const s = cover ? Math.min(Math.max(cw / iw, ch / ih), (ch * 1.45) / ih) : Math.min(cw / iw, ch / ih);
    const dw = iw * s, dh = ih * s;
    const dx = (cw - dw) / 2;
    // on phones the copy sits on top, so the frame is nudged down to keep the gold below the text
    // phones: the window pans gently with the action (droplets, sphere, then the bars lower in the frame)
    const focus = i < 150 ? 0.58 : i > 215 ? 0.74 : 0.58 + 0.16 * (0.5 - 0.5 * Math.cos(Math.PI * (i - 150) / 65));
    const dy = cover ? clamp(ch / 2 - dh * focus, ch - dh, 0) : (ch - dh) / 2;
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
  function fitMask() {
    if (!narrow.matches || staticMode || zoneVh === vh) return;
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
    for (let i = 0; i < 12; i++) add(i);
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
    img.onload = () => {
      inflight--;
      loaded[i] = true;
      if (!stage.classList.contains('has-frames') && loaded[0]) { stage.classList.add('has-frames'); drawn = -1; }
      // redraw if this frame is closer to what the visitor is looking at
      if (drawn < 0 || Math.abs(i - Math.round(shown)) < Math.abs(drawn - Math.round(shown))) { drawn = -1; startGlide(); }
      pump();
    };
    img.onerror = () => {
      inflight--;
      frames[i] = undefined;
      const r = (retries.get(i) || 0) + 1;
      retries.set(i, r);
      if (r <= 2) setTimeout(() => { queue.push(i); pump(); }, 800 * r);
      pump();
    };
    img.src = frameUrl(i);
  }

  async function initStory() {
    // The story only moves when the visitor scrolls (nothing autoplays), so it stays on with "reduce motion";
    // there the frame snaps instead of gliding and the copy appears without easing.
    // Data saver: keep the poster and show the chapters as normal sections.
    const conn = navigator.connection;
    if (conn && conn.saveData) { setStatic(true); return; }
    try {
      const res = await fetch(SEQ_DIR + 'manifest.json', { cache: 'force-cache' });
      if (!res.ok) throw new Error(res.status);
      manifest = await res.json();
    } catch (e) {
      manifest = FALLBACK_MANIFEST; // the frames are still there even if the manifest request is blocked
    }
    frames = new Array(manifest.count);
    loaded = new Array(manifest.count).fill(false);
    queue = baseOrder(manifest.count);
    queue.forEach((i) => queued.add(i));
    measure();
    pump();
    update();
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
  window.addEventListener('resize', () => { zoneVh = 0; measure(); requestUpdate(); chrome(); });
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
  function openBox(node) {
    boxBody.replaceChildren(node);
    if (box.showModal) box.showModal(); else box.setAttribute('open', '');
  }
  $('[data-close]', box).addEventListener('click', () => box.close());
  box.addEventListener('click', (e) => { if (e.target === box) box.close(); });
  $$('[data-zoom]').forEach((b) => b.addEventListener('click', () => {
    const img = new Image();
    img.src = b.dataset.zoom;
    img.alt = $('img', b).alt;
    openBox(img);
  }));
  $$('[data-open]').forEach((b) => b.addEventListener('click', () => {
    openBox(document.getElementById(b.dataset.open).content.cloneNode(true));
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
    if (!fOk.checked) errors.push('אישור לחזרה אליכם');
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

  // ---------- boot ----------
  measure();
  chrome();
  initStory();
})();

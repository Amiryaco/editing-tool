/* AY Digital Marketing landing page.
   1. Scroll story: a pinned canvas scrubs an image sequence (media/story/) through piecewise beats.
   2. Testimonial videos, header/dock state, lead form. */
(() => {
  'use strict';

  // ---------- config ----------
  const FORM_ENDPOINT = 'https://formsubmit.co/ajax/ay.digital10@gmail.com';
  const THANKS_URL = 'thanks.html';
  const SEQ_DIR = 'media/story/';

  // Each beat gets its own scroll distance (in viewport heights) and its own frame range.
  // from === to is a still-frame hold. Frames: 0–120 clip A (scatter → sphere), 120–240 clip B (sphere → gold bars).
  const BEATS = [
    { id: 'open',     vh: 80,  from: 0,   to: 0   }, // hold on the first frame while the headline is read
    { id: 'scatter',  vh: 120, from: 0,   to: 62  }, // droplets scatter: budget spread thin
    { id: 'converge', vh: 90,  from: 62,  to: 120 }, // transition, no copy: everything pulls into one sphere
    { id: 'focus',    vh: 130, from: 120, to: 170 }, // sphere turns slowly: strategy
    { id: 'descend',  vh: 80,  from: 170, to: 205 }, // sphere lands, crown splash, no copy
    { id: 'growth',   vh: 110, from: 205, to: 240 }, // gold bars rise
    { id: 'hold',     vh: 60,  from: 240, to: 240 }, // rest on the final frame with the CTA
  ];
  // Copy windows in story vh (absolute). A chapter is visible while the scroll position is inside its window.
  const COPY = [
    { beat: 'open',    from: -1e9, to: 62 },
    { beat: 'scatter', from: 98,   to: 192 },
    { beat: 'focus',   from: 302,  to: 412 },
    { beat: 'growth',  from: 522,  to: 1e9 },
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
  let staticMode = reduceMotion;

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
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; drawn = -1; }
  }

  // scroll position (in story vh) → frame index, beat by beat
  function frameAt(posVh) {
    let acc = 0;
    for (const b of BEATS) {
      if (posVh <= acc + b.vh) {
        const t = clamp((posVh - acc) / b.vh, 0, 1);
        return Math.round(b.from + (b.to - b.from) * t);
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
    const s = cover ? Math.max(cw / iw, ch / ih) : Math.min(cw / iw, ch / ih);
    const dw = iw * s, dh = ih * s;
    const dx = (cw - dw) / 2;
    const dy = cover ? (ch - dh) * 0.62 : (ch - dh) / 2;
    ctx.fillStyle = '#030303';
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
      const i = nearestLoaded(wanted);
      if (i >= 0 && i !== drawn) draw(i);
      prioritize(wanted);
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

    const pastStory = posPx > (totalVh / 100) * vh - vh * 0.2;
    document.body.classList.toggle('after-story', pastStory);
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
      if (Math.abs(i - wanted) < Math.abs(drawn - wanted) || drawn < 0) requestUpdate();
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
    if (reduceMotion) { setStatic(true); return; }
    // Respect data saver: keep the poster and show the chapters as normal sections.
    const conn = navigator.connection;
    if (conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || ''))) { setStatic(true); return; }
    try {
      const res = await fetch(SEQ_DIR + 'manifest.json', { cache: 'force-cache' });
      if (!res.ok) throw new Error(res.status);
      manifest = await res.json();
    } catch (e) {
      setStatic(true);
      return;
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
  window.addEventListener('resize', () => { measure(); requestUpdate(); chrome(); });
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

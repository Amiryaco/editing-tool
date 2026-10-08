/* Accessibility toolbar (תפריט נגישות). Self-hosted, no third party, nothing sent anywhere.
   The choices are saved in this browser only (localStorage) and applied as classes on <html> before the page paints,
   so the page does not flash. The toolbar adds to the site's own WCAG 2.0 AA work (IS 5568); it does not replace it.
   app.js listens for "a11y:change" so "stop animations" also freezes the scroll story. */
(() => {
  const KEY = 'lp_a11y';
  const root = document.documentElement;
  const SIZES = [1, 1.15, 1.3, 1.5];
  const TOGGLES = [
    ['contrast', 'ניגודיות גבוהה', 'M12 3a9 9 0 1 0 0 18zm0-2a11 11 0 1 1 0 22 11 11 0 0 1 0-22z'],
    ['invert', 'היפוך צבעים', 'M12 2.5c-3 4-6 7.2-6 11a6 6 0 0 0 12 0c0-3.8-3-7-6-11zm0 3.4V19a4 4 0 0 1-4-4.5c0-2.4 1.8-4.8 4-8.6z'],
    ['gray', 'גווני אפור', 'M4 4h16v16H4zm2 2v12h6V6z'],
    ['links', 'הדגשת קישורים', 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 1.4 1.4 1-1a2 2 0 0 1 2.9 2.9l-3 3a2 2 0 0 1-2.9 0zm4-4a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1-1.4-1.4-1 1a2 2 0 0 1-2.9-2.9l3-3a2 2 0 0 1 2.9 0z'],
    ['font', 'גופן קריא', 'M5 20 10.5 4h3L19 20h-2.4l-1.4-4H8.8l-1.4 4zm4.5-6h5L12 6.6z'],
    ['spacing', 'ריווח טקסט', 'M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z'],
    ['still', 'עצירת אנימציות', 'M7 5h4v14H7zm6 0h4v14h-4z'],
    ['cursor', 'סמן גדול', 'M5 2l14 12-6.2.6 3.7 7.6-2.7 1.3-3.6-7.7L5 20z'],
  ];

  let state = {};
  try { state = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (_) { state = {}; }

  function apply() {
    for (const [k] of TOGGLES) root.classList.toggle('a11y-' + k, !!state[k]);
    const s = SIZES[state.size | 0] || 1;
    if (s === 1) root.style.removeProperty('font-size'); else root.style.fontSize = s * 100 + '%';
    root.classList.toggle('a11y-big', s > 1);
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {}
    document.dispatchEvent(new CustomEvent('a11y:change', { detail: { still: !!state.still } }));
  }
  apply();

  function build() {
    const icon = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;
    const wrap = document.createElement('div');
    wrap.className = 'a11y';
    wrap.innerHTML = `
<button class="a11y__fab" type="button" aria-expanded="false" aria-controls="a11y-panel" aria-label="תפריט נגישות">
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="4.2" r="2.2"/><path d="M4 7.6l.6-1.9c2.4.8 4.9 1.2 7.4 1.2s5-.4 7.4-1.2l.6 1.9c-1.9.6-3.9 1-6 1.2v4.3l2.3 7.8-1.9.6-2.4-6.8-2.4 6.8-1.9-.6L10 13.1V8.8c-2.1-.2-4.1-.6-6-1.2z"/></svg>
</button>
<div class="a11y__panel" id="a11y-panel" role="region" aria-labelledby="a11y-title" hidden>
  <div class="a11y__head">
    <h2 class="a11y__title" id="a11y-title">תפריט נגישות</h2>
    <button class="a11y__close" type="button" aria-label="סגירת תפריט הנגישות">✕</button>
  </div>
  <div class="a11y__size" role="group" aria-label="גודל טקסט">
    <span class="a11y__label">גודל טקסט</span>
    <button type="button" data-size="-1" aria-label="הקטנת טקסט">א-</button>
    <output class="a11y__val" aria-live="polite"></output>
    <button type="button" data-size="1" aria-label="הגדלת טקסט">א+</button>
  </div>
  <div class="a11y__grid">
    ${TOGGLES.map(([k, label, d]) => `<button type="button" class="a11y__opt" data-k="${k}" aria-pressed="false">${icon(d)}<span>${label}</span></button>`).join('')}
  </div>
  <div class="a11y__foot">
    <button type="button" class="a11y__reset">איפוס הגדרות</button>
    <a href="accessibility.html" data-legal="accessibility">הצהרת נגישות</a>
  </div>
</div>`;
    document.body.appendChild(wrap);

    const fab = wrap.querySelector('.a11y__fab');
    const panel = wrap.querySelector('.a11y__panel');
    const val = wrap.querySelector('.a11y__val');

    function sync() {
      wrap.querySelectorAll('.a11y__opt').forEach((b) => b.setAttribute('aria-pressed', String(!!state[b.dataset.k])));
      val.textContent = Math.round((SIZES[state.size | 0] || 1) * 100) + '%';
      wrap.querySelector('[data-size="-1"]').disabled = !(state.size | 0);
      wrap.querySelector('[data-size="1"]').disabled = (state.size | 0) >= SIZES.length - 1;
      fab.classList.toggle('is-set', Object.keys(state).some((k) => state[k]));
    }
    function open(on) {
      panel.hidden = !on;
      fab.setAttribute('aria-expanded', String(on));
      if (on) panel.querySelector('.a11y__close').focus();
    }

    fab.addEventListener('click', () => open(panel.hidden));
    wrap.querySelector('.a11y__close').addEventListener('click', () => { open(false); fab.focus(); });
    wrap.querySelectorAll('[data-size]').forEach((b) => b.addEventListener('click', () => {
      state.size = Math.min(SIZES.length - 1, Math.max(0, (state.size | 0) + Number(b.dataset.size)));
      apply(); sync();
    }));
    wrap.querySelectorAll('.a11y__opt').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.k;
      state[k] = !state[k];
      if (k === 'contrast' && state[k]) state.invert = false; // the two colour modes cancel each other
      if (k === 'invert' && state[k]) state.contrast = false;
      apply(); sync();
    }));
    wrap.querySelector('.a11y__reset').addEventListener('click', () => { state = {}; apply(); sync(); });
    // the statement link opens in the page's dialog when there is one (index.html); app.js handles [data-legal]
    wrap.querySelector('[data-legal]').addEventListener('click', () => open(false));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !panel.hidden) { open(false); fab.focus(); }
    });
    document.addEventListener('pointerdown', (e) => {
      if (!panel.hidden && !wrap.contains(e.target)) open(false);
    });
    sync();
  }

  if (document.body && document.readyState !== 'loading') build();
  else document.addEventListener('DOMContentLoaded', build);
})();

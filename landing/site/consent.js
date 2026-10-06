/* Cookie and pixel consent for AY Digital Marketing pages.
   Nothing that tracks is loaded until the visitor clicks "אישור". "דחייה" is just as easy and is remembered.
   To turn a tracker on, fill in its ID below. Empty IDs load nothing, even after consent.
   The choice is stored in this browser (localStorage) for 180 days; "הגדרות עוגיות" in the footer reopens it. */
(() => {
  'use strict';

  const IDS = {
    GOOGLE_TAG: '',        // Google Ads "AW-XXXXXXXXX" or GA4 "G-XXXXXXXXXX"
    GOOGLE_ADS_CONVERSION: '', // "AW-XXXXXXXXX/abcDEF123" (the send_to value of the lead conversion)
    META_PIXEL: '',        // Meta (Facebook) Pixel ID, digits only
    TIKTOK_PIXEL: '',      // TikTok Pixel ID
  };

  const KEY = 'ay_consent_v1';
  const MAX_AGE = 180 * 24 * 3600 * 1000;

  function read() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (v && Date.now() - v.t < MAX_AGE) return v.choice;
    } catch (_) {}
    return null;
  }
  function save(choice) {
    try { localStorage.setItem(KEY, JSON.stringify({ choice, t: Date.now() })); } catch (_) {}
  }

  function script(src) {
    const s = document.createElement('script');
    s.async = true; s.src = src;
    document.head.appendChild(s);
  }

  let loaded = false;
  function loadTrackers() {
    if (loaded) return;
    loaded = true;
    // Google tag (Ads / GA4)
    if (IDS.GOOGLE_TAG) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', IDS.GOOGLE_TAG);
      script('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(IDS.GOOGLE_TAG));
    }
    // Meta Pixel
    if (IDS.META_PIXEL) {
      const f = window;
      if (!f.fbq) {
        const n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
        if (!f._fbq) f._fbq = n;
        n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
        script('https://connect.facebook.net/en_US/fbevents.js');
      }
      f.fbq('init', IDS.META_PIXEL);
      f.fbq('track', 'PageView');
    }
    // TikTok Pixel
    if (IDS.TIKTOK_PIXEL) {
      const w = window, t = 'ttq';
      w.TiktokAnalyticsObject = t;
      const ttq = w[t] = w[t] || [];
      ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie'];
      ttq.setAndDefer = (o, m) => { o[m] = function () { o.push([m].concat([].slice.call(arguments, 0))); }; };
      ttq.methods.forEach((m) => ttq.setAndDefer(ttq, m));
      ttq.load = (id) => { script('https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=' + encodeURIComponent(id) + '&lib=' + t); };
      ttq.load(IDS.TIKTOK_PIXEL);
      ttq.page();
    }
    document.dispatchEvent(new CustomEvent('ay:trackers'));
  }

  // Conversion helper for the thank-you page; does nothing without consent and IDs.
  window.ayTrackLead = function () {
    if (read() !== 'all') return;
    loadTrackers();
    if (window.gtag && IDS.GOOGLE_ADS_CONVERSION) window.gtag('event', 'conversion', { send_to: IDS.GOOGLE_ADS_CONVERSION });
    if (window.fbq) window.fbq('track', 'Lead');
    if (window.ttq) window.ttq.track('SubmitForm');
  };

  // ---------- banner ----------
  function banner() {
    if (document.getElementById('consent')) return;
    const el = document.createElement('section');
    el.id = 'consent';
    el.className = 'consent';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-labelledby', 'consent-h');
    el.setAttribute('aria-describedby', 'consent-p');
    el.innerHTML =
      '<h2 class="consent__h" id="consent-h">עוגיות ומדידה</h2>' +
      '<p class="consent__p" id="consent-p">נשמח להשתמש בעוגיות ובכלי מדידה של גוגל, מטא וטיקטוק כדי למדוד את הפרסום שלנו ולהציג מודעות רלוונטיות. ' +
      'הם ייטענו רק אם תאשרו. האתר עובד באותה צורה גם אם תדחו. <a href="privacy.html#cookies">פרטים במדיניות הפרטיות</a></p>' +
      '<div class="consent__actions">' +
      '<button type="button" class="consent__btn" data-consent="all">אישור</button>' +
      '<button type="button" class="consent__btn" data-consent="essential">דחייה</button>' +
      '</div>';
    document.body.appendChild(el);
    el.querySelectorAll('[data-consent]').forEach((b) => b.addEventListener('click', () => {
      const choice = b.dataset.consent;
      save(choice);
      el.remove();
      if (choice === 'all') loadTrackers();
      document.dispatchEvent(new CustomEvent('ay:consent', { detail: choice }));
    }));
  }

  function init() {
    const choice = read();
    if (choice === 'all') loadTrackers();
    else if (!choice) banner();
    document.querySelectorAll('[data-cookie-settings]').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      banner();
      const first = document.querySelector('#consent [data-consent]');
      if (first) first.focus();
    }));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

/* Ad and analytics pixels for AY Digital Marketing pages (Google, Meta, TikTok).
   Fill in an ID below to turn its pixel on; empty IDs load nothing.
   What the pixels collect is described in privacy.html#cookies. */
(() => {
  'use strict';

  const IDS = {
    GOOGLE_TAG: '',        // Google Ads "AW-XXXXXXXXX" or GA4 "G-XXXXXXXXXX"
    GOOGLE_ADS_CONVERSION: '', // "AW-XXXXXXXXX/abcDEF123" (the send_to value of the lead conversion)
    META_PIXEL: '',        // Meta (Facebook) Pixel ID, digits only
    TIKTOK_PIXEL: '',      // TikTok Pixel ID
  };

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

  // Conversion helper for the thank-you page; does nothing without IDs.
  window.ayTrackLead = function () {
    loadTrackers();
    if (window.gtag && IDS.GOOGLE_ADS_CONVERSION) window.gtag('event', 'conversion', { send_to: IDS.GOOGLE_ADS_CONVERSION });
    if (window.fbq) window.fbq('track', 'Lead');
    if (window.ttq) window.ttq.track('SubmitForm');
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadTrackers); else loadTrackers();
})();

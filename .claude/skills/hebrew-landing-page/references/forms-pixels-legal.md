# Form, pixels and legal (Israel)

The legal texts in `assets/templates/` are **drafts written for a small Israeli service business**. Each one carries an HTML comment saying so. Tell the user plainly that a lawyer should review them before ads run. Don't present them as legal advice.

## Lead form

- **Fields:** name (required), phone (required, Israeli validation), business (optional) and one consent checkbox. Keep the form short: every extra field costs leads.
- **Sending: FormSubmit AJAX** (`https://formsubmit.co/ajax/<email>`). It's free, needs no backend, and the email lands in the user's inbox as a table. Send:
  - `name, phone, business, platform_check` (the quiz summary), `privacy_consent`, `consent_time` (ISO), `consent_text` (the exact label shown);
  - `_subject: "ליד חדש מדף הנחיתה: <name>"`, `_template: 'table'`, `_captcha: 'false'`, `page`.
  - **The first submission triggers an activation email to that address.** The user has to click "Activate" once, or no leads arrive. Tell them before launch and send a test lead together.
- **Spam:** a hidden honeypot input (`_honey`); if it's filled, silently drop the submission.
- **Phone validation:** normalise +972/972 to 0, then `/^0(5\d|[2-4]|[89]|7\d)\d{7}$/`.
- **Errors:** one message listing what's missing (״חסר: שם, מספר טלפון תקין.״), `aria-invalid` on the bad fields, focus on the first one, and a `role="status"` / `aria-live` message. If sending fails, show the WhatsApp number as a fallback.
- **Success:** store the first name in `sessionStorage` and redirect to `thanks.html`. That page greets them by name and fires the conversion. A separate thank-you URL is what makes ad-platform conversion tracking reliable.
- **CSP:** `connect-src` and `form-action` must allow `https://formsubmit.co` (it's already in `assets/_headers`).

## Pixels (`assets/pixels.js`)

- Fill in `IDS`: `GOOGLE_TAG` (AW- or G-), `GOOGLE_ADS_CONVERSION` (the `AW-…/label` send_to), `META_PIXEL`, `TIKTOK_PIXEL`. An empty ID loads nothing, so the page can launch before the user has the IDs.
- `lpTrackLead()` on the thank-you page fires the Google Ads conversion, Meta `Lead` and TikTok `SubmitForm`.
- `track(name, params)` in app.js sends GA4 events (`generate_lead`, `platform_check_step`, `whatsapp`, `results_breakdown_open`) when gtag exists. Put `data-track="whatsapp"` on WhatsApp links.
- **CSP:** the script, connect, img and frame sources for Google, Meta and TikTok are listed in `assets/_headers`. If a pixel doesn't fire, check the console for a CSP block first.
- After adding IDs: submit a test lead, then check Meta Events Manager, TikTok Events and Google Tag Assistant.

## Consent: what we chose and why

**Cookies and pixels.** This user said no cookie banner: "most sites don't put a banner for pixels". So the pixels load immediately, and section 7 of the privacy policy discloses them, says how to block them and links to each platform's ad settings.

Israeli law (Privacy Protection Law + Amendment 13, in force since August 2025) has no EU-style cookie-consent rule, so for an Israel-only audience this is common practice. If the audience includes the EU/UK, a consent banner is required. In that case use a consent gate (load the pixels only after "accept"; the worked example's history has a `consent.js` version).

**Form consent: a single checkbox.**
- The user wanted one box ("כמו אצלי באתר"): ״קראתי ואני מאשר/ת את מדיניות הפרטיות״.
- Section 8 of the policy says that approving it covers both the callback and marketing messages, that every message has a removal option, and that replying ״הסר״ works.
- The submission records `consent_time` and `consent_text`.

**Tell the user the risk honestly.** The anti-spam law (section 30A of the Communications Law) requires explicit, prior consent to advertising messages. Consent that is bundled into a required privacy checkbox is weaker if challenged: the statutory damages are up to ₪1,000 per message without proof of damage.

The safer default is a second, **optional, unticked** box: ״אני מסכים/ה לקבל עדכונים ותוכן שיווקי בוואטסאפ, SMS ובמייל. אפשר להסיר בכל עת.״. Offer it, explain the trade-off in two lines, and let the user decide. Record their decision in the handover.

## Privacy policy (`assets/templates/privacy.html`)

**Sections:**

1. **Who is responsible:** name, ID, address, the contact person for privacy, email and phone.
2. **What is collected:**
   - Form data.
   - Direct contacts (WhatsApp, phone).
   - Technical and browsing data, from the pixels and from the host (Cloudflare).
   - A line saying no sensitive data is requested.
3. **Purposes:** callback, marketing (with removal), ad measurement and remarketing, security. Add "we don't sell data".
4. **No legal obligation to provide data**, and what happens without it. (Amendment 13 requires stating this.)
5. **Recipients:** FormSubmit, Google (Gmail, Ads, Analytics), Meta (WhatsApp, the pixel), TikTok, Cloudflare, freelancers under confidentiality, authorities. Include the **transfer abroad** clause.
6. **Retention:** e.g. 24 months for leads that didn't become clients, as required by law for clients, and consent records kept as long as needed to prove consent.
7. **Cookies, pixels and measurement** (`id="cookies"`): what they do, how to block them, and links to the platforms' ad settings and privacy pages.
8. **Callback and marketing:** what approval covers, the section 30A wording, removal at any time, and records kept.
9. **Data security:** HTTPS, 2FA on the inbox, minimal storage and deletion, and reporting a severe incident to the Privacy Protection Authority under the Data Security Regulations.
10. **Your rights:** access (section 13), correction and deletion (section 14), removal from marketing, a reply within 30 days, and the Privacy Protection Authority.
11. **Minors.**
12. **External links.**
13. **Changes**, with the update date.

**Placeholders:** `{{BUSINESS_NAME}} {{BUSINESS_TYPE}} {{BUSINESS_ID}} {{ADDRESS}} {{CONTACT_NAME}} {{EMAIL}} {{PHONE}} {{PHONE_INTL}} {{UPDATED}}`. Adjust the recipients list to the tools actually used. Never list a tool that isn't installed, and never omit one that is.

## Terms (`assets/templates/terms.html`)

**Sections:**

1. Business details.
2. Purpose of the site (`{{SERVICE_DESCRIPTION}}`), with no sale on the site.
3. The free call, with no obligation either way.
4. **Results and testimonials:**
   - They are real, shown with consent and blurring.
   - They are **not a promise**.
   - Any average claim (e.g. "×5 ROI") is explained in `{{AVERAGE_CLAIM_DISCLAIMER}}`.
5. Intellectual property, including the platforms' trademarks.
6. Permitted use.
7. Limitation of liability (AS IS).
8. Privacy (a link).
9. Changes.
10. **Governing law and jurisdiction** (`{{JURISDICTION}}`). Explain to the user what this is: the city whose courts hear disputes. It is usually their own district (here חיפה, for Yokneam).
11. Contact.

## Legal pages in the UI

- **Footer links** on every page: privacy · terms · accessibility statement. Show © the business name, the ID and the address.
- **On the landing page, legal links open in the dialog** (fetch the page and show its `<main>`), so a half-filled form isn't lost. In the claude.ai preview the pages are embedded as `<template id="legal-*">`, because the frame can't navigate.
- Legal pages carry `noindex`, a skip link, a small header with the logo, and the same footer.

## Security headers (`assets/_headers`, Cloudflare)

HSTS, `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, a locked-down `Permissions-Policy`, COOP, and a CSP that allows only `'self'`, FormSubmit and the three ad platforms, with `frame-ancestors 'none'` and `upgrade-insecure-requests`. Caching: `/media/*` and `/fonts/*` are immutable for one year, and `/img/*` is cached for one day (images get replaced while the page is being finished).

Adding any third party (a chat widget, a video host, an image CDN) means adding it to the CSP, or it fails silently. Check the console on the live URL after each deploy.

# Accessibility (Israel: regulation 35 / IS 5568)

## What the law requires

- The Equal Rights for Persons with Disabilities (Service Accessibility Adjustments) Regulations, 2013, **regulation 35**, require websites that provide a service to the public to comply with **IS 5568**, which adopts **WCAG 2.0 level AA**. The current edition is aligned with WCAG 2.1.
- They also require a published **accessibility statement**, reachable from the home page (a footer link on every page). It must include what was done, known limitations, the accessibility coordinator's contact details, and the date of the last update.
- **The law requires no toolbar ("תוסף נגישות")**, and doesn't say where one should go if you add it.
- **Enforcement:** private lawsuits. The law allows statutory compensation **up to ₪50,000 without proof of damage**, and there are many serial claims. Plaintiffs test the site itself (keyboard, screen reader, contrast, captions, forms), not the toolbar.
- **Overlays don't confer compliance.** The US FTC fined accessiBe $1M (January 2025) for claiming that its widget alone makes sites compliant. WebAIM surveys have found more detectable errors on sites with overlays, not fewer.

Sources:
- כל זכות, website accessibility: https://www.kolzchut.org.il/he/נגישות_אתרי_אינטרנט
- https://testparty.ai/blog/overlays-wcag-compliant-legal
- https://www.qualibooth.com/resources/accessibility-overlay-tools-legal-risks/

## How to explain it to the user

Business owners hear "plugin = legal". When they ask, say it in plain words:
- The site itself was built accessible.
- The toolbar is a courtesy on top of that, and it's fine wherever it sits.
- The real risk is the common pattern: buy a ₪300/year widget, leave the site inaccessible, get a demand letter.
- The strongest protection is a written audit by a certified accessibility consultant (מורשה נגישות). It's a recommendation, not an obligation.

Don't call anything "risky" or "not OK" without saying whose risk it is: the user once read a general warning as "something on my site is broken".

## Build checklist (WCAG 2.0/2.1 AA as it applies to a landing page)

- [ ] `lang="he" dir="rtl"`, landmarks (`header`, `main`, `nav`, `footer`), one `h1`, and headings in order (every section `aria-labelledby` its `h2`).
- [ ] A skip link to the content (״דילוג לתוכן״), first in the tab order. Plus a "skip the story" button for the scroll story.
- [ ] Everything works with the keyboard, with a visible focus ring (`:focus-visible`, a gold outline with offset). No traps. Hidden story chapters are `inert`.
- [ ] Alt text on every meaningful image. Screenshots get the gist of the message in the alt **and** a visible caption. Decorative images get `alt=""` / `aria-hidden`.
- [ ] Contrast AA. Body text in `--ivory`/`--muted` on `--ink` passes. Gold gradient text only at large sizes. Check buttons over busy backgrounds.
- [ ] Video: Hebrew captions (`<track kind="captions">`), no autoplay, and native controls.
- [ ] Motion: nothing moves by itself, and the scroll story follows the user. Honour `prefers-reduced-motion` (no reveals, blur, tilt, smooth scroll or count-ups). Provide a screen-reader text version of the story.
- [ ] Forms: visible labels, required fields marked, errors in text with `aria-invalid` and a live region, and the consent label clickable.
- [ ] Dialogs: `role="dialog"`/`<dialog>`, `aria-labelledby`, Esc closes, focus moves in and returns to the opener.
- [ ] Carousels: a focusable, labelled container, prev/next buttons, and "N מתוך M" labels.
- [ ] Zoom to 200% and the toolbar's 150% text: no lost content, no horizontal scroll.
- [ ] Tested with axe (`scripts/axe_check.js`) plus a manual keyboard pass, in Chrome and Safari.

## Accessibility statement (`assets/templates/accessibility.html`)

**Sections:**
- Commitment, and the standard (the regulations, IS 5568, WCAG 2.0 AA).
- **What we did:** one bullet per item in the checklist above, in plain Hebrew, plus a bullet for the toolbar: its features, that settings stay in the visitor's browser only, and that it **complements** the site's adjustments and doesn't replace them.
- **Known limitations.** Be honest: screenshots are images (their gist is also in text), captions come from automatic transcription, and external services (WhatsApp) are out of our control.
- **The coordinator:** name, phone, email, address, and how to report (page, device, assistive technology). Promise a reply time (e.g. 14 working days) and an alternative format on request.
- **Physical accessibility**, or a note that service is remote.
- **The update date:** change it whenever the statement changes.

## The toolbar (`assets/a11y.js` + `assets/a11y.css`)

It is self-hosted: no third party, no cost, no data sent anywhere, and it fits the CSP.

**Include it as the first thing in `<body>`, synchronously** (`<script src="a11y.js"></script>`). It applies the saved classes to `<html>` before paint, so nothing flashes, and builds the button on DOMContentLoaded. Put the CSS in `styles.css`, so every page, including the legal pages and the thank-you page, gets it.

**Features:**
- **Text size:** 100 / 115 / 130 / 150%, on `html` font-size, which works because sizes are in rem. It adds `a11y-big`, so headlines and button rows wrap instead of overflowing.
- **Colour modes:** high contrast (pure black, white and yellow via the CSS tokens); invert colours (a filter on `<html>`, with photos, video and the toolbar flipped back); grayscale.
- **Highlight links**, a readable font (Arial; gold gradient text becomes solid), and **text spacing** (WCAG 1.4.12 values).
- **Stop animations:** `html.a11y-still` kills transitions and animations. It also dispatches `a11y:change`, and app.js uses that to put the scroll story into static mode.
- **Big cursor.**
- **Reset**, and a link to the statement (it opens in the page's legal dialog).

**Behaviour:**
- The button has `aria-expanded` and `aria-controls`, and options are `aria-pressed` toggles. The size value is announced through an `<output aria-live>`.
- Focus goes to the close button on open. Esc or an outside tap closes the panel, and focus returns to the button.
- The colour modes cancel each other.
- Settings live in `localStorage` (`lp_a11y`), wrapped in try/catch: private mode just means nothing is saved.

**Placement** (the user asked why; this is the answer):
- **Desktop:** bottom-left corner. Nothing else is there.
- **Phones:** centred in the fixed header row, between the logo and the header CTA. Bottom corners collide with the hero buttons on the first screen and with the mobile dock after it. The sides and middle would cover headlines and the scene.
- **The trade-off:** it's less familiar than a side tab, and farther from the thumb, but it never covers content or competes with the CTAs.
- **The alternative** if the user prefers convention: a slim tab on the left edge at mid-height.
- At 150% text on a phone the header CTA grows and touches the button. It's acceptable, but check it.

**Gotchas we hit:**
- In `a11y.css`, the mobile media query must come **after** the base panel rules. Otherwise `bottom: 60px` survives and squeezes the panel to 28px high.
- Invert has to go on `<html>`, because the page background is painted on html/body. Inverting `body > *` left a dark page with white cards.
- The static scroll story overflowed sideways with big text. The fix was `min-width: 0` on chapters, wrapping button rows, and `text-wrap: wrap` on no-wrap headlines (the `a11y-big` rules).

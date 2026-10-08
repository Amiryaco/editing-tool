---
name: hebrew-landing-page
description: Build a premium, high-converting Hebrew (RTL) lead-generation landing page as a static site, from first interview to a live Cloudflare deploy. Covers conversion copy in Hebrew, a cinematic scroll story (a vector/CSS-3D scene or an AI-video image sequence), proof sections (Ads Manager results, WhatsApp screenshots, video testimonials with Hebrew captions), an interactive quiz lead magnet, a lead form that emails each lead, Google/Meta/TikTok pixels, Israeli legal pages (privacy under Amendment 13, terms, accessibility statement under IS 5568), a self-hosted accessibility toolbar, a claude.ai preview and the Cloudflare upload. Use this skill whenever someone wants a landing page, sales page, lead page, "דף נחיתה", "עמוד מכירה", a page for Meta/Google/TikTok ad traffic, or wants to improve, fix, make legal/accessible, or deploy such a page, even if they only ask for one piece (just the quiz, just the privacy policy, just the accessibility widget, just the scroll animation).
---

# Hebrew landing page

You are building a page whose only job is to turn paid traffic into phone calls. Every decision is measured against that: does it build trust, does it make the next step obvious, does it load fast on a phone. A beautiful page that doesn't convert has failed; an ugly one that converts is a draft.

`$LP` = `.claude/skills/hebrew-landing-page`. A complete worked example (AY Digital Marketing) lives in `landing/site/` in this repo. When the repo is available, open the matching file there before writing your own: it holds solutions to problems this skill only summarises. Without the repo, the templates in `$LP/assets/` are enough to start.

## The shape of the work

1. **Interview** → 2. **Plan** (structure + copy, approved by the user) → 3. **Build** the static site → 4. **Scroll story** → 5. **Proof** → 6. **Quiz** (optional) → 7. **Form, pixels, legal** → 8. **Accessibility** → 9. **Test** on phones and desktop → 10. **Preview** link → 11. **Deploy** to Cloudflare → 12. **Handover** (what's still missing).

Show the user something real early (a preview link after step 3) and iterate. The user reacts much better to a page than to a plan, and almost every important rule in this skill came from them reacting to a page.

## 1. Interview

Ask in one round (AskUserQuestion) and skip anything already answered. If the user has an existing page or a video about the business, study it first ("so you understand who I am"). Use it only to understand the business: the user doesn't want its copy or design.

- **Business:** what you sell, to whom, the offer (e.g. a free strategy call), what makes you different, what the customer leaves the call with.
- **Traffic:** Google, Meta, TikTok (it decides the hero: search traffic wants the answer now, social traffic needs a hook).
- **Proof they can give:** Ads Manager screenshots (names hidden), WhatsApp screenshots from clients, video testimonials, numbers they will stand behind.
- **Brand:** logo, colours, fonts they like (ask for a screenshot of a font they like), photos of the person.
- **Legal details:** business name, ID number (עוסק מורשה / ח.פ.), address, email, phone, who handles privacy, and the jurisdiction city for the terms.
- **Lead destination:** which email gets the leads; do they call back and also want to send marketing.
- **Domain:** a subdomain of their main site (e.g. `lp.example.co.il`) or a temporary address for now.

## 2. Plan before building

Write the section order and the headline of every section, and wait for approval. Default order (it worked; change it only with a reason):

1. **Hero inside the scroll story:** headline, one-line subhead, CTA and WhatsApp.
2. **Story chapters:** problem → method → result, headlines only.
3. **Results:** a sample of real campaigns.
4. **WhatsApp wall.**
5. **Video testimonials.**
6. **Method:** campaigner vs strategist (us vs them).
7. **Quiz.**
8. **The call:** what happens on it, in 3 steps.
9. **About:** the person.
10. **Fit:** who it's for.
11. **FAQ.**
12. **Form, then footer.**
13. **Mobile dock**, always on screen: CTA and WhatsApp.

Copy rules and the reasoning behind them are in `references/copy-and-structure.md`. The most important one: **never invent a number, a quote or a result.** If a figure is missing (e.g. revenue per account), leave a visible placeholder and ask. An estimate shown to the visitor has to be labelled as an estimate (e.g. "הכנסה משוערת לפי החזר ממוצע פי 5"), and the user has to stand behind the multiplier.

## 3. Build the static site

Plain HTML/CSS/JS, no framework, no build step: it loads fast, it deploys by drag and drop, and the user can't break it.

```
site/
  index.html  styles.css  fonts.css  app.js  pixels.js  a11y.js
  privacy.html  terms.html  accessibility.html  thanks.html
  _headers                     # Cloudflare: CSP, HSTS, caching
  fonts/*.woff2                # self-hosted Hebrew fonts (Rubik, IBM Plex Sans Hebrew)
  img/  media/
tools/build_preview.py         # copy from $LP/scripts
```

Start from `$LP/assets/`:
- `base.css`: the tokens, type, buttons, skip link and legal-page styles. Start `styles.css` from it and append `a11y.css`.
- `fonts.css` + `fonts/`.
- `pixels.js`, `a11y.js`, `_headers`.
- `templates/`: privacy, terms, accessibility and thanks pages.

Fill these placeholders in the templates: `{{BUSINESS_NAME}} {{BUSINESS_TYPE}}` (עוסק מורשה / חברה בע״מ) `{{BUSINESS_ID}} {{ADDRESS}} {{CONTACT_NAME}} {{EMAIL}} {{PHONE}} {{PHONE_INTL}}` (+972…) `{{PHONE_WA}}` (972…) `{{BRAND_EN}} {{UPDATED}}` (e.g. 7 באוקטובר 2026) `{{JURISDICTION}} {{SERVICE_DESCRIPTION}} {{AVERAGE_CLAIM_DISCLAIMER}}`. Then grep for `{{`: none may reach the live site. Design rules (RTL, fonts, the black-and-gold token set, buttons, the mobile dock) are in `references/design-system.md`. Read it before writing CSS; RTL mistakes are the first thing a Hebrew speaker notices.

## 4. The scroll story

A pinned stage that the visitor drives by scrolling. This is the page's "wow" moment and the part the user cared about most. Read `references/scroll-story.md` before you touch it. It has two engines (a vector + CSS-3D scene, or an AI-video image sequence), the timeline model (BEATS for motion, COPY windows for text) and a list of rules that each came from a rejected version:

- The motion starts on the **first** scroll pixel.
- No text over moving footage.
- Each chapter's text arrives while its motion is still settling.
- The hero looks like a calm static page until the visitor scrolls.
- Middle chapters show headlines only.
- 3D is held back for the surprise, and when it comes it is big.
- Anything that travels a path does it **once**, slowly.

## 5. Proof

See `references/proof-sections.md`: the results cards (image first, combined key figure, then a "full breakdown" dialog), the WhatsApp wall (`scripts/stack_wa.py` turns wide desktop screenshots into a phone-width column), and video testimonials with a Hebrew captions track (`scripts/make_vtt.py`, faster-whisper). Frame results as a **sample** ("5 תוצאות מדגם"), so nobody thinks those are the only results.

## 6. Quiz lead magnet (optional, recommended)

A short quiz that gives real value (e.g. "Google, Meta or TikTok: where should your money be?"), then offers the call with the answers attached to the lead. Design and scoring rules are in `references/quiz.md`. Keep it short: the first question is free text with a few chips. Recommendations come from stated working rules, never fake statistics. Every answer goes into the lead email.

## 7. Form, pixels, legal

See `references/forms-pixels-legal.md`:

- **Form:** FormSubmit AJAX, Israeli phone validation and a honeypot. Remember the activation email the first time the form is used.
- **Thank-you page:** fires the conversion (`ayTrackLead`).
- **Pixels:** `pixels.js` with empty IDs until the user has them.
- **Consent:** the choices and their trade-offs.
- **Legal pages:** the privacy policy, the terms, and the CSP in `_headers`.

The legal texts are drafts. Say so, and recommend a lawyer.

## 8. Accessibility

See `references/accessibility.md`. The site itself has to meet WCAG 2.0/2.1 AA (Israeli regulation 35 / IS 5568). That covers keyboard use, focus, alt text, contrast, captions, labels, reduced motion, and a screen-reader copy of the story.

Then add the self-hosted toolbar (`assets/a11y.js` + `assets/a11y.css`). Its "stop animations" option must actually freeze the scroll story.

Be straight with the user: the toolbar is not legally required and doesn't make a site compliant by itself. The reference has the facts and sources.

## 9. Test

See `references/testing.md`. Use Playwright with the pre-installed Chromium and these devices: iPhone 13, iPhone SE, Pixel 7 and desktop at 1440×900.

- `scripts/shoot.js`: screenshots.
- `scripts/scroll_video.js`: a frame-by-frame video of the scroll story. Send it to the user; they judge motion from video, not from stills.
- `scripts/a11y_widget_test.js`: the toolbar.

Look at every screenshot yourself before sending. Check that the text reads right-to-left, nothing is cut or overlapping, there's no horizontal scroll, and the CTAs are visible.

## 10–11. Preview and deploy

See `references/preview-and-deploy.md`.

- **Preview:** `scripts/build_preview.py` inlines everything into a claude.ai artifact preview, under 511 files, with the legal pages embedded so they open in a dialog. It also zips the site for Cloudflare.
- **Deploy:** Cloudflare Workers/Pages static assets, uploaded by dragging the folder in, with a new deployment for every update. The reference also covers the subdomain DNS.

Commit only sources. Generated media, the preview and the zip are gitignored.

## 12. Handover

End every round with what is still missing from the user (pixel IDs, real numbers, original screenshots, domain access), so nothing silently stays a placeholder. Before the first ad goes live:

- [ ] Pixel IDs in `pixels.js`, with a test lead fired and seen in each platform.
- [ ] The FormSubmit activation clicked and a test lead received.
- [ ] Every placeholder number replaced or removed.
- [ ] The legal pages reviewed by a lawyer, and the site checked by an accessibility consultant.
- [ ] The domain connected, HTTPS working, and the `_headers` CSP not blocking anything (check the console).

## Working with this user type

Business owners give short, visual feedback ("זה לא נראה מקצועי", a screen recording, an arrow on a screenshot). Treat each note as a symptom. Find the underlying rule, fix it everywhere it applies, and say in one line what you changed. `references/lessons.md` lists the notes from the first project with the rule each one became. Read it once: it is the fastest way to avoid repeating them.

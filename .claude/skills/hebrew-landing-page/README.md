# hebrew-landing-page: a Claude Code skill

A skill for building a premium, high-converting **Hebrew (RTL) landing page** for lead generation, as a static site, from the first interview to a live Cloudflare deploy. It was distilled from a real project: the AY Digital Marketing landing page (`landing/site/` in this repo).

סקיל לבניית דף נחיתה ממיר בעברית: ראיון, מבנה וקופי, אנימציית גלילה (סצנה וקטורית ותלת-ממד או רצף וידאו), הוכחות (מנהל מודעות, וואטסאפ, המלצות וידאו עם כתוביות), שאלון שמייצר לידים, טופס למייל, פיקסלים, מדיניות פרטיות, תנאי שימוש והצהרת נגישות לפי החוק הישראלי, תפריט נגישות עצמאי, תצוגה מקדימה והעלאה ל-Cloudflare.

## What's inside

```
SKILL.md                      the workflow (start here)
references/
  copy-and-structure.md       Hebrew conversion copy, section order, hard rules (no invented numbers)
  design-system.md            RTL rules, fonts, black-and-gold tokens, components
  scroll-story.md             the scroll story: timeline, vector + CSS 3D scene, AI-video sequence, rules
  proof-sections.md           Ads Manager results, WhatsApp wall, video testimonials
  quiz.md                     quiz lead magnet (platform recommender)
  forms-pixels-legal.md       FormSubmit, pixels, consent, privacy/terms (Israel), CSP
  accessibility.md            IS 5568 / WCAG AA checklist, statement, the toolbar, the legal facts
  preview-and-deploy.md       claude.ai preview build, Cloudflare upload, subdomain DNS
  testing.md                  Playwright device matrix, scroll video, axe
  lessons.md                  every piece of user feedback from the first project and the rule it became
assets/
  base.css                    tokens, type, buttons, legal-page styles (start styles.css from it)
  a11y.js, a11y.css           self-hosted accessibility toolbar (Hebrew, keyboard, ARIA, persists locally)
  pixels.js                   Google / Meta / TikTok with empty IDs + lpTrackLead() for the thank-you page
  _headers                    Cloudflare security headers (CSP, HSTS) and caching
  fonts.css, fonts/           Rubik + IBM Plex Sans Hebrew, self-hosted (OFL)
  templates/                  privacy, terms, accessibility statement, thanks page, with {{PLACEHOLDERS}}
scripts/
  build_preview.py            inline everything for a claude.ai artifact preview + zip for Cloudflare
  shoot.js                    screenshots on iPhone 13 / SE / Pixel 7 / desktop, with an overflow and error report
  scroll_video.js             frame-by-frame capture of the scroll story (→ ffmpeg → mp4)
  a11y_widget_test.js         end-to-end test of the accessibility toolbar
  axe_check.js                axe-core WCAG 2.0/2.1 AA scan
  stack_wa.py                 wide WhatsApp Web screenshots → a phone-width column
  make_vtt.py                 Hebrew captions track for testimonial videos (faster-whisper)
evals/evals.json              test prompts for iterating on the skill
```

## Install

Copy the folder into `.claude/skills/` of any project (or `~/.claude/skills/` for all projects). Claude Code picks it up automatically. It triggers on requests like "build me a landing page", "דף נחיתה", "add a privacy policy / accessibility widget to my page".

**Requirements:**
- Python 3 with OpenCV (`stack_wa.py`) and faster-whisper (`make_vtt.py`, optional).
- Node with Playwright 1.56 and a Chromium for the tests (`axe-core` for `axe_check.js`).
- ffmpeg for videos.

## Notes

- The legal templates are **drafts**, not legal advice. Have a lawyer review them, and an accessibility consultant check the site.
- The accessibility toolbar complements an accessible site. It doesn't make a site compliant by itself (see `references/accessibility.md`).
- The fonts are under the SIL Open Font License (see `assets/fonts/LICENSES.md`).

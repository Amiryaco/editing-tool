# Design system

## RTL first

- `<html lang="he" dir="rtl">` on every page. Inside the claude.ai preview the skeleton owns `<html>`, so the build script sets `dir`/`lang` with a tiny script and adds `html { direction: rtl }`.
- Use logical properties only: `inset-inline-start/end`, `margin-inline-*`, `padding-inline-*`, `text-align: start`. Never `left`/`right` for layout. The rare exception is something that has to be physically centred (`left: 50%; transform: translateX(-50%)`).
- The leading element goes on the **right**: the logo on the right, the CTA on the left in the header. Bars and carousels fill and move right-to-left, tabs read right-to-left, and "next" arrows point left (←).
- Numbers and Latin inside Hebrew: wrap them in `unicode-bidi: isolate` (or `<bdi>` / `dir="ltr"` on phone numbers) so ₪, % and the digits don't jump around. Ads Manager replicas are LTR islands (`dir="ltr"` on the table).
- Check every screenshot for reading order, not just layout: a Hebrew speaker spots a flipped arrow or a misplaced ״ ״ at once.

## Fonts (self-hosted, OFL)

`assets/fonts/` + `assets/fonts.css`:
- **Rubik** (variable 300–900) for display and body. Use 900/800 for headlines, 300 for leads and subheads, and 400 for body text. The user supplied a screenshot of the font they wanted. Ask for one, because the first default "looked strange".
- **IBM Plex Sans Hebrew** (500/600) for eyebrows, labels, tabs and small UI. It reads as more "designed" than Rubik at small sizes.
- Split each font into Hebrew and Latin `unicode-range` files, with `font-display: swap`, and load them from `'self'` (the CSP allows `font-src 'self'` only).

## Tokens (black and gold, from the logo)

```css
:root {
  --ink: #07070a; --ink-2: #0f0e12; --ink-3: #18161b;        /* ground, raised, cards */
  --line: rgba(214,180,106,.18);
  --ivory: #f3eee5; --muted: #a7a095;                          /* text, secondary (passes AA on --ink) */
  --gold: #d6b46a; --gold-hi: #f0d79a; --gold-lo: #9a7432;
  --gold-grad: linear-gradient(115deg,#a87d36 0%,#f3dc9f 42%,#c79a4c 62%,#8f6a2c 100%);
  --step--1: clamp(.85rem,.82rem + .15vw,.95rem); --step-0: clamp(1rem,.96rem + .2vw,1.125rem);
  --step-1: clamp(1.2rem,1.1rem + .5vw,1.45rem); --step-2: clamp(1.6rem,1.3rem + 1.4vw,2.4rem);
  --step-3: clamp(2rem,1.5rem + 2.4vw,3.4rem);   --step-4: clamp(2.35rem,1.6rem + 3.6vw,4.6rem);
  --gutter: clamp(16px,4vw,48px); --radius: 14px; --header-h: 68px;
}
```

For another brand, take the colours from its logo, and keep the structure: one dark ground, one ivory text, one accent with a gradient for display words.

- **Gold words:** `.gold { background: var(--gold-grad); background-clip: text; color: transparent; }`. Gold text has to be **large** to pass contrast. Use `--gold-hi` (solid) for small gold text.
- Use sizes in `rem` + `vw` clamps, so browser zoom and the toolbar's text-size option both work.

## Components

- **Header:** fixed, transparent over the story and solid with blur after it (`.is-solid`). Logo on the right, a short nav (desktop only) and the gold CTA on the left.
- **Buttons:** pills, min-height 52px.
  - `btn--gold`: gradient, dark text, a soft gold shadow.
  - `btn--ghost`: a thin line on transparent.
  - A CTA that sits over a busy background needs extra contrast. The user said one "נבלע עם הרקע", and the fix was a gold outline, a gold-tinted fill and a stronger shadow.
- **Mobile dock** (≤860px): fixed at the bottom with the safe-area padding. It holds the CTA (flex 1) and a round WhatsApp button, and slides in after the hero (`.is-on`). Every fixed element on a phone must avoid it (and the hero buttons).
- **Dialog / lightbox:** `openBox(node, title)` with a sticky close button, Esc to close and focus returned to the opener. It is used for screenshots, results breakdowns and the legal pages.
- **Reveals:** elements start visible in the HTML. JS adds the "from" state (`.rv`: a slight 3D rise) and `.in` on intersection, so nothing is lost without JS. Rows that scroll sideways reveal as one block, so swiped-in cards are never blank. Turn this off under reduced motion.
- **Desktop tilt:** cards lean toward the mouse (`perspective(1000px) rotateX/Y` up to 3–7°) with a soft glare. Pointer-fine devices only, off under reduced motion.

## Layout checks

- At 16px gutters on a 375px phone, nothing may cause horizontal scroll (`overflow-x: clip` on body hides it but doesn't fix it, so measure `scrollWidth`).
- Fieldsets need `min-inline-size: 0`. The quiz overflowed on mobile without it.
- Images: WebP, with an explicit `width`/`height`, and `loading="lazy"` below the fold. A portrait photo must be sharp at 2× DPR.

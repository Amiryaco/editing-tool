# Quiz lead magnet

**Why:** the user asked what agencies do worldwide to attract leads and give value. The answer was calculators, scores and audits. The winning idea was the user's own: "something that tells the business owner which platform to advertise on, by niche, budget and social presence". It gives a real answer for free, then hands over to the call with context.

Worked example: `#quiz` in `landing/site/index.html`; `QUIZ`, `NICHES`, `PLAT`, `compute()`, `renderResult()` and `summary()` in `app.js`.

## Design rules (from the user)

- **Keep it short.** Use 6–8 questions, one per screen, with a progress bar and ״שאלה N מתוך M״. Tap an answer and the quiz moves on, with no "next" button.
- **The first question is free text with a few chips**, not a long list of niches. The user: "a list of options lengthens the page, it's not good". Map the text with a keyword table (`NICHES[id].k`) to a niche with its own scores and reason, and fall back to `other`.
- **A back button** on every step after the first.
- **Answers come from your working rules, not fake market statistics.** Write the rules down in a code comment. Each answer adds points per platform (`s: {G, M, T}`) and may add a human reason (`r`) that is shown with the result, e.g. ״קהל מבוגר יותר נוטה לחפש בגוגל, ופחות נמצא בטיקטוק״.
- **Budget decides how many platforms:** a small budget spread thin learns nothing. Up to ₪3k means one platform. ₪3–7k means up to two (70/30). Above that, up to three, split by score in 5% steps with a 15% minimum.
- **Result card:**
  - The recommended platform(s) with a split bar.
  - The top 2–3 reasons.
  - "what to launch first" per platform (`PLAT[k].first`).
  - A short note that it's a starting point, not a plan.
- **Inline capture under the result:** name and phone, plus the single consent checkbox, and the CTA ״לקבלת התוכנית המלאה בשיחה״.
  - It posts the same lead payload as the main form, plus `platform_check: summary(res)`: every question with its answer and the recommendation.
  - It also fills the hidden `#f-quiz` in the main form, in case they scroll down and use that instead.
  - **The user asked "can I get all the info a person fills in?"** Yes: every answer goes into the lead email.
- **Tracking:** `platform_check_step` on each step, and `generate_lead` with `method: 'quiz'` on submit.

## Accessibility

- Each step is a `<fieldset>` with the question as `<legend>`. Move focus to the legend (`tabindex="-1"`) when the step changes, but not on first render.
- Options are real `<button type="button">`s, and the free-text step is a `<form>` so Enter works. Mark an empty text submit with `aria-invalid`.
- `min-inline-size: 0` on the fieldset (it overflowed on phones).
- Include a `<noscript>` note pointing to the form.
- Scroll the result into view (smooth unless reduced motion).

## Adapting to another business

Keep the engine and change the content. Examples:
- A clinic: "which treatment fits you".
- A lawyer: "do you have a case, and what's the next step".
- A course: "which track fits your level".

The pattern is the same: a few taps, a real, explained answer, then the call with the answers attached.

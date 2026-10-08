# The scroll story

A tall section (`.story`, height = total timeline + one screen) with a sticky, full-screen stage (`.stage`) inside it. The scroll position inside the section is converted to **story vh** (0 = top of the story, 100 = one screen scrolled), and everything on the stage is a pure function of that number. Nothing autoplays: the visitor's thumb is the playhead. That also means it is allowed under "reduce motion" (WCAG 2.2.2 is about motion that starts by itself), but the accessibility toolbar can still freeze it (see the end).

Worked example: `landing/site/index.html` (`#story`), `app.js` ("scroll story" and "scene mode" sections), `styles.css` (`.story`, `.stage`, `.beat`, `.scene`, `.p3d`, `.l3d`).

## Contents
1. Rules from the user (read first)
2. Timeline model
3. Engine A: vector scene + CSS 3D (recommended)
4. Engine B: AI-video image sequence
5. Copy layer
6. Mobile, desktop, accessibility
7. Pitfalls we hit

## 1. Rules from the user

Each rule was a rejected version. They generalise to any business.

| Rule | Why (what the user said or showed) |
|---|---|
| The motion starts on the very first scroll pixel, at full speed (ease-out). | "מהגלילה הראשונה צריך להתחיל... בלי השהייות, כי זה הוואו שואו". A delayed start reads as broken. |
| No text over moving footage. Text lives in the still moments. | "הטקסט עולה על האנימציה... לא מקצועי". |
| No black pause or hold inside a motion. Each motion is one smooth, fast run. | "אסור שיהיה משהו שעוצר את המעבר באמצע". |
| A chapter's text fades in **while** its motion is still settling (about 80% done), not after it stops. | Text arriving after the stop felt late ("המלל... מאחר"). |
| The hero looks like a calm, static landing page at first glance. The first scroll "breaks" it open (a burst). | "במבט ראשון נראה דף נחיתה סטטי ואז שגוללים מתחילה האנימציה... אפקט וואו". The user referenced a course page ("Jenny") with this effect. |
| Nothing in the hero may look like a button that isn't one. | A "Publish" card in the hero was rejected: "שלא יחשבו שצריך ללחוץ". |
| Middle chapters are **headlines only**. Keep a paragraph only in the first chapter (hero) and the last (the facts + CTA). | The user's own insight: reading a paragraph stops the scroll and kills the experience. |
| Make headlines bigger than normal section headings. Split them into short lines, centred, with the key word biggest. | E.g. `שיווק שעובד / לא מתחיל בכפתור / ״פרסם״`, with ״פרסם״ about 1.3× bigger. |
| 3D is a surprise: keep the opening flat, then bring in real 3D objects. | "הגרף של הרשתות החברתיות יהיה רגיל בלי תלת מימד... ואז יהיה אלמנט מפתיע". |
| 3D moves are big and complementary: a ~130° turn from almost upside-down, not a 15° wobble. Each object's move hands off to the next. | "אתה עושה תנועות קצרות... זה צריך להיות מרשים יותר". |
| 3D objects need real thickness (sides, a lip, a back face), or they look like cardboard. | The first laptop "looks weird". The rebuild added a deck, a lid with a back, sides and a rim. |
| Anything travelling a path (a spark on a funnel) passes **once**, slowly. | "הכדור עובר 3 פעמים, צריך להוריד את הקצב". |
| Use real brand icons and screens (Instagram, TikTok, Google, Ads Manager, WhatsApp), not abstract shapes. | "שבן אדם ייכנס ויגיד וואו", and the earlier pillar icons "look AI". |
| Tie the story to the business's own numbers. | E.g. the Ads Manager screen shows the real totals of the sample accounts. Never invented numbers. |
| A "skip" button jumps past the story. | It must actually work: see pitfalls. |

## 2. Timeline model

```js
// story vh → what is on screen
const COPY = [                       // when each chapter's text is visible
  { beat: 'open',    from: -1e9, to: 38 },
  { beat: 'scatter', from: 72,   to: 148 },
  { beat: 'focus',   from: 200,  to: 278 },
  { beat: 'growth',  from: 362,  to: 1e9 },
];
```

- The total length (e.g. 450 story vh) sets `--story-h` = `total/100 * innerHeight + innerHeight`. Measure `innerHeight` only when the **width** changes, because phones change the height every time the address bar slides.
- `update()` runs on scroll (rAF-throttled). It computes `posVh`, sets the progress bar, toggles `.is-on` / `.is-past` on chapters, and sets `inert` on hidden chapters (so they stay out of the tab order), then passes `posVh` to the engine.
- Helpers: `seg(x,a,b)` (0→1 between a and b, clamped), `io` (cubic in-out), `out` (cubic out), `pop` (soft overshoot, use rarely). The engine **lerps** toward the target (`x += (target-x)*0.16`) so a jerky trackpad still looks smooth. Jump straight to the target under reduced motion.
- Plan motions so that the copy windows fall on moments where the scene is nearly still.

## 3. Engine A: vector scene + CSS 3D (recommended)

One inline SVG (viewBox like `0 24 400 276`) for the flat drawing, plus real 3D objects built from CSS faces (`transform-style: preserve-3d`) stacked on top of it in the same coordinate frame.

- **Shared units:** `.scene__box` keeps the SVG's aspect ratio; `--u` = px per SVG unit (`U = min(w/400, h/276)`). Size and place the 3D objects in `calc(N * var(--u))`, so they line up with the drawing at any screen size. **Run `layout()` on every render** (cache the last size): computing it while the scene was hidden gave `U≈0`, which made tiny objects.
- **Camera:** keyframes `[vh, rotateX, rotateY, translateZ, rotateZ]`, eased between keys and applied to the SVG. Keep the opening flat (all zeros), then e.g. lay the "path" flat like a table (rotateX 72°) and stand it up while the spark runs.
- **Example chapters (AY):**
  1. **Emblem.** The logo mark in a gold circle, two thin orbits, and the four platform icons resting on the orbits. It looks static.
  2. **Burst.** On the first scroll a gold shockwave goes out, the orbits open, and the icons fly loose onto a jumpy "chaos" line. Small "things going wrong" toasts appear.
  3. **Phone.** A 3D phone spins in (-330°→0). It flips twice, and the screen content (Instagram → TikTok → Google ad) changes while its back faces the viewer, so the swap is never seen. Budget-burn and leads cards sit at its sides.
  4. **Funnel.** The phone lies flat and becomes the first step of a funnel: ad → landing page → lead → call → deal. One spark rides the line once.
  5. **Laptop.** A 3D laptop arrives on a turntable (rotateY -148°→-10°, rotateX -22°). The lid opens from closed (`rotateX(-90+102*t)`) to show Ads Manager with real totals. KPIs count up and the bars grow right-to-left.
  6. **Messages.** Real WhatsApp-style client messages pop in beside it.
- **Building 3D objects:**
  - **Phone:** a front face (an SVG screen with its own viewBox) and a back face (`rotateY(180deg)`, camera bump and logo), with `backface-visibility: hidden`.
  - **Laptop:** a deck (keys, pad), a front lip, two sides, a lid hinged at the deck's back edge (`transform-origin: bottom`), and a lid back with the logo and a rim. Add a soft blurred shadow on the floor.
- **Floor:** a faint perspective grid under the scene gives the 3D a ground.
- **Icons:** draw your own simplified versions of the platform marks as `<symbol>`s (`#ic-fb`, `#ic-ig`, `#ic-tt`, `#ic-g`, `#ic-wa`) and reuse them with `<use>`. Gradients go in `<defs>` (gold, Instagram, burn, halo). Use filters (glow, shadow) sparingly because they cost frames on phones.
- **Performance:** animate with `transform` and `opacity` only. Avoid `filter: blur` on large moving layers. Hide finished groups (`display:none`) instead of leaving them at opacity 0.

## 4. Engine B: AI-video image sequence

Use this when the story is footage (e.g. liquid gold generated with Higgsfield / Seedance). Generate the clips with pinned start and end frames, so each clip starts where the previous one ended. Then:

- Extract frames at 15 fps to WebP (640×1138 tall, 1280×720 wide). Blend the seam between clips, and correct scale drift on the last ~1.5 s. See `landing/tools/build_frames.py`.
- Give each beat its own frame range and scroll distance (`{vh, from, to, ease}`); a beat with `from === to` is a still hold where the copy appears.
- Draw on a `<canvas>` (DPR capped at 2). Use a bounded-concurrency, nearest-first loader with a generation counter, so late loads from an old sequence are ignored. Glide the shown frame toward the wanted one.
- **Desktop:** use a separate 16:9 sequence (reframe the clips; Higgsfield has a reframe tool), chosen live with `wantsWide = innerWidth > innerHeight*1.05 && innerWidth >= 700`, so widening the window switches it. Anchor it to the bottom and scale it to fit the room below the tallest chapter, so the text never covers the footage. Add side fades into black.
- **Data saver** (`navigator.connection.saveData`): show the poster and render the chapters as normal sections.
- Keep both engines in the code behind `STORY_MODE = 'scene' | 'frames'`, so you can switch back if the user prefers the old one ("אם לא יהיה טוב נחזיר").

## 5. Copy layer

- `.stage__copy` is absolute over the stage with `pointer-events: none`; only the chapter on screen (`.beat.is-on`) takes taps. The skip button has its own `z-index` above it.
- Middle-chapter headlines rise out of a soft blur, line after line (`transition-delay` .12s / .24s), and drift up as they leave. The end state must be `filter: none`: a leftover `blur(0)` combined with `background-clip: text` gold left lines looking blurred in Chrome.
- On phones the hero buttons sit in one row (gold CTA `flex: 2.4`, WhatsApp beside it), so they don't push down over the scene.
- Screen readers get the whole story as plain text in an `.sr-only` block (headings + paragraphs), because only one chapter is visible at a time.

## 6. Mobile, desktop, accessibility

- Test every chapter at iPhone SE (375×667) as well as at large phones. The scene box sits between the header zone and the bottom buttons (`top: calc(var(--zone) - var(--header-h) ...)`).
- `prefers-reduced-motion`: no lerp, no blur reveals, no entrance animations. The story still follows the scroll.
- **Accessibility toolbar "stop animations":** `a11y.js` sets `html.a11y-still` and dispatches `a11y:change`. `app.js` listens: it switches the story to static mode (`setStatic(true)`: chapters become ordinary sections, the scene freezes on its first frame) and sets `reduceMotion = true` for everything else (count-ups, smooth scroll, tilt). Turning it off restores the scroll story. Copy `stillOn()` / `still()` from the worked example (it predates the template and uses the names `ay_a11y` / `ay:a11y`; the template uses `lp_a11y` / `a11y:change`).

## 7. Pitfalls we hit

- **Skip button didn't respond:** the copy layer covered it. Fix: `pointer-events: none` on the layer, and `z-index` on the button.
- **Tiny 3D objects:** `--u` was measured while the stage was hidden. Fix: layout on every render.
- **Laptop cut off / too low:** it was positioned for a tall screen. Check the 3D objects at 375×667 and at 1440×900.
- **Spark looped 3 times:** its progress was taken modulo 1. Fix: map it once over the segment and fade it out at the end.
- **The hero emblem was hidden by the cursor and the mobile buttons:** the buttons now share one row. Keep a few px of breathing room on iPhone SE.
- **Headline lines out of order on iPhone** (line 2 before line 1) with CSS `transition-delay` staggering: Safari building the blur layer of the first line can stall it. Fix: stagger in JS (`revealLines` in the worked example adds `.in` to one line at a time, the next only after two frames + 110ms), and `will-change` on the lines. Chromium never shows the bug, so test on a real iPhone.
- **Text over footage on wide screens:** the footage has to be scaled to the room below the tallest chapter, not to the stage.

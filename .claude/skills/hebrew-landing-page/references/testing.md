# Testing

Use Playwright with the pre-installed Chromium. In this repo it is installed into `motion/node_modules` by `scripts/setup-env.sh`, so run scripts from the repo root with `NODE_PATH=./motion/node_modules`. Elsewhere, `npm i playwright@1.56.1` and set `PLAYWRIGHT_BROWSERS_PATH` / `executablePath` to an existing Chromium rather than downloading one. Keep test scripts in the scratchpad or `$LP/scripts`, never in `site/`.

## Device matrix

| Name | Playwright device | Why |
|---|---|---|
| m | `iPhone 13` (390×844) | The main ad audience. |
| se | `iPhone SE` (375×667) | The shortest common screen. Cut-off and overlap bugs show up here first. |
| p | `Pixel 7` | Android, a different font metric. |
| d | `{ viewport: { width: 1440, height: 900 } }` | Desktop. Also widen and narrow the window live if a sequence switches. |

## Scripts

```bash
# screenshots of the top, every section and the footer on all devices
NODE_PATH=./motion/node_modules node $LP/scripts/shoot.js http://localhost:8765/site/index.html /tmp/shots

# the scroll story as a video (one frame per step), for you and for the user
NODE_PATH=./motion/node_modules node $LP/scripts/scroll_video.js http://localhost:8765/site/index.html /tmp/frames --device "iPhone 13" --steps 270 --vh 455
ffmpeg -y -framerate 30 -i /tmp/frames/f%04d.jpg -c:v libx264 -pix_fmt yuv420p -crf 23 story.mp4

# the accessibility toolbar: open, Esc, focus return, persistence, every option, stop-animations → static story
NODE_PATH=./motion/node_modules node $LP/scripts/a11y_widget_test.js http://localhost:8765/site/index.html /tmp/a11y

# axe WCAG 2.0/2.1 A+AA (needs axe-core: npm i axe-core into the same node_modules)
NODE_PATH=./motion/node_modules node $LP/scripts/axe_check.js http://localhost:8765/site/index.html
```

Stitch screenshots into one grid with OpenCV (`np.hstack`/`vstack` after resizing) and read the grid yourself. One look at a grid catches more than ten separate images.

## What to check every round

- **RTL reading order:**
  - Headlines, numbers with ₪, arrows (← = forward), tabs and bars run right-to-left.
  - Phone numbers read LTR.
- **Nothing is cut, overlapping or covered:**
  - The scene vs the hero buttons on iPhone SE.
  - Fixed elements (the header, the dock, the toolbar button) vs content.
  - Dialogs scroll.
- **No horizontal scroll:** `document.documentElement.scrollWidth - innerWidth === 0`, at 100% and at 150% text.
- **The story:**
  - The motion starts on the first scroll.
  - Text appears only in the still moments.
  - The skip button works.
  - Every chapter is readable on SE.
  - In static mode, the chapters are ordinary sections.
- **Interactions:**
  - Tabs.
  - Count-ups.
  - The lightbox (zoom and close).
  - The video plays with captions.
  - The quiz runs to the end and its capture form sends.
  - The legal links open in the dialog.
- **Console:** no errors except known 404s (e.g. optional result screenshots that haven't arrived yet). Expect no CSP violations on the live URL.
- **Form:** submit with errors (messages and focus), then a real test lead after deploy (the FormSubmit activation).

## Showing results to the user

- Send stills and the scroll video with SendUserFile. The user judges motion from video, not from a description.
- Describe each fix in one line. If something can't be verified here (e.g. a real phone's address bar, or Safari-only behaviour), say so and ask them to check on their phone.

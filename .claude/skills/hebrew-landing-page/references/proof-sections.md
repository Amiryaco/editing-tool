# Proof sections

Proof converts only if the visitor can check it. Everything here is real, with names hidden, and the copy says how it was hidden.

## Results from Ads Manager

**Structure:**

1. **Summary row.**
   - Average ROI (the user's stated ×5, as a big number).
   - Total leads across the sample, counted up.
   - The lowest cost per lead in the sample.
2. **Account tabs** (לקוח א׳ … ה׳). They are tabs with `role="tablist"`, arrow-key navigation and the first one selected, and they read right-to-left.
3. **Each panel:**
   - **First, the image:** the real Ads Manager screenshot (`img/results/r-a.webp`). Until it arrives, show a faithful HTML replica of the Ads Manager row (an LTR table with the same columns: Results, Reach, Frequency, Cost per result, Budget, Amount spent), and swap in the image automatically when the file exists (`data-shot` + `[data-replica]`).
   - **Then the money:** ״₪744,573 הכנסות משוערות מהקמפיינים לפי החזר ממוצע של פי 5 על ₪148,915 שהושקעו״. It is visible at first glance, without opening anything.
   - **Then one key row:** leads · spent · per lead. Show one combined figure per account, presented the same way on every card.
   - **Then "לפירוט המלא":** opens a dialog with the full transcribed row and the note ״הנתונים מועתקים אחד לאחד... שם הלקוח הוסתר״.
4. **Number formatting:** use `Intl.NumberFormat('en-US')` (commas), with the ₪ prefix inside a `unicode-bidi: isolate` span. Count up when the number scrolls into view, or jump straight to the value under reduced motion.

**Why it's built this way:**
- "It's written, that's not proof": the user wanted the image first, then the analysis the visitor can do themselves, and a button for the detail.
- Hide client names in the image too. Blur or crop them before converting to WebP. Never show an account ID.
- Fit the replica tables to the panel width (`fitReplicas`: scale them down rather than letting them scroll sideways on a phone).

## WhatsApp wall

- Real client messages, with names and avatars blurred. Say so: ״השמות והתמונות טושטשו״.
- **Wide desktop screenshots:** WhatsApp Web screenshots are unreadable on a phone. `scripts/stack_wa.py in.jpg out.webp` finds the bubbles (white = incoming, green = outgoing), groups them into bands and stacks them into one narrow column, keeping each side.
- **Each item:**
  - A `<button>` that opens the image in the dialog (zoom).
  - An `alt` with the gist of the message.
  - A visible `<figcaption>` with the key quote in ״ ״.
  - The quote is also in the button's `aria-label`.
- **Horizontal reel:** scroll-snap, a `tabindex="0"` container with an `aria-label`, prev/next buttons (→ for previous and ← for next, because the reel runs RTL), and items labelled "N מתוך M".
- **Zoom bug we fixed:** the zoomed image was cut and could not be panned on phones. The dialog has to scroll, and tall images must fit to width.

## Video testimonials

- 5–7 clips. Each has a poster image (`.webp`) behind a play button, and the video is `hidden` until it's clicked, with `preload="none"`, `playsinline` and `controls`. **No autoplay.**
- **Compress for the web:** `ffmpeg -i in.mov -vf "scale='min(720,iw)':-2" -c:v libx264 -crf 28 -preset slow -c:a aac -b:a 96k -movflags +faststart tN.mp4`. Take the poster from a frame where the face is natural.
- **Hebrew captions as a track** (`<track kind="captions" srclang="he" label="עברית" src="tN.he.vtt" default>`). They can be turned off in the player, unlike burned-in captions.
  - Generate them with `scripts/make_vtt.py tN.mp4 tN.he.vtt` (faster-whisper large-v3; the network must allow Hugging Face). If transcription is unavailable, ask the user for an SRT.
  - Proofread names and brand words by ear.
  - In the preview build, the VTTs become data URIs (to stay under the file limit).
- **Figcaption:** the strongest quote from the clip, verbatim from the transcript, plus the person's name and role, or a short result line.
- Pause the other clips when one starts.

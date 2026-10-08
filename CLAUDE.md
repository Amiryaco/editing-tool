# editing-tool

A workspace for editing videos with motion-graphic B-roll and animations.

## Skills

- `.claude/skills/video-edit/`: **the main workflow.** Raw footage → transcription, topic and structure analysis, cutting pauses, fillers and retakes, punch-in zooms, transitions, B-roll, captions, sound effects, music and loudness → a finished video. Orchestrates the other two.
- `.claude/skills/motion-broll/`: imported from [Barty-Bart/motion-graphics](https://github.com/Barty-Bart/motion-graphics) (MIT, commit `e8d610a`). Motion-graphic B-roll timed to the speaker's words. **Read its `SKILL.md` and `reference/engine-api.md` before writing clips.**
- `.claude/skills/hebrew-landing-page/`: a premium Hebrew RTL lead-generation landing page, from interview to Cloudflare: conversion copy, scroll story (vector + CSS 3D), proof sections, quiz, form, pixels, Israeli legal pages, accessibility toolbar, preview and deploy. The worked example is `landing/site/`.
- `.claude/skills/hebrew-captions/`: burned-in Hebrew captions (RTL) with the spoken word highlighted, plus an `.srt`. Fonts Heebo and Rubik (OFL) in `fonts/`.

When the user uploads a video and asks for editing, use `/video-edit` and follow its full workflow: interview → transcribe and analyse → plan table and **wait for approval** → cut → B-roll (motion-broll) → captions → finish → check stills and loudness → deliver. For B-roll only, use `/motion-broll`; for captions only, use `/hebrew-captions`.

## Environment (cloud container)

- `scripts/setup-env.sh` runs on session start (hook in `.claude/settings.json`). It installs ffmpeg (with `prores_ks` and libass), numpy, OpenCV 4, HarfBuzz, fontTools, faster-whisper, Playwright 1.56.1 into `motion/node_modules` (using the pre-installed Chromium), and generates the sound effects into `motion/inputs/sfx/`.
- **Don't run the skill's `scripts/setup.sh`** here: it would try to download Chromium. Use `scripts/setup-env.sh` instead.
- Run engine scripts from the repo root with `NODE_PATH=./motion/node_modules`, with `$SKILL=.claude/skills/motion-broll`.
- Working folders: `motion/inputs/` (brand assets, logos), `motion/clips/` (clip sources, tracked in git), `motion/work/`, `motion/dist/` and `motion/out/` (generated, not tracked).
- Automatic transcription (`video-edit/scripts/transcribe.py`) downloads Whisper models from Hugging Face. The network policy must allow `huggingface.co` **and** its file storage: `cas-server.xethub.hf.co`, `cas-bridge.xethub.hf.co`, `transfer.xethub.hf.co`, `cdn-lfs.hf.co`, `cdn-lfs-us-1.hf.co`, `us.aws.cdn.hf.co` (the actual file download; both the Xet and the plain path redirect there) (or `*.hf.co` if wildcards are allowed). Without them, the model metadata loads but the weights fail (CAS/403 errors); ask the user for an SRT meanwhile.

## Characters and brands

Each AI character has a brand kit in `motion/brands.json` (colours, niche, handle, clip folder). **Read it before building clips for a character and use those colours.** When the user names a new character or new colours, add or update its entry.

- Robin Carter: astrology. Ink `#15121B`, gold `#C9A45C`, cream `#F3ECDF`.
- Adrian Hale: relationship advice for women. Black `#0B0B0C`, gold `#C9A24D`, ivory `#F5F1E8`.

## Our working rules

- **The skill's rules stay in force:** one shape that never cuts, a cursor that drives every change, springs with no bouncy easing, one change per spoken beat, and **no invented numbers, quotes or results**.
- **Hebrew:** the engine embeds Heebo (OFL) as the Hebrew fallback, so Hebrew letters render automatically. Put `class="rtl"` on Hebrew text and mirror the layout (leading element on the right, bars filling right to left). Details are under "Hebrew and RTL" in `.claude/skills/motion-broll/reference/engine-api.md`. Check the stills that the text reads in the right order.
- **Local changes to motion-broll:** we changed `engine/base.css`, `engine/build.py`, `scripts/words.py`, `reference/engine-api.md` and `SKILL.md` for Hebrew support, and `engine/beats.js` so contact sheets of vertical clips are not cropped. Keep them when updating from upstream.
- **Zooms: don't overdo them.** Most of the video is steady, normal talking; add gentle zooms (+6–10%) only on 2–4 emphasis lines (hook, key lesson, punchline, CTA), return to the base framing afterwards, and at most one or two snap zooms per video. Details: zoom rules in `.claude/skills/video-edit/SKILL.md`.
- Match the video's resolution and fps (vertical 1080×1920 for Reels/Shorts/TikTok too); keep content and the cursor inside the safe area.
- **Captions default: `--style soft --below-face <rough.mp4>`** (the user's preferred look): white Heebo Bold over a soft shadow, each caption placed under the face on the top line of the chest, never over the mouth or chin. (`white` was the earlier default.) `final.mp4` from video-edit is a finished video. The parts (`rough.mp4`, B-roll clips, `captions.srt`) are delivered too, for anyone who wants to fine-tune in their own editor. motion-broll's own `preview.mp4` (hard cuts only) is for review.
- Clips and final outputs go back to the user via SendUserFile. Only source files (`motion/clips/*.html`, `plan.json`) are committed to git, not the video files.

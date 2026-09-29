# editing-tool

A workspace for editing videos with motion-graphic B-roll and animations.

## Skills

- `.claude/skills/video-edit/`: **the main workflow.** Raw footage → transcription, topic and structure analysis, cutting pauses, fillers and retakes, punch-in zooms, transitions, B-roll, captions, sound effects, music and loudness → a finished video. Orchestrates the other two.
- `.claude/skills/motion-broll/`: imported from [Barty-Bart/motion-graphics](https://github.com/Barty-Bart/motion-graphics) (MIT, commit `e8d610a`). Motion-graphic B-roll timed to the speaker's words. **Read its `SKILL.md` and `reference/engine-api.md` before writing clips.**
- `.claude/skills/hebrew-captions/`: burned-in Hebrew captions (RTL) with the spoken word highlighted, plus an `.srt`. Fonts Heebo and Rubik (OFL) in `fonts/`.

When the user uploads a video and asks for editing, use `/video-edit` and follow its full workflow: interview → transcribe and analyse → plan table and **wait for approval** → cut → B-roll (motion-broll) → captions → finish → check stills and loudness → deliver. For B-roll only, use `/motion-broll`; for captions only, use `/hebrew-captions`.

## Environment (cloud container)

- `scripts/setup-env.sh` runs on session start (hook in `.claude/settings.json`). It installs ffmpeg (with `prores_ks` and libass), numpy, OpenCV 4, HarfBuzz, fontTools, faster-whisper, Playwright 1.56.1 into `motion/node_modules` (using the pre-installed Chromium), and generates the sound effects into `motion/inputs/sfx/`.
- **Don't run the skill's `scripts/setup.sh`** here: it would try to download Chromium. Use `scripts/setup-env.sh` instead.
- Run engine scripts from the repo root with `NODE_PATH=./motion/node_modules`, with `$SKILL=.claude/skills/motion-broll`.
- Working folders: `motion/inputs/` (brand assets, logos), `motion/clips/` (clip sources, tracked in git), `motion/work/`, `motion/dist/` and `motion/out/` (generated, not tracked).
- Automatic transcription (`video-edit/scripts/transcribe.py`) downloads Whisper models from huggingface.co. If the network policy blocks it, ask the user for an SRT or to allow that domain in the environment's network settings.

## Our working rules

- **The skill's rules stay in force:** one shape that never cuts, a cursor that drives every change, springs with no bouncy easing, one change per spoken beat, and **no invented numbers, quotes or results**.
- **Hebrew:** the engine embeds Heebo (OFL) as the Hebrew fallback, so Hebrew letters render automatically. Put `class="rtl"` on Hebrew text and mirror the layout (leading element on the right, bars filling right to left). Details are under "Hebrew and RTL" in `.claude/skills/motion-broll/reference/engine-api.md`. Check the stills that the text reads in the right order.
- **Local changes to motion-broll:** we changed `engine/base.css`, `engine/build.py`, `scripts/words.py`, `reference/engine-api.md` and `SKILL.md` for Hebrew support. Keep them when updating from upstream.
- Match the video's resolution and fps (vertical 1080×1920 for Reels/Shorts/TikTok too); keep content and the cursor inside the safe area.
- `final.mp4` from video-edit is a finished video. The parts (`rough.mp4`, B-roll clips, `captions.srt`) are delivered too, for anyone who wants to fine-tune in their own editor. motion-broll's own `preview.mp4` (hard cuts only) is for review.
- Clips and final outputs go back to the user via SendUserFile. Only source files (`motion/clips/*.html`, `plan.json`) are committed to git, not the video files.

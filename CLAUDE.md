# editing-tool

A workspace for editing videos with motion-graphic B-roll and animations.

## Skills

- `.claude/skills/motion-broll/`: imported from [Barty-Bart/motion-graphics](https://github.com/Barty-Bart/motion-graphics) (MIT, commit `e8d610a`). Turns a talking-head video plus a transcript into motion-graphic B-roll timed to the speaker's words. **Read `.claude/skills/motion-broll/SKILL.md` and `reference/engine-api.md` before any video work.**

When the user uploads a video and asks for editing, B-roll, animations or motion graphics, use `/motion-broll` and follow its full workflow: interview → inspect → plan table and **wait for approval** → build → check stills → render → deliver (preview, `compare.html`, `viewer.html`, `TIMING.md`).

## Environment (cloud container)

- `scripts/setup-env.sh` runs on session start (hook in `.claude/settings.json`). It installs ffmpeg (with `prores_ks`), numpy, and Playwright 1.56.1 into `motion/node_modules`, using the pre-installed Chromium.
- **Don't run the skill's `scripts/setup.sh`** here: it would try to download Chromium. Use `scripts/setup-env.sh` instead.
- Run engine scripts from the repo root with `NODE_PATH=./motion/node_modules`, with `$SKILL=.claude/skills/motion-broll`.
- Working folders: `motion/inputs/` (brand assets, logos), `motion/clips/` (clip sources, tracked in git), `motion/work/`, `motion/dist/` and `motion/out/` (generated, not tracked).
- No transcript? Get word timestamps with `pip install faster-whisper` (`language="he"` for Hebrew).

## Our working rules

- **The skill's rules stay in force:** one shape that never cuts, a cursor that drives every change, springs with no bouncy easing, one change per spoken beat, and **no invented numbers, quotes or results**.
- **Hebrew:** the engine embeds Heebo (OFL) as the Hebrew fallback, so Hebrew letters render automatically. Put `class="rtl"` on Hebrew text and mirror the layout (leading element on the right, bars filling right to left). Details are under "Hebrew and RTL" in `.claude/skills/motion-broll/reference/engine-api.md`. Check the stills that the text reads in the right order.
- **Local changes to the skill:** we changed `engine/base.css`, `engine/build.py`, `scripts/words.py`, `reference/engine-api.md` and `SKILL.md` for Hebrew support. Keep them when updating from upstream.
- Match the video's resolution and fps (vertical 1080×1920 for Reels/Shorts/TikTok too); keep content and the cursor inside the safe area.
- The preview is for review only; the final cut is done in the user's editor with the files from `motion/out/`.
- Clips and final outputs go back to the user via SendUserFile. Only source files (`motion/clips/*.html`, `plan.json`) are committed to git, not the video files.

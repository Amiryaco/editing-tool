# editing-tool: branded short-form video editing skills for Claude Code

A set of [Claude Code skills](https://docs.claude.com/en/docs/claude-code/skills) that turn a raw talking-head video (an AI avatar or a real person) into a finished, branded vertical reel: tight cut, gentle emphasis zooms, warm grade, one elegant motion-graphic card that changes exactly on the spoken words, soft captions under the face, light sound design and -14 LUFS loudness.

Ask Claude in this repo, e.g. *"Edit video 3 from my Drive, branded, clean and creative"* or *"Give every tip a number and its title on screen"*, and it runs the whole pipeline and sends back `final.mp4` + `captions.srt`.

## Skills

| Skill | What it does |
|---|---|
| [`brand-reels`](.claude/skills/brand-reels/SKILL.md) | **Start here.** The house style and end-to-end playbook: Drive/upload intake, `auto_cut.py`, card pattern library (hook, chips list, numbered tips with progress, quote, compare, checklist, calendar story, send/follow), `make_tips_card.py` generator, grade, captions, finish, QA, delivery, and the pitfalls we hit. |
| [`video-edit`](.claude/skills/video-edit/SKILL.md) | The editing engine: Whisper transcription (Hebrew via ivrit-ai, English), analysis (silences, face, retakes), cut rendering with zooms and transitions, script alignment, B-roll/captions/SFX/music compositing, loudness. |
| [`motion-broll`](.claude/skills/motion-broll/SKILL.md) | Motion-graphic clips as HTML: one shape that morphs between states on spring physics, a cursor that drives changes, frame-exact rendering (with motion blur) to ProRes 4444 with alpha. Imported from [Barty-Bart/motion-graphics](https://github.com/Barty-Bart/motion-graphics) (MIT) with Hebrew/RTL additions. |
| [`hebrew-captions`](.claude/skills/hebrew-captions/SKILL.md) | Burned-in captions (Hebrew RTL or English): word-level layout with HarfBuzz, styles incl. `soft` (white Heebo Bold under the face), `--below-face`, `--strong-shadow`, `.srt` export. |

## Example output

Each card is one continuous shape in the brand colours (ink `#0B0B0C`, gold `#C9A24D`, ivory `#F5F1E8`), sitting on the lap/table area under the captions:

- **Hook**: ink card, serif italic line + gold second line.
- **Numbered tips**: gold serif number in an ink circle, the tip's title, a 10-segment progress bar, changing on each spoken number.
- **Calendar story**: "Her life" card fills with her blocks; a dashed "Him" block gets bounced, then fits in "if he's worth room".
- **Ending**: "Send this" (cursor clicks send) → "Follow" flips to "✓ Following".

## Requirements

- Claude Code (CLI, desktop or claude.ai/code). In a cloud environment, `scripts/setup-env.sh` runs on session start (see `.claude/settings.json`) and installs everything.
- Locally: `ffmpeg` (with libass and `prores_ks`), Python 3.10+ with `numpy`, `opencv-python-headless<5`, `uharfbuzz`, `fonttools`, `faster-whisper`; Node 18+ and Playwright with Chromium (`cd motion && npm i playwright`); the Liberation fonts (`fonts-liberation`).
- Network: Hugging Face (Whisper models) and, for Drive intake, `drive.google.com` + `drive.usercontent.google.com`. Details in [CLAUDE.md](CLAUDE.md).

## Use the skills in another project

Copy `.claude/skills/{brand-reels,video-edit,motion-broll,hebrew-captions}` and `scripts/setup-env.sh` into the project, run the setup script once, and add your characters' colours to `motion/brands.json`.

## Layout

```
.claude/skills/        the four skills (SKILL.md, scripts, references, templates)
motion/brands.json     brand kit per character (colours, niche, handle)
motion/clips/          card sources per video (HTML, tracked)
motion/inputs/         brand assets, generated sound effects
motion/v*/             per-video work folders (git-ignored: source, transcripts, renders)
scripts/setup-env.sh   environment setup
```

## Credits and licences

- `motion-broll` engine: © Barty-Bart, MIT ([LICENSE](.claude/skills/motion-broll/LICENSE)).
- Fonts: Geist and Geist Mono (OFL), Heebo, Rubik and Noto Sans Hebrew/Symbols (OFL); licence texts sit next to the font files. Liberation Serif (OFL) is loaded from the system.
- Icons: paths from [Lucide](https://lucide.dev) (ISC).

# Lessons: problems we hit and the fix

## Getting the file
| Symptom | Cause | Fix |
|---|---|---|
| Chat upload rejected | ~30 MB upload limit | Use Drive (`fetch_drive.sh`), or the user compresses (HandBrake / FreeConvert, 1080x1920) |
| Drive connector: "File too large for download, over limit of 10 MB" | connector limit | Use the connector only to find the `id`; download with `fetch_drive.sh` |
| `CONNECT tunnel failed, response 403` | network policy blocks Drive | User adds `drive.google.com` + `drive.usercontent.google.com` in Network access → Custom → Allowed domains |
| Downloaded "mp4" is ~900 KB of HTML, `moov atom not found` | file is private (sign-in page) | User shares "Anyone with the link"; check with `get_file_permissions` |
| Whisper metadata loads, weights 403 | Hugging Face file storage blocked | Allow the hf.co domains listed in CLAUDE.md |

## Words and cutting
| Symptom | Fix |
|---|---|
| Captions/cuts start before the voice after a pause | `analyze.py` snaps word starts to silence ends; always run it before cutting |
| A word disappears after the cut | `render_cut.py` maps words by overlap; check `words_edited.json` around cuts |
| A word lands before the pause it follows (e.g. "asked … is" with `is` at the old time), or `e < s` | set `s` to where it's heard (segment start) and `e` > `s` by hand |
| English video, transcript turns into Hebrew halfway | `transcribe.py` defaults to `--lang he`; rerun with `--lang en` |
| `half -naked` split into two caption words | merge words starting with `-` into the previous one in `words_captions.json` |
| `⚠ RETAKE?` on "Never ask him… Never ask him…" | anaphora in a script, not a retake: keep |
| Same script, another character: card times off | re-time each state from the new `words_edited.json` (we measured drifts of -0.04 to +0.47 s) |

## Card
| Symptom | Fix |
|---|---|
| Black card disappears on a dark shirt | 2 px gold hairline on `#shape` (alpha box-shadow) |
| Hook text overflows the card | widen the state (900+), drop the title to 38 px, or shorten |
| Quote mark sits on the text | position it with `left:` (layers have no width, so `right:` measures from the anchor) |
| Element animates past the card edge | smaller offset (≤ 40 px) or clip it |
| Cursor wanders over the card between clicks | rest keys off-stage (y beyond the stage height) |
| "Following" flashes for 0.2 s at the very end | hold the last frame 0.6 s (`grade.sh … 0.6`) and extend the clip's `T` |
| Waiting for a background `render.js` with `pgrep -f render.js` never ends | the wait loop's own command line contains "render.js": wait on the log line (`grep -q rendered render.log`) instead |
| Contact sheets of vertical clips are cropped | our `beats.js` reads the stage size (local change, keep it) |

## Captions
| Symptom | Fix |
|---|---|
| White captions unreadable on a white shirt | `--strong-shadow` |
| Lowercase first words, no sentence breaks | `align_script.py` with a punctuated `script.txt` |
| "her self", "every one" split by Whisper | merge the two words in `words_captions.json` (keep the first word's `s`, the last word's `e`) |
| Last word alone on screen ("it", "man", "address") | lone sentence-end words join a group of up to max+1 words / max_chars+12 (in `make_captions.py`); else add a comma earlier in `script.txt` |
| Awkward break ("you'd be proud / of in a room") | add a comma at the speaker's pause in `script.txt` and re-align |
| Captions over the mouth | `--below-face rough.mp4` (per-caption face detection), `--chest 0.5` |

## Delivery
- SendUserFile ≈ 30 MB: `-crf 21` keeps 55 s around 23-25 MB; re-encode at `-crf 23` if bigger. A 500 from the server: just retry.
- Commit only sources (`motion/clips/**.html`, scripts, docs). `motion/v*/`, `*.mp4`, `*.mov`, `*.wav` are git-ignored.

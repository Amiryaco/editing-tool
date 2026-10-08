"""Hebrew captions track (.vtt) for a testimonial video, with faster-whisper.

usage: python3 make_vtt.py t1.mp4 t1.he.vtt [--model large-v3] [--max-chars 42]

Cues are cut at sentence ends or every ~max-chars characters, so each one is one or two short lines.
Proofread names and brand words by ear afterwards. Needs network access to Hugging Face for the model
(see CLAUDE.md); if that is blocked, ask the user for an SRT and convert it instead.
"""
import argparse
from faster_whisper import WhisperModel

ap = argparse.ArgumentParser()
ap.add_argument('video'); ap.add_argument('out')
ap.add_argument('--model', default='large-v3'); ap.add_argument('--max-chars', type=int, default=42)
a = ap.parse_args()

model = WhisperModel(a.model, device='auto', compute_type='int8')
segments, _ = model.transcribe(a.video, language='he', word_timestamps=True, vad_filter=True)


def ts(t):
    h, m = int(t // 3600), int(t % 3600 // 60)
    return f'{h:02d}:{m:02d}:{t % 60:06.3f}'


cues, cur = [], []
for seg in segments:
    for w in seg.words:
        cur.append(w)
        text = ''.join(x.word for x in cur).strip()
        if len(text) >= a.max_chars or text.endswith(('.', '?', '!')):
            cues.append(cur); cur = []
if cur:
    cues.append(cur)

with open(a.out, 'w', encoding='utf-8') as f:
    f.write('WEBVTT\n\n')
    for i, c in enumerate(cues, 1):
        f.write(f'{i}\n{ts(c[0].start)} --> {ts(c[-1].end)}\n{"".join(x.word for x in c).strip()}\n\n')
print(a.out, len(cues), 'cues')

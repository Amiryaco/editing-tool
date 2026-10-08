#!/usr/bin/env bash
# Subtle warm "cinematic" grade + soft vignette on the rough cut, with an optional frozen hold at the end
# (so a final Follow/Send click has time to read). Audio is padded with silence to match.
# usage: grade.sh <rough.mp4> <rough_graded.mp4> [hold_seconds=0]
set -euo pipefail
in="$1"; out="$2"; hold="${3:-0}"
vf="eq=contrast=1.05:saturation=1.06:gamma=0.98,colorbalance=rh=0.03:gh=0.01:bh=-0.03:rs=0.01:bs=-0.01,vignette=angle=PI/5:mode=forward"
af="anull"
if [ "$hold" != "0" ]; then vf="$vf,tpad=stop_mode=clone:stop_duration=$hold"; af="apad=pad_dur=$hold"; fi
ffmpeg -v error -y -i "$in" -vf "$vf" -af "$af" -c:v libx264 -crf 15 -preset medium -c:a aac -b:a 256k "$out"
ffprobe -v error -show_entries format=duration -of csv=p=0 "$out"

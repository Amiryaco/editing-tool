#!/usr/bin/env bash
# Prepares a fresh container for the motion-broll skill: ffmpeg (with prores_ks), numpy,
# and Playwright in ./motion/node_modules using the pre-installed Chromium (no browser download).
set -e
cd "$(dirname "$0")/.."
if ! command -v ffmpeg >/dev/null; then
  (apt-get install -y -qq ffmpeg || (apt-get update -qq && apt-get install -y -qq ffmpeg)) >/dev/null 2>&1 || echo "ffmpeg install failed"
fi
python3 -c "import numpy" 2>/dev/null || pip install -q numpy 2>/dev/null || pip install -q --break-system-packages numpy
mkdir -p motion/{clips,dist,out,work,inputs}
if [ ! -d motion/node_modules/playwright ]; then
  [ -f motion/package.json ] || echo '{"private":true}' > motion/package.json
  # 1.56.1 matches the Chromium build pre-installed at /opt/pw-browsers (chromium-1194).
  (cd motion && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --silent playwright@1.56.1)
fi
echo "motion-broll environment ready"

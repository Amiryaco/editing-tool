"""Turn wide desktop WhatsApp screenshots into a narrow, phone-like column so the text stays readable on a phone.

Rows of the screenshot are split into bands; each band holds bubbles on one side (incoming on the right,
outgoing on the left). The bands are stacked into one column, keeping each bubble on its own side.
Usage: python3 stack_wa.py wa_screenshot.jpg site/img/wa/wa-5.webp
"""
import sys
import cv2
import numpy as np

src, dst = sys.argv[1], sys.argv[2]
img = cv2.imread(src)
h, w = img.shape[:2]
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
# bubbles: near-white (incoming) or pale green (outgoing); the wallpaper is beige with darker doodles
white = (hsv[..., 1] < 12) & (hsv[..., 2] > 248)
green = (hsv[..., 0] > 35) & (hsv[..., 0] < 75) & (hsv[..., 1] > 20) & (hsv[..., 2] > 200)
quote = (hsv[..., 1] < 6) & (hsv[..., 2] > 236)  # grey quoted-reply boxes inside bubbles
mask = (white | green | quote).astype(np.uint8)
mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))

n, lab, stats, _ = cv2.connectedComponentsWithStats(mask)
boxes = []
for i in range(1, n):
    x, y, bw, bh, area = stats[i]
    if bw < 40 or bh < 20 or area < 1500:
        continue
    boxes.append([x, y, x + bw, y + bh])
# grow each bubble a little to keep its tail, reaction emoji and the avatar beside it
PAD = 12
boxes = [[max(0, x0 - PAD), max(0, y0 - PAD), min(w, x1 + PAD), min(h, y1 + PAD)] for x0, y0, x1, y1 in boxes]
# avatars sit just outside incoming bubbles on the right edge: keep everything to the image edge
for b in boxes:
    if b[2] > w * 0.6:
        b[2] = w
    if b[0] < w * 0.4:
        b[0] = 0
boxes.sort(key=lambda b: b[1])

# merge vertically overlapping boxes on the same side into bands
bands = []
for b in boxes:
    side = 'r' if (b[0] + b[2]) / 2 > w / 2 else 'l'
    if bands and bands[-1]['side'] == side and b[1] <= bands[-1]['y1'] + 20:
        B = bands[-1]
        B['x0'], B['x1'], B['y1'] = min(B['x0'], b[0]), max(B['x1'], b[2]), max(B['y1'], b[3])
    else:
        bands.append({'side': side, 'x0': b[0], 'y0': b[1], 'x1': b[2], 'y1': b[3]})

width = max(B['x1'] - B['x0'] for B in bands)
bg = np.median(img[mask == 0].reshape(-1, 3), axis=0).astype(np.uint8)
GAP = 10
rows = []
for B in bands:
    piece = img[B['y0']:B['y1'], B['x0']:B['x1']]
    row = np.full((piece.shape[0], width, 3), bg, np.uint8)
    if B['side'] == 'r':
        row[:, width - piece.shape[1]:] = piece
    else:
        row[:, :piece.shape[1]] = piece
    rows.append(row)
    rows.append(np.full((GAP, width, 3), bg, np.uint8))
out = np.vstack([np.full((GAP, width, 3), bg, np.uint8)] + rows)
cv2.imwrite(dst, out, [cv2.IMWRITE_WEBP_QUALITY, 92])
print(dst, out.shape[1], 'x', out.shape[0], len(bands), 'bands')

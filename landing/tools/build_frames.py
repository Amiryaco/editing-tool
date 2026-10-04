"""Build the scroll-story image sequence from the two Higgsfield clips.

usage: python3 landing/tools/build_frames.py <clipA.mp4> <clipB.mp4> [--out landing/site/media/story]

Clip A: liquid gold droplets scatter, then pull into one sphere (Higgsfield job f616987c-1d83-4fa5-8f63-4ddbfb6a4722).
Clip B: the sphere turns, lands and rises into gold bars (job d18679fc-1fc5-4e17-b1e9-e3ee67c4d500).
Both were generated with Seedance 2.0 Mini, 9:16, 720p, 8 s, start/end frames pinned to the same keyframes.

The sphere at the end of A is about 7% larger than at the start of B, so the last 1.5 s of A are eased
toward B's scale and centre. B's first frame is dropped (it duplicates A's last), giving 241 frames.
Writes f-0000.webp … f-0240.webp, poster.webp, poster.jpg and manifest.json into a fresh staging folder,
then swaps it in.
"""
import argparse, json, math, pathlib, shutil, subprocess, tempfile
import cv2
import numpy as np

FPS = 15
W, H = 640, 1138
QUALITY = 70
# sphere centre/scale measured on A's last frame and B's first frame (720x1280 source pixels)
C_A, C_B, S_END, RAMP = (360.0, 740.5), (358.5, 734.5), 0.93, 23


def extract(video, folder):
    folder.mkdir(parents=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-i', str(video), '-vf', f'fps={FPS}', str(folder / '%04d.png')], check=True)
    return sorted(folder.glob('*.png'))


def ease_to_b(img, t):
    e = 0.5 - 0.5 * math.cos(math.pi * t)
    s = 1 + (S_END - 1) * e
    cx = C_A[0] + (C_B[0] - C_A[0]) * e
    cy = C_A[1] + (C_B[1] - C_A[1]) * e
    m = np.float32([[s, 0, cx - s * C_A[0]], [0, s, cy - s * C_A[1]]])
    return cv2.warpAffine(img, m, (img.shape[1], img.shape[0]), flags=cv2.INTER_CUBIC, borderValue=(3, 3, 3))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('clip_a'); ap.add_argument('clip_b')
    ap.add_argument('--out', default=str(pathlib.Path(__file__).resolve().parents[1] / 'site/media/story'))
    a = ap.parse_args()
    out = pathlib.Path(a.out)
    tmp = pathlib.Path(tempfile.mkdtemp())
    fa, fb = extract(a.clip_a, tmp / 'a'), extract(a.clip_b, tmp / 'b')
    stage = out.with_name(out.name + '.staging')
    shutil.rmtree(stage, ignore_errors=True); stage.mkdir(parents=True)

    frames = []
    for i, p in enumerate(fa):
        img = cv2.imread(str(p))
        k = i - (len(fa) - RAMP)
        if k > 0:
            img = ease_to_b(img, k / RAMP)
        frames.append(img)
    frames += [cv2.imread(str(p)) for p in fb[1:]]

    for i, img in enumerate(frames):
        small = cv2.resize(img, (W, H), interpolation=cv2.INTER_AREA)
        cv2.imwrite(str(stage / f'f-{i:04d}.webp'), small, [cv2.IMWRITE_WEBP_QUALITY, QUALITY])
    poster = cv2.resize(frames[0], (W, H), interpolation=cv2.INTER_AREA)
    cv2.imwrite(str(stage / 'poster.webp'), poster, [cv2.IMWRITE_WEBP_QUALITY, 82])
    cv2.imwrite(str(stage / 'poster.jpg'), poster, [cv2.IMWRITE_JPEG_QUALITY, 82])
    manifest = {'count': len(frames), 'pattern': 'f-%04d.webp', 'width': W, 'height': H, 'fps': FPS,
                'poster': 'poster.webp', 'seam_frame': len(fa) - 1}
    (stage / 'manifest.json').write_text(json.dumps(manifest, indent=2))

    # verify before swapping in
    files = sorted(stage.glob('f-*.webp'))
    assert len(files) == manifest['count'], 'frame count mismatch'
    for f in (files[0], files[len(files) // 2], files[-1]):
        im = cv2.imread(str(f)); assert im is not None and im.shape[:2] == (H, W), f
    total = sum(f.stat().st_size for f in files)
    shutil.rmtree(out, ignore_errors=True); stage.rename(out)
    shutil.rmtree(tmp, ignore_errors=True)
    print(f"{manifest['count']} frames, {total / 1e6:.1f} MB, seam at frame {manifest['seam_frame']} -> {out}")


if __name__ == '__main__':
    main()

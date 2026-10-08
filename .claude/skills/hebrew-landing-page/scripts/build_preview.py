"""Build a claude.ai Artifact preview of a static landing page, and a Cloudflare-ready zip.

usage: python3 build_preview.py --root landing [--site site] [--out preview] [--zip site.zip]

The artifact frame only allows inline CSS/JS, and one version holds at most 511 files, so:
- fonts.css (woff2 → base64 data URIs) and styles.css are inlined into a <style> on every page;
- every local <script src="x.js"> is inlined;
- index.html is written as a fragment (the artifact skeleton owns <html>/<body>; dir/lang and the body class are
  re-applied by a small script); other pages are full documents, or they render in quirks mode;
- privacy/terms/accessibility <main> blocks are embedded in index.html as <template id="legal-*"> so the page can
  open them in its dialog (the frame cannot navigate);
- caption .vtt files become data URIs; a frame-sequence poster points at frame 0;
- thanks.html is left out (the form cannot submit inside the preview).
The zip is the untouched site folder, for Cloudflare "upload assets".
"""
import argparse, base64, pathlib, re, shutil, zipfile

ap = argparse.ArgumentParser()
ap.add_argument('--root', default='.', help='folder that holds the site folder')
ap.add_argument('--site', default='site')
ap.add_argument('--out', default='preview')
ap.add_argument('--zip', default='site.zip')
args = ap.parse_args()

ROOT = pathlib.Path(args.root).resolve()
SITE, OUT = ROOT / args.site, ROOT / args.out
LEGAL = ('privacy', 'terms', 'accessibility')

shutil.rmtree(OUT, ignore_errors=True)
shutil.copytree(SITE, OUT, ignore=shutil.ignore_patterns(
    '*.html', '*.css', '*.js', 'fonts', '_headers', '*.vtt', 'poster.webp', 'poster.jpg', 'manifest.json'))
for p in ('img/favicon.png', 'img/logo.png'):  # unused by the preview, saves files
    (OUT / p).unlink(missing_ok=True)

fonts = (SITE / 'fonts.css').read_text() if (SITE / 'fonts.css').exists() else ''
fonts = re.sub(r'url\((fonts/[^)]+\.woff2)\)',
               lambda m: 'url(data:font/woff2;base64,%s)' % base64.b64encode((SITE / m.group(1)).read_bytes()).decode(), fonts)
css = (SITE / 'styles.css').read_text()
rtl = "<script>document.documentElement.dir = 'rtl'; document.documentElement.lang = 'he';</script>"


def inline_scripts(body):
    def rep(m):
        src = m.group(1)
        f = SITE / src
        if not f.exists() or src.startswith(('http:', 'https:', '//')):
            return m.group(0)
        js = f.read_text().replace("SEQ_DIR + 'poster.webp'", "SEQ_DIR + 'f-0000.webp'")
        return '<script>\n%s\n</script>' % js
    return re.sub(r'<script src="([^"]+\.js)"(?: defer)?(?: async)?></script>', rep, body)


def build(name):
    html = (SITE / name).read_text()
    title = re.search(r'<title>(.*?)</title>', html, re.S)
    title = title.group(1).strip() if title else name
    body = re.search(r'<body[^>]*>(.*)</body>', html, re.S).group(1)
    body_attrs = re.search(r'<body([^>]*)>', html).group(1)
    body = inline_scripts(body)
    body = body.replace('src="media/story/poster.webp"', 'src="media/story/f-0000.webp"')
    body = re.sub(r'src="([^"]+\.vtt)"',
                  lambda m: 'src="data:text/vtt;base64,%s"' % base64.b64encode((SITE / m.group(1)).read_bytes()).decode(), body)
    head_style = re.findall(r'<style>(.*?)</style>', html.split('<body')[0], re.S)  # page-specific <style> in <head>
    extra = '\n'.join(head_style)
    if name == 'index.html':
        for n in LEGAL:
            if (SITE / f'{n}.html').exists():
                m = re.search(r'<main[^>]*>.*?</main>', (SITE / f'{n}.html').read_text(), re.S)
                if m:
                    body += '\n<template id="legal-%s">%s</template>' % (n, m.group(0))
        cls = re.search(r'class="([^"]+)"', body_attrs)
        if cls:
            body = "<script>document.addEventListener('DOMContentLoaded', () => { document.body.className = '%s'; });</script>\n" % cls.group(1) + body
        (OUT / name).write_text('<meta charset="utf-8">\n<title>%s</title>\n%s\n<style>\nhtml { direction: rtl; }\n%s\n%s\n%s\n</style>\n%s'
                                % (title, rtl, fonts, css, extra, body))
    else:
        (OUT / name).write_text('<!doctype html>\n<html lang="he" dir="rtl">\n<head>\n<meta charset="utf-8">\n'
                                '<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>%s</title>\n'
                                '<style>\n%s\n%s\n%s\n</style>\n</head>\n<body%s>\n%s\n</body>\n</html>\n'
                                % (title, fonts, css, extra, body_attrs, body))


build('index.html')
for n in LEGAL:
    if (SITE / f'{n}.html').exists():
        build(f'{n}.html')
count = sum(1 for p in OUT.rglob('*') if p.is_file())
print('preview ->', OUT, count, 'files', '(over the 511-file artifact limit!)' if count > 511 else '')

zpath = ROOT / args.zip
with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_DEFLATED) as z:
    for p in sorted(SITE.rglob('*')):
        if p.is_file():
            z.write(p, pathlib.Path(SITE.name) / p.relative_to(SITE))
print('zip ->', zpath, round(zpath.stat().st_size / 1e6, 1), 'MB')

"""Make a claude.ai Artifact preview of the site (preview/), and a Cloudflare-ready zip (ay-landing.zip).

The artifact frame only allows inline CSS/JS, so styles, fonts (data URIs) and scripts are inlined into each page.
An artifact version holds at most 511 files, so the preview also packs small things: caption tracks become data
URIs, the story posters point at frame 0, and thanks.html is left out (the form cannot submit inside the preview).
The zip for Cloudflare is the untouched site/ folder.
"""
import base64, pathlib, re, shutil, zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
SITE, OUT = ROOT / 'site', ROOT / 'preview'

shutil.rmtree(OUT, ignore_errors=True)
shutil.copytree(SITE, OUT, ignore=shutil.ignore_patterns(
    '*.html', 'styles.css', 'fonts.css', '*.js', 'fonts', '_headers', '*.vtt', 'poster.webp', 'poster.jpg', 'manifest.json'))
# keep favicon/logo.png out too (unused by the preview pages)
for p in ('img/favicon.png', 'img/logo.png'):
    (OUT / p).unlink(missing_ok=True)

fonts = (SITE / 'fonts.css').read_text()
fonts = re.sub(r'url\((fonts/[^)]+\.woff2)\)', lambda m: 'url(data:font/woff2;base64,%s)' % base64.b64encode((SITE / m.group(1)).read_bytes()).decode(), fonts)
css = (SITE / 'styles.css').read_text()
pixels = (SITE / 'pixels.js').read_text()
app = (SITE / 'app.js').read_text().replace("SEQ_DIR + 'poster.webp'", "SEQ_DIR + 'f-0000.webp'")
rtl = "<script>document.documentElement.dir = 'rtl'; document.documentElement.lang = 'he';</script>"


def build(name, title):
    html = (SITE / name).read_text()
    body = re.search(r'<body[^>]*>(.*)</body>', html, re.S).group(1)
    body_cls = re.search(r'<body([^>]*)>', html).group(1)
    body = body.replace('<script src="pixels.js" defer></script>', '<script>\n%s\n</script>' % pixels)
    body = body.replace('<script src="app.js" defer></script>', '<script>\n%s\n</script>' % app)
    body = body.replace('src="media/story/poster.webp"', 'src="media/story/f-0000.webp"')
    body = re.sub(r'src="(media/testimonials/t\d\.he\.vtt)"',
                  lambda m: 'src="data:text/vtt;base64,%s"' % base64.b64encode((SITE / m.group(1)).read_bytes()).decode(), body)
    if name == 'index.html':  # the artifact frame cannot navigate to the legal pages, so the dialog reads them from here
        for n in ('privacy', 'terms', 'accessibility'):
            m = re.search(r'<main[^>]*>.*?</main>', (SITE / (n + '.html')).read_text(), re.S).group(0)
            body += '\n<template id="legal-%s">%s</template>' % (n, m)
    cls = re.search(r'class="([^"]+)"', body_cls)
    if cls:  # the artifact skeleton owns <body>; re-apply the page's body class
        body = "<script>document.addEventListener('DOMContentLoaded', () => { document.body.className = '%s'; });</script>\n" % cls.group(1) + body
    if name == 'index.html':
        (OUT / name).write_text('<meta charset="utf-8">\n<title>%s</title>\n%s\n<style>\nhtml { direction: rtl; }\n%s\n%s\n</style>\n%s'
                                % (title, rtl, fonts, css, body))
    else:  # extra pages are served as-is, so they need a full document of their own
        (OUT / name).write_text('<!doctype html>\n<html lang="he" dir="rtl">\n<head>\n<meta charset="utf-8">\n'
                                '<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>%s</title>\n'
                                '<style>\n%s\n%s\n</style>\n</head>\n<body%s>\n%s\n</body>\n</html>\n'
                                % (title, fonts, css, body_cls, body))


build('index.html', 'AY Digital Marketing')
for n, t in (('privacy.html', 'מדיניות פרטיות'), ('terms.html', 'תנאי שימוש'), ('accessibility.html', 'הצהרת נגישות')):
    build(n, t)
n = sum(1 for p in OUT.rglob('*') if p.is_file())
print('preview ->', OUT, n, 'files')

with zipfile.ZipFile(ROOT / 'ay-landing.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    for p in sorted(SITE.rglob('*')):
        if p.is_file():
            z.write(p, p.relative_to(SITE))
print('zip ->', ROOT / 'ay-landing.zip', round((ROOT / 'ay-landing.zip').stat().st_size / 1e6, 1), 'MB')

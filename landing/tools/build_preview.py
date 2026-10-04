"""Make a claude.ai Artifact preview of the site (preview/), and a Cloudflare-ready zip (ay-landing.zip).

The artifact frame only allows the page's own inline CSS/JS, so styles, fonts (as data URIs) and app.js are
inlined into preview/index.html; images, frames and videos are published alongside it.
"""
import base64, pathlib, re, shutil, zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
SITE, OUT = ROOT / 'site', ROOT / 'preview'

shutil.rmtree(OUT, ignore_errors=True)
shutil.copytree(SITE, OUT, ignore=shutil.ignore_patterns('index.html', 'styles.css', 'fonts.css', 'app.js', 'fonts'))

fonts = (SITE / 'fonts.css').read_text()
fonts = re.sub(r'url\((fonts/[^)]+\.woff2)\)', lambda m: 'url(data:font/woff2;base64,%s)' % base64.b64encode((SITE / m.group(1)).read_bytes()).decode(), fonts)
html = (SITE / 'index.html').read_text()
title = re.search(r'<title>.*?</title>', html, re.S).group(0)
body = re.search(r'<body>(.*)</body>', html, re.S).group(1)
body = body.replace('<script src="app.js" defer></script>', '<script>\n%s\n</script>' % (SITE / 'app.js').read_text())
(OUT / 'index.html').write_text('%s\n<style>\n%s\n%s\n</style>\n%s' % (title, fonts, (SITE / 'styles.css').read_text(), body))
print('preview ->', OUT)

with zipfile.ZipFile(ROOT / 'ay-landing.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    for p in sorted(SITE.rglob('*')):
        if p.is_file():
            z.write(p, p.relative_to(SITE))
print('zip ->', ROOT / 'ay-landing.zip', round((ROOT / 'ay-landing.zip').stat().st_size / 1e6, 1), 'MB')

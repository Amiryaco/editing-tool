# Preview and deploy

## Local server

```bash
cd landing && python3 -m http.server 8765      # then http://localhost:8765/site/index.html
```

Run the server in the background, and reuse it across tests.

## claude.ai artifact preview (a shareable link while you iterate)

The artifact frame allows only inline CSS/JS, and a version holds at most **511 files**. `scripts/build_preview.py` handles both limits:

- It copies `site/` to `preview/` without HTML, CSS, JS, fonts and `_headers`.
- It inlines `fonts.css` (as base64 woff2 data URIs), `styles.css` and every local `<script src="x.js">` into each page.
- **index.html** is written as a fragment: the artifact skeleton owns `<html>`/`<body>`, so it sets `dir`/`lang` with a script and re-applies the page's body class. **The other pages** are written as full documents (`<!doctype html>`), or they render in quirks mode.
- It embeds the legal pages into index.html as `<template id="legal-privacy|terms|accessibility">`. The frame can't navigate to another page, so app.js opens them in the dialog from the template.
- It turns caption `.vtt` files into data URIs, and points the frame-sequence poster at frame 0, to save files.
- It also writes `<project>.zip` of the untouched `site/` folder for Cloudflare.

```bash
python3 $LP/scripts/build_preview.py --root landing --zip ay-landing.zip
```

**Publishing:**
- Publish `preview/index.html` with the Artifact tool, with `root: preview` and the other HTML pages in `files`.
- On later rounds, republish to the **same URL** (pass `url`) with only the changed pages. Files you leave out are kept, so the images don't need re-uploading.
- If the count passes 511, pack more: data-URI small images, or drop the frame sequence from the preview.

Give the user the artifact link after each round. It's private until they share it.

## Cloudflare (live site)

The user's setup was Cloudflare **Workers & Pages → Create → Upload assets** (drag and drop, no git, no CLI). This creates a `*.workers.dev` (or `*.pages.dev`) URL.

- **First deploy:** send the user the zip with SendUserFile. They unzip it on their computer and drag the **folder** (not the zip, and not the files one by one) into the upload box.
- **Updates:** on the project, choose **"Create new deployment"** (or "New deployment") and drag the folder again. Each deployment replaces the whole site, so always upload the full folder. Older deployments stay listed and can be rolled back.
- **Mac:** after unzipping in Finder, drag the folder from Finder into the browser window. If the browser opens the files instead, drag onto the dashed box exactly.
- `_headers` sits at the root of the folder. Cloudflare applies it automatically.
- The user doesn't need `wrangler` or a terminal. Only offer them if they ask.

### Subdomain (e.g. `lp.example.co.il`)

- **If the main domain's DNS is already on Cloudflare:** go to the project → Settings → Domains & Routes → Add custom domain, then type `lp.example.co.il`. Cloudflare creates the record and the certificate.
- **If the DNS is elsewhere** (the registrar, Wix, GoDaddy and so on): first find out where it is managed. The user usually doesn't know, so ask where they bought the domain, or check the nameservers. Then either:
  - move the domain's nameservers to Cloudflare (free; the main site keeps working once its records are copied), or
  - for a **Pages** project, add the custom domain in Cloudflare, then create the `CNAME lp → <project>.pages.dev` record at the current DNS host.
- **Before switching ads to the new address:** HTTPS works, the form sends, the pixels fire, and the canonical/OG URLs are updated.

## Git

- Commit the sources only: HTML, CSS, JS, fonts, small images, tools and templates.
- Gitignore the generated frames, the preview, the zip and raw uploads (`landing/.gitignore`). Videos are already ignored repo-wide (`*.mp4`, `*.mov`).
- Commit after each approved round, and push to the session branch. Large media go to the user as files, not into git.

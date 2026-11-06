# ParlorLens

Milking-parlor vacuum audit for BioControl VaDia recordings, by Eng. Mohammad Murad.
Runs in the browser; recordings are analysed on the device and never uploaded.

**Open or install:** https://parlorlens.github.io

## Releasing a new version

1. Open `ParlorLens.html` in this repository on github.com, click the pencil or **Add file → Upload files**,
   and upload the new version **named `ParlorLens.html`**. The version number is read from inside the file (`APP.version`).
2. Optional: write one line in `release-notes.txt` — it is shown to users in the update banner.
3. Commit. The **Publish ParlorLens** action builds and publishes the site in about a minute (Actions tab).

Every device that has the app open or installed then shows **"ParlorLens vNN is ready — Update now"**.
It never reloads by itself, so an unsaved visit is not lost; it offers **Save visit** first when one is open.

## What is published

`build_site.py` turns `ParlorLens.html` into the web app: `index.html` (the app plus install, offline and update hooks),
`sw.js` (offline cache, renamed per version), `version.json`, `manifest.webmanifest` (install; opens `.vd6`, `.vd5`, `.plvisit`
files on a laptop), icons, and `ParlorLens-vNN.html` — the plain single file, for offline copies and e-mail.

## One-time setup

Settings → Pages → Build and deployment → Source: **GitHub Actions**.

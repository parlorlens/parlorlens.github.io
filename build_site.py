"""Build the ParlorLens web app from the single-file app.

    python3 build_site.py ParlorLens.html site/

Reads the version from APP.version inside the HTML, then writes site/ with:
  index.html            the app, plus the web-app hooks (manifest, offline cache, update banner, file handling)
  sw.js                 offline cache, named after the version so every release replaces the old one
  version.json          what the update banner shows
  manifest.webmanifest  install as an app; opens .vd6 / .vd5 / .plvisit files on desktop
  ParlorLens-vNN.html   the untouched single file, for offline copies and e-mail
  icons
The app's own code is not changed. Opened from disk (file://) the hooks do nothing, so the single file behaves as before.
"""
import json, re, shutil, sys, datetime, pathlib

src_path, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
here = pathlib.Path(__file__).resolve().parent
html = src_path.read_text(encoding="utf-8")
m = re.search(r'const APP = \{ name: "ParlorLens", version: "(\d+)"', html)
if not m:
    sys.exit("APP.version not found in " + str(src_path))
version = m.group(1)
out.mkdir(parents=True, exist_ok=True)

HEAD = """<link rel="manifest" href="manifest.webmanifest">
<meta name="theme-color" content="#0b5fa5">
<link rel="icon" type="image/png" href="favicon.png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
"""

HOOK = r"""<style>
.pl-update{position:fixed;left:16px;right:16px;bottom:16px;z-index:200;max-width:720px;margin:0 auto;display:flex;gap:10px;align-items:center;flex-wrap:wrap;
 padding:12px 14px;border-radius:10px;background:#073c68;color:#fff;box-shadow:0 10px 30px rgba(0,0,0,.35);font:14px system-ui,-apple-system,"Segoe UI",sans-serif}
.pl-update span{flex:1 1 260px}
body.pl-has-update main{padding-bottom:130px}
.pl-update button{border:1px solid rgba(255,255,255,.5);background:transparent;color:#fff;border-radius:6px;padding:7px 12px;font:600 13px inherit;cursor:pointer}
.pl-update button.go{background:#fff;color:#073c68;border-color:#fff}
@media print{.pl-update,#pl-install{display:none!important}}
</style>
<script>
/* ParlorLens web app: offline cache, one-click updates, install, open .vd6 files. Not used when the file is opened from disk. */
(function () {
  if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
  // reload only after the user chose "Update now" — never on the first visit, when the offline cache first takes over
  var updating = false, reloading = false;
  var hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (updating) { if (!reloading) { reloading = true; location.reload(); } return; }
    // updated from another window: offer a reload here too (never on the first visit, when there was no controller before)
    if (hadController) navigator.serviceWorker.getRegistration().then(function (reg) { var old = document.getElementById('pl-update'); if (old) { old.remove(); document.body.classList.remove('pl-has-update'); } if (reg) offer(reg, 'active'); });
    hadController = true;
  });
  // where = 'waiting': a new version is downloaded and waits for "Update now";
  //         'active' : another window already switched to it, so this window only needs a reload
  function offer(reg, where) {
    if (document.getElementById('pl-update') || (where !== 'active' && !reg.waiting)) return;
    fetch('version.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).catch(function () { return {}; }).then(function (v) {
      var dirty = typeof visitIsDirty === 'function' && visitIsDirty();
      var bar = document.createElement('div'); bar.id = 'pl-update'; bar.className = 'pl-update'; bar.setAttribute('role', 'status');
      var msg = document.createElement('span');
      var same = typeof APP === 'object' && v.version && String(v.version) === String(APP.version);
      msg.textContent = (same ? 'An update to ParlorLens v' + v.version + ' is ready.' : 'ParlorLens v' + (v.version || '?') + ' is ready.') + (v.notes ? ' ' + v.notes : '') +
        (dirty ? ' Save your visit first: updating reloads the app.' : '');
      bar.appendChild(msg);
      function btn(text, cls, fn) { var b = document.createElement('button'); b.type = 'button'; b.textContent = text; if (cls) b.className = cls; b.onclick = fn; bar.appendChild(b); }
      if (dirty && typeof saveVisit === 'function') btn('Save visit', '', function () { saveVisit(); });
      btn('Update now', 'go', function () {
        updating = true;
        if (reg.waiting) { reg.waiting.postMessage('update-now'); setTimeout(function () { location.reload(); }, 4000); }   // reload follows the switch; the timer is a fallback
        else location.reload();                                                                                          // already switched in another window
      });
      btn('Later', '', function () { bar.remove(); document.body.classList.remove('pl-has-update'); });
      document.body.appendChild(bar); document.body.classList.add('pl-has-update');
    });
  }
  navigator.serviceWorker.register('sw.js').then(function (reg) {
    if (reg.waiting && navigator.serviceWorker.controller) offer(reg);
    reg.addEventListener('updatefound', function () {
      var w = reg.installing; if (!w) return;
      w.addEventListener('statechange', function () { if (w.state === 'installed' && navigator.serviceWorker.controller) offer(reg); });
    });
    function check() { reg.update().catch(function () {}); }
    setInterval(check, 60 * 60 * 1000);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') check(); });
  }).catch(function () {});
  // "Install app" next to Theme, where the browser offers installation
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    if (document.getElementById('pl-install')) return;
    var row = document.querySelector('.topbar .row') || document.body;
    var b = document.createElement('button'); b.id = 'pl-install'; b.type = 'button'; b.className = 'btn sm'; b.textContent = 'Install app';
    b.onclick = function () {
      // installing opens ParlorLens in a new, empty window: an unsaved visit stays behind in this tab
      if (typeof visitIsDirty === 'function' && visitIsDirty() &&
          !confirm('Installing opens ParlorLens in a new window, which starts empty. Save your visit first (Visit → Save visit) to keep it. Install now anyway?')) return;
      e.prompt(); e.userChoice.then(function () { b.remove(); });
    };
    row.insertBefore(b, row.firstChild);
  });
  // installed on a laptop: double-clicking a .vd6 or .plvisit opens it here
  if ('launchQueue' in window) window.launchQueue.setConsumer(function (params) {
    if (!params.files || !params.files.length) return;
    Promise.all(params.files.map(function (h) { return h.getFile(); })).then(function (files) { if (typeof handleFiles === 'function') handleFiles(files); });
  });
})();
</script>
"""

assert html.count("</head>") == 1 and html.count("</body>") == 1
index = html.replace("</head>", HEAD + "</head>", 1).replace("</body>", HOOK + "</body>", 1)
(out / "index.html").write_text(index, encoding="utf-8")
(out / f"ParlorLens-v{version}.html").write_text(html, encoding="utf-8")

ASSETS = ["icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png", "favicon.png"]
for a in ASSETS:
    shutil.copy(here / a, out / a)

notes = ""
notes_file = here / "release-notes.txt"
if notes_file.exists():
    notes = notes_file.read_text(encoding="utf-8").strip().splitlines()[0][:160]
(out / "version.json").write_text(json.dumps({"version": version, "released": datetime.date.today().isoformat(), "notes": notes}), encoding="utf-8")

manifest = {
    "name": "ParlorLens", "short_name": "ParlorLens",
    "description": "Milking-parlor vacuum audit for BioControl VaDia recordings",
    "start_url": "./", "scope": "./", "display": "standalone",
    "background_color": "#eef2f6", "theme_color": "#0b5fa5",
    "icons": [
        {"src": "icon-192.png", "sizes": "192x192", "type": "image/png"},
        {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"},
        {"src": "icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}],
    "file_handlers": [{"action": "./", "accept": {"application/octet-stream": [".vd6", ".vd5", ".plvisit"]}}],
}
(out / "manifest.webmanifest").write_text(json.dumps(manifest, indent=1), encoding="utf-8")

SW = """/* ParlorLens offline cache, version %(v)s. A new release changes this file, so every device fetches the new app
   in the background and the page offers "Update now"; nothing reloads by itself while a visit is open. */
const CACHE = 'parlorlens-v%(v)s';
const FILES = ['./', './index.html', './manifest.webmanifest', './version.json', './ParlorLens-v%(v)s.html', %(assets)s];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(u => new Request(u, { cache: 'reload' })))));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('parlorlens-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'update-now') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.endsWith('/version.json')) { e.respondWith(fetch(req).catch(() => caches.match(req))); return; }
  e.respondWith(caches.open(CACHE).then(c => c.match(req, { ignoreSearch: true })
    .then(hit => hit || (req.mode === 'navigate' ? c.match('./') : null))
    .then(hit => hit || fetch(req))));
});
""" % {"v": version, "assets": ", ".join("'./%s'" % a for a in ASSETS)}
import hashlib
build = hashlib.sha256(b"".join((out / f).read_bytes() for f in ["index.html", "version.json", "manifest.webmanifest"] + ASSETS)).hexdigest()[:12]
SW = SW.replace("const CACHE = 'parlorlens-v%s';" % version, "const CACHE = 'parlorlens-v%s-%s';" % (version, build))
(out / "sw.js").write_text(SW, encoding="utf-8")
print("ParlorLens v%s web app written to %s" % (version, out))

"""Make an evaluation copy of ParlorLens for one named recipient.

    python3 tools/make_eval.py ParlorLens.html "Recipient name" 2026-12-31 out.html

The copy is a single HTML file that
  - names the recipient and the terms on screen and on every report (red strip, watermark, footer, file names),
  - stops working after the expiry date,
  - carries an evaluation ID so a leaked copy can be traced to its recipient.
These measures deter and document; they do not make copying impossible. The agreement signed with the
recipient is what protects the software.
"""
import sys, re, json, hashlib, datetime
src_path, who, expires, out_path = sys.argv[1:5]
datetime.date.fromisoformat(expires)
s = open(src_path, encoding="utf-8").read()
eid = "EV-" + hashlib.sha256((who + expires + datetime.date.today().isoformat()).encode()).hexdigest()[:10].upper()
EV = {"licensee": who, "expires": expires, "id": eid}

def rep(a, b):
    global s
    assert s.count(a) == 1, (s.count(a), a[:80])
    s = s.replace(a, b)

rep('const APP = { name: "ParlorLens",', 'const EVAL = ' + json.dumps(EV) + ';\nconst APP = { name: "ParlorLens",')
rep('el("span", { text: APP.name + " v" + APP.version + " by " + APP.by + " · " + APP.copyright }),',
    'el("span", { text: APP.name + " v" + APP.version + " by " + APP.by + " · " + APP.copyright + " · EVALUATION COPY for " + EVAL.licensee + " (" + EVAL.id + ") — not for distribution" }),')
rep("+'_v'+APP.version+'_'+dateOf(new Date())+'.'+ext;}", "+'_EVALUATION_v'+APP.version+'_'+dateOf(new Date())+'.'+ext;}")
rep("function boot(){\n", """function evalExpired(){return new Date()>new Date(EVAL.expires+'T23:59:59');}
function boot(){
 document.body.classList.add('eval-copy');
 const strip=el('div',{class:'eval-strip'},'Evaluation copy for '+EVAL.licensee+' \\u00b7 valid until '+EVAL.expires+' \\u00b7 '+EVAL.id+' \\u00b7 \\u00a9 Mohammad Murad \\u2014 evaluation only: no copying, modification, reverse engineering or redistribution without written agreement.');
 document.body.prepend(strip);
 if(evalExpired()){document.querySelector('.shell').replaceChildren(el('main',null,el('div',{class:'wrap',style:'padding:60px 20px;text-align:center'},[el('h2',{text:'This evaluation copy has expired'}),el('p',{text:'It was issued to '+EVAL.licensee+' and was valid until '+EVAL.expires+' ('+EVAL.id+').'}),el('p',{text:'To continue, contact Eng. Mohammad Murad \\u2014 technical@libanvet.net'})])));document.title=APP.name+' \\u2014 evaluation expired';return;}
""")
rep("document.title=APP.name+' v'+APP.version;", "document.title=APP.name+' v'+APP.version+' \\u2014 Evaluation copy';")
wm = "EVALUATION COPY \u00b7 " + who.replace("\\", "").replace('"', "")
rep("</head>", """<style>
.eval-strip{background:#7a1712;color:#fff;font:600 12px system-ui,sans-serif;padding:6px 14px;text-align:center}
.eval-copy .report{position:relative}
.eval-copy .report::before{content:"%s";position:absolute;inset:0;display:grid;place-items:start center;padding-top:220px;font:700 44px system-ui,sans-serif;color:rgba(166,33,25,.10);transform:rotate(-24deg);pointer-events:none;z-index:5;white-space:nowrap}
@media print{
 .eval-strip{display:none}
 body.eval-copy.printing-report::after{content:"%s";position:fixed;top:44%%;left:0;right:0;text-align:center;font:700 34pt system-ui,sans-serif;color:rgba(166,33,25,.13);transform:rotate(-24deg);z-index:9999;white-space:nowrap}
}
</style>
</head>""" % (wm, wm))

open(out_path, "w", encoding="utf-8").write(s)
print("evaluation copy %s for %s, valid until %s -> %s (%d KB)" % (eid, who, expires, out_path, len(s) // 1024))

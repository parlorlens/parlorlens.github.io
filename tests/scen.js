const L=require('./lib.js');const fs=require('fs');const ok=L.ok;const app=process.argv[2];
const JUNK=/\bundefined\b|\bNaN\b|\[object Object\]|\bnull\b|Infinity/;
(async()=>{const b=await L.chromium.launch();const p=await L.open(b,app);
 await p.click('text=Not now').catch(()=>{});
 await p.fill('#f_farmName','Haddad Farm');await p.fill('#f_testDate','2026-11-17');await p.fill('#f_visitNotes','Liners changed three weeks ago.');
 // --- A: three recordings
 await L.load(p,L.REC+'/FarmA_unit3_MTT.vd6');await L.run(p,'Enter cow records');
 await p.fill('#mcow0','794');await p.fill('#myld0','14.2');await p.fill('#mnote1','kicked off once');await p.click('text=Save cow records');await p.waitForTimeout(800);
 await L.load(p,L.REC+'/FarmB_unit1_MTT.vd6');
 const st=await p.evaluate(()=>({active:VISIT.records.findIndex(r=>r.id===VISIT.active),n:VISIT.records.length,setup:S.setupComplete,top:Math.round(document.getElementById('setup-panel')?.getBoundingClientRect().top)}));
 ok('A1 second recording becomes active and shows its setup',st.n===2&&st.active===1&&st.setup===false,JSON.stringify(st));
 const cowB=await p.evaluate(()=>!!document.getElementById('cow-records'));ok('A2 cow table of recording 1 is not shown for the un-analysed recording 2',!cowB);
 await L.run(p,'Later');
 ok('A3 "Later" goes to results',await p.evaluate(()=>S.view)==='results');
 await p.evaluate(()=>go('visit'));await p.waitForTimeout(400);
 const n2=await p.evaluate(()=>[document.getElementById('mcow0')?.value,document.getElementById('mnote1')?.value]);ok('A4 recording 2 cow table is empty (no leak from recording 1)',n2[0]===''&&n2[1]==='',JSON.stringify(n2));
 await p.selectOption('select[aria-label="Active recording"]',{index:0});await p.waitForTimeout(600);
 const n1=await p.evaluate(()=>[document.getElementById('mcow0')?.value,document.getElementById('mnote1')?.value]);ok('A5 switching back shows recording 1 cows and notes',n1[0]==='794'&&n1[1]==='kicked off once',JSON.stringify(n1));
 // --- B: same file twice
 await L.load(p,L.REC+'/FarmA_unit3_MTT.vd6');const dup=await p.evaluate(()=>({n:VISIT.records.length,msg:document.querySelector('#views .note.crit, #views .note.warn, .pl-error, [role=alert]')?.innerText||document.querySelector('main')?.innerText.match(/already in this visit[^\n]*/)?.[0]||''}));
 ok('B1 the same file twice is refused with a message',dup.n===2&&/already/.test(dup.msg),JSON.stringify(dup).slice(0,200));
 // --- C: PT file in the same visit
 await L.load(p,L.REC+'/PT_4pulsators.vd6');for(let c=0;c<4;c++)await p.selectOption('select[aria-label="CH'+(c+1)+' connection"]','SPT');
 await p.click('.test-tile >> nth=1');await p.waitForTimeout(300);await L.run(p);
 ok('C1 pulsator test runs with no question box',await p.evaluate(()=>S.view==='results'&&!document.getElementById('pl-dialog')));
 const res=await p.evaluate(()=>document.querySelector('#views').innerText);ok('C2 pulsator results page clean',!JUNK.test(res)&&/Pulsator/.test(res));
 // --- D: farm report for the visit
 const fr=await p.evaluate(()=>{UI.report='farm';go('reports');const r=document.querySelector('.report');return {t:r.innerText,figs:r.querySelectorAll('.fig').length,h2:[...r.querySelectorAll('h2')].map(h=>h.textContent)};});
 fs.writeFileSync('farm-visit.txt',fr.t);
 ok('D1 farm report: 3 recordings covered, side-by-side table, notes',/3 of 3 recordings/.test(fr.t)&&fr.h2.includes('Units side by side')&&/Liners changed/.test(fr.t)&&/Note: kicked off once/.test(fr.t),fr.h2.slice(0,6).join(' | '));
 ok('D2 farm report free of junk text',!JUNK.test(fr.t),(fr.t.match(JUNK)||[''])[0]);
 const lit=fr.t.match(/ISO \d|How it is measured|stored values|et al\.|Penn State|DAIReXNET|Recording ID|Thresholds|Every milking tab|Technical audit|Method tab|proposal below|Farm details|Tools\b/g)||[];
 ok('D3 no leftover references to sources or to app screens',lit.length===0,[...new Set(lit)].join(', '));
 const occ=(fr.t.match(/Note: kicked off once/g)||[]).length;ok('D4 the cow note appears once, under its own recording',occ===1,'count '+occ);
 console.log('INFO farm report',fr.t.split(/\s+/).length,'words,',fr.figs,'graphs');
 // print + word
 await p.emulateMedia({media:'print'});await p.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));await p.pdf({path:'farm-visit.pdf',format:'A4',printBackground:true});await p.evaluate(()=>window.dispatchEvent(new Event('afterprint')));await p.emulateMedia({media:'screen'});
 const pages=(fs.readFileSync('farm-visit.pdf').toString('latin1').match(/\/Type\s*\/Page[^s]/g)||[]).length;console.log('INFO farm report prints on',pages,'pages');
 const [dl]=await Promise.all([p.waitForEvent('download',{timeout:90000}),p.click('text=Export Word >> nth=0')]);const wf=dl.suggestedFilename();await dl.saveAs('farm.docx');
 ok('D5 Word export of the farm report',/Haddad_Farm_Farm_report_v37/.test(wf)&&fs.statSync('farm.docx').size>50000,wf+' '+fs.statSync('farm.docx').size+' bytes');
 for(const aud of ['technical','methods','offer']){const t=await p.evaluate(a=>{UI.report=a;go('reports');return document.querySelector('#views').innerText;},aud);ok('D6 '+aud+' report clean',!JUNK.test(t)&&t.length>300,(t.match(JUNK)||[''])[0]);}
 // --- E: re-run a test keeps cow records, asks nothing
 await p.evaluate(()=>{go('visit');});await p.selectOption('select[aria-label="Active recording"]',{index:0});await p.waitForTimeout(500);
 await p.selectOption('select[aria-label="CH4 connection"]','OFF');await p.waitForTimeout(300);await L.run(p);
 const re=await p.evaluate(()=>({view:S.view,dlg:!!document.getElementById('pl-dialog'),cow:S.auto.milkings[0].cow,note:Object.values(S.cowInfo.rows).some(r=>r.note)}));
 ok('E1 re-running keeps cow numbers and notes and does not ask again',re.view==='results'&&!re.dlg&&re.cow==='794'&&re.note,JSON.stringify(re));
 // --- F: clear cow records
 await p.evaluate(()=>go('visit'));await p.waitForTimeout(300);await p.click('#cowPanel >> text=Clear');await p.waitForTimeout(400);const asked=await p.evaluate(()=>document.getElementById('pl-dialog')?.innerText||'');
 await p.keyboard.press('Escape');await p.waitForTimeout(300);const kept=await p.evaluate(()=>Object.keys(S.cowInfo.rows).length);
 await p.click('#cowPanel >> text=Clear');await p.click('#pl-dialog button:has-text("Clear them")');await p.waitForTimeout(500);const gone=await p.evaluate(()=>Object.keys(S.cowInfo.rows).length);
 ok('F1 Clear asks first; Escape keeps the records; "Clear them" removes them',/Clear the cow records/.test(asked)&&kept>0&&gone===0,'kept '+kept+', then '+gone);
 // --- G: save → reopen, old-format file
 await p.evaluate(()=>{window.showSaveFilePicker=undefined;go('visit');});const [d2]=await Promise.all([p.waitForEvent('download'),p.click('text=Save visit')]);await d2.saveAs('v.plvisit');
 const zlib=require('zlib');const proj=JSON.parse(zlib.gunzipSync(fs.readFileSync('v.plvisit')));delete proj.meta.visitNotes;proj.version='30';for(const r of proj.records){delete r.state.thresh.letdown_slow_gap;for(const k of Object.keys(r.state.cowInfo.rows||{}))delete r.state.cowInfo.rows[k].note;}
 fs.writeFileSync('old.plvisit',JSON.stringify(proj));
 const q=await L.open(b,app);await q.click('text=Not now').catch(()=>{});await q.evaluate(async b64=>{const bin=atob(b64);const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);await openVisit(new File([u],'old.plvisit'));},fs.readFileSync('old.plvisit').toString('base64'));await q.waitForTimeout(5000);
 const og=await q.evaluate(()=>{UI.report='farm';go('reports');return {n:VISIT.records.length,gap:S.thresh.letdown_slow_gap,t:document.querySelector('.report').innerText};});
 ok('G1 a visit file saved by an older version opens and reports',og.n===3&&og.gap===30&&!JUNK.test(og.t)&&q.errs.length===0,JSON.stringify({n:og.n,gap:og.gap,errs:q.errs}));
 // --- H: no-milkings → show anyway
 const h=await L.open(b,app);await h.click('text=Not now').catch(()=>{});await L.load(h,L.REC+'/PT_4pulsators.vd6');await L.run(h,'Show the results anyway');
 const ht=await h.evaluate(()=>document.querySelector('#views').innerText);ok('H1 "Show the results anyway" opens a sensible page',!JUNK.test(ht)&&h.errs.length===0,ht.slice(0,120).replace(/\n/g,' | '));
 const hr=await h.evaluate(()=>{UI.report='farm';go('reports');return document.querySelector('.report').innerText;});ok('H2 farm report for a recording with no milkings says so plainly',/No —|not included|Not included/i.test(hr)&&!JUNK.test(hr),hr.slice(0,300).replace(/\n/g,' | '));
 // --- I: Escape on the dialog
 const e=await L.open(b,app);await e.click('text=Not now').catch(()=>{});await e.click('text=Load demo recording');await e.waitForTimeout(1200);await e.click('text=Confirm connections & run test');await e.waitForTimeout(3000);
 const foc=await e.evaluate(()=>document.activeElement?.textContent);await e.keyboard.press('Escape');await e.waitForTimeout(500);
 ok('I1 question box: focus on the main button, Escape = "Later"',foc==='Enter cow records'&&await e.evaluate(()=>S.view==='results'&&!document.getElementById('pl-dialog')),'focus on: '+foc);
 // --- J: phone + dark
 const m=await L.open(b,app,{vp:{width:390,height:800},scheme:'dark'});await m.click('text=Not now').catch(()=>{});await m.click('text=Load demo recording');await m.waitForTimeout(1200);await m.click('text=Confirm connections & run test');await m.waitForTimeout(3000);
 const dg=await m.evaluate(()=>{const r=document.querySelector('.pl-dialog-box').getBoundingClientRect();return {w:Math.round(r.width),left:Math.round(r.left),right:Math.round(r.right)};});ok('J1 phone: question box fits the screen',dg.left>=0&&dg.right<=390,JSON.stringify(dg));
 await m.click('#pl-dialog >> text=Enter cow records');await m.waitForTimeout(800);
 for(const a of ['visit','results','reports','tools']){await m.evaluate(a=>go(a),a);await m.waitForTimeout(700);const w=await m.evaluate(()=>document.documentElement.scrollWidth);ok('J2 phone: no sideways scroll on '+a,w<=392,w+' px');}
 for(const pg of [p,q,h,e,m])if(pg.errs.length)console.log('ERRORS',pg.errs.slice(0,5));
 console.log('browser pop-ups seen:',[...new Set([p,q,h,e,m].flatMap(x=>x.dialogs))]);
 await b.close();})();

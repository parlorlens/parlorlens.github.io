const L=require('./lib.js');const ok=L.ok;const app=process.argv[2];
(async()=>{const b=await L.chromium.launch();
 // 1. before expiry: works, banner + watermark present
 let p=await L.open(b,app);await p.click('text=Not now').catch(()=>{});
 const t=await p.evaluate(()=>({title:document.title,strip:document.querySelector('.eval-strip')?.innerText||'',eid:typeof EVAL!=='undefined'?EVAL.id:null,lic:EVAL.licensee}));
 ok('runs before expiry, red strip names the recipient',/Evaluation copy for BioControl/.test(t.strip)&&/EV-/.test(t.strip)&&t.eid&&/Evaluation/.test(t.title),JSON.stringify(t).slice(0,180));
 await p.click('text=Load demo recording');await p.waitForTimeout(1200);await L.run(p,'Later');await p.waitForTimeout(500);
 const fr=await p.evaluate(()=>{UI.report='farm';go('reports');const r=document.querySelector('.report');return {wm:getComputedStyle(r,'::before').content,foot:document.querySelector('.print-footer')?.innerText||'',file:reportFileName('docx')};});
 ok('report carries the evaluation watermark and footer',/EVALUATION COPY/.test(fr.wm)&&/EVALUATION COPY for BioControl/.test(fr.foot),JSON.stringify(fr).slice(0,180));
 ok('exported report file name marked EVALUATION',/EVALUATION/.test(fr.file),fr.file);
 // engine still correct in the eval copy
 const on=await p.evaluate(()=>S.auto.herd.machineOn);ok('analysis still runs in the evaluation copy',typeof on==='number'&&on>0,'unit-on '+on);
 await p.close();
 // 2. after expiry: locked out (clock moved past expiry)
 const q=await b.newContext({viewport:{width:1200,height:800}});const pg=await q.newPage();
 await pg.addInitScript(()=>{const R=Date;const F=new R('2027-02-01T10:00:00Z').getTime();class D extends R{constructor(...a){if(a.length)super(...a);else super(F);}static now(){return F;}}globalThis.Date=D;});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));await pg.goto('file://'+app);await pg.waitForTimeout(800);
 const ex=await pg.evaluate(()=>({body:document.querySelector('#views, .wrap')?.innerText||document.body.innerText,hasDemo:!!document.querySelector('*')&&/Load demo recording/.test(document.body.innerText)}));
 ok('after the expiry date it locks out with a clear message',/evaluation copy has expired/i.test(ex.body)&&/technical@libanvet.net/.test(ex.body)&&!ex.hasDemo&&errs.length===0,ex.body.replace(/\n+/g,' | ').slice(0,180));
 await b.close();})();

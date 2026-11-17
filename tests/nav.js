const L=require('./lib.js');const ok=L.ok;(async()=>{const b=await L.chromium.launch();
for(const [name,vp] of [['desktop',{width:1366,height:800}],['phone',{width:390,height:800}]]){const p=await L.open(b,process.argv[2],{vp});await p.click('text=Not now').catch(()=>{});
 await p.click('text=Load demo recording');await p.waitForTimeout(1200);await L.run(p,'Later');
 await p.evaluate(()=>{UI.report='farm';go('reports');});await p.waitForTimeout(800);await p.evaluate(()=>window.scrollTo(0,3000));await p.waitForTimeout(300);
 const r=await p.evaluate(()=>{const vis=e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.height>0;};const rail=document.querySelector('.rail'),sub=document.querySelector('.subtabs'),tb=document.querySelector('.topbar');
  return {railVisible:vis(rail),subVisible:vis(sub),vertical:getComputedStyle(rail.querySelector('ol')).flexDirection,railTop:Math.round(rail.getBoundingClientRect().top),subTop:Math.round(sub.getBoundingClientRect().top),tb:tb.offsetHeight,railBottom:Math.round(rail.getBoundingClientRect().bottom),w:document.documentElement.scrollWidth,tabs:[...sub.children].map(x=>x.textContent)};});
 ok(name+': main menu and tabs stay visible after scrolling',r.railVisible&&r.subVisible,JSON.stringify(r));
 ok(name+': main menu '+(name==='desktop'?'vertical':'horizontal')+', no overlap',r.vertical===(name==='desktop'?'column':'row')&&r.railTop>=r.tb-1&&(name==='desktop'?r.subTop>=r.tb-1:r.subTop>=r.railBottom-1)&&r.w<=vp.width+2);
 await p.click('.subtabs >> text=Technical report');await p.waitForTimeout(800);ok(name+': tab switches the report and returns to the top',await p.evaluate(()=>UI.report==='technical'&&scrollY<5&&document.querySelector('.subtabs [aria-current]').textContent==='Technical report'));
 await p.click('.railbtn >> text=Tools');await p.waitForTimeout(500);await p.click('.subtabs >> text=Thresholds');await p.waitForTimeout(600);ok(name+': tools tabs work',await p.evaluate(()=>UI.tool==='thresholds'&&!!document.querySelector('#th_overmilk_warn')));
 await p.click('.railbtn >> text=Visit');await p.waitForTimeout(500);await p.click('.subtabs >> text=Cows, milk & notes');await p.waitForTimeout(900);
 const c=await p.evaluate(()=>{const t=document.querySelector('#cow-records h3').getBoundingClientRect().top,sb=document.querySelector('.subtabs').getBoundingClientRect().bottom;return {t:Math.round(t),sb:Math.round(sb)};});ok(name+': Visit jump lands with the heading below the frozen menus',c.t>=c.sb-2&&c.t<500,JSON.stringify(c));
 await p.screenshot({path:'nav-'+name+'.png'});if(p.errs.length)console.log('ERRS',p.errs);await p.close();}
await b.close();})();

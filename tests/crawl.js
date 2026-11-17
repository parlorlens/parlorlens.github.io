// every test on every recording through every screen, report and tool; fail on script errors or junk text
const L=require('./lib.js');const app=process.argv[2];
const RECS=[['FarmA_unit3_MTT.vd6',{0:'SPT',1:'SMT',2:'MPC',3:'MPC2'}],['FarmB_unit1_MTT.vd6',{0:'SPT',1:'SMT',2:'MPC',3:'MPC2'}],['PT_4pulsators.vd6',{0:'SPT',1:'SPT',2:'SPT',3:'SPT'}],['DEMO',{0:'SPT',1:'SMT',2:'MPC',3:'MPC2'}]];
(async()=>{const b=await L.chromium.launch();const problems=new Map();let renders=0;
for(const [rec,map] of RECS)for(const teach of [false,true]){const p=await L.open(b,app,{scheme:teach?'dark':'light'});
 if(rec==='DEMO')await p.evaluate(()=>loadDemo());else await L.load(p,L.REC+'/'+rec);await p.waitForTimeout(800);if(teach)await p.evaluate(()=>{S.teach=true;});
 for(const t of ['MTT','PT','FOT','MPE','ST','MRT']){await p.evaluate(([map,t])=>{S.mapping=Object.assign({},map);S.setupChannelsConfirmed=true;S.mappingSource='user';S.testType=t;S.testChosen=true;finishSetup('suite');document.getElementById('pl-dialog')?.remove();},[map,t]);
  for(const [area,sub] of [['results'],['reports','farm'],['reports','technical'],['reports','methods'],['reports','offer'],...['markers','thresholds','channels','analysis','report','guide','compareVisits','owner','parts'].map(x=>['tools',x]),['visit']]){
   const r=await p.evaluate(([area,sub])=>{try{if(area==='reports')UI.report=sub;if(area==='tools')UI.tool=sub;go(area);}catch(e){return {err:e.message};}const t=document.querySelector('#views').innerText,bad=[],re=/\bundefined\b|\bNaN\b|\[object Object\]|\bnull\b|Infinity/g;let m;while((m=re.exec(t))&&bad.length<2)bad.push(t.slice(Math.max(0,m.index-50),m.index+30).replace(/\s+/g,' '));return {bad};},[area,sub]);
   renders++;const where=rec+' · '+t+(teach?' teach/dark':'')+' · '+area+(sub?':'+sub:'');if(r.err&&!problems.has(r.err))problems.set('THROW '+r.err,where);(r.bad||[]).forEach(s=>{if(!problems.has(s))problems.set('TEXT «'+s+'»',where);});}}
 p.errs.forEach(e=>{if(!problems.has(e))problems.set('ERR '+e,rec);});await p.close();}
console.log('renders',renders,'· distinct problems',problems.size);for(const [k,v] of problems)console.log('-',k,' ['+v+']');await b.close();})();

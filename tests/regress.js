const L=require('./lib.js');const fs=require('fs');
const RECS=[['FarmA_unit3_MTT.vd6','MTT',{0:'SPT',1:'SMT',2:'MPC',3:'MPC2'}],['FarmB_unit1_MTT.vd6','MTT',{0:'SPT',1:'SMT',2:'MPC',3:'MPC2'}],['PT_4pulsators.vd6','PT',{0:'SPT',1:'SPT',2:'SPT',3:'SPT'}]];
(async()=>{const b=await L.chromium.launch();const out={};
for(const app of [process.argv[2],process.argv[3]]){out[app]={};for(const [rec,test,map] of RECS){const p=await L.open(b,app);
 await p.addInitScript(()=>{});await L.load(p,L.REC+'/'+rec);
 out[app][rec]=await p.evaluate(([test,map])=>{S.mapping=map;S.setupChannelsConfirmed=true;S.mappingSource='user';S.testType=test;S.testChosen=true;finishSetup('suite');document.getElementById('pl-dialog')?.remove();
  const seen=new WeakSet();const VOL=new Set(['generatedAt','savedAt','id','t']);
  const clean=(v,d)=>{if(d>7)return '…';if(v===null||typeof v!=='object'){if(typeof v==='number')return Number.isFinite(v)?+v.toPrecision(10):String(v);if(typeof v==='function')return undefined;return v;}
   if(ArrayBuffer.isView(v))return 'typed['+v.length+']';if(v instanceof Date)return 'date';if(seen.has(v))return '[cycle]';seen.add(v);
   if(Array.isArray(v))return v.length>400?['len',v.length]:v.map(x=>clean(x,d+1));const o={};for(const k of Object.keys(v).sort()){if(VOL.has(k)||k==='_cache')continue;const c=clean(v[k],d+1);if(c!==undefined)o[k]=c;}return o;};
  let pt=null;try{pt=ptSegments().map(ptAnalyse);}catch(e){pt='ERR '+e.message;}
  return JSON.stringify({auto:clean(S.auto,0),results:clean(S.results,0),markers:clean(S.markers,0),pt:clean(pt,0)});},[test,map]);
 if(p.errs.length)console.log('errors',app,rec,p.errs);await p.close();}}
const [a,c]=Object.keys(out);let bad=0;for(const r of Object.keys(out[a])){if(out[a][r]!==out[c][r]){bad++;console.log('DIFFERS',r);fs.writeFileSync('diffA.json',out[a][r]);fs.writeFileSync('diffB.json',out[c][r]);}else console.log('identical',r,out[a][r].length,'chars');}
console.log(bad?'REGRESSION FAIL':'REGRESSION PASS');await b.close();})();

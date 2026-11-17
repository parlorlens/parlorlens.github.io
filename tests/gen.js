// Synthetic VaDia .vd6 writer — layout per the ParlorLens reader. Not farm data.
const fs=require('fs');
let seed=12345; const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
function encode(segments, rate){
  const D=[];
  for(const sg of segments){ for(let s=0;s<sg.secs;s++){ const t=new Date(sg.start.getTime()+s*1000);
      D.push(0x1a,0x50,0x06,0x01,rate,0, t.getFullYear()&255,t.getFullYear()>>8,t.getMonth()+1,t.getDate(),t.getHours(),t.getMinutes(),t.getSeconds());
      for(let k=0;k<rate;k++){const v=sg.gen(s+k/rate);for(let c=0;c<4;c++){let r=Math.round(v[c]*10);r=Math.max(-32768,Math.min(32767,r));const u=r&0xffff;D.push(u&255,u>>8);}}
      D.push(0,0,0,0); } }
  const isHdr=new Uint8Array(D.length+8); let off=0;
  for(const sg of segments){for(let s=0;s<sg.secs;s++){isHdr[off]=1;off+=13+rate*8+4;}}
  while(D.length%7)D.push(0);
  const nF=D.length/7, out=new Uint8Array(nF*8);
  for(let f=0;f<nF;f++){ const p=f*7; let ctl=0x80;
    const put=i=>{let b=D[i]; if(b===0x1a&&!isHdr[i])return [0x55,true]; return [b,false];};
    out[f*8]=put(p)[0];
    for(let j=0;j<6;j++){const [b,e]=put(p+1+j);out[f*8+2+j]=b;if(e)ctl|=1<<j;}
    if(f+1<nF){const i=p+7; if(D[i]===0x1a&&!isHdr[i])ctl|=0x40;}
    out[f*8+1]=ctl; }
  return Buffer.from(out);
}
function puls(cyc,a,b,c,work,dipAmp){ if(cyc<a)return work*cyc/a; if(cyc<a+b)return work-(dipAmp||1.6)*Math.sin((cyc-a)/b*Math.PI); if(cyc<a+b+c)return work*(1-(cyc-a-b)/c); return 0;}
function cow(o){ const work=o.work||44.5, att=o.pre, flowEnd=att+o.flowS, off=flowEnd+o.overmilkS, secs=Math.ceil(off+o.post);
  return {secs, gen:(t)=>{ const cyc=(t*(o.rate||60)/60)%1; const sp=puls(cyc,o.a||0.15,o.b||0.47,o.c||0.11,work,o.dip);
    const on=t>=att&&t<off; let smt=0,mpc=0,mpc2=0;
    if(on){const el=t-att, ld=o.letdown||20;
      const flow= el<ld? el/ld : t<flowEnd-60? 1 : t<flowEnd? (flowEnd-t)/60 : 0.03;
      const bm=o.bimodal&&el>8&&el<30?3.2*Math.sin((el-8)/22*Math.PI):0;
      const drop=o.peakDrop||7.5, milkPh=cyc<(o.a||0.15)+(o.b||0.47);
      smt=work-drop*flow+bm+(milkPh?-1:1)*(0.6+0.6*flow);
      const om=t>flowEnd?Math.min(1,(t-flowEnd)/6):0; mpc=(o.mpcBase||18)+5*flow+15*om+(milkPh?-1.2:1.2); mpc2=(o.mpcBase||18)+3+4*flow+13*om+(milkPh?-1:1);
      for(const s of (o.slips||[])) if(t>s&&t<s+1.8){smt-=14*Math.sin((t-s)/1.8*Math.PI);mpc-=8;} }
    return [sp+(rnd()-.5)*.25, smt+(rnd()-.5)*.3, mpc+(rnd()-.5)*.3, mpc2+(rnd()-.5)*.3]; }};
}
function mtt(name,start,cows,rate){ const segs=[]; let t=start.getTime();
  for(const c of cows){const k=cow(c); segs.push({start:new Date(t),secs:k.secs,gen:k.gen}); t+=(k.secs+(c.gapAfter||45))*1000;}
  fs.mkdirSync(__dirname+'/rec',{recursive:true});fs.writeFileSync(__dirname+'/rec/'+name, encode(segs,rate)); console.log(name, segs.length,'milkings'); }
mtt('FarmA_unit3_MTT.vd6', new Date(2026,9,10,5,12,0), [
 {pre:6,flowS:300,overmilkS:25,post:8},{pre:5,flowS:260,overmilkS:110,post:6},{pre:7,flowS:280,overmilkS:40,post:6,bimodal:true,letdown:35},
 {pre:6,flowS:320,overmilkS:30,post:6,slips:[120,180]},{pre:5,flowS:240,overmilkS:70,post:6},{pre:6,flowS:300,overmilkS:20,post:6,peakDrop:11},
 {pre:4,flowS:200,overmilkS:95,post:6,bimodal:true},{pre:6,flowS:290,overmilkS:35,post:6,gapAfter:20},{pre:3,flowS:60,overmilkS:15,post:5}],100);
mtt('FarmB_unit1_MTT.vd6', new Date(2026,9,11,16,40,0), [
 {pre:6,flowS:280,overmilkS:60,post:6,work:47,a:0.20,b:0.50,c:0.17,peakDrop:6},{pre:6,flowS:250,overmilkS:85,post:6,work:47,a:0.20,b:0.50,c:0.17,peakDrop:6,slips:[90]},
 {pre:6,flowS:310,overmilkS:50,post:6,work:47,a:0.20,b:0.50,c:0.17,peakDrop:6,mpcBase:26},{pre:6,flowS:270,overmilkS:120,post:6,work:47,a:0.20,b:0.50,c:0.17,peakDrop:6,bimodal:true}],200);
(function(){const segs=[{start:new Date(2026,9,11,10,0,0),secs:90,gen:(t)=>{ const c=(t%1), c2=((t+0.013)%1);
  return [puls(c,0.15,0.47,0.11,44.5)+(rnd()-.5)*.2, puls(c2,0.16,0.46,0.12,44.2)+(rnd()-.5)*.2, puls(c,0.22,0.50,0.18,44.0)+(rnd()-.5)*.2, puls((t*57/60)%1,0.15,0.40,0.11,41.5,4.8)+(rnd()-.5)*.2];}}];
 fs.writeFileSync(__dirname+'/rec/PT_4pulsators.vd6',encode(segs,100)); console.log('PT written');})();

const fs=require('fs');
const html=fs.readFileSync('little-learner.html','utf8');
const js=html.split('<script>')[1].split('</script>')[0];
function mkEl(){return{dataset:{},children:[],style:{},classList:{_s:new Set(),add(c){this._s.add(c)},remove(c){this._s.delete(c)},toggle(c,f){if(f===undefined)f=!this._s.has(c);f?this._s.add(c):this._s.delete(c);return f},contains(c){return this._s.has(c)}},listeners:{},addEventListener(){},appendChild(c){this.children.push(c)},querySelector(s){this._q=this._q||{};if(!this._q[s])this._q[s]=mkEl();return this._q[s]},setAttribute(){},set innerHTML(v){this._h=v;this.children=[]},get innerHTML(){return this._h||''},textContent:'',value:0,disabled:false,getBoundingClientRect(){return{width:390,height:300,left:0,top:0}},getContext(){return ctx},width:0,height:0};}
const ctx={setTransform(){},fillRect(){},strokeRect(){},beginPath(){},moveTo(){},lineTo(){},quadraticCurveTo(){},arc(){},fill(){},stroke(){},drawImage(){},putImageData(){},createImageData(w,h){return{data:new Uint8ClampedArray(w*h*4)}},fillText(){},setLineDash(){},fillStyle:'',strokeStyle:'',lineWidth:1,font:'',imageSmoothingEnabled:true,globalAlpha:1};
const els={};
global.document={getElementById:id=>{if(!els[id])els[id]=mkEl();return els[id]},createElement:()=>mkEl(),querySelectorAll:()=>[]};
global.window={devicePixelRatio:1,addEventListener(){}};
global.requestAnimationFrame=()=>{};
global.performance={now:()=>Date.now()};
global.setTimeout=(f,ms)=>0; global.clearTimeout=()=>{};
let pass=0, fail=0;
const check=(name,ok,detail='')=>{ console.log(`${ok?'PASS':'FAIL'} — ${name}${detail?' · '+detail:''}`); ok?pass++:fail++; };

// ---- 1) notation collision sweep on the shipped file ----
const forbidden=['(p−y)','(p-y)','p−y','p - y','shove','∂L/∂w → x','weight on x','weight on y',"node(xIn, yIn[0], 'x',","node(xIn, yIn[1], 'y',"];
const found=forbidden.filter(f=>html.includes(f));
check('zero forbidden notation in file', found.length===0, found.length?('FOUND: '+found.join(' | ')):'(p−y), shove, x/y-as-label all gone');
const required=['x\u2081','x\u2082','guess','truth','error = guess','every symbol here means exactly one thing','thermostat'];
const missing=required.filter(r=>!html.includes(r));
check('the cast + thermostat present', missing.length===0, missing.join(' | '));

// ---- 2) font sizes actually bumped ----
check('type scale bumped', html.includes('#goal{font-size:14px')&&html.includes('#inspect{display:none')&&html.includes('font-size:13px;line-height:1.8')&&html.includes('font-size:12px;letter-spacing:.05em')&&html.includes('font-size:11px;letter-spacing:.1em'));

// ---- boot ----
let bootErr=null; try{ new Function(js)(); }catch(e){ bootErr=e; }
check('boot clean', !bootErr, bootErr?bootErr.message:'');
if(bootErr){ console.log('ABORT'); process.exit(1); }
const L=global.window.LAB;
const sig=z=>1/(1+Math.exp(-z));

// ---- 3) word budget per step ----
const strip=s=>s.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
let wordsOK=true, detail='';
for(const s of L.NB_STEPS){
  const main=strip(s.goal.split('<span')[0]).split(' ').filter(Boolean).length;
  const all=strip(s.goal).split(' ').filter(Boolean).length;
  detail+=`${s.name}:${main}/${all} `;
  if(main>22||all>45) wordsOK=false;
}
check('word budget: main ≤22, total ≤45', wordsOK, detail.trim());

// ---- 4) inspector math (ch 1) ----
L.setCh(0); L.nbSetStep(2);
const data=L.getData(), model=L.getModel();
const dSpam=data.find(d=>!d.test&&d.lab===1), dLegit=data.find(d=>!d.test&&d.lab===0);
L.NB.pick=dSpam;
let I=L.inspectData();
const sM=model.w[0]*dSpam.x+model.w[1]*dSpam.y+model.wb;
check('score exact', Math.abs(I.score-sM)<1e-12);
check('guess = σ(score)', Math.abs(I.guess-sig(sM))<1e-12);
check('error = guess − truth', Math.abs(I.error-(I.guess-1))<1e-12);
check('votes = error×[x₁,x₂,1]', Math.abs(I.votes[0]-I.error*dSpam.x)<1e-12 && Math.abs(I.votes[1]-I.error*dSpam.y)<1e-12 && Math.abs(I.votes[2]-I.error)<1e-12);
check('loss = −ln(guess) for truth=1', Math.abs(I.loss-(-Math.log(Math.min(1-1e-6,Math.max(1e-6,I.guess)))))<1e-12);
L.NB.pick=dLegit; I=L.inspectData();
check('loss = −ln(1−guess) for truth=0', Math.abs(I.loss-(-Math.log(Math.min(1-1e-6,Math.max(1e-6,1-I.guess)))))<1e-12);

// ---- 5) thermostat semantics per email ----
model.w[0]=0.5; model.w[1]=0.5; model.wb=0;
const upRight=data.filter(d=>!d.test&&d.lab===1&&d.x>0.2&&d.y>0.2)[0];
L.NB.pick=upRight; I=L.inspectData();
const thermoOK = I.guess<1 && I.error<0 && I.votes[0]<0 && I.votes[1]<0;
check('spam email, guess too low, +inputs ⇒ votes say dials ▲', thermoOK, `error ${I.error.toFixed(2)} votes [${I.votes.map(v=>v.toFixed(2))}]`);

// ---- 6) rendered HTML: ch1 3 lines, ch2 adds error+votes, no y-as-label ----
L.renderInspect();
let h1=els['inspect'].innerHTML;
check('ch1 panel: guess+truth, no error line', h1.includes('guess')&&h1.includes('truth')&&!h1.includes('error'), '');
L.setCh(1);
const d2=L.getData().find(d=>!d.test&&d.lab===1);
L.NB.pick=d2; L.renderInspect();
let h2=els['inspect'].innerHTML;
check('ch2 panel: error, votes, arrows, −ln loss', h2.includes('error = guess \u2212 truth')&&h2.includes('votes')&&(h2.includes('\u25b2')||h2.includes('\u25bc'))&&h2.includes('loss = \u2212ln('), '');
check('panel never says p or y', !/[^a-z\u2081\u2082]p[^a-z(]/.test(h2.replace(/<[^>]+>/g,''))&&!h2.includes('(p')&&!/ y /.test(h2.replace(/<[^>]+>/g,'')), '');

// ---- 7) arrow-direction truth: shown arrow == actual dial movement ----
let arrowsOK=true, arrDetail='';
for(const seed of [11,22,33]){
  const M=L.makeModel(0,seed), D=L.makeData('crowds',seed+7,0,false);
  // gradNow uses module data/model; emulate with same formula on M,D:
  let g0=0,g1=0,gb=0,n=0;
  for(const d of D){ if(d.test)continue; n++; const dz=1/(1+Math.exp(-(M.w[0]*d.x+M.w[1]*d.y+M.wb)))-d.lab; g0+=dz*d.x; g1+=dz*d.y; gb+=dz; }
  g0/=n; g1/=n; gb/=n;
  const b=[M.w[0],M.w[1],M.wb];
  L.trainEpoch(M,D,0.6);
  const mv=[M.w[0]-b[0],M.w[1]-b[1],M.wb-b[2]];
  const gs=[g0,g1,gb];
  for(let k=0;k<3;k++){ if(Math.abs(gs[k])>1e-9 && Math.sign(mv[k])!==-Math.sign(gs[k])) arrowsOK=false; }
  arrDetail+=`s${seed}[${mv.map((m,k)=>(gs[k]<0?'▲':'▼')+(Math.sign(m)>0?'+':'−')).join(',')}] `;
}
check('▲/▼ arrows == true dial movement (3 seeds × 3 dials)', arrowsOK, arrDetail.trim());

// ---- 8) draw paths everywhere ----
let derr=null;
outer:
for(let step=0;step<5;step++){
  L.setCh(0); L.nbSetStep(step);
  for(const pk of [null, L.getData()[0]]){ L.NB.pick=pk;
    try{ L.drawAll(); }catch(e){ derr=`ch1 s${step} pick=${!!pk}: ${e.message}`; break outer; } }
}
if(!derr) for(let c=1;c<7;c++){ L.setCh(c); L.NB.pick=null; try{ L.drawAll(); }catch(e){ derr=`ch${c+1}: ${e.message}`; break; } }
check('all draw paths clean', !derr, derr||'ch1 steps 0–4 ± pick, ch2–7');

// ---- 9) solved path + hand-solvability ----
L.setCh(0);
const dd=L.getData(), mm=L.getModel();
let best=0,bw=null;
for(let w0=0.5;w0<=3.01;w0+=0.25)for(let w1=0.5;w1<=3.01;w1+=0.25)for(let b=-0.9;b<=0.91;b+=0.15){
  mm.w[0]=w0;mm.w[1]=w1;mm.wb=b;
  const a=L.evalSet(mm,dd).acc; if(a>best){best=a;bw=[w0,w1,b];}
}
check('hand-solvable ≥97%', best>=0.97, `best ${(best*100).toFixed(1)}%`);
mm.w[0]=bw[0];mm.w[1]=bw[1];mm.wb=bw[2];
L.NB.solved=false; L.nbSetStep(4); L.NB.pick=dd[0];
L.drawAll();
check('solved toast fires, handLoss stored', L.NB.solved===true&&L.NB.handLoss!=null, `handLoss ${L.NB.handLoss.toFixed(3)}`);

// ---- 10) regressions ----
function epochsTo(t,lr,cap){ const M=L.makeModel(0,42),D=L.makeData('crowds',49,0,false);
  for(let e=1;e<=cap;e++){ if(L.trainEpoch(M,D,lr)<t) return e; } return -1; }
const crawl=epochsTo(0.15,0.05,20000), snap=epochsTo(0.15,2,20000);
check('crawl vs snap intact', crawl>10*snap, `${crawl} vs ${snap} epochs`);
const r3=L.run('rings',3,4000,0.6,1);
check('rings H=3 → 100%', r3.acc===1);
let atErr=null; try{ L.atInit(7); for(let i=0;i<5;i++) L.atTrainStep(0.15,16); }catch(e){ atErr=e; }
check('attention trains', !atErr&&L.AT.step===5);

console.log(`\n${fail===0?'ALL PASS':'FAILURES PRESENT'} · ${pass} passed, ${fail} failed`);
process.exit(fail?1:0);

const fs=require('fs');
const html=fs.readFileSync('little-llm.html','utf8');
const js=html.split('<script>')[1].split('</script>')[0];
function mkEl(){return{dataset:{},children:[],style:{},classList:{_s:new Set(),add(c){this._s.add(c)},remove(c){this._s.delete(c)},toggle(c,f){if(f===undefined)f=!this._s.has(c);f?this._s.add(c):this._s.delete(c);return f},contains(c){return this._s.has(c)}},listeners:{},addEventListener(){},appendChild(c){this.children.push(c)},querySelector(s){this._q=this._q||{};if(!this._q[s])this._q[s]=mkEl();return this._q[s]},setAttribute(){},set innerHTML(v){this._h=v;this.children=[]},get innerHTML(){return this._h||''},textContent:'',value:0,disabled:false,getBoundingClientRect(){return{width:390,height:300,left:0,top:0}},getContext(){return ctx},width:0,height:0};}
const ctx={setTransform(){},fillRect(){},strokeRect(){},beginPath(){},moveTo(){},lineTo(){},quadraticCurveTo(){},arc(){},fill(){},stroke(){},drawImage(){},fillText(){},setLineDash(){},fillStyle:'',strokeStyle:'',lineWidth:1,font:'',globalAlpha:1,textAlign:'',textBaseline:''};
const els={};
global.document={getElementById:id=>{if(!els[id])els[id]=mkEl();return els[id]},createElement:()=>mkEl(),querySelectorAll:()=>[]};
global.window={devicePixelRatio:1,addEventListener(){}};
global.requestAnimationFrame=()=>{};
global.performance={now:()=>Date.now()};
global.setTimeout=(f,ms)=>0; global.clearTimeout=()=>{};
const LS={};
global.localStorage={getItem:k=>LS[k]??null,setItem:(k,v)=>{LS[k]=String(v)},removeItem:k=>{delete LS[k]}};
let pass=0, fail=0;
const check=(name,ok,detail='')=>{ console.log(`${ok?'PASS':'FAIL'} — ${name}${detail?' · '+detail:''}`); ok?pass++:fail++; };

// ---- 1) notation discipline on the shipped file ----
// jargon is banned until a chapter earns it: no probability/token talk, the model is counts and shares
const forbidden=['probability','distribution','token','n-gram','ngram','stochastic','corpus','(p−','(p-',' p = ',' y = '];
const found=forbidden.filter(f=>html.toLowerCase().includes(f));
check('zero forbidden jargon in file', found.length===0, found.length?('FOUND: '+found.join(' | ')):'probability, token, n-gram, corpus all absent — counts and shares only');
const required=['the book','context','share = ','babble','temp','▮','one symbol, one meaning'];
const missing=required.filter(r=>!html.includes(r));
check('the cast present', missing.length===0, missing.join(' | ')||'book · context · share · babble · temp');

// ---- 2) type scale ----
check('type scale', html.includes('#goal{font-size:14px')&&html.includes('#inspect{display:none')&&html.includes('font-size:13px;line-height:1.8')&&html.includes('font-size:12px;letter-spacing:.05em')&&html.includes('font-size:11px;letter-spacing:.1em')&&html.includes("font='10px"));

// ---- boot ----
let bootErr=null; try{ new Function(js)(); }catch(e){ bootErr=e; }
check('boot clean', !bootErr, bootErr?bootErr.message:'');
if(bootErr){ console.log('ABORT'); process.exit(1); }
const L=global.window.LM;

// ---- 3) word budget per chapter ----
const strip=s=>s.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
let wordsOK=true, wDetail='';
for(const g of L.CH_GOALS){
  const main=strip(g.goal.split('<span')[0]).split(' ').filter(Boolean).length;
  const all=strip(g.goal).split(' ').filter(Boolean).length;
  wDetail+=`${g.name}:${main}/${all} `;
  if(main>22||all>45) wordsOK=false;
}
check('word budget: main ≤22, total ≤45', wordsOK, wDetail.trim());

// ---- 4) the book is clean ----
const bookOK=[...L.BOOK].every(c=>L.IDX[c]!=null);
check('book uses only the 28 glyphs, ends with a period', bookOK&&L.BOOK.length>=600&&L.BOOK.length<=2000&&L.BOOK.endsWith('.'), `${L.BOOK.length} letters`);

// ---- 5) counts exact: independent recount vs the model's table ----
const T1=L.getTable(1);
const mine=new Map();
for(let i=1;i<L.BOOK.length;i++){
  const c=L.BOOK[i-1];
  if(!mine.has(c)) mine.set(c,new Float64Array(L.NV));
  mine.get(c)[L.IDX[L.BOOK[i]]]++;
}
let cntOK=T1.size===mine.size, cells=0;
mine.forEach((row,c)=>{ const r=T1.get(c); if(!r){cntOK=false;return;}
  for(let i=0;i<L.NV;i++){ if(r[i]!==row[i]) cntOK=false; else if(r[i]>0) cells++; } });
check('bigram counts exact vs independent recount', cntOK, `${T1.size} rows · ${cells} nonzero cells agree`);

// ---- 6) shares: count ÷ total exactly, rows sum to 1 at any temp ----
const rowT=T1.get('t'), totT=L.rowTotal(rowT);
const sh1=L.shares(rowT,1);
let shOK=true;
for(let i=0;i<L.NV;i++) if(Math.abs(sh1[i]-rowT[i]/totT)>1e-12) shOK=false;
for(const tp of [0.4,1,2.5]){ const s=L.shares(rowT,tp); let sum=0; for(let i=0;i<L.NV;i++)sum+=s[i]; if(Math.abs(sum-1)>1e-9) shOK=false; }
check('share = count ÷ row total · shares sum to 1 at temps 0.4/1/2.5', shOK, `row ‘t’ total ${totT}`);

// ---- 7) temp reshapes: low temp sharpens, high temp loosens ----
const mx=t=>Math.max(...L.shares(rowT,t));
check('temp: 0.4 sharpens > 1 > 2.5 loosens', mx(0.4)>mx(1)&&mx(1)>mx(2.5), `top share ${(100*mx(0.4)).toFixed(0)}% → ${(100*mx(1)).toFixed(0)}% → ${(100*mx(2.5)).toFixed(0)}%`);

// ---- 8) drawing letters honestly follows the shares ----
const rowSp=T1.get(' '), shSp=L.shares(rowSp,1);
const rng=L.rng(9), freq=new Float64Array(L.NV), DRAWS=6000;
for(let i=0;i<DRAWS;i++) freq[L.pickIdx(rng,shSp)]++;
let maxDev=0;
for(let i=0;i<L.NV;i++) maxDev=Math.max(maxDev,Math.abs(freq[i]/DRAWS-shSp[i]));
check('6000 seeded draws match the shares (row ‘␣’)', maxDev<0.02, `max deviation ${(100*maxDev).toFixed(2)}%`);

// ---- 9) generation: deterministic per seed, clean, exact length ----
let genOK=true, gDetail='';
for(let n=1;n<=4;n++){
  const a=L.generate(n,120,1,77), b=L.generate(n,120,1,77);
  if(a.out!==b.out||a.out.length!==120||![...a.out].every(c=>L.IDX[c]!=null)) genOK=false;
  gDetail+=`n${n}:ok `;
}
check('generate: seeded twice = identical, 120 clean glyphs, context 1–4', genOK, gDetail.trim());

// ---- 10) inspector arithmetic exact vs the table ----
const I=L.cellInfo('t','h');
const tRow=T1.get('t');
const arithOK=I.count===tRow[L.IDX['h']]&&I.tot===L.rowTotal(tRow)&&Math.abs(I.share-I.count/I.tot)<1e-12;
L.setTemp(1); L.renderCell('t','h');
const ih=els['inspect'].innerHTML;
const renderOK=ih.includes('<b>'+I.count+'</b>')&&ih.includes('<b>'+I.tot+'</b>')&&ih.includes('share = '+I.count+' ÷ '+I.tot)&&ih.includes(Math.round(100*I.share)+'%');
check('cell inspector: share = count ÷ total, rendered numbers exact', arithOK&&renderOK, `‘t’→‘h’ ${I.count} of ${I.tot} = ${Math.round(100*I.share)}%`);

// ---- 11) the game scores honestly and unlocks at 12 ----
const G=L.game.state;
let myRight=0, gameOK=true;
for(let k=0;k<12;k++){
  const truth=G.sent[G.pos];
  const wrong=(L.IDX[truth]+1)%L.NV;
  const pick=(k%3===0)?wrong:L.IDX[truth];          // miss every 3rd tap
  const before=G.right;
  const r=L.game.tap(pick);
  const expectHit=pick===L.IDX[truth];
  if(r.hit!==expectHit) gameOK=false;
  if(r.truth!==truth) gameOK=false;
  if(G.right!==before+(expectHit?1:0)) gameOK=false;
  if(expectHit) myRight++;
}
check('game: hits and truth reported exactly (12 taps, misses forced)', gameOK&&G.right===myRight&&G.total===12, `right ${G.right}/12`);
check('12 guesses unlock the counter, stored', L.unlocked>=2&&LS['llm-unlock']>='2', `unlocked=${L.unlocked}`);

// ---- 12) babble unlocks the wall ----
const bb=L.babble(1,140,1,55);
check('babble runs and unlocks the wall', bb.out.length===140&&L.unlocked===3, `copy stat ${bb.copy.len}`);

// ---- 13) the wall: table explodes, choices die, babble turns to quotes ----
const W=[1,2,3,4].map(n=>L.wallStats(n));
check('contexts possible = 28ⁿ exact', W.every((s,i)=>s.poss===Math.pow(28,i+1)), W.map(s=>s.poss).join(' · '));
const rowsOK=W[0].rows<=28&&W[0].rows<W[1].rows&&W[1].rows<W[2].rows&&W[2].rows<W[3].rows&&W[3].rows/W[3].poss<0.001;
check('book coverage collapses: rows grow, yet <0.1% of possible at context 4', rowsOK, W.map(s=>s.rows).join(' → ')+` of ${W[3].poss}`);
const forcedOK=W[0].forcedShare<0.15&&W[3].forcedShare>0.55&&W[0].forcedShare<W[1].forcedShare&&W[1].forcedShare<W[2].forcedShare&&W[2].forcedShare<W[3].forcedShare;
check('one-way steps climb: <15% at context 1 → >55% at context 4', forcedOK, W.map(s=>(100*s.forcedShare).toFixed(0)+'%').join(' → '));
let copyOK=true, cDetail='';
for(const seed of [7,8,9]){
  const c1=L.longestCopy(L.generate(1,300,1,seed).out).len;
  const c4=L.longestCopy(L.generate(4,300,1,seed).out).len;
  if(!(c1<=14&&c4>=20&&c4>c1)) copyOK=false;
  cDetail+=`s${seed}:${c1}→${c4} `;
}
check('longest quote from the book: ≤14 letters at context 1, ≥20 at context 4 (3 seeds)', copyOK, cDetail.trim());
check('verdict honest at the endpoints', L.verdict(1).tone==='invent'&&L.verdict(4).tone==='copy', `1:${L.verdict(1).tone} 4:${L.verdict(4).tone}`);

// ---- 14) draw paths clean across chapters and states ----
let derr=null;
try{
  L.setCh(0); L.drawAll();
  L.setCh(1); L.drawAll();          // pre-count
  L.buildNow(); L.setCh(1); L.drawAll(); // post-count
  L.setCh(2); for(let n=1;n<=4;n++){ L.setN(n); L.drawAll(); }
}catch(e){ derr=e.message; }
check('all draw paths clean', !derr, derr||'ch1 · ch2 pre/post count · ch3 context 1–4');

console.log(`\n${fail===0?'ALL PASS':'FAILURES PRESENT'} · ${pass} passed, ${fail} failed`);
process.exit(fail?1:0);

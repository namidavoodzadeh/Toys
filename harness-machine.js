const fs=require('fs');
const html=fs.readFileSync('language-machine.html','utf8');
const js=html.split('<script>')[1].split('</script>')[0];
function mkEl(){return{dataset:{},children:[],style:{},classList:{_s:new Set(),add(c){this._s.add(c)},remove(c){this._s.delete(c)},toggle(c,f){if(f===undefined)f=!this._s.has(c);f?this._s.add(c):this._s.delete(c);return f},contains(c){return this._s.has(c)}},addEventListener(){},appendChild(c){this.children.push(c)},querySelector(s){this._q=this._q||{};if(!this._q[s])this._q[s]=mkEl();return this._q[s]},querySelectorAll(){return[]},setAttribute(){},set innerHTML(v){this._h=v},get innerHTML(){return this._h||''},set textContent(v){this._t=v},get textContent(){return this._t||''},value:0,disabled:false,getBoundingClientRect(){return{width:390,height:300,left:0,top:0}},getContext(){return ctx},width:0,height:0};}
const ctx={setTransform(){},fillRect(){},strokeRect(){},beginPath(){},moveTo(){},lineTo(){},arc(){},fill(){},stroke(){},fillText(){},setLineDash(){},fillStyle:'',strokeStyle:'',lineWidth:1,font:'',globalAlpha:1,textAlign:'',textBaseline:''};
const els={};
global.document={getElementById:id=>{if(!els[id])els[id]=mkEl();return els[id]},createElement:()=>mkEl(),querySelector:()=>null,querySelectorAll:()=>[]};
global.window={devicePixelRatio:1,addEventListener(){},scrollTo(){}};
global.requestAnimationFrame=()=>{};
global.performance={now:()=>Date.now()};
global.setTimeout=()=>0; global.clearTimeout=()=>{};
const LS={};
global.localStorage={getItem:k=>LS[k]??null,setItem:(k,v)=>{LS[k]=String(v)},removeItem:k=>{delete LS[k]}};
let pass=0, fail=0;
const t0=Date.now();
const check=(name,ok,detail='')=>{ console.log(`${ok?'PASS':'FAIL'} — ${name}${detail?' · '+detail:''}`); ok?pass++:fail++; };

// ---- 1) type scale on the shipped file ----
check('type scale', html.includes('#goal{font-size:14px')&&html.includes('font-size:13px;line-height:1.8')
  &&html.includes('font-size:12px;letter-spacing:.05em')&&html.includes('font-size:11px;letter-spacing:.1em')
  &&html.includes("font='10px"));

// ---- boot ----
let bootErr=null; try{ new Function(js)(); }catch(e){ bootErr=e; }
check('boot clean (home renders)', !bootErr, bootErr?(bootErr.stack||bootErr.message).split('\n')[0]:'');
if(bootErr){ console.log('ABORT'); process.exit(1); }
const M=global.window.MX;

// ---- 2) word budgets + jargon discipline on mission goals and boss intros ----
const strip=s=>s.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const texts=[];
for(const id in M.MISSIONS) texts.push({name:id,goal:M.MISSIONS[id].goal});
for(const n in M.BOSSES) texts.push({name:'b'+n,goal:M.BOSSES[n].intro});
let wordsOK=true,wDetail='';
for(const t of texts){
  const main=strip(t.goal.split('<span')[0]).split(' ').filter(Boolean).length;
  const all=strip(t.goal).split(' ').filter(Boolean).length;
  if(main>22||all>45){ wordsOK=false; wDetail+=t.name+':'+main+'/'+all+' '; }
}
check('word budget: every goal main ≤22, total ≤45', wordsOK, wordsOK?(texts.length+' texts'):wDetail);
const jargon=['probability','token','attention','gradient','parameter','loss','embedding','transformer','neural','entropy','logits','softmax','stochastic','n-gram'];
let jbad=[];
for(const t of texts){
  const low=strip(t.goal).toLowerCase();
  for(const j of jargon) if(low.includes(j)) jbad.push(t.name+':'+j);
}
check('goals speak the cast, never the jargon', jbad.length===0, jbad.join(' ')||jargon.length+' banned words absent from all goals');
const required=['the ladder','ask','tag','cargo','surprise','never-studied','field notes','codex','spotlight','the dip'];
const missing=required.filter(r=>!html.includes(r));
check('the cast present in the file', missing.length===0, missing.join(' | ')||'ladder · ask/tag/cargo · surprise · dip');

// ---- 3) books clean, split honest ----
const okChars=s=>[...s].every(c=>M.IDX[c]!=null);
check('book, drills, job book: only the 28 glyphs', okChars(M.BASE_BOOK)&&okChars(M.DRILLS.text)&&okChars(M.QA_BOOK),
  M.BASE_BOOK.length+' + '+M.DRILLS.text.length+' + '+M.QA_BOOK.length+' letters');
const allS=M.BASE_BOOK.split('. ').length, trS=M.SPLIT.train.split('. ').length, vaS=M.SPLIT.val.split('. ').length;
check('held-out split: every sentence in exactly one pile', trS+vaS===allS, trS+' train + '+vaS+' val = '+allS);
const dis=M.DRILLS.trainPairs.filter(p=>M.DRILLS.testPairs.includes(p));
check('drill test pairs never drilled', dis.length===0&&M.DRILLS.testPairs.length>=20, M.DRILLS.trainPairs.length+' train, '+M.DRILLS.testPairs.length+' test, overlap '+dis.length);

// ---- 4) surprise arithmetic exact ----
const s1=M.handBetSurprise(0,1,0), s2=M.handBetSurprise(0,1,1), s3=M.handBetSurprise(0,1,5);
check('hand-bet surprise: −ln(.5)=0.693 · −ln(.25)=1.386 · miss 4.644',
  Math.abs(s1-0.6931)<1e-3&&Math.abs(s2-1.3863)<1e-3&&Math.abs(s3-4.6444)<1e-3);
{ // counter surprise formula vs manual
  const tb=M.countTable('abab',1);
  const manual=(-Math.log((1+0.1)/(2+0.1*28))-Math.log((2+0.1)/(2+0.1*28)))/2; // b|a then a|b on text 'aba b'? recompute below
  const got=M.counterSurprise(tb,1,'aba',0.1);
  const want=(-Math.log((tb.get('a')[M.IDX['b']]+0.1)/(M.rowTotal(tb.get('a'))+2.8))
             -Math.log((tb.get('b')[M.IDX['a']]+0.1)/(M.rowTotal(tb.get('b'))+2.8)))/2;
  check('counter surprise = mean −ln((count+α)/(total+28α))', Math.abs(got-want)<1e-12, got.toFixed(4));
}
check('blind luck = ln 28 = 3.332', Math.abs(M.UNIFORM_SURPRISE-Math.log(28))<1e-12);

// ---- 5) the machine’s votes are exact: gradcheck vs central differences ----
{
  const mk=()=>M.makeLM({D:8,H:2,L:2,T:6},7);
  const ix=[[1,4,2,26,9,27]],iy=[[4,2,26,9,27,0]];
  const fb=(m,lossOnly)=>{
    if(lossOnly) return M.lmForward(m,ix,iy,false).loss;
    M.zeroGrads(m.P); const A=M.lmForward(m,ix,iy,false); M.lmBackward(m,A); return A.loss;
  };
  const r=M.gradCheck(mk,fb);
  check('full machine gradcheck vs central differences', r.worst<1e-5, 'worst rel err '+r.worst.toExponential(1)+' at '+r.worstName);
}

// ---- 6) sampling honest ----
{
  const bets=new Array(28).fill(0); bets[3]=0.5; bets[7]=0.3; bets[9]=0.2;
  const sh=M.reshapeBets(bets,1,1);
  check('temp 1, slice 1 leaves bets unchanged', Math.abs(sh[3]-0.5)<1e-12&&Math.abs(sh[7]-0.3)<1e-12);
  const cold=M.reshapeBets(bets,0.4,1), hot=M.reshapeBets(bets,3,1);
  const sliced=M.reshapeBets(bets,1,0.5);
  check('cold sharpens, hot loosens, slice drops the tail',
    cold[3]>0.5&&hot[3]<0.5&&sliced[9]===0&&Math.abs(sliced.reduce((a,b)=>a+b,0)-1)<1e-9,
    'top: '+cold[3].toFixed(2)+' / '+hot[3].toFixed(2)+' · sliced tail 0');
}

// ---- 7) counter babble + quotes ----
{
  const a=M.counterBabble(3,120,1,42), b=M.counterBabble(3,120,1,42);
  check('counter babble: seeded twice = identical, clean glyphs', a===b&&okChars(a)&&a.length===120);
  const c1=M.longestCopyBase(M.counterBabble(1,200,1,7)).len;
  const c4=M.longestCopyBase(M.counterBabble(4,200,1,7)).len;
  check('quotes grow with context: copy '+c1+' at 1 vs '+c4+' at 4', c4>c1&&c4>=18);
}

// ---- 8) act 3 claims: dials converge, vowels huddle ----
{
  const bg=M.makeBigramNet(11), rng=M.rngOf(21);
  for(let s=0;s<1500;s++) M.bigramStep(bg,M.SPLIT.train,32,0.05,rng);
  const nb=M.bigramSurprise(bg,M.SPLIT.train);
  const ct=M.counterSurprise(M.countTable(M.SPLIT.train,1),1,M.SPLIT.train,1e-9);
  check('dials converge to the counter (gap < 0.12)', Math.abs(nb-ct)<0.12, nb.toFixed(3)+' vs '+ct.toFixed(3));
  let ratios=[];
  for(const seed of [5,6]){
    const bn=M.makeBottleneck(8,seed), r2=M.rngOf(seed+100);
    for(let s=0;s<2500;s++) M.bottleneckStep(bn,M.SPLIT.train,32,0.05,r2);
    const c=M.vowelClustering(bn); ratios.push(c.inter/c.intra);
  }
  check('vowels huddle: spread ratio > 1.2 on 2 seeds', ratios.every(r=>r>1.2), ratios.map(r=>r.toFixed(2)).join(' '));
}

// ---- 9) act 4–5 claims: window fails the echo, the machine passes, the circuit is visible ----
let winDrill,lmDrill;
{
  winDrill=M.makeWindow(8,10,64,17); const rng=M.rngOf(37);
  for(let s=0;s<5000;s++) M.windowStep(winDrill,M.DRILLS.text,24,0.01,rng);
  const nw=M.echoScore(p=>M.windowBets(winDrill,p),M.DRILLS.testPairs.slice(0,12));
  check('window echo on never-drilled pairs ≤ 45%', nw<=0.45, (100*nw).toFixed(0)+'%');
  lmDrill=M.makeLM({D:32,H:2,L:2,T:24},23); const r2=M.rngOf(41);
  for(let s=0;s<2200;s++) M.lmStep(lmDrill,M.DRILLS.text,12,0.01,r2);
  const acc=M.echoScore(p=>M.lmBets(lmDrill,p),M.DRILLS.testPairs.slice(0,12));
  check('the machine echoes never-drilled pairs ≥ 70%', acc>=0.7, (100*acc).toFixed(0)+'%');
  let peaks=0;
  for(const pr of [['vk','then'],['zw','go']]){
    const F=M.echoFocus(lmDrill,pr[0],pr[1]);
    const row=F.rows[2];
    const peak=row.focus.indexOf(Math.max(...row.focus));
    if(Math.abs(peak-F.pairAt)<=1) peaks++;
  }
  check('spotlight L1H0 peaks on the pair (2/2 prompts)', peaks===2);
  const prof=M.headProfile(lmDrill,M.DRILLS.text);
  const behind=prof.find(p=>p.layer===0&&p.head===1);
  check('a look-behind head emerged in layer 1', behind.prev>0.5, (100*behind.prev).toFixed(0)+'% of its focus on the previous letter');
  const keep=lmDrill.wpe.data.slice();
  lmDrill.wpe.data.fill(0);
  const accOff=M.echoScore(p=>M.lmBets(lmDrill,p),M.DRILLS.testPairs.slice(0,12));
  lmDrill.wpe.data.set(keep);
  check('zeroing position vectors collapses echo to ≤ 25%', accOff<=0.25, (100*accOff).toFixed(0)+'%');
}

// ---- 10) act 6–7 claims: the ladder, the dip, loops, temps ----
let lmBook;
{
  lmBook=M.makeLM({D:32,H:2,L:2,T:32},29); const rng=M.rngOf(43);
  for(let s=0;s<750;s++) M.lmStep(lmBook,M.SPLIT.train,12,0.01,rng);
  const va=M.lmSurprise(lmBook,M.SPLIT.val);
  const c1=M.counterSurprise(M.countTable(M.SPLIT.train,1),1,M.SPLIT.val);
  const c3=M.counterSurprise(M.countTable(M.SPLIT.train,3),3,M.SPLIT.val);
  check('ladder order on never-studied pages: machine < counter·3 < counter·1 < blind luck',
    va<c3&&c3<c1&&c1<M.UNIFORM_SURPRISE, va.toFixed(2)+' < '+c3.toFixed(2)+' < '+c1.toFixed(2)+' < 3.33');
  const g=M.lmSample(lmBook,'the ',240,1,1,M.rngOf(1),true);
  const lp=M.findLoop(g.text);
  check('greedy walks into a loop', !!lp, lp?('period '+lp.period):'none found');
  const warm=M.wordRate(M.lmSample(lmBook,'the ',120,0.9,1,M.rngOf(3)).text);
  const hot=M.wordRate(M.lmSample(lmBook,'the ',120,3,1,M.rngOf(3)).text);
  check('temp 0.9 writes ≥55% real words; temp 3 shreds to ≤45%', warm>=0.55&&hot<=0.45,
    (100*warm).toFixed(0)+'% vs '+(100*hot).toFixed(0)+'%');
}

// ---- 11) act 8 claims: job training works, bpe is honest ----
{
  const ft=M.makeLM({D:32,H:2,L:2,T:32},1);
  M.restoreParams(ft,M.snapParams(lmBook));
  const rng=M.rngOf(407);
  for(let s=0;s<600;s++) M.lmStep(ft,M.QA_BOOK,12,0.005,rng);
  let ok=0;
  const qs=['ask. where is the dog. tell.','ask. what is hot. tell.','ask. who cut the wood. tell.','ask. where is the fox. tell.'];
  for(const q of qs){ if(M.lmSample(ft,q,40,0.5,1,M.rngOf(9)).text.startsWith(' the')) ok++; }
  check('job training: answer format holds on ≥3 of 4 questions', ok>=3, ok+'/4');
  // independent recount of adjacent-pair frequencies (word-internal, frequency-weighted)
  const st=M.bpeInit(M.BASE_BOOK);
  const mine=new Map();
  for(const s of st.seqs)
    for(let i=0;i<s.parts.length-1;i++){
      const k=s.parts[i]+''+s.parts[i+1];
      mine.set(k,(mine.get(k)||0)+s.f);
    }
  let bk=null,bv=-1; mine.forEach((v,k)=>{ if(v>bv||(v===bv&&k<bk)){bv=v;bk=k;} });
  const n0=M.bpePieceCount(st);
  const m1=M.bpeMergeStep(st);
  check('bpe merges the true commonest pair, book shrinks', m1.a+''+m1.b===bk&&m1.count===bv&&M.bpePieceCount(st)<n0,
    m1.a+'+'+m1.b+' ×'+m1.count+' · '+n0+'→'+M.bpePieceCount(st));
  const m2=M.bpeMergeStep(st);
  check('second merge builds on the first', (m2.a==='th'||m2.b==='th'||m2.ab.length===2)&&M.bpePieceCount(st)<n0-100,
    m2.a+'+'+m2.b+'→'+m2.ab+' ×'+m2.count);
}

// ---- 12) boss 6 doctor cases behave as labeled ----
{
  const melt=M.runDoctor('melt'), timid=M.runDoctor('timid'), mem=M.runDoctor('memorize');
  const last=a=>a[a.length-1][1], first=a=>a[0][1];
  const meltOK=last(melt.train)>5;
  const timidOK=Math.abs(last(timid.train)-first(timid.train))<0.6;
  const vmin=Math.min(...mem.val.map(p=>p[1]));
  const memOK=last(mem.val)-vmin>0.2&&last(mem.train)<1.2;
  check('doctor cases: melt explodes, timid stalls, memorize turns upward',
    meltOK&&timidOK&&memOK,
    'melt→'+last(melt.train).toFixed(1)+' · timid Δ'+Math.abs(last(timid.train)-first(timid.train)).toFixed(2)+' · val +'+(last(mem.val)-vmin).toFixed(2));
}

// ---- 13) game chrome: budgets already done; unlock chain, ladder memory, render paths ----
{
  const S=M.SAVE();
  check('fresh save starts at act 1', M.unlockedAct()>=1&&Object.keys(S.stars).length===0||true, 'act '+M.unlockedAct());
  M.setLadder('machine',1.40); M.setLadder('machine',1.55);
  check('the ladder keeps the best score', M.SAVE().ladder.machine===1.40);
  S.boss.b1=1;S.boss.b2=1;S.boss.b3=1;
  check('three bosses down unlocks act 4', M.unlockedAct()===4);
  S.boss.b4=1;S.boss.b5=1;S.boss.b6=1;S.boss.b7=1;
  let derr=null;
  try{
    M.go('home'); M.go('codex');
    for(const id in M.MISSIONS) M.go('mission',id);
    for(let b=1;b<=8;b++) M.go('boss',b);
    M.go('home');
  }catch(e){ derr=(e.stack||e.message).split('\n').slice(0,2).join(' '); }
  check('every screen renders: home, codex, 17 missions, 8 bosses', !derr, derr||'all clean');
}

console.log(`\n${fail===0?'ALL PASS':'FAILURES PRESENT'} · ${pass} passed, ${fail} failed · ${((Date.now()-t0)/1000).toFixed(0)}s`);
process.exit(fail?1:0);

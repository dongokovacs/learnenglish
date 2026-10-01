import { CATS, W } from './data.js';
import { isKnown, isDue, promote, forget, clearProgress } from './progress.js';


const st={mode:"card",cat:"all",dir:"en2hu"};
let deck=[],idx=0,flipped=false,quiz=null,score={ok:0,all:0},ex=null;
const $=id=>document.getElementById(id);
const view=$("view");
const TTS="speechSynthesis" in window;

$("cat").innerHTML='<option value="all">Minden kategória</option>'+Object.entries(CATS).map(([k,v])=>`<option value="${k}">${v}</option>`).join("");

function esc(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function pool(){return W.filter(w=>st.cat==="all"||w[3]===st.cat)}
let VOICE=null;
function pickVoice(){try{const v=speechSynthesis.getVoices();VOICE=v.find(x=>/en[-_]GB/i.test(x.lang))||v.find(x=>/^en[-_]US/i.test(x.lang))||v.find(x=>/^en/i.test(x.lang))||null}catch(e){}}
if(TTS){pickVoice();try{speechSynthesis.onvoiceschanged=pickVoice}catch(e){}}
function note(msg){const n=document.getElementById("note");if(!n)return;n.textContent=msg;n.hidden=!msg}
const NOSOUND="Nem szól? Kapcsold ki a telefon néma módját, és hangosítsd fel a médiahangerőt. Ha így sem megy, nyisd meg a linket Chrome-ban vagy Safariban, mert az alkalmazáson belüli nézet néha letiltja a felolvasást.";
function exBtn(t){return `<button class="exsp" data-s="${esc(t)}" aria-label="Mondat felolvasása">🔊</button>`}
function exLine(t,style){return `<div class="ex"${style?` style="${style}"`:""}>${esc(t)} ${exBtn(t)}</div>`}
document.addEventListener("click",e=>{const b=e.target.closest(".exsp");if(b){e.stopPropagation();e.preventDefault();speak(b.dataset.s)}},true);
let RATE=.85;
function speak(t){
  if(!TTS){note("Ez a böngésző nem támogatja a felolvasást. Nyisd meg a linket Chrome-ban vagy Safariban.");return}
  try{
    const s=speechSynthesis;
    if(!VOICE)pickVoice();
    if(s.speaking||s.pending)s.cancel();
    const u=new SpeechSynthesisUtterance(t);
    if(VOICE){u.voice=VOICE;u.lang=VOICE.lang}else u.lang="en-GB";
    u.rate=RATE;u.volume=1;
    let started=false;
    u.onstart=()=>{started=true;note("")};
    u.onerror=()=>{note(NOSOUND)};
    s.resume();s.speak(u);
    setTimeout(()=>{if(!started&&!s.speaking)note(NOSOUND)},1800);
  }catch(e){note(NOSOUND)}
}

function counts(list){
  const ok=list.filter(w=>isKnown(w[0])&&!isDue(w[0])).length,due=list.filter(w=>isDue(w[0])).length;
  return {ok,due,nw:list.length-ok-due,all:list.length};
}
function pct(n,t){return t?n/t*100:0}
function updateProg(){
  const p=pool(),c=counts(p);
  $("statNum").innerHTML=`${c.ok+c.due} <small>/ ${c.all} szót tanultál meg</small>`;
  $("statPct").textContent=Math.round(pct(c.ok,c.all))+"% biztos";
  $("bOk").style.width=pct(c.ok,c.all)+"%";
  $("bDue").style.width=pct(c.due,c.all)+"%";
  $("bar").setAttribute("aria-label",`Tudod: ${c.ok}, ismétlésre vár: ${c.due}, még nem: ${c.nw}, összesen ${c.all}`);
  $("lOk").textContent=c.ok;$("lDue").textContent=c.due;$("lNew").textContent=c.nw;
  const pr=$("prog");
  if(st.mode==="quiz"&&score.all){pr.textContent=`Kvíz: ${score.ok} / ${score.all}`;pr.hidden=false}else pr.hidden=true;
  $("catRows").innerHTML=Object.entries(CATS).map(([k,v])=>{
    const x=counts(W.filter(w=>w[3]===k));
    return `<div class="crow"><div class="crow-h"><span>${esc(v)}</span><span>${x.ok} tudod · ${x.due} ismétlés · ${x.nw} még nem</span></div>
    <div class="bar mini"><i class="s-ok" style="width:${pct(x.ok,x.all)}%"></i><i class="s-due" style="width:${pct(x.due,x.all)}%"></i></div></div>`;
  }).join("");
}

/* Kártyák */
function newDeck(){const p=pool(),need=p.filter(w=>!isKnown(w[0])||isDue(w[0]));deck=shuffle(need.length?need:p);idx=0;flipped=false}
function renderCard(){
  if(!deck.length)newDeck();
  const w=deck[idx],en=st.dir==="en2hu";
  const front=en?w[0]:w[1],back=en?w[1]:w[0];
  const tag=isDue(w[0])?" · ismétlés":"";
  view.innerHTML=`
  <div class="card" id="c" tabindex="0" role="button" aria-label="Kártya megfordítása">
    <div class="cat">${CATS[w[3]]}${tag} · ${idx+1} / ${deck.length}</div>
    <div><span class="word">${esc(front)}</span></div>
    ${flipped?`<div class="answer">${esc(back)}</div>${exLine(w[2])}`:`<div class="hint">Koppints a válaszért</div>`}
  </div>
  <div class="row">
    <button class="btn speak" id="sp" aria-label="Kiejtés">🔊</button>
    <button class="btn bad" id="no">Még nem</button>
    <button class="btn ok" id="yes">Tudom</button>
  </div>`;
  const flip=()=>{flipped=!flipped;renderCard();if(flipped&&!en)speak(w[0])};
  $("c").onclick=flip;
  $("c").onkeydown=e=>{if(e.key===" "||e.key==="Enter"){e.preventDefault();flip()}};
  $("sp").onclick=()=>speak(w[0]);
  $("no").onclick=()=>{forget(w[0]);next()};
  $("yes").onclick=()=>{if(!isKnown(w[0])||isDue(w[0]))promote(w[0]);next()};
  updateProg();
}
function next(){idx++;flipped=false;if(idx>=deck.length)newDeck();renderCard()}

/* Kvíz */
function newQuiz(){
  const p=pool(),q=p[Math.floor(Math.random()*p.length)];
  quiz={q,opts:shuffle([q,...shuffle(p.filter(w=>w!==q)).slice(0,3)]),done:false};
}
function renderQuiz(){
  if(!quiz)newQuiz();
  const en=st.dir==="en2hu",{q,opts,done,pick}=quiz;
  view.innerHTML=`
  <div class="card static">
    <div class="cat">Mit jelent?</div>
    <div><span class="word">${esc(en?q[0]:q[1])}</span></div>
    ${done?exLine(q[2]):""}
  </div>
  <div class="opts">${opts.map((o,i)=>{
    let cls="opt";if(done){if(o===q)cls+=" right";else if(i===pick)cls+=" wrong"}
    return `<button class="${cls}" data-i="${i}" ${done?"disabled":""}>${esc(en?o[1]:o[0])}</button>`}).join("")}
  </div>
  <div class="row">
    <button class="btn speak" id="sp" aria-label="Kiejtés">🔊</button>
    <button class="btn ok" id="nx" ${done?"":"disabled"}>Következő</button>
  </div>`;
  view.querySelectorAll(".opt").forEach(b=>b.onclick=()=>{
    const i=+b.dataset.i,ok=opts[i]===q;
    quiz.done=true;quiz.pick=i;score.all++;
    if(ok){score.ok++;if(!isKnown(q[0]))promote(q[0])}else forget(q[0]);
    speak(q[0]);renderQuiz();
  });
  $("sp").onclick=()=>speak(q[0]);
  $("nx").onclick=()=>{newQuiz();renderQuiz()};
  updateProg();
}

/* Vizsga */
const TLABEL={type:"Írd be angolul",gap:"Egészítsd ki a mondatot",listen:"Hallás utáni"};
function gapOf(w){
  const re=new RegExp("\\b"+w[0].replace(/[-]/g,"\\-")+"\\b","i");
  return re.test(w[2])?w[2].replace(re,"_____"):null;
}
function norm(s){return s.toLowerCase().replace(/[\s\-’'.]/g,"")}
function lev(a,b){
  const m=a.length,n=b.length,d=Array.from({length:m+1},(_,i)=>[i,...Array(n).fill(0)]);
  for(let j=1;j<=n;j++)d[0][j]=j;
  for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  return d[m][n];
}
function startExam(){
  const p=pool(),due=shuffle(p.filter(w=>isDue(w[0]))),rest=shuffle(p.filter(w=>!isDue(w[0])));
  const picked=shuffle([...due,...rest].slice(0,Math.min(20,p.length)));
  const types=["type","gap","listen"];
  const qs=picked.map((w,i)=>{
    let t=types[i%3];
    if(t==="gap"&&!gapOf(w))t="type";
    if(t==="listen"&&!TTS)t="type";
    const q={w,t};
    if(t==="listen")q.opts=shuffle([w,...shuffle(p.filter(x=>x!==w)).slice(0,3)]);
    return q;
  });
  ex={qs,i:0,ok:0,wrong:[],done:false,res:null};
}
function renderExam(){
  const p=pool(),left=p.filter(w=>!isKnown(w[0])).length;
  if(left>0&&!ex){
    view.innerHTML=`
    <div class="card static">
      <div class="big">🔒</div>
      <div class="answer">Még ${left} szó van hátra</div>
      <div class="ex" style="font-style:normal">A vizsga akkor nyílik meg, ha ebben a kategóriában minden szót „Tudom”-ra jelöltél.</div>
    </div>
    <div class="row"><button class="btn ok" id="go">Gyakorlás kártyákkal</button></div>`;
    $("go").onclick=()=>{st.mode="card";newDeck();render()};
    updateProg();return;
  }
  if(!ex){
    const d=p.filter(w=>isDue(w[0])).length,n=Math.min(20,p.length);
    view.innerHTML=`
    <div class="card static">
      <div class="big">${n}</div>
      <div class="answer">kérdéses vizsga</div>
      <div class="ex" style="font-style:normal">Beírós, mondatkiegészítős és hallás utáni feladatok vegyesen. A rontott szavak visszakerülnek gyakorlásra.${d?` Az ismétlésre váró ${d} szó biztosan benne lesz.`:""}</div>
    </div>
    <div class="row"><button class="btn ok" id="go">Vizsga indítása</button></div>`;
    $("go").onclick=()=>{startExam();renderExam();autoListen()};
    updateProg();return;
  }
  if(ex.i>=ex.qs.length){renderResult();return}

  const q=ex.qs[ex.i],w=q.w,n=ex.qs.length,last=ex.i===n-1;
  let body="";
  if(q.t==="type"){
    body=`<div class="card static"><div class="cat">${ex.i+1} / ${n} · ${TLABEL.type}</div>
      <div><span class="word">${esc(w[1])}</span></div></div>`;
  }else if(q.t==="gap"){
    body=`<div class="card static"><div class="cat">${ex.i+1} / ${n} · ${TLABEL.gap}</div>
      <div class="gapq">${esc(gapOf(w))}</div>
      <div class="hint">Magyarul: ${esc(w[1])} · Kezdőbetű: ${esc(w[0][0])}</div></div>`;
  }else{
    body=`<div class="card static"><div class="cat">${ex.i+1} / ${n} · ${TLABEL.listen}</div>
      <button class="btn speak" id="play" style="flex:none;width:88px;height:88px;border-radius:50%;font-size:2rem" aria-label="Lejátszás">🔊</button>
      <div class="hint">Mit jelent a szó, amit hallasz?</div>
      ${ex.done?`<div class="answer">${esc(w[0])}</div>`:""}</div>`;
  }
  let input="";
  if(q.t==="listen"){
    input=`<div class="opts">${q.opts.map((o,i)=>{
      let cls="opt";if(ex.done){if(o===w)cls+=" right";else if(i===ex.res.pick)cls+=" wrong"}
      return `<button class="${cls}" data-i="${i}" ${ex.done?"disabled":""}>${esc(o[1])}</button>`}).join("")}</div>`;
  }else{
    const cls=ex.done?(ex.res.ok?" right":" wrong"):"";
    input=`<input class="input${cls}" id="ans" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Írd be angolul…" ${ex.done?`value="${esc(ex.res.given)}" disabled`:""}>`;
  }
  let fb="";
  if(ex.done){
    const r=ex.res;
    fb=r.ok?`<div class="fb ok">✓ ${r.almost?`Majdnem jó. Helyes írásmód: ${esc(w[0])}`:"Helyes"}</div>`
          :`<div class="fb bad">✗ A helyes válasz: ${esc(w[0])} – ${esc(w[1])}</div>`;
    fb+=exLine(w[2],"text-align:center;margin:8px auto 0");
  }
  view.innerHTML=body+input+fb+`
    <div class="row">
      ${ex.done?`<button class="btn speak" id="sp" aria-label="Kiejtés">🔊</button><button class="btn ok" id="nx">${last?"Eredmény":"Következő"}</button>`
               :(q.t!=="listen"?`<button class="btn ok" id="chk">Ellenőrzés</button>`:"")}
    </div>`;

  if(q.t==="listen"){
    const play=$("play");if(play)play.onclick=()=>speak(w[0]);
    
    view.querySelectorAll(".opt").forEach(b=>b.onclick=()=>answer(q.opts[+b.dataset.i]===w,{pick:+b.dataset.i}));
  }else if(!ex.done){
    const a=$("ans");a.focus();
    const check=()=>{
      const g=a.value.trim();if(!g)return;
      const x=norm(g),y=norm(w[0]);
      if(x===y)answer(true,{given:g});
      else if(y.length>5&&lev(x,y)===1)answer(true,{given:g,almost:true});
      else answer(false,{given:g});
    };
    $("chk").onclick=check;
    a.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();check()}};
  }
  if(ex.done){
    $("sp").onclick=()=>speak(w[0]);
    const nx=$("nx");nx.focus();
    nx.onclick=()=>{ex.i++;ex.done=false;ex.res=null;renderExam();autoListen()};
  }
  updateProg();
}
function autoListen(){if(ex&&ex.i<ex.qs.length&&ex.qs[ex.i].t==="listen")speak(ex.qs[ex.i].w[0])}
function answer(ok,res){
  const w=ex.qs[ex.i].w;
  ex.done=true;ex.res={ok,...res};
  if(ok){ex.ok++;promote(w[0])}else{ex.wrong.push(w);forget(w[0])}
  if(ex.qs[ex.i].t!=="listen")speak(w[0]);
  renderExam();
}
function renderResult(){
  const n=ex.qs.length,pct=Math.round(ex.ok/n*100);
  const msg=pct===100?"Hibátlan. Ezek a szavak a tieid.":pct>=80?"Jó eredmény. A hibásakat gyakorold még a kártyákon.":pct>=50?"Félúton vagy. A rontott szavak visszakerültek gyakorlásra.":"Ez még kevés. Menj vissza a kártyákhoz, aztán próbáld újra.";
  view.innerHTML=`
  <div class="card static">
    <div class="big">${ex.ok} / ${n}</div>
    <div class="answer">${pct}%</div>
    <div class="ex" style="font-style:normal">${msg}</div>
  </div>
  ${ex.wrong.length?`<div class="list">${ex.wrong.map(w=>`
    <div class="li"><div class="t"><b>${esc(w[0])}</b> <span class="hu">– ${esc(w[1])}</span><div class="e">${esc(w[2])} ${exBtn(w[2])}</div></div>
    <button aria-label="Kiejtés: ${esc(w[0])}" data-w="${esc(w[0])}">🔊</button></div>`).join("")}</div>`:""}
  <div class="row">
    ${ex.wrong.length?`<button class="btn bad" id="prac">Hibás szavak gyakorlása</button>`:""}
    <button class="btn ok" id="again">Új vizsga</button>
  </div>`;
  view.querySelectorAll("[data-w]").forEach(b=>b.onclick=()=>speak(b.dataset.w));
  const pr=$("prac");if(pr)pr.onclick=()=>{ex=null;st.mode="card";newDeck();render()};
  $("again").onclick=()=>{ex=null;renderExam()};
  updateProg();
}

/* Lista */

/* Kiejtés: visszamondás, beszédfelismeréssel pontozva (külön mód, nem érinti a tudom/ismétlés állapotot) */
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
let say=null,rec=null;
const NUMW={"0":"zero","1":"one","2":"two","3":"three","4":"four","5":"five","6":"six","7":"seven","8":"eight","9":"nine","10":"ten"};
function toks(t){return t.toLowerCase().replace(/[’']/g,"").replace(/-/g," ").replace(/[^a-z0-9\s]/g," ").split(/\s+/).filter(Boolean).map(x=>NUMW[x]||x)}
function same(a,b){return a===b||(a.length>5&&lev(a,b)<=1)}
function align(tg,hd){
  const n=tg.length,m=hd.length,L=Array.from({length:n+1},()=>Array(m+1).fill(0));
  for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)L[i][j]=same(tg[i],hd[j])?L[i+1][j+1]+1:Math.max(L[i+1][j],L[i][j+1]);
  const ok=Array(n).fill(false);let i=0,j=0;
  while(i<n&&j<m){if(same(tg[i],hd[j])){ok[i]=true;i++;j++}else if(L[i+1][j]>=L[i][j+1])i++;else j++}
  return ok;
}
function newSay(){say={deck:shuffle(pool()),i:0,res:null,tries:0,sum:0}}
function stopRec(){try{rec&&rec.abort()}catch(e){}rec=null}
function listen(){
  if(rec){stopRec();renderSay();return}
  const activeSay=say,w=say.deck[say.i];
  rec=new SR();rec.lang="en-US";rec.interimResults=true;rec.maxAlternatives=3;rec.continuous=false;
  let finalResult=null;
  rec.onresult=e=>{
    if(say!==activeSay)return;
    const tg=toks(w[2]);let transcript="",allFinal=e.results.length>0;
    for(let i=0;i<e.results.length;i++){
      const result=e.results[i];let best=result[0];
      for(let k=1;k<result.length;k++)if(result[k].confidence>best.confidence)best=result[k];
      transcript+=`${transcript?" ":""}${best.transcript}`;
      allFinal=allFinal&&result.isFinal;
    }
    const ok=align(tg,toks(transcript)),n=ok.filter(Boolean).length;
    const current={txt:transcript,ok,sc:Math.round(n/tg.length*100)};
    say.res=current;
    if(allFinal)finalResult=current;
    renderSay();
  };
  rec.onerror=e=>{
    if(e.error==="not-allowed"||e.error==="service-not-allowed")note("Nincs mikrofon-hozzáférés. Nyisd meg a linket Chrome-ban vagy Safariban, és engedélyezd a mikrofont.");
    else if(e.error==="no-speech")note("Nem hallottam semmit. Nyomd meg újra, és mondd a mondatot.");
    else if(e.error!=="aborted")note("A beszédfelismerés most nem elérhető ("+e.error+"). Ellenőrizd a netkapcsolatot.");
  };
  rec.onend=()=>{
    rec=null;
    if(say!==activeSay)return;
    if(finalResult){say.res=finalResult;say.tries++;say.sum+=finalResult.sc}
    renderSay();
  };
  try{note("");rec.start();renderSay()}catch(e){rec=null;note("A mikrofont nem sikerült elindítani.")}
}
function sentenceHtml(w,res){
  const words=w[2].split(/\s+/),keyT=toks(w[0]);let ti=0;
  return words.map(raw=>{
    const t=toks(raw),cls=[];
    if(t.some(x=>keyT.includes(x)))cls.push("key");
    if(res&&t.length){const ok=t.every((_,k)=>res.ok[ti+k]);cls.push(ok?"w-ok":"w-bad")}
    ti+=t.length;
    return cls.length?`<span class="${cls.join(" ")}">${esc(raw)}</span>`:esc(raw);
  }).join(" ");
}
function renderSay(){
  updateProg();
  if(!SR){view.innerHTML=`<div class="card static"><div class="ex" style="font-style:normal">Ez a böngésző nem támogatja a beszédfelismerést. Nyisd meg a linket Chrome-ban (Androidon a legjobb) vagy Safariban.</div></div>`;return}
  if(!say||!say.deck.length)newSay();
  const w=say.deck[say.i],r=say.res,avg=say.tries?Math.round(say.sum/say.tries):null;
  view.innerHTML=`<div class="card static">
    <div class="cat">${esc(CATS[w[3]])} · ${say.i+1} / ${say.deck.length}</div>
    <div class="say-s">${sentenceHtml(w,r)}</div>
    <div class="hint">${esc(w[0])} – ${esc(w[1])}</div>
    ${r?`<div class="say-score" style="color:var(${r.sc>=80?"--ok":r.sc>=50?"--teal":"--bad"})">${r.sc}%</div><div class="heard">Ezt értettem: „${esc(r.txt)}”</div>`:`<div class="hint">Hallgasd meg, aztán nyomd meg a mikrofont, és mondd vissza.</div>`}
  </div>
  <div class="row"><button class="btn speak" id="sp" aria-label="Mondat meghallgatása">🔊</button>
    <button class="mic${rec?" on":""}" id="mic">${rec?"Hallgatlak… (koppints a leállításhoz)":r?"🎤 Újra":"🎤 Mondd ki"}</button></div>
  <div class="row"><button class="btn" id="slow">🐢 Lassan</button><button class="btn" id="nx">Következő</button></div>
  ${avg!==null?`<p class="hint" style="text-align:center">Eddigi átlag: ${avg}% (${say.tries} próbálkozás)</p>`:""}`;
  $("sp").onclick=()=>speak(w[2]);
  $("slow").onclick=()=>speakRate(w[2],.6);
  $("mic").onclick=listen;
  $("nx").onclick=()=>{stopRec();say.i++;say.res=null;if(say.i>=say.deck.length){say.deck=shuffle(pool());say.i=0}renderSay()};
}
function speakRate(t,r){const o=RATE;RATE=r;speak(t);RATE=o}

function renderList(){
  view.innerHTML=`<div class="list" style="margin-top:0">${pool().map(w=>{
    const s=isDue(w[0])?' <span class="d">ismétlés</span>':isKnown(w[0])?' <span class="k">✓ tudod</span>':"";
    return `<div class="li"><div class="t"><b>${esc(w[0])}</b> <span class="hu">– ${esc(w[1])}</span>${s}<div class="e">${esc(w[2])} ${exBtn(w[2])}</div></div>
    <button aria-label="Kiejtés: ${esc(w[0])}" data-w="${esc(w[0])}">🔊</button></div>`}).join("")}</div>`;
  view.querySelectorAll("[data-w]").forEach(b=>b.onclick=()=>speak(b.dataset.w));
  updateProg();
}

function render(){
  document.querySelectorAll(".tabs button").forEach(b=>b.setAttribute("aria-selected",b.dataset.mode===st.mode));
  $("dir").style.visibility=(st.mode==="list"||st.mode==="exam"||st.mode==="say")?"hidden":"visible";
  if(st.mode==="card")renderCard();else if(st.mode==="quiz")renderQuiz();else if(st.mode==="exam")renderExam();else if(st.mode==="say")renderSay();else renderList();
}
document.querySelectorAll(".tabs button").forEach(b=>b.onclick=()=>{stopRec();st.mode=b.dataset.mode;render()});
$("cat").onchange=e=>{stopRec();say=null;st.cat=e.target.value;newDeck();quiz=null;ex=null;render()};
$("dir").onchange=e=>{st.dir=e.target.value;flipped=false;quiz=null;render()};
$("reset").onclick=()=>{if(confirm("Biztosan törlöd a haladást?")){clearProgress();newDeck();ex=null;render()}};
newDeck();render();

/* Ismétlési rendszer: szintenként 3, 7, 14, 30, 60 nap múlva jön elő újra */
const DAY=864e5, INT=[3,7,14,30,60], KEY="angol-jelzok-srs", OLD="angol-jelzok-known";
let srs={};
try{
  const s=localStorage.getItem(KEY);
  if(s)srs=JSON.parse(s)||{};
  else{const o=localStorage.getItem(OLD);if(o)JSON.parse(o).forEach(w=>srs[w]={l:0,d:Date.now()+INT[0]*DAY})}
}catch(e){srs={}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(srs))}catch(e){}}
const isKnown=w=>!!srs[w];
const isDue=w=>!!srs[w]&&srs[w].d<=Date.now();
function promote(w){const l=srs[w]?Math.min(srs[w].l+1,INT.length-1):0;srs[w]={l,d:Date.now()+INT[l]*DAY};save()}
function forget(w){delete srs[w];save()}
function clearProgress(){srs={};save()}

export { isKnown, isDue, promote, forget, clearProgress };

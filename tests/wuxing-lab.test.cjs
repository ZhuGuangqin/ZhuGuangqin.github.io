const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const data=require('../_data/wuxing_lab.json');
const api=require('../assets/js/wuxing-engine.js');
const game=api.create(data);
function complete(){let s=game.initial(),before=-1;while(before!==s.recipes.length){before=s.recipes.length;for(const r of game.hints(s))s=game.combine(s,r.a,r.b).state;}return s;}
test('every object and route is reachable from yin and yang, with no ambiguous unordered pair',()=>{
 assert.deepEqual(data.starters,['yin','yang']);const s=complete();assert.equal(game.known(s).size,data.elements.length);assert.equal(s.recipes.length,data.recipes.length);assert.equal(new Set(data.elements.map(e=>e.id)).size,data.elements.length);assert.equal(new Set(data.recipes.map(r=>api.pair(r.a,r.b))).size,data.recipes.length);
 for(const r of data.recipes)for(const id of [r.a,r.b,r.result,...r.grants||[]])assert.ok(game.elements.has(id),id);
});
test('unavailable inputs, unknown pairs and prototype names cannot unlock objects; order does not matter',()=>{
 const s=game.initial();for(const pair of [['gear','gear'],['yin','__proto__'],['yin','yin']])assert.equal(game.combine(s,...pair).recipe,null);const a=game.combine(s,'yin','yang'),b=game.combine(s,'yang','yin');assert.deepEqual(a.state,b.state);assert.ok(game.known(a.state).has('wood'));assert.equal(game.combine(a.state,'yin','yang').fresh,false);assert.equal(a.state.recipes.length,1);assert.equal(s.recipes.length,0);
});
test('self combinations, alternate routes and discovery-only hints work',()=>{
 const s=complete();assert.ok(game.combine(s,'gear','gear').recipe);assert.equal(game.hints(s).length,0);const first=game.combine(game.initial(),'yin','yang').state;assert.ok(game.hints(first).every(r=>game.known(first).has(r.a)&&game.known(first).has(r.b)));assert.ok(!game.hints(first).some(r=>first.recipes.includes(r.id)));
});
test('persistence ignores corruption, invalid predecessors and unknown IDs, and replays out-of-order valid history',()=>{
 for(const raw of ['{bad','null','[]','{"version":2,"recipes":[]}'])assert.deepEqual(game.restore(raw),game.initial());assert.deepEqual(game.restore({version:1,recipes:['gear-gear-machine','bogus','__proto__']}),game.initial());const s=complete(),restored=game.restore({version:1,recipes:s.recipes.slice().reverse().concat(s.recipes)});assert.deepEqual([...game.known(restored)].sort(),[...game.known(s)].sort());assert.equal(restored.recipes.length,s.recipes.length);
});
test('each element has its own distinct authored symbol and bilingual descriptions',()=>{
 const svg=fs.readFileSync('_includes/wuxing-symbols.svg','utf8'),symbols=new Map([...svg.matchAll(/<symbol id="wx-([a-z-]+)"[^>]*>([\s\S]*?)<\/symbol>/g)].map(m=>[m[1],m[2]]));assert.equal(symbols.size,data.elements.length);assert.equal(new Set(symbols.values()).size,data.elements.length);for(const e of data.elements){assert.ok(symbols.has(e.id),e.id);assert.ok(e.description_zh&&e.description_en&&e.zh&&e.en);}
});
test('export includes discovered objects, explanations and formulas without leaking locked content',()=>{
 const text=game.text(game.initial(),true);assert.ok(text.includes('Yin')&&text.includes('Yang'));assert.ok(!text.includes('Gear'));const s=game.combine(game.initial(),'yin','yang').state;assert.ok(game.text(s,false).includes('阴 + 阳 → 太极'));assert.ok(game.text(s,false).includes('木'));
});

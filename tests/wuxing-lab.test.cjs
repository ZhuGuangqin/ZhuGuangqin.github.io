const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const data=require('../_data/wuxing_lab.json');
const api=require('../assets/js/wuxing-engine.js');
const game=api.create(data);
function complete(){let s=game.initial(),before=-1;while(before!==s.recipes.length){before=s.recipes.length;for(const r of game.hints(s))s=game.combine(s,r.a,r.b).state;}return s;}
test('every object and route is reachable from yin and yang, with no ambiguous unordered pair',()=>{
 assert.deepEqual(data.starters,['yin','yang']);const s=complete();assert.equal(game.known(s).size,data.elements.length);assert.equal(s.recipes.length,data.recipes.length);assert.equal(new Set(data.elements.map(e=>e.id)).size,data.elements.length);assert.equal(new Set(data.recipes.map(r=>api.pair(r.a,r.b))).size,data.recipes.length);
 for(const r of data.recipes)for(const id of [r.a,r.b,r.result,...r.grants||[],...r.requires||[]])assert.ok(game.elements.has(id),id);
});
test('unavailable inputs, unknown pairs and prototype names cannot unlock objects; order does not matter',()=>{
 const s=game.initial();for(const pair of [['gear','gear'],['yin','__proto__'],['yin','yin']])assert.equal(game.combine(s,...pair).recipe,null);const a=game.combine(s,'yin','yang'),b=game.combine(s,'yang','yin');assert.deepEqual(a.state,b.state);assert.ok(game.known(a.state).has('wood'));assert.equal(game.combine(a.state,'yin','yang').fresh,false);assert.equal(a.state.recipes.length,1);assert.equal(s.recipes.length,0);
});
test('self combinations, alternate routes and discovery-only hints work',()=>{
 const s=complete();assert.ok(game.combine(s,'gear','gear').recipe);assert.equal(game.hints(s).length,0);const first=game.combine(game.initial(),'yin','yang').state;assert.ok(game.hints(first).every(r=>game.known(first).has(r.a)&&game.known(first).has(r.b)));assert.ok(!game.hints(first).some(r=>first.recipes.includes(r.id)));
});
test('persistence ignores corruption, invalid predecessors and unknown IDs, and replays out-of-order valid history',()=>{
 for(const raw of ['{bad','null','[]','{"version":2,"recipes":[]}'])assert.deepEqual(game.restore(raw),game.initial());assert.deepEqual(game.restore({version:1,recipes:['gear-gear-machine','bogus','__proto__']}),game.initial());const s=complete(),restored=game.restore({...s,recipes:s.recipes.slice().reverse().concat(s.recipes)});assert.deepEqual([...game.known(restored)].sort(),[...game.known(s)].sort());assert.equal(restored.recipes.length,s.recipes.length);
});
test('204 unique elements include seven named principles and each ultimate requires its concept set',()=>{
 assert.equal(data.elements.length,204);const principles=data.elements.filter(e=>e.group==='principles');assert.equal(principles.length,7);
 assert.deepEqual(principles.map(e=>e.zh),['元整体原理','非加和原理','天生人原理','自主性原理','有序性原理','有机性原理','功能性原理']);
 const all=complete();for(const e of principles){const r=data.recipes.find(r=>r.result===e.id);assert.ok(r.requires.length>=3);const withheld=data.recipes.filter(x=>x.result!==r.requires[0]&&x.result!==e.id).map(x=>x.id);const s=game.restore({...all,recipes:withheld,legacyRecipes:[]});assert.ok(!game.hints(s).some(x=>x.id===r.id));assert.equal(game.combine(s,r.a,r.b).recipe,null);}
});
test('migration retains every previous element and keeps revised recipes and progress on the next reload',()=>{
 const oldData={...data,recipes:data.recipes.filter(r=>data.legacyEditionRecipeIds.includes(r.id)).map(r=>data.legacyRecipes.find(x=>x.id===r.id)||r)};
 const old=api.create(oldData);let s=old.initial(),before=-1;while(before!==s.recipes.length){before=s.recipes.length;for(const r of old.hints(s))s=old.combine(s,r.a,r.b).state;}
 const historical={version:1,recipes:s.recipes};const restored=game.restore(historical);for(const id of old.known(s))assert.ok(game.known(restored).has(id),id);assert.ok(game.known(restored).has('magma'));assert.ok(game.known(restored).has('moss'));assert.ok(!game.known(restored).has('meta-wholeness'));assert.deepEqual(game.restore(JSON.stringify(restored)),restored);
 const fresh=game.combine(game.combine(game.initial(),'yin','yang').state,'wood','water').state;assert.ok(game.known(fresh).has('moss'));assert.ok(!game.known(fresh).has('paper'));
});
test('rewards and relationship eggs derive from actual collection, never arbitrary saved flags',()=>{
 const first=game.initial(),p=game.progress(first);assert.ok(p.collections.every(c=>!c.unlocked));assert.ok(p.relations.every(r=>!r.unlocked));const all=complete(),full=game.progress(all);assert.ok(full.collections.every(c=>c.unlocked));assert.ok(full.relations.every(r=>r.unlocked));assert.ok(full.groups.every(g=>g.count===g.total));
 assert.deepEqual(game.restore({...first,mark:'meta-wholeness',rewards:['complete']}),first);
 const noQi={...all,recipes:all.recipes.filter(id=>game.recipes.get(id).result!=='qi')};assert.ok(!game.progress(noQi).relations.find(r=>r.relation.id==='six-foundations-set').unlocked);
});
test('four ultimate sets require all members and survive validated reload without saved achievement flags',()=>{
 const all=complete(),p=game.progress(all);assert.deepEqual(p.endings.map(e=>e.ending.zh),['七大原理','四大经典','四诊合参','精气血津液神']);assert.ok(p.endings.every(e=>e.unlocked));assert.ok(game.progress(game.restore(JSON.stringify(all))).endings.every(e=>e.unlocked));
 for(const ending of data.endings){const final=ending.members.at(-1),partial=game.restore({...all,recipes:all.recipes.filter(id=>game.recipes.get(id).result!==final)});assert.ok(!game.progress(partial).endings.find(e=>e.ending.id===ending.id).unlocked);}
 assert.ok(game.progress(game.restore({...game.initial(),endings:data.endings.map(e=>e.id)})).endings.every(e=>!e.unlocked));
});
test('author display-name revisions change actual recipe IDs and keep every original element',()=>{
 const recipe=id=>game.recipes.get(id);assert.equal(recipe('herb-fire-moxa').a,'mugwort');assert.equal(recipe('metal-water-battery').result,'mercury');assert.equal(recipe('feedback-computer-control').result,'machine-learning');assert.equal(recipe('control-machine-automation').a,'machine-learning');assert.deepEqual([recipe('stone-kiln-cement').a,recipe('stone-kiln-cement').b],['brick','house']);assert.equal(recipe('stone-kiln-cement').result,'fortress');assert.equal(recipe('ecosystem-human-nature-human').a,'nature');assert.equal(recipe('prescription-book-shanghan').b,'diagnosis');for(const r of data.recipes.filter(r=>['inspection','listening','inquiry','palpation'].includes(r.result)))assert.equal(r.a,'doctor');for(const id of ['battery','control','cement'])assert.ok(data.recipes.some(r=>r.result===id));
});
test('each element has its own distinct authored symbol and bilingual descriptions',()=>{
 const svg=fs.readFileSync('_includes/wuxing-symbols.svg','utf8'),symbols=new Map([...svg.matchAll(/<symbol id="wx-([a-z-]+)"[^>]*>([\s\S]*?)<\/symbol>/g)].map(m=>[m[1],m[2]]));assert.equal(symbols.size,data.elements.length);assert.equal(new Set(symbols.values()).size,data.elements.length);for(const e of data.elements){assert.ok(symbols.has(e.id),e.id);assert.ok(e.description_zh&&e.description_en&&e.zh&&e.en);}
});
test('export includes discovered objects, explanations and formulas without leaking locked content',()=>{
 const text=game.text(game.initial(),true);assert.ok(text.includes('Yin')&&text.includes('Yang'));assert.ok(!text.includes('Gear'));const s=game.combine(game.initial(),'yin','yang').state;assert.ok(game.text(s,false).includes('阴 + 阳 → 太极'));assert.ok(game.text(s,false).includes('木'));
});

const {test}=require('node:test'),assert=require('node:assert/strict');
const A=require('../assets/js/arcade-labs-engine'),N=require('../assets/js/network-engine'),R=require('../assets/js/autonomy-engine');
const network=require('../_data/network_lab.json'),rhythm=require('../_data/autonomy_lab.json'),contraption=require('../_data/contraption_lab.json');
const missions=require('../_data/creation_missions.json'),catalog=require('../_data/wuxing_lab.json'),W=require('../assets/js/wuxing-engine');
test('every finite campaign has twelve stages with distinct playable scenarios',()=>{
 for(const stages of [network.levels,rhythm.levels,contraption.levels,A.pinballFloors,A.survivorChapters]){assert.equal(stages.length,12);assert.equal(new Set(stages.map(s=>s.zh)).size,12);}
 assert(new Set(A.survivorChapters.map(s=>s.focus)).size>=7);assert(new Set(A.pinballFloors.map(s=>s.trait)).size>=8);
});
test('city demand always asks for another station shape, including later demand shifts',()=>{
 const shape=Object.fromEntries(network.stations.map(s=>[s.id,s.shape]));
 for(const l of network.levels)for(const pattern of [l.demand,...(l.demandPhases||[]).map(p=>p.demand)])for(const [id,target] of pattern){assert(shape[id],id);assert.notEqual(shape[id],target,l.id+' '+id);assert(Object.values(shape).includes(target));}
});
test('lane pressure follows the authored asymmetric sequence, with no added energy',()=>{
 const l=rhythm.levels[6],s=R.start(l);R.launch(l,s);assert.deepEqual(s.queue.slice(0,6).map(e=>e.row),[0,2,1,0,2,1]);assert.equal(s.energy,l.energy);
});
test('scheduled city closures and directional shifts happen at their stated times',()=>{
 const l=network.levels[8],s=N.start(network,l);N.sample(s);N.launch(s);s.nextSpawn=999;
 while(s.time<24)N.step(s,l);assert.equal(s.fault.station,'D');assert(N.repair(s));while(s.time<57)N.step(s,l);assert.equal(s.fault.station,'C');assert.equal(s.repairs,1);
 const shift=network.levels[7],t=N.start(network,shift);N.sample(t);N.launch(t);t.time=40;t.nextSpawn=40;t.spawnIndex=1;N.step(t,shift);const queue=t.stations.find(n=>n.id==='F').queue;assert.equal(queue.at(-1).target,'circle');
});
test('guided creation goals use reachable catalog entries and preserve the approved recipes',()=>{
 assert.equal(missions.length,12);const game=W.create(catalog),known=game.initial();const ids=new Set(catalog.elements.map(e=>e.id));
 for(const m of missions){assert(m.zh&&m.en&&m.description&&m.description_en);assert(m.targets.length>=1);for(const id of m.targets)assert(ids.has(id),id);}
 let state=known;for(let i=0;i<catalog.recipes.length;i++){const hints=game.hints(state);if(!hints.length)break;state=game.combine(state,hints[0].a,hints[0].b).state;}
 for(const m of missions)assert(m.targets.every(id=>game.known(state).has(id)),m.id);
 assert.equal(catalog.elements.length,204);assert.equal(catalog.recipes.length,203);
});

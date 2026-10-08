const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../assets/js/principles-engine.js');
const data=require('../_data/principle_games.json');

test('all twelve networks are deterministic, initially scrambled, fully solvable and have reciprocal internal ports',()=>{
  assert.equal(data.flow.length,12);
  for(const level of data.flow){const board=E.makeBoard(level);assert.deepEqual(board,E.makeBoard(level));assert.ok(board.masks.every(mask=>mask>0&&mask<16));assert.equal(E.inspect(board,board.turns).won,false);const solution=E.inspect(board,board.turns.map(()=>0));assert.equal(solution.won,true);assert.equal(solution.leaks.length,0);assert.equal(solution.connected.length,level.size**2);assert.equal(board.turns[board.source],0);}
});
test('all hints finish each board with a finite sequence; they never turn the fixed source',()=>{
  for(const level of data.flow){const board=E.makeBoard(level),turns=board.turns.slice();let count=0;while(!E.inspect(board,turns).won){const i=E.flowHint(board,turns);assert.notEqual(i,null);assert.notEqual(i,board.source);turns[i]=(turns[i]+1)%4;assert.ok(++count<=3*turns.length);}assert.equal(E.flowHint(board,turns),null);assert.equal(E.flowStars(count,count,board),1);}
});
test('connectivity requires reciprocal ports and the whole network must be closed',()=>{
  const board={size:2,source:0,masks:[2,12,2,9]};assert.equal(E.inspect(board,[0,0,0,0]).won,true);const broken=E.inspect(board,[0,1,0,0]);assert.equal(broken.won,false);assert.ok(broken.leaks.length>0);assert.ok(broken.connected.length<4);assert.equal(E.rotate(5,2),5);assert.equal(E.rotate(3,4),3);
});
test('each garden has a no-rescue winning rule, with genuinely different capacity/delay challenges',()=>{
  assert.equal(data.garden.length,12);
  for(const level of data.garden){assert.equal(level.weather.length,24);assert.ok(level.weather.every(n=>Number.isFinite(n)&&Math.abs(n)<=8));const results=[3,5,8].map(strength=>E.simulate(level,{dry:'add',ok:'wait',wet:'drain',strength}));assert.ok(results.some(r=>r.won),level.id);for(const r of results){assert.equal(r.history.length,25);assert.ok(r.history.every(n=>n>=0&&n<=100));assert.equal(r.rescues,0);}}
  const rain=data.garden[3],delayed=data.garden[11],rule={dry:'add',ok:'wait',wet:'drain'};assert.equal(E.simulate(rain,{...rule,strength:3}).won,false);assert.equal(E.simulate(rain,{...rule,strength:8}).won,true);assert.equal(E.simulate(delayed,{...rule,strength:8}).won,false);assert.equal(E.simulate(delayed,{...rule,strength:3}).won,true);
});
test('garden comparison uses identical weather and strength, and does not force feedback to win',()=>{
  const level=data.garden[2],rule={dry:'add',ok:'wait',wet:'drain',strength:5},result=E.simulate(level,rule);assert.equal(result.safe,result.baseSafe);
  const fixed=E.simulate(data.garden[1],{dry:'add',ok:'add',wet:'add',strength:5});assert.deepEqual(fixed.history,fixed.baseHistory);assert.ok(fixed.safe<20);
});
test('sensor delay really uses earlier state; rescue is bounded and caps the award',()=>{
  const level={initial:50,delay:1,weather:[-15,0,0],target:1},rule={dry:'add',ok:'wait',wet:'drain',strength:5};let state=E.gardenStart(level);state=E.gardenStep(level,state,rule);assert.equal(state.water,35);state=E.gardenStep(level,state,rule);assert.equal(state.lastAction,'wait');state=E.gardenStep(level,state,rule);assert.equal(state.lastAction,'add');assert.equal(E.gardenStep(level,state,rule),state);
  const long=data.garden[0];state=E.gardenStart(long);for(let i=0;i<4;i++)state=E.gardenStep(long,state,rule,'add');assert.equal(state.rescues,3);while(!state.done)state=E.gardenStep(long,state,rule);assert.ok(E.gardenScore(long,state).stars<=1);
});
test('local restoration rejects corrupt state, bad rules, unknown levels and invalid fixed-source rotation',()=>{
  const empty=E.restore('{bad',data);assert.deepEqual(empty,E.restore(null,data));const board=E.makeBoard(data.flow[0]),turns=board.turns.slice();turns[board.source]=1;
  const restored=E.restore({version:1,flow:{'flow-1':{turns,moves:-5,best:99},unknown:{best:3}},garden:{'garden-2':{best:2}},flowLevel:'__proto__',gardenLevel:'garden-2',rule:{dry:'__proto__',wet:'constructor',strength:99}},data);assert.deepEqual(restored.flow,{});assert.deepEqual(restored.garden,{'garden-2':{best:2}});assert.equal(restored.flowLevel,'flow-1');assert.equal(restored.gardenLevel,'garden-2');assert.deepEqual(restored.rule,E.normalRule());
  const valid=E.restore({version:1,flow:{'flow-1':{turns:board.turns,moves:4,hints:1,best:2}}},data);assert.equal(valid.flow['flow-1'].moves,4);assert.deepEqual(valid.flow['flow-1'].turns,board.turns);
});

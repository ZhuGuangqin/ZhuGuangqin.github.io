/* Original toy models. No physiological parameters or medical predictions. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PrinciplesEngine = factory();
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  const directions = [{bit:1,dr:-1,dc:0,opposite:4},{bit:2,dr:0,dc:1,opposite:8},{bit:4,dr:1,dc:0,opposite:1},{bit:8,dr:0,dc:-1,opposite:2}];
  function rotate(mask, turns) { for (let i=0;i<((turns%4)+4)%4;i++) mask=((mask<<1)&15)|((mask>>3)&1);return mask; }
  function random(seed) { let value=seed>>>0;return function(){value=(Math.imul(1664525,value)+1013904223)>>>0;return value/4294967296;}; }
  function makeBoard(level) {
    const size=level.size,count=size*size,rng=random(level.seed),source=Math.floor(size/2)*size+Math.floor(size/2),masks=Array(count).fill(0),visited=new Set([source]),stack=[source];
    while(stack.length){const at=stack[stack.length-1],row=Math.floor(at/size),col=at%size,options=directions.map(d=>({d,row:row+d.dr,col:col+d.dc})).filter(p=>p.row>=0&&p.row<size&&p.col>=0&&p.col<size&&!visited.has(p.row*size+p.col));if(!options.length){stack.pop();continue;}const p=options[Math.floor(rng()*options.length)],next=p.row*size+p.col;masks[at]|=p.d.bit;masks[next]|=p.d.opposite;visited.add(next);stack.push(next);}
    const turns=masks.map((_,i)=>i===source?0:Math.floor(rng()*4));
    if(inspect({size,source,masks},turns).won){const index=source===0?1:0;turns[index]=1;}
    return {size,source,masks,turns};
  }
  function inspect(board, turns) {
    const {size,source,masks}=board,tiles=masks.map((mask,i)=>rotate(mask,turns[i]||0)),connected=new Set([source]),distance=Array(tiles.length).fill(-1),queue=[source],leaks=[];distance[source]=0;
    tiles.forEach((mask,i)=>directions.forEach(d=>{if(!(mask&d.bit))return;const row=Math.floor(i/size)+d.dr,col=i%size+d.dc;if(row<0||row>=size||col<0||col>=size||!(tiles[row*size+col]&d.opposite))leaks.push({index:i,bit:d.bit});}));
    for(let k=0;k<queue.length;k++){const i=queue[k];directions.forEach(d=>{if(!(tiles[i]&d.bit))return;const row=Math.floor(i/size)+d.dr,col=i%size+d.dc;if(row<0||row>=size||col<0||col>=size)return;const next=row*size+col;if(!(tiles[next]&d.opposite)||connected.has(next))return;connected.add(next);distance[next]=distance[i]+1;queue.push(next);});}
    return {tiles,connected:Array.from(connected),distance,leaks,won:connected.size===tiles.length&&leaks.length===0};
  }
  function flowHint(board,turns) {
    const result=inspect(board,turns),order=result.connected.concat(board.masks.map((_,i)=>i).filter(i=>!result.connected.includes(i)));
    for(const index of order){if(index!==board.source&&rotate(board.masks[index],turns[index])!==board.masks[index])return index;}return null;
  }
  function flowStars(moves,hints,board) { const ideal=board.turns.reduce((sum,t,i)=>sum+(rotate(board.masks[i],t)===board.masks[i]?0:(4-t)%4),0);return hints?1:moves<=ideal+board.size?3:2; }
  const actions={add:1,wait:0,drain:-1};
  function normalRule(rule) {rule=rule||{};return {dry:Object.hasOwn(actions,rule.dry)?rule.dry:'add',ok:Object.hasOwn(actions,rule.ok)?rule.ok:'wait',wet:Object.hasOwn(actions,rule.wet)?rule.wet:'drain',strength:[3,5,8].includes(rule.strength)?rule.strength:5};}
  function gardenStart(level) {return {tick:0,water:level.initial,baseline:level.initial,history:[level.initial],baseHistory:[level.initial],safe:0,rescues:0,spill:0,done:false,lastAction:'wait',lastWeather:0};}
  function gardenStep(level,state,rule,rescue) {
    if(state.done)return state;rule=normalRule(rule);const sensed=state.history[Math.max(0,state.history.length-1-level.delay)],band=sensed<45?'dry':sensed>55?'wet':'ok',action=rule[band],weather=level.weather[state.tick];
    const emergency=['add','drain'].includes(rescue)&&state.rescues<3?actions[rescue]*8:0,raw=state.water+actions[action]*rule.strength+weather+emergency,water=Math.max(0,Math.min(100,raw)),baseline=Math.max(0,Math.min(100,state.baseline+rule.strength+weather)),tick=state.tick+1;
    return {tick,water,baseline,history:state.history.concat(water),baseHistory:state.baseHistory.concat(baseline),safe:state.safe+(water>=35&&water<=65?1:0),rescues:state.rescues+(emergency?1:0),spill:state.spill+Math.max(0,raw-100)+Math.max(0,-raw),done:tick>=level.weather.length,lastAction:action,lastWeather:weather};
  }
  function gardenScore(level,state) {const won=state.done&&state.safe>=level.target,stars=!won?0:state.rescues?1:state.safe>=22?3:2,baseSafe=state.baseHistory.slice(1).filter(x=>x>=35&&x<=65).length;return {won,stars,baseSafe};}
  function simulate(level,rule) {let state=gardenStart(level);while(!state.done)state=gardenStep(level,state,rule);return {...state,...gardenScore(level,state)};}
  function restore(raw,data) {
    let saved;try{saved=typeof raw==='string'?JSON.parse(raw):raw;}catch(e){};const result={version:1,flow:{},garden:{},flowLevel:data.flow[0].id,gardenLevel:data.garden[0].id,rule:normalRule()};
    if(!saved||saved.version!==1)return result;
    ['flow','garden'].forEach(kind=>data[kind].forEach(level=>{const entry=saved[kind]&&saved[kind][level.id];if(!entry||typeof entry!=='object')return;const value={};if(Number.isInteger(entry.best)&&entry.best>=1&&entry.best<=3)value.best=entry.best;if(kind==='flow'){const board=makeBoard(level);if(Array.isArray(entry.turns)&&entry.turns.length===board.masks.length&&entry.turns.every(t=>Number.isInteger(t)&&t>=0&&t<4)&&entry.turns[board.source]===0){value.turns=entry.turns.slice();value.moves=Number.isInteger(entry.moves)&&entry.moves>=0&&entry.moves<=100000?entry.moves:0;value.hints=Number.isInteger(entry.hints)&&entry.hints>=0&&entry.hints<=100000?entry.hints:0;}}if(Object.keys(value).length)result[kind][level.id]=value;}));
    ['flow','garden'].forEach(kind=>{if(data[kind].some(l=>l.id===saved[kind+'Level']))result[kind+'Level']=saved[kind+'Level'];});result.rule=normalRule(saved.rule);return result;
  }
  return {directions,rotate,makeBoard,inspect,flowHint,flowStars,normalRule,gardenStart,gardenStep,gardenScore,simulate,restore};
});

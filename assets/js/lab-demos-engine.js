(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.LabDemosEngine=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const key=([x,y])=>x+','+y, same=(a,b)=>a.length===b.length&&a.every(p=>b.some(q=>key(p)===key(q)));
  const lifeLevels=[
    {zh:'唤醒心跳',en:'Wake a heartbeat',budget:1,seed:[[2,3],[3,3]],hint:[[4,3]],ticks:8,goal:'pulse'},
    {zh:'让种子出发',en:'Send a seed travelling',budget:1,seed:[[2,1],[0,2],[1,2],[2,2]],hint:[[1,0]],ticks:8,goal:'travel'},
    {zh:'双生节律',en:'A shared rhythm',budget:2,seed:[[1,2],[2,2],[3,3],[4,3],[3,4],[4,4]],hint:[[1,1],[2,1]],ticks:8,goal:'pulse'}
  ];
  function lifeTick(cells){const alive=new Set(cells.map(key)),out=[];for(let y=0;y<6;y++)for(let x=0;x<6;x++){let n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(dx||dy)if(alive.has(key([x+dx,y+dy])))n++;if(n===3||(n===2&&alive.has(key([x,y]))))out.push([x,y]);}return out;}
  function lifeGoal(seed,cells,index){const l=lifeLevels[index];if(l.goal==='travel')return same(cells,[[3,2],[4,3],[2,4],[3,4],[4,4]]);const next=lifeTick(seed);return seed.length>=3&&!same(seed,next)&&same(seed,lifeTick(next))&&same(seed,cells);}
  const blocks=[[2,1],[2,2],[2,3],[4,2]],home=[0,4],inside=p=>p[0]>=0&&p[0]<6&&p[1]>=0&&p[1]<5,free=p=>inside(p)&&!blocks.some(q=>key(p)===key(q));
  function route(from,to){const queue=[[from]],seen=new Set([key(from)]);while(queue.length){const path=queue.shift(),p=path[path.length-1];if(key(p)===key(to))return path;for(const d of [[1,0],[0,-1],[-1,0],[0,1]]){const q=[p[0]+d[0],p[1]+d[1]];if(free(q)&&!seen.has(key(q))){seen.add(key(q));queue.push([...path,q]);}}}return [];}
  function robotStart(rules={charge:false,detour:true,return:true}){return {pos:[...home],energy:18,seeds:[[5,3],[4,0]],carrying:false,delivered:0,tick:0,phase:'ready',mode:'seek',charging:false,trail:[[...home]],rules:{...rules}};}
  function robotTick(input){const s={...input,pos:[...input.pos],seeds:input.seeds.map(p=>[...p]),trail:input.trail.map(p=>[...p]),rules:{...input.rules}};if(['won','lost'].includes(s.phase))return s;s.phase='active';s.tick++;
    if(s.energy<=0){s.phase='lost';s.mode='empty';return s;}
    const atHome=key(s.pos)===key(home);if(atHome&&s.carrying&&s.rules.return){s.carrying=false;s.delivered++;s.mode='delivered';if(s.delivered===2)s.phase='won';return s;}
    const homePath=route(s.pos,home);if(s.rules.charge&&s.energy<=homePath.length+1)s.charging=true;
    if(s.charging&&atHome){s.energy=Math.min(18,s.energy+6);s.mode='charge';if(s.energy===18)s.charging=false;return s;}
    const targets=s.seeds.map(p=>({p,path:route(s.pos,p)})).filter(o=>o.path.length).sort((a,b)=>a.path.length-b.path.length);
    const target=s.charging||s.carrying&&s.rules.return?home:targets[0]?.p||home;
    s.mode=s.charging?'home-charge':s.carrying&&s.rules.return?'home-seed':'seek';
    let next;if(s.rules.detour)next=route(s.pos,target)[1];else {const dx=Math.sign(target[0]-s.pos[0]),dy=Math.sign(target[1]-s.pos[1]);next=dx?[s.pos[0]+dx,s.pos[1]]:[s.pos[0],s.pos[1]+dy];}
    if(next&&key(next)!==key(s.pos)){s.energy--;if(free(next)){s.pos=next;s.trail.push([...next]);if(s.trail.length>48)s.trail.shift();}else s.mode='blocked';}
    if(!s.carrying){const i=s.seeds.findIndex(p=>key(p)===key(s.pos));if(i>=0){s.seeds.splice(i,1);s.carrying=true;s.mode='pickup';}}
    if(s.tick>=64||s.energy<=0){s.phase='lost';s.mode=s.energy<=0?'empty':'timeout';}return s;
  }
  const sceneLevels=[{zh:'晴久的小院',en:'After a long dry spell',water:1,light:4},{zh:'雨后的小院',en:'After heavy rain',water:8,light:4},{zh:'闭窗的小院',en:'Behind a closed window',water:4,light:0}];
  function sceneStart(index){return {...sceneLevels[index],moves:0,phase:'ready',last:null};}
  function sceneApply(input,action){if(!['rain','sun','window'].includes(action)||['won','lost'].includes(input.phase))return {...input};const effects={rain:[3,-1],sun:[-3,3],window:[0,4]},e=effects[action],s={...input,water:Math.max(0,Math.min(11,input.water+e[0])),light:Math.max(0,Math.min(8,input.light+e[1])),moves:input.moves+1,phase:'active',last:action};if(s.water>=3&&s.water<=5&&s.light>=3)s.phase='won';else if(s.water===0||s.water===11||s.moves>=3)s.phase='lost';return s;}
  return {lifeLevels,lifeTick,lifeGoal,same,robotStart,robotTick,blocks,home,route,sceneLevels,sceneStart,sceneApply};
});

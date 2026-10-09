/* An original finite lane-defence model, independent of rendering or clocks. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AutonomyEngine=factory();})(typeof window!=='undefined'?window:this,function(){
  'use strict';
  const units={sprout:{cost:40,hp:65},lotus:{cost:60,hp:90},vine:{cost:45,hp:240},nexus:{cost:85,hp:110}};
  const threats={drift:{hp:36,speed:.075,damage:7},gust:{hp:25,speed:.13,damage:5},stone:{hp:105,speed:.045,damage:12}};
  function start(level){return {tick:0,energy:level.energy,life:5,wave:0,phase:'build',plants:[],enemies:[],shots:[],events:[],queue:[],waveTick:0,nextId:1,kills:0,responses:0};}
  function place(state,kind,row,col){if(!Object.hasOwn(units,kind))return false;const spec=units[kind];if(!Number.isInteger(row)||row<0||row>2||!Number.isInteger(col)||col<0||col>4||state.phase==='won'||state.phase==='lost'||state.energy<spec.cost||state.plants.some(p=>p.row===row&&p.col===col))return false;state.energy-=spec.cost;state.plants.push({id:state.nextId++,kind,row,col,hp:spec.hp,maxHp:spec.hp,rank:1,charge:0,cool:0,action:'idle'});return true;}
  function reclaim(state,row,col){if(['won','lost'].includes(state.phase))return false;const index=state.plants.findIndex(p=>p.row===row&&p.col===col);if(index<0)return false;const p=state.plants[index];state.energy=Math.min(400,state.energy+Math.floor((units[p.kind].cost+(p.rank-1)*45)/2));state.plants.splice(index,1);return true;}
  function upgrade(state,row,col){const p=state.plants.find(p=>p.row===row&&p.col===col);if(!p||p.rank>=2||state.energy<45||['won','lost'].includes(state.phase))return false;state.energy-=45;p.rank=2;p.maxHp=Math.round(p.maxHp*1.5);p.hp=p.maxHp;return true;}
  function launch(level,state){if(state.phase!=='build'||state.wave>=level.waves.length)return false;const wave=level.waves[state.wave];state.queue=Array.from({length:wave.count},(_,i)=>({at:2+i*wave.gap,row:(i+state.wave)%3,kind:wave.types[(i+state.wave)%wave.types.length]}));state.wave++;state.waveTick=0;state.phase='wave';state.events=[];return true;}
  function step(level,state){if(state.phase!=='wave')return state;state.tick++;state.waveTick++;state.events=[];if(state.tick%3===0)state.energy=Math.min(400,state.energy+2);
    while(state.queue.length&&state.queue[0].at<=state.waveTick){const e=state.queue.shift(),spec=threats[e.kind];state.enemies.push({id:state.nextId++,kind:e.kind,row:e.row,x:6.15,hp:spec.hp,maxHp:spec.hp,slow:0});}
    function response(p,action){p.action=action;state.responses++;state.events.push({kind:action,row:p.row,col:p.col});}
    for(const p of state.plants){p.action='idle';p.cool=Math.max(0,p.cool-1);const ahead=state.enemies.filter(e=>e.row===p.row&&e.x>p.col+.2&&e.hp>0).sort((a,b)=>a.x-b.x);
      if(p.kind==='sprout'&&state.tick%7===0){state.energy=Math.min(400,state.energy+(p.rank===2?14:9));response(p,'supply');}
      if(p.kind==='lotus'){p.charge=Math.min(3,p.charge+.22);if(ahead.length&&!p.cool){const charge=Math.floor(p.charge);state.shots.push({id:state.nextId++,row:p.row,x:p.col+.5,damage:(p.rank===2?13:8)+charge*4});p.charge=0;p.cool=3;response(p,charge>=2?'burst':'attack');}}
      if(p.kind==='vine'&&!ahead.some(e=>e.x<=p.col+1)&&state.tick%3===0&&p.hp<p.maxHp){p.hp=Math.min(p.maxHp,p.hp+(p.rank===2?8:5));response(p,'regrow');}
      if(p.kind==='nexus'&&!p.cool){const hurt=state.plants.filter(other=>other.id!==p.id&&Math.abs(other.row-p.row)<=1&&other.hp<other.maxHp).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];const cluster=state.enemies.filter(e=>Math.abs(e.row-p.row)<=1&&e.x>p.col+.2&&e.x<p.col+3);if(hurt){hurt.hp=Math.min(hurt.maxHp,hurt.hp+(p.rank===2?26:18));p.cool=5;response(p,'repair');}else if(cluster.length>=2){cluster.forEach(e=>e.slow=6);p.cool=6;response(p,'slow');}}
    }
    for(const shot of state.shots){const next=shot.x+.85;const hit=state.enemies.filter(e=>e.row===shot.row&&e.hp>0&&e.x>=shot.x-.15&&e.x<=next+.2).sort((a,b)=>a.x-b.x)[0];if(hit){hit.hp-=shot.damage;shot.x=8;}else shot.x=next;}state.shots=state.shots.filter(s=>s.x<6.5);
    const dead=state.enemies.filter(e=>e.hp<=0);state.kills+=dead.length;state.energy=Math.min(400,state.energy+dead.length*7);state.enemies=state.enemies.filter(e=>e.hp>0);
    for(const e of state.enemies){const spec=threats[e.kind],next=e.x-spec.speed*(e.slow>0?.45:1);e.slow=Math.max(0,e.slow-1);const obstacle=state.plants.filter(p=>p.row===e.row&&p.hp>0&&p.col+.75>=next&&p.col<e.x).sort((a,b)=>b.col-a.col)[0];if(obstacle){e.x=Math.max(next,obstacle.col+.72);if(state.tick%3===0)obstacle.hp-=spec.damage;}else e.x=next;if(e.x<0){state.life--;state.events.push({kind:'breach',row:e.row});}}
    state.plants=state.plants.filter(p=>p.hp>0);state.enemies=state.enemies.filter(e=>e.x>=0);if(state.life<=0){state.life=0;state.phase='lost';state.shots=[];}else if(!state.queue.length&&!state.enemies.length){state.phase=state.wave===level.waves.length?'won':'build';state.shots=[];}return state;
  }
  function score(state){return state.phase==='won'?(state.life===5?3:state.life>=3?2:1):0;}
  function restore(raw,levels){let value;try{value=typeof raw==='string'?JSON.parse(raw):raw;}catch(e){}const result={version:1,level:levels[0].id,best:{}};if(!value||value.version!==1)return result;if(levels.some(l=>l.id===value.level))result.level=value.level;for(const l of levels)if(Number.isInteger(value.best?.[l.id])&&value.best[l.id]>=1&&value.best[l.id]<=3)result.best[l.id]=value.best[l.id];return result;}
  return {units,threats,start,place,reclaim,upgrade,launch,step,score,restore};
});

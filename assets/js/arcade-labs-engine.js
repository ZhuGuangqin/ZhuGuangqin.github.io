(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ArcadeLabs=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const W=640,H=480,TAU=Math.PI*2;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const profiles={explore:{rank:0,goal:2000,uptakeTime:240,survivorTime:180,lives:4},challenge:{rank:1,goal:3500,uptakeTime:330,survivorTime:240,lives:3},extreme:{rank:2,goal:5500,uptakeTime:420,survivorTime:300,lives:2}};
  const upgradeIds=['ring','tendril','membrane','spore','enzyme','cilia','needle','leaf','root'];
  function random(s){s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;return s.rng/4294967296;}
  function pick(s,list){return list[Math.floor(random(s)*list.length)];}
  function base(kind,seed,difficulty){const key=Object.hasOwn(profiles,difficulty)?difficulty:'challenge';return {kind,seed:seed>>>0,rng:seed>>>0,difficulty:key,rank:profiles[key].rank,phase:'ready',time:0,events:[],score:0};}
  function radius(mass){return Math.sqrt(Math.max(0,mass))*1.6;}
  function event(s,kind,x,y,value){s.events.push({kind,x,y,value});}
  function bounce(b,r,dt){b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.x<r||b.x>W-r){b.x=clamp(b.x,r,W-r);b.vx*=-.8;}if(b.y<r||b.y>H-r){b.y=clamp(b.y,r,H-r);b.vy*=-.8;}}
  const uptakeModes=['race','timed','endless'];
  const uptakeMass=s=>s.player.mass+(s.fragment?.mass||0);
  function worldBounce(s,b,r,dt){
    b.x+=b.vx*dt;b.y+=b.vy*dt;
    if(b.x<r||b.x>s.world.w-r){b.x=clamp(b.x,r,s.world.w-r);b.vx*=-.45;}
    if(b.y<r||b.y>s.world.h-r){b.y=clamp(b.y,r,s.world.h-r);b.vy*=-.45;}
  }
  function newFood(s,id,initial=false){
    let x,y;for(let n=0;n<30;n++){
      x=initial&&id<18?s.player.x+Math.cos(id*2.4)*(75+id*7):35+random(s)*(s.world.w-70);y=initial&&id<18?s.player.y+Math.sin(id*2.4)*(75+id*7):35+random(s)*(s.world.h-70);
      if(distance({x,y},s.player)>(initial?55:100)&&s.motes.every(m=>distance({x,y},m)>radius(m.mass)+18))break;
    }
    const a=random(s)*TAU;return {id,x,y,mass:8+random(s)*16,vx:Math.cos(a)*6,vy:Math.sin(a)*6,rich:random(s)<.12,type:pick(s,[...Array(16).fill('plain'),'shield','haste','magnet','nectar','poison','poison'])};
  }
  function newMote(s,id){
    const mass=(70+random(s)*650)*(1+s.rank*.2+s.time*.004)+s.peak*.18;
    let x,y;for(let n=0;n<25;n++){x=80+random(s)*(s.world.w-160);y=80+random(s)*(s.world.h-160);if(distance({x,y},s.player)>radius(mass)+170)break;}
    return {id,x,y,mass,vx:0,vy:0,role:pick(s,['grazer','hunter','ambusher','sprinter','jester','glutton']),feedClock:0,dashClock:2+random(s)*3,dash:0,heading:random(s)*TAU};
  }
  function uptakeStart(seed=17,difficulty='challenge',mode='timed'){
    const s=Object.assign(base('uptake',seed,difficulty),{world:{w:2400,h:1800},rule:uptakeModes.includes(mode)?mode:'race',limit:0,goal:0,player:{x:320,y:600,vx:0,vy:0,mass:100,hp:100},fragment:null,splitCooldown:0,haste:0,poison:0,powerShield:0,peak:100,deaths:0,respawnAt:0,magnet:0,rivalsEaten:0,eaten:0,tier:0,jetCooldown:0,invincible:0,burstCooldown:0,combo:0,comboClock:0,mode:'grow',foods:[],motes:[],hazards:[],current:{x:0,y:0},weather:'calm',nextWeather:'bloom',weatherAt:18,nextMote:24,feastAt:25,feast:null});
    s.limit=s.rule==='endless'?Infinity:s.rule==='timed'?90+s.rank*60:profiles[s.difficulty].uptakeTime;s.goal=profiles[s.difficulty].goal;
    s.motes=Array.from({length:12+s.rank*3},(_,i)=>newMote(s,i));
    s.foods=Array.from({length:180},(_,i)=>newFood(s,i,true));
    s.hazards=Array.from({length:3+s.rank},(_,i)=>({x:650+random(s)*700,y:150+random(s)*850,r:25+i*3}));
    s.nextWeather=pick(s,['bloom','drift','lean']);return s;
  }
  function uptakeBurst(s){
    if(!['ready','active'].includes(s.phase)||s.burstCooldown>0||s.player.mass<65)return false;
    const p=s.player;p.mass-=16;s.burstCooldown=8;s.invincible=Math.max(s.invincible,.45);
    for(const m of s.motes){const d=distance(p,m)||1;if(d<220){m.vx+=(m.x-p.x)/d*250;m.vy+=(m.y-p.y)/d*250;}}
    for(const f of s.foods)if(distance(p,f)<220){f.vx+=(p.x-f.x)*1.1;f.vy+=(p.y-f.y)*1.1;}
    event(s,'burst',p.x,p.y,220);return true;
  }
  function uptakeSplit(s,input={}){
    if(!['ready','active'].includes(s.phase))return false;
    const p=s.player;
    if(s.fragment){if(s.splitCooldown>0||distance(p,s.fragment)>radius(p.mass)+radius(s.fragment.mass)+60)return false;p.mass+=s.fragment.mass;p.vx=(p.vx+s.fragment.vx)/2;p.vy=(p.vy+s.fragment.vy)/2;s.fragment=null;event(s,'merge',p.x,p.y);return true;}
    if(p.mass<160)return false;let dx=(input.x??p.x+100)-p.x,dy=(input.y??p.y)-p.y;const d=Math.hypot(dx,dy)||1;dx/=d;dy/=d;
    const mass=p.mass*.45;p.mass-=mass;s.fragment={x:p.x+dx*20,y:p.y+dy*20,mass,vx:dx*300,vy:dy*300,hp:100};s.splitCooldown=8;event(s,'split',p.x,p.y);return true;
  }
  function uptakeStep(s,input={},delta=1/60){
    if(['won','lost'].includes(s.phase))return s;
    s.events=[];
    const dt=clamp(delta,0,1/30),p=s.player;s.time+=dt;
    if(s.phase==='respawn'){
      if(s.time>=s.limit){s.phase=s.rule==='timed'?'won':'lost';event(s,'end',p.x,p.y);return s;}
      if(s.time>=s.respawnAt)uptakeRevive(s);else return s;
    }
    s.phase='active';
    for(const key of ['jetCooldown','invincible','burstCooldown','comboClock','splitCooldown','haste','poison','powerShield','magnet'])s[key]=Math.max(0,s[key]-dt);if(!s.comboClock)s.combo=0;
    if(s.time>=s.weatherAt){s.weather=s.nextWeather;s.nextWeather=pick(s,['bloom','drift','lean'].filter(v=>v!==s.weather));s.weatherAt+=22+random(s)*8;event(s,'weather',p.x,p.y,s.weather);}
    const flow=s.weather==='drift'?22+s.rank*5:4+s.rank*2;s.current.x=Math.cos(s.time*.13+s.seed%9)*flow;s.current.y=Math.sin(s.time*.17+s.seed%7)*flow*.7;
    const bodies=[p,...s.fragment?[s.fragment]:[]];
    for(const body of bodies){
      if(input.thrust&&Number.isFinite(input.x)&&Number.isFinite(input.y)){
        const dx=input.x-body.x,dy=input.y-body.y,d=Math.hypot(dx,dy)||1,speed=(210*(s.haste>0?1.65:1)/(1+Math.sqrt(body.mass)/95))*Math.min(1,d/50),ease=1-Math.exp(-13*dt);
        body.vx+=(dx/d*speed-body.vx)*ease;body.vy+=(dy/d*speed-body.vy)*ease;body.mass=Math.max(0,body.mass-(1.2+speed*.007)*dt);
      }else{body.vx*=Math.exp(-1.8*dt);body.vy*=Math.exp(-1.8*dt);}
      body.vx+=s.current.x*dt;body.vy+=s.current.y*dt;worldBounce(s,body,radius(body.mass),dt);body.mass=Math.max(0,body.mass-(s.weather==='lean'?1.6:.35)*dt);
      const reach=radius(body.mass)+5+s.tier*4+(s.magnet>0?65:0);
      for(let i=0;i<s.foods.length;i++){
        const f=s.foods[i],d=distance(body,f);if(d<reach+30&&s.tier){f.x+=(body.x-f.x)*2*dt;f.y+=(body.y-f.y)*2*dt;}
        if(d<reach&&body.mass>f.mass*1.12){const gain=f.mass*(f.rich?1.4:.85)*(s.weather==='bloom'?1.25:1)/(1+uptakeMass(s)/7500);body.mass+=gain;if(f.type==='shield')s.powerShield=6;if(f.type==='haste')s.haste=7;if(f.type==='magnet')s.magnet=8;if(f.type==='nectar')p.hp=Math.min(100,p.hp+30);if(f.type==='poison'){s.poison=7;event(s,'poison',body.x,body.y);}s.eaten++;s.combo=Math.min(12,s.combo+1);s.comboClock=4.5;s.score+=Math.round(gain*(1+s.combo*.1));event(s,'eat',f.x,f.y,gain);s.foods[i]=newFood(s,f.id);}
      }
      for(const h of s.hazards)if(distance(body,h)<radius(body.mass)+h.r&&s.invincible===0&&s.powerShield===0){body.mass*=.86;p.hp-=14;s.invincible=1.1;const d=distance(body,h)||1;body.vx=(body.x-h.x)/d*230;body.vy=(body.y-h.y)/d*230;event(s,'hit',body.x,body.y);}
    }
    if(s.fragment&&s.splitCooldown===0&&distance(p,s.fragment)<radius(p.mass)+radius(s.fragment.mass)+12)uptakeSplit(s);
    if(s.poison>0&&s.powerShield===0){p.mass=Math.max(0,p.mass-4*dt);p.hp-=1.5*dt;}
    if(p.hp<=0){uptakeDie(s);return s;}
    s.mode=p.hp<99&&p.mass>110?'repair':uptakeMass(s)<70?'conserve':'grow';if(s.mode==='repair'){const repair=Math.min(100-p.hp,2*dt);p.hp+=repair;p.mass-=repair*.9;}
    for(const f of s.foods){f.vx*=Math.exp(-.3*dt);f.vy*=Math.exp(-.3*dt);f.vx+=s.current.x*.15*dt;f.vy+=s.current.y*.15*dt;worldBounce(s,f,radius(f.mass),dt);}
    if(s.time>=s.feastAt){const x=100+random(s)*(s.world.w-200),y=100+random(s)*(s.world.h-200);s.feast={x,y,until:s.time+16};s.feastAt+=30+random(s)*10;for(let i=0;i<16;i++){const a=random(s)*TAU,r=25+random(s)*70;s.foods[i]={id:i,x:x+Math.cos(a)*r,y:y+Math.sin(a)*r,mass:24+random(s)*18,vx:0,vy:0,rich:true};}event(s,'feast',x,y);}
    if(s.time>=s.nextMote&&s.motes.length<28){s.motes.push(newMote(s,100+Math.floor(s.time)));s.nextMote+=12;}
    for(let i=s.motes.length-1;i>=0;i--){
      const m=s.motes[i];let target=null;
      const threat=bodies.find(b=>b.mass>m.mass*1.18&&distance(b,m)<300);
      const prey=s.time<6?null:bodies.find(b=>m.mass>b.mass*1.18&&distance(b,m)<(m.role==='hunter'?560:m.role==='ambusher'?260:360));
      m.dashClock=(m.dashClock??3)-dt;m.dash=Math.max(0,(m.dash||0)-dt);
      if(m.role==='sprinter'&&prey&&m.dashClock<=0){m.dash=.8;m.dashClock=3.6;event(s,'rivalDash',m.x,m.y);}
      if(threat)target={x:m.x+(m.x-threat.x)*2,y:m.y+(m.y-threat.y)*2};
      else if(prey)target={x:prey.x+(m.role==='hunter'?prey.vx*.65:0),y:prey.y+(m.role==='hunter'?prey.vy*.65:0)};
      else {m.feedClock-=dt;if(m.feedClock<=0){m.food=s.foods.reduce((best,f)=>!best||distance(m,f)<distance(m,best)?f:best,null);m.feedClock=.35;}target=m.food||{x:m.x+Math.cos(m.heading)*80,y:m.y+Math.sin(m.heading)*80};}
      if(m.role==='jester'&&!threat){target={x:target.x+Math.cos(s.time*4+m.id)*95,y:target.y+Math.sin(s.time*3+m.id)*95};}
      const d=distance(m,target)||1;
      const speed=(m.dash>0?310:prey?182+s.rank*22:threat?185:m.role==='ambusher'?32:90+s.rank*10)/(1+Math.sqrt(m.mass)/150);
      const ease=1-Math.exp(-5*dt);m.vx+=((target.x-m.x)/d*speed-m.vx)*ease;m.vy+=((target.y-m.y)/d*speed-m.vy)*ease;worldBounce(s,m,radius(m.mass),dt);
      for(let j=0;j<s.foods.length;j++)if(distance(m,s.foods[j])<radius(m.mass)){m.mass=Math.min(16000,m.mass+s.foods[j].mass*.85);s.foods[j]=newFood(s,s.foods[j].id);}
      // Predators compete with one another as well as with the player.
      if(m.role==='glutton'||m.role==='hunter')for(let j=i-1;j>=0;j--){const other=s.motes[j];if(m.mass>other.mass*1.25&&distance(m,other)<radius(m.mass)*.65){m.mass=Math.min(16000,m.mass+other.mass*.6);s.motes.splice(j,1);i--;}}
      let consumed=false;for(const b of bodies){if(b.mass<=0)continue;if(distance(b,m)<Math.max(radius(b.mass),radius(m.mass))*.78){
        if(b.mass>m.mass*1.18){b.mass+=m.mass*.7;s.score+=Math.round(m.mass);s.rivalsEaten++;s.motes.splice(i,1);event(s,'eat',m.x,m.y,m.mass);consumed=true;break;}
        if(m.mass>b.mass*1.18&&s.invincible===0&&s.powerShield===0){
          const swallowedMass=uptakeMass(s);m.mass+=b.mass*.7;event(s,'swallowed',b.x,b.y);b.mass=0;
          if(b===s.fragment){s.fragment=null;}
          else if(s.fragment&&s.fragment.mass>0){Object.assign(p,s.fragment);s.fragment=null;s.invincible=1;}
          else {uptakeDie(s,swallowedMass);return s;}
        }
      }}
      if(consumed)continue;
    }
    const total=uptakeMass(s),tier=total>=1800?4:total>=900?3:total>=400?2:total>=180?1:0;s.peak=Math.max(s.peak,total);
    if(tier>s.tier){s.tier=tier;event(s,'evolve',p.x,p.y,tier);}
    if(p.hp<=0||p.mass<30||total<42){uptakeDie(s);}
    else if(s.rule==='race'&&total>=s.goal){s.score+=Math.round((s.limit-s.time)*4+p.hp*2);s.phase='won';event(s,'win',p.x,p.y);}
    else if(s.time>=s.limit){s.phase=s.rule==='timed'?'won':'lost';event(s,s.phase==='won'?'win':'end',p.x,p.y);}return s;
  }
  function uptakeDie(s,mass=uptakeMass(s)){
    s.deaths++;s.deathMass=mass;s.fragment=null;s.combo=0;s.score=Math.max(0,s.score-80);s.respawnAt=s.time+3;s.phase='respawn';
    if(s.time>=s.limit){s.phase=s.rule==='timed'?'won':'lost';}event(s,'death',s.player.x,s.player.y);
  }
  function uptakeRevive(s){
    const mass=clamp((s.deathMass||100)*.25,100,450);let best={x:320,y:600},safety=-1;
    for(let i=0;i<32;i++){const candidate={x:100+random(s)*(s.world.w-200),y:100+random(s)*(s.world.h-200)};const gap=Math.min(...s.motes.map(m=>distance(candidate,m)-radius(m.mass)),...s.hazards.map(h=>distance(candidate,h)-h.r));if(gap>safety){best=candidate;safety=gap;}}
    Object.assign(s.player,best,{vx:0,vy:0,mass,hp:100});s.invincible=3;s.poison=0;s.powerShield=0;s.haste=0;s.tier=mass>=400?2:mass>=180?1:0;s.phase='active';event(s,'revive',best.x,best.y);
  }
  function offerUpgrades(s){const pool=upgradeIds.filter(id=>s.upgrades[id]<3),offers=[];while(pool.length&&offers.length<3)offers.push(pool.splice(Math.floor(random(s)*pool.length),1)[0]);s.offers=offers;return offers;}
  const survivorChapters=[{"zh": "萌生", "en": "Sprout", "hint": "先吃附近养分，慢慢长出第一套本领。", "hint_en": "Gather nearby nutrients and grow your first abilities.", "focus": "slow", "weather": "calm", "pressure": 1, "current": 0}, {"zh": "逐流", "en": "Current", "hint": "捷行者会绕着你走。用急行拉开距离，再回头取养。", "hint_en": "Skirmishers weave around you. Dash away, then return for nutrients.", "focus": "fast", "weather": "drift", "pressure": 1, "current": 12}, {"zh": "厚土", "en": "Heavy ground", "hint": "重甲来得慢，体量却大。先削弱它们，再靠近吞纳。", "hint_en": "Tanks move slowly but carry mass. Weaken them before closing in.", "focus": "tank", "weather": "calm", "pressure": 1.05, "current": 0}, {"zh": "逆风", "en": "Headwind", "hint": "冲锋者先锁定方向。等它亮出路径，向侧面避让。", "hint_en": "Chargers lock their direction first. Sidestep the warning line.", "focus": "charger", "weather": "drift", "pressure": 1.05, "current": -16}, {"zh": "繁茂", "en": "Bloom", "hint": "养分更充足，分裂体也更多。别被身后的碎片包围。", "hint_en": "Food is richer and splitters are common. Watch the fragments behind you.", "focus": "splitter", "weather": "bloom", "pressure": 1.1, "current": 0}, {"zh": "远袭", "en": "Distant fire", "hint": "投射者保持距离。用飞针追击，或借护盾靠近。", "hint_en": "Shooters keep their distance. Use needles or a shield to close in.", "focus": "ranged", "weather": "calm", "pressure": 1.1, "current": 0}, {"zh": "争养", "en": "Competition", "hint": "窃养者会抢走掉落的成长养分。及时收取，守住储备。", "hint_en": "Leeches steal dropped growth. Collect it before they do.", "focus": "leech", "weather": "lean", "pressure": 1.15, "current": 0}, {"zh": "回旋", "en": "Eddies", "hint": "水流会改变方向。顺势取养，也为突然转向留点余地。", "hint_en": "Currents change direction. Follow the food, but leave room to turn.", "focus": "fast", "weather": "drift", "pressure": 1.15, "current": 25}, {"zh": "伏潮", "en": "Hidden tide", "hint": "冲锋与远袭交替出现。看清预警，再决定急行或调息。", "hint_en": "Charges alternate with distant fire. Read the warnings before dashing or resting.", "focus": "charger", "weather": "lean", "pressure": 1.2, "current": -20}, {"zh": "生息", "en": "Regrowth", "hint": "丰富养分里夹着毒性颗粒。护盾和修复可以帮你重新站稳。", "hint_en": "Rich food includes toxic particles. Shields and repair help you recover.", "focus": "splitter", "weather": "bloom", "pressure": 1.2, "current": 0}, {"zh": "交锋", "en": "Convergence", "hint": "各种敌人一起出现。让已成长的结构相互配合。", "hint_en": "Every enemy joins the habitat. Put your grown structures to work together.", "focus": "ranged", "weather": "drift", "pressure": 1.25, "current": 18}, {"zh": "归元", "en": "Renewal", "hint": "这是最后一境。带着一路继承的本领，化解最终首领。", "hint_en": "The final habitat. Bring every inherited ability to the last elite.", "focus": "elite", "weather": "calm", "pressure": 1.3, "current": 0}];
  const survivorRadius=mass=>clamp(14*Math.pow(Math.max(1,mass)/100,.28),10,65);
  function survivorFood(s,id,near=false){const a=random(s)*TAU,d=70+random(s)*210;return {id,x:near?clamp(s.player.x+Math.cos(a)*d,35,s.world.w-35):35+random(s)*(s.world.w-70),y:near?clamp(s.player.y+Math.sin(a)*d,35,s.world.h-35):35+random(s)*(s.world.h-70),mass:6+random(s)*8,type:pick(s,[...Array(12).fill('plain'),'nectar','shield','magnet','haste','poison'])};}
  function survivorEcology(s,dt){
    const p=s.player;for(const key of ['haste','poison','powerShield','magnet','splitCooldown'])s[key]=Math.max(0,s[key]-dt);
    if(s.time>=s.weatherAt){s.weather=pick(s,['calm','bloom','drift','lean'].filter(v=>v!==s.weather));s.weatherAt=s.time+22;event(s,'weather',p.x,p.y,s.weather);}
    if(s.fragment){const f=s.fragment,ease=1-Math.exp(-4*dt);f.vx+=((p.x+60-f.x)*2-f.vx)*ease;f.vy+=((p.y-f.y)*2-f.vy)*ease;worldBounce(s,f,survivorRadius(f.mass),dt);}
    for(const body of [p,...s.fragment?[s.fragment]:[]]){
      const r=survivorRadius(body.mass),reach=r+12+s.upgrades.tendril*12+(s.magnet>0?90:0);
      for(let i=0;i<s.foods.length;i++){const f=s.foods[i],gap=distance(body,f);if(gap<reach){f.x+=(body.x-f.x)*5*dt;f.y+=(body.y-f.y)*5*dt;}
        if(gap<r+5){const value=f.mass*(s.weather==='bloom'?1.4:s.weather==='lean'?.65:1);body.mass+=value;s.xp+=1;p.reserve=Math.min(100,p.reserve+4+s.upgrades.enzyme);s.eaten++;event(s,'eat',f.x,f.y,Math.round(value));
          if(f.type==='shield')s.powerShield=6;if(f.type==='haste')s.haste=6;if(f.type==='magnet')s.magnet=7;if(f.type==='nectar')p.hp=Math.min(p.maxHp,p.hp+20);if(f.type==='poison'&&s.powerShield<=0)s.poison=5;
          s.foods[i]=survivorFood(s,f.id);
        }
      }
    }
    if(s.poison>0&&s.powerShield<=0)p.hp-=3*dt;
    const total=p.mass+(s.fragment?.mass||0);s.peak=Math.max(s.peak,total);const tier=total>=1800?4:total>=850?3:total>=400?2:total>=180?1:0;if(tier>s.tier)event(s,'evolve',p.x,p.y);s.tier=tier;
  }
  function survivorSplit(s){
    if(!['ready','active'].includes(s.phase)||s.splitCooldown>0)return false;const p=s.player;
    if(s.fragment){p.mass+=s.fragment.mass;s.fragment=null;event(s,'merge',p.x,p.y);return true;}
    if(p.mass<220)return false;const mass=p.mass*.4;p.mass-=mass;s.fragment={x:p.x+s.lastDir.x*28,y:p.y+s.lastDir.y*28,mass,vx:s.lastDir.x*260,vy:s.lastDir.y*260};s.splitCooldown=5;event(s,'split',p.x,p.y);return true;
  }
  function survivorDie(s){
    const p=s.player;if(s.fragment){Object.assign(p,{x:s.fragment.x,y:s.fragment.y,mass:s.fragment.mass,hp:Math.max(20,p.hp)});s.fragment=null;s.invincible=1;event(s,'survived',p.x,p.y);return;}
    s.deathMass=p.mass;s.deaths++;s.respawnAt=s.time+3;s.phase='respawn';s.score=Math.max(0,s.score-80);s.player.hp=0;s.guard=0;event(s,'death',p.x,p.y);
  }
  function survivorRevive(s){
    let best={x:320,y:250},gap=-Infinity;for(let i=0;i<24;i++){const candidate={x:100+random(s)*(s.world.w-200),y:100+random(s)*(s.world.h-200)},d=Math.min(999,...s.enemies.map(e=>distance(e,candidate)-e.r));if(d>gap){gap=d;best=candidate;}}
    Object.assign(s.player,best,{vx:0,vy:0,mass:clamp(s.deathMass*.7,100,1600),hp:s.player.maxHp,reserve:75});s.fragment=null;s.poison=0;s.invincible=3;s.powerShield=0;s.phase='active';event(s,'revive',best.x,best.y);
  }
  function survivorStart(seed=23,difficulty='challenge',mode='survive',school='orbit'){
    const s=Object.assign(base('survivor',seed,difficulty),{limit:0,player:{x:320,y:250,hp:100,maxHp:100,reserve:85},enemies:[],pickups:[],nextId:1,spawnClock:1.5,pulseClock:.25,tendrilClock:.5,pulse:0,invincible:0,kills:0,xp:0,level:0,nextXp:8,upgrades:Object.fromEntries(upgradeIds.map(id=>[id,0])),offers:[],mode:'guard',dashCooldown:0,dashTime:0,dashDir:{x:0,y:-1},lastDir:{x:0,y:-1},wave:0,waveAt:14,sector:0,nextSector:0,synergies:[],hazards:[],eliteAt:42,rule:mode==='core'?'core':'survive',school:['orbit','pulse','ranger'].includes(school)?school:'orbit',projectiles:[],enemyShots:[],fields:[],sites:[],siteAt:18,weaponClock:0,leafClock:0,rootClock:0,guard:0,guardClock:0,blocked:0,breath:0,breathCooldown:0,rerolls:2,boon:null,boonTime:0,rewardOffers:[],finalBoss:false,finalCleared:false,chapter:1,chapterCount:survivorChapters.length,chapterStart:0,chapterResults:[],inheritance:[],perkOffers:[],core:{x:320,y:240,hp:150,maxHp:150}});
    s.world={w:2400,h:1800};Object.assign(s.player,{mass:100,vx:0,vy:0});Object.assign(s,{foods:[],fragment:null,splitCooldown:0,haste:0,poison:0,powerShield:0,magnet:0,tier:0,peak:100,deaths:0,eaten:0,swallowed:0,weather:'calm',weatherAt:22});s.foods=Array.from({length:180},(_,i)=>survivorFood(s,i,i<20));
    s.chapterLength=60+s.rank*15;s.limit=s.chapterLength;s.upgrades[s.school==='orbit'?'ring':s.school==='pulse'?'spore':'needle']=1;s.nextSector=Math.floor(random(s)*4);const angle=random(s)*TAU;s.pickups=Array.from({length:4},(_,i)=>({x:320+Math.cos(angle+i*TAU/4)*65,y:250+Math.sin(angle+i*TAU/4)*65,xp:4}));return s;
  }
  function survivorUpgrade(s,id){if(s.phase!=='upgrade'||!s.offers.includes(id)||s.upgrades[id]>=3)return false;s.upgrades[id]++;if(id==='membrane'){s.player.maxHp+=20;s.player.hp=Math.min(s.player.maxHp,s.player.hp+30);}s.level++;s.nextXp+=8+Math.floor(s.level*1.3);s.phase='active';s.offers=[];event(s,'evolve',s.player.x,s.player.y,id);
    const pairs=[['shelter','ring','membrane'],['reach','tendril','spore'],['renew','enzyme','cilia'],['rain','needle','spore'],['forest','leaf','root']];for(const [name,a,b]of pairs)if(s.upgrades[a]>=2&&s.upgrades[b]>=2&&!s.synergies.includes(name)){s.synergies.push(name);event(s,'synergy',s.player.x,s.player.y,name);}return true;}
  function survivorDash(s){if(!['ready','active'].includes(s.phase)||s.dashCooldown>0||s.player.reserve<20)return false;s.player.reserve-=20;s.breath=0;s.dashCooldown=5.5-s.upgrades.cilia*.65;s.dashDir={...s.lastDir};s.dashTime=.23;s.invincible=Math.max(s.invincible,.3);if(s.synergies.includes('renew'))for(const f of s.pickups)if(distance(s.player,f)<150){f.x+=(s.player.x-f.x)*.6;f.y+=(s.player.y-f.y)*.6;}event(s,'dash',s.player.x,s.player.y);return true;}
  function survivorSpawn(s,side,elite=false){side=side===undefined?Math.floor(random(s)*4):side;const v=random(s),roll=random(s),type=elite?'elite':s.chapter>1&&roll<.35&&survivorChapters[s.chapter-1].focus!=='elite'?survivorChapters[s.chapter-1].focus:s.chapter>=3&&roll<.13?'leech':s.chapter>=2&&roll<.25?'ranged':s.chapter>=2&&roll<.38?'splitter':roll<.50?'tank':roll<.67?'charger':roll<.84?'fast':'slow',scale=1+s.rank*.12+(s.chapter-1)*.10;
    const hp=(type==='elite'?230+(s.time-s.chapterStart)*1.7+s.rank*55+(s.chapter-1)*20:type==='tank'?95:type==='charger'?44:type==='fast'?24:28)*scale,mass=(type==='elite'?3.3:type==='tank'?1.8:type==='fast'?.55: .8+random(s)*.7)*s.player.mass+(s.chapter-1)*35,a=side*TAU/4+(v-.5)*1.4,d=(330+random(s)*100)/[1,.8,.62,.46,.34][s.tier];
    return {id:s.nextId++,x:clamp(s.player.x+Math.cos(a)*d,35,s.world.w-35),y:clamp(s.player.y+Math.sin(a)*d,35,s.world.h-35),hp,maxHp:hp,mass,baseMass:mass,r:survivorRadius(mass),speed:(type==='elite'?32:type==='tank'?35:type==='fast'?92:52+Math.min(5,s.chapter)*6),type,personality: type,orbitSign:random(s)<.5?-1:1,castClock:2,chargeClock:1+random(s),chargeState:'follow',target:null};}
  function survivorStep(s,input={},delta=1/60){
    if(['won','lost','upgrade','reward','chapter'].includes(s.phase))return s;const dt=clamp(delta,0,1/30);s.events=[];s.time+=dt;
    if(s.phase==='respawn'){if(s.time>=s.limit+45){s.phase='lost';event(s,'end',s.player.x,s.player.y);return s;}if(s.time>=s.respawnAt)survivorRevive(s);else return s;}
    s.phase='active';const p=s.player;survivorEcology(s,dt);const bodyRadius=survivorRadius(p.mass),unit=bodyRadius/14;let dx=input.x||0,dy=input.y||0;const length=Math.hypot(dx,dy);if(length>1){dx/=length;dy/=length;}if(length>.15)s.lastDir={x:dx/(Math.hypot(dx,dy)||1),y:dy/(Math.hypot(dx,dy)||1)};
    s.dashCooldown=Math.max(0,s.dashCooldown-dt);s.dashTime=Math.max(0,s.dashTime-dt);s.breath=Math.max(0,s.breath-dt);s.breathCooldown=Math.max(0,s.breathCooldown-dt);if(s.breath>0){dx=0;dy=0;p.reserve=clamp(p.reserve+24*dt,0,100);}
    const speed=(165+s.upgrades.cilia*15)*(s.haste>0?1.6:1),move=s.dashTime>0?{x:s.dashDir.x*470,y:s.dashDir.y*470}:{x:dx*speed,y:dy*speed},ease=1-Math.exp(-13*dt);p.vx+=(move.x-p.vx)*ease;p.vy+=(move.y-p.vy)*ease;if(s.breath>0){p.vx=0;p.vy=0;}p.x=clamp(p.x+(p.vx+survivorChapters[s.chapter-1].current*Math.sin((s.time-s.chapterStart)*.2))*dt,bodyRadius,s.world.w-bodyRadius);p.y=clamp(p.y+p.vy*dt,bodyRadius,s.world.h-bodyRadius);s.invincible=Math.max(0,s.invincible-dt);s.pulse=Math.max(0,s.pulse-dt);
    p.reserve=clamp(p.reserve+(length<.15?3.8+s.upgrades.enzyme*.8:-2.4-s.rank*.5)*dt,0,100);s.mode=p.reserve<20?'forage':p.hp<p.maxHp-1&&p.reserve>38?'repair':'guard';if(s.mode==='repair'){const amount=Math.min(p.maxHp-p.hp,(2+s.upgrades.membrane*.8)*dt);p.hp+=amount;p.reserve-=amount*.9;}
    if(s.time>=s.waveAt){s.wave++;s.sector=s.nextSector;s.nextSector=Math.floor(random(s)*4);s.waveAt+=17+random(s)*4;for(let i=0;i<Math.min(12,3+s.rank+s.wave)&&s.enemies.length<64;i++)s.enemies.push(survivorSpawn(s,s.sector));event(s,'wave',p.x,p.y,s.sector);}
    if(s.time>=s.eliteAt){if(s.enemies.length<64)s.enemies.push(survivorSpawn(s,undefined,true));s.eliteAt+=45;event(s,'elite',p.x,p.y);}
    survivorSystems(s,dt);
    s.spawnClock-=dt;if(s.spawnClock<=0&&s.enemies.length<64){s.enemies.push(survivorSpawn(s));s.spawnClock=Math.max(.22,1.15-s.rank*.16-(s.time-s.chapterStart)*.0075)*( .8+random(s)*.4)/survivorChapters[s.chapter-1].pressure;}
    s.pulseClock-=dt;if(s.pulseClock<=0&&p.reserve>=1.5&&s.breath===0){s.pulseClock=(s.mode==='forage'?1.1:.7-s.upgrades.spore*.07)*(s.boon==='focus'?.65:1);s.pulse=.24;p.reserve=Math.max(0,p.reserve-1.5);const reach=(66+s.upgrades.spore*8)*unit,damage=(25+s.upgrades.spore*5)*(p.reserve>=65?1.2:1);for(const e of s.enemies)if(distance(p,e)<reach+e.r)e.hp-=damage;event(s,'pulse',p.x,p.y,reach);}
    s.tendrilClock-=dt;if(s.upgrades.tendril&&s.tendrilClock<=0&&s.breath===0){s.tendrilClock=.6;const targets=s.enemies.filter(e=>distance(p,e)<115+s.upgrades.tendril*20).sort((a,b)=>distance(p,a)-distance(p,b));for(const target of targets.slice(0,s.synergies.includes('reach')?3:1)){target.hp-=12+s.upgrades.tendril*8;event(s,'tendril',p.x,p.y,{x:target.x,y:target.y});}}
    for(const e of s.enemies){const target=s.rule==='core'&&e.id%3===0?s.core:p;const d=distance(target,e)||1;let vx=(target.x-e.x)/d*e.speed,vy=(target.y-e.y)/d*e.speed;
      if(e.type==='fast'){vx+=(target.y-e.y)/d*e.speed*Math.sin(s.time*2+e.id)*.8;vy-=(target.x-e.x)/d*e.speed*Math.sin(s.time*2+e.id)*.8;}
      if(e.type==='leech'){const food=s.pickups.find(f=>!f.chest);if(food){const gap=distance(food,e)||1;vx=(food.x-e.x)/gap*55;vy=(food.y-e.y)/gap*55;if(gap<18){e.hp+=food.xp*7;p.reserve=Math.max(0,p.reserve-5);s.pickups.splice(s.pickups.indexOf(food),1);event(s,'stolen',e.x,e.y);}}}
      if(e.type==='tank'&&s.guard>0&&d<130){vx*=1.35;vy*=1.35;}
      if(e.type==='ranged'){if(d<190){vx*= -.6;vy*= -.6;}else if(d<270){vx=(p.y-e.y)/d*e.speed*(e.orbitSign||1);vy=-(p.x-e.x)/d*e.speed*(e.orbitSign||1);}e.castClock-=dt;if(e.castClock<=0&&s.enemyShots.length<55){const dist=distance(p,e)||1;s.enemyShots.push({x:e.x,y:e.y,vx:(p.x-e.x)/dist*120,vy:(p.y-e.y)/dist*120,life:5});e.castClock=2.8;}}
      for(const f of s.fields)if(distance(e,f)<f.r){e.hp-=f.damage*dt;vx*=.45;vy*=.45;}
      if(s.rule==='core'&&distance(e,s.core)<e.r+20){s.core.hp-=7*dt;e.hp-=8*dt;}
      if(e.type==='charger'){e.chargeClock-=dt;if(e.chargeClock<=0){if(e.chargeState==='follow'){e.chargeState='warn';e.chargeClock=.9;e.target={x:(p.x-e.x)/d,y:(p.y-e.y)/d};}else if(e.chargeState==='warn'){e.chargeState='rush';e.chargeClock=.65;}else{e.chargeState='follow';e.chargeClock=2.2;}}
        if(e.chargeState==='warn'){vx=0;vy=0;}else if(e.chargeState==='rush'){vx=e.target.x*210;vy=e.target.y*210;}}
      if(e.type==='elite'){e.castClock-=dt;if(e.castClock<=0){if(s.hazards.length<8)s.hazards.push({x:p.x,y:p.y,r:40+s.rank*5,fuse:1.1,life:1.3,hit:false});e.castClock=3.8-s.rank*.3;}}
      e.x=clamp(e.x+vx*dt,-25,s.world.w+25);e.y=clamp(e.y+vy*dt,-25,s.world.h+25);
      if(e.baseMass){e.mass=e.baseMass*(.4+.6*clamp(e.hp/e.maxHp,0,1));e.r=survivorRadius(e.mass);}
      if(e.mass&&e.hp>0){for(const body of [p,...s.fragment?[s.fragment]:[]]){const br=survivorRadius(body.mass),gap=distance(body,e);
          if(body.mass>e.mass*1.2&&gap<br+e.r*.25){e.hp=0;s.swallowed++;body.mass+=e.mass*.45;event(s,'swallow',e.x,e.y);break;}
          if(e.mass>body.mass*1.2&&gap<e.r+br*.25&&s.invincible===0&&s.powerShield<=0){if(s.guard>0&&p.reserve>=12){survivorHarm(s,0);s.invincible=.8;e.x+=Math.sign(e.x-p.x||1)*(e.r+br);event(s,'shield',p.x,p.y);}else if(body===s.fragment){s.fragment=null;event(s,'fragment-lost',e.x,e.y);}else{survivorDie(s);if(s.phase==='respawn')return s;}break;}
        }}
      if(s.upgrades.ring&&s.breath===0){const count=s.synergies.includes('shelter')?4:3;for(let i=0;i<count;i++){const angle=s.time*2.4+i*TAU/count,orb={x:p.x+Math.cos(angle)*(46+s.upgrades.ring*5)*unit,y:p.y+Math.sin(angle)*(46+s.upgrades.ring*5)*unit};if(distance(e,orb)<e.r+9)e.hp-=75*dt*s.upgrades.ring;}}
      if(distance(p,e)<e.r+bodyRadius&&s.invincible===0&&s.powerShield<=0&&e.hp>0){survivorHarm(s,(e.type==='elite'?34:e.type==='tank'?28:19+s.rank*2)/(1+s.upgrades.membrane*.3));p.reserve=Math.max(0,p.reserve-7);s.invincible=.65;event(s,'hit',p.x,p.y);}}
    for(const h of s.hazards){h.fuse-=dt;h.life-=dt;if(h.fuse<=0&&!h.hit){h.hit=true;if(distance(p,h)<h.r+12&&s.invincible===0){survivorHarm(s,32/(1+s.upgrades.membrane*.3));p.reserve=Math.max(0,p.reserve-15);s.invincible=.65;event(s,'hit',p.x,p.y);}}}s.hazards=s.hazards.filter(h=>h.life>0);
    for(let i=s.enemies.length-1;i>=0;i--){const e=s.enemies[i];if(e.hp<=0){s.kills++;s.score+=e.type==='elite'?200:e.type==='tank'?45:15;if(s.pickups.length>=220){const oldest=s.pickups.findIndex(f=>!f.chest);if(oldest>=0)s.pickups.splice(oldest,1);}s.pickups.push({x:e.x,y:e.y,xp:e.type==='elite'?20:e.type==='tank'?7:3,chest:e.type==='elite'});if(e.final)s.finalCleared=true;if(e.type==='splitter'&&s.enemies.length<62)for(let j=0;j<2;j++){const child=survivorSpawn(s,0);child.type='fast';child.hp=22;child.speed=75;child.x=e.x+(j?14:-14);child.y=e.y;s.enemies.push(child);}s.enemies.splice(i,1);event(s,'clear',e.x,e.y);}}
    const reach=24+s.upgrades.tendril*23+(s.mode==='forage'?30:0)+(s.boon==='magnet'?180:0);for(let i=s.pickups.length-1;i>=0;i--){const f=s.pickups[i],d=distance(p,f);if(d<reach+20){f.x+=(p.x-f.x)*7*dt;f.y+=(p.y-f.y)*7*dt;}if(d<18){s.xp+=f.xp;p.mass+=f.xp*6;p.reserve=Math.min(100,p.reserve+7+s.upgrades.enzyme*3);s.pickups.splice(i,1);event(s,'eat',f.x,f.y,f.xp);if(f.chest){s.phase='reward';s.rewardOffers=['renewal','harvest','purge'];event(s,'reward',p.x,p.y);}}}
    if(s.rule==='core'&&s.core.hp<=0){s.phase='lost';event(s,'end',p.x,p.y);}else if(p.hp<=0){survivorDie(s);}else if(s.time>=s.limit&&s.finalCleared){
      s.chapterResults.push({chapter:s.chapter,kills:s.kills,level:s.level,hp:Math.ceil(p.hp)});s.score+=Math.round(p.hp*2+s.level*35);
      if(s.chapter>=s.chapterCount){s.phase='won';event(s,'win',p.x,p.y);}else{s.phase='chapter';s.perkOffers=['vitality','reserve','insight'];event(s,'chapter',p.x,p.y);}
    }else if(s.time>=s.limit+45){s.phase='lost';event(s,'end',p.x,p.y);}else if(s.phase!=='reward'&&s.xp>=s.nextXp&&s.level<26){if(offerUpgrades(s).length){s.phase='upgrade';event(s,'upgrade',p.x,p.y);}}return s;
  }
  function survivorHarm(s,amount){
    if(s.guard>0&&s.player.reserve>=12){s.guard--;s.player.reserve-=12;s.blocked++;amount*=.28;event(s,'shield',s.player.x,s.player.y);}
    if(s.boon==='ward')amount*=.5;s.player.hp-=amount;
  }
  function survivorBreath(s){
    if(s.phase!=='active'||s.breathCooldown>0)return false;s.breath=1.6;s.breathCooldown=18;event(s,'breath',s.player.x,s.player.y);return true;
  }
  function survivorReroll(s){if(s.phase!=='upgrade'||s.rerolls<=0)return false;s.rerolls--;offerUpgrades(s);return true;}
  function survivorReward(s,id){
    if(s.phase!=='reward'||!s.rewardOffers.includes(id))return false;
    if(id==='renewal'){s.player.hp=Math.min(s.player.maxHp,s.player.hp+65);s.player.reserve=Math.min(100,s.player.reserve+45);s.core.hp=Math.min(150,s.core.hp+35);}
    if(id==='harvest'){for(const f of s.pickups){s.xp+=f.xp;s.player.reserve=Math.min(100,s.player.reserve+3);}s.pickups=[];s.boon='focus';s.boonTime=18;}
    if(id==='purge'){for(const e of s.enemies)e.hp-=140;s.enemyShots=[];s.hazards=[];s.guard=3;}
    s.phase='active';s.rewardOffers=[];event(s,'rewarded',s.player.x,s.player.y,id);return true;
  }
  function survivorSystems(s,dt){
    const p=s.player;
    if(p.reserve>=65){s.guardClock+=dt;if(s.guardClock>=7&&s.guard<3){s.guard++;s.guardClock=0;event(s,'guard',p.x,p.y);}}else s.guardClock=0;
    s.boonTime=Math.max(0,s.boonTime-dt);if(!s.boonTime)s.boon=null;
    if(s.time>=s.siteAt){s.siteAt+=23+random(s)*8;if(s.sites.length<3)s.sites.push({x:clamp(p.x+(random(s)-.5)*400,40,s.world.w-40),y:clamp(p.y+(random(s)-.5)*400,40,s.world.h-40),type:pick(s,['nectar','ward','focus']),life:20});}
    for(const site of s.sites){site.life-=dt;if(distance(p,site)<28){site.life=0;if(site.type==='nectar'){p.reserve=Math.min(100,p.reserve+45);p.hp=Math.min(p.maxHp,p.hp+18);}else{s.boon=site.type;s.boonTime=14;}event(s,'site',site.x,site.y,site.type);}}
    s.sites=s.sites.filter(f=>f.life>0);s.weaponClock-=dt;s.leafClock-=dt;s.rootClock-=dt;
    if(!s.breath&&s.upgrades.needle&&s.weaponClock<=0){
      const target=s.enemies.reduce((best,e)=>!best||distance(p,e)<distance(p,best)?e:best,null);if(target){const a=Math.atan2(target.y-p.y,target.x-p.x),count=s.synergies.includes('rain')?5:s.upgrades.needle;
        for(let i=0;i<count&&s.projectiles.length<80;i++){const angle=a+(i-(count-1)/2)*.14;s.projectiles.push({x:p.x,y:p.y,vx:Math.cos(angle)*340,vy:Math.sin(angle)*340,life:1.6,damage:24+s.upgrades.needle*9,pierce:s.upgrades.needle>=3?2:1,hit:[]});}s.weaponClock=.65-(s.boon==='focus'?.2:0);}
    }
    if(!s.breath&&s.upgrades.leaf&&s.leafClock<=0){s.leafClock=1.2;for(let i=0;i<s.upgrades.leaf;i++){const a=s.time+i*TAU/s.upgrades.leaf;s.projectiles.push({x:p.x,y:p.y,vx:Math.cos(a)*170,vy:Math.sin(a)*170,life:2,age:0,leaf:true,damage:32,pierce:8,hit:[]});}}
    if(!s.breath&&s.upgrades.root&&s.rootClock<=0){s.rootClock=2.6;s.fields.push({x:p.x,y:p.y,r:35+s.upgrades.root*8,damage:(s.synergies.includes('forest')?38:22)+s.upgrades.root*5,life:3.8});}
    for(const b of s.projectiles){b.life-=dt;if(b.leaf){b.age+=dt;const a=Math.atan2(p.y-b.y,p.x-b.x);if(b.age>.8){b.vx+=Math.cos(a)*500*dt;b.vy+=Math.sin(a)*500*dt;}}b.x+=b.vx*dt;b.y+=b.vy*dt;
      for(const e of s.enemies)if(!b.hit.includes(e.id)&&distance(b,e)<e.r+5){e.hp-=b.damage;b.hit.push(e.id);b.pierce--;if(b.pierce<=0){b.life=0;break;}event(s,'strike',e.x,e.y);}}
    s.projectiles=s.projectiles.filter(b=>b.life>0&&b.x>-50&&b.x<s.world.w+50&&b.y>-50&&b.y<s.world.h+50).slice(-80);
    for(const b of s.enemyShots){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(distance(p,b)<survivorRadius(p.mass)+4&&s.invincible===0&&s.powerShield<=0){survivorHarm(s,18);s.invincible=.6;b.life=0;event(s,'hit',p.x,p.y);}}
    s.enemyShots=s.enemyShots.filter(b=>b.life>0);for(const f of s.fields)f.life-=dt;s.fields=s.fields.filter(f=>f.life>0).slice(-12);
    if(!s.finalBoss&&s.time>=s.limit-16){const boss=survivorSpawn(s,undefined,true);boss.final=true;boss.hp*=1.05+s.chapter*.16;if(s.enemies.length>=64)s.enemies.pop();s.enemies.push(boss);s.finalBoss=true;event(s,'boss',p.x,p.y);}
  }
  function survivorContinue(s,perk){
    if(s.phase!=='chapter'||!s.perkOffers.includes(perk))return false;
    s.inheritance.push(perk);
    if(perk==='vitality'){s.player.maxHp+=15;s.player.hp+=30;}
    if(perk==='reserve'){s.player.reserve=100;s.guard=3;}
    if(perk==='insight'){s.xp+=s.nextXp; s.rerolls++;}
    s.player.hp=Math.min(s.player.maxHp,s.player.hp+s.player.maxHp*.22);s.player.reserve=Math.min(100,s.player.reserve+30);
    s.chapter++;s.weather=survivorChapters[s.chapter-1].weather;s.weatherAt=s.time+22;s.chapterStart=s.time;s.limit=s.time+s.chapterLength+Math.min(20,(s.chapter-1)*3);s.eliteAt=s.time+28;s.waveAt=s.time+10;s.siteAt=s.time+8;
    s.enemies=[];s.enemyShots=[];s.hazards=[];s.projectiles=[];s.fields=[];s.pickups=[];s.sites=[];s.foods=Array.from({length:180},(_,i)=>survivorFood(s,i,i<20));s.finalBoss=false;s.finalCleared=false;s.breathCooldown=0;s.dashCooldown=0;s.spawnClock=1;s.perkOffers=[];s.invincible=2;s.phase='active';s.core.hp=Math.min(150,s.core.hp+50);event(s,'inherit',s.player.x,s.player.y,s.chapter);return true;
  }
  // The table uses planar contact physics plus a separate height coordinate for ramps.
  const pinballBumpers=[{id:0,x:230,y:145,r:27},{id:1,x:410,y:145,r:27},{id:2,x:320,y:225,r:31}];
  const pinballWalls=[{x:85,y:50,bx:85,by:325},{x:555,y:50,bx:555,by:455},{x:85,y:50,bx:555,by:50},{x:85,y:325,bx:204,by:410},{x:535,y:325,bx:436,by:410},{x:85,y:325,bx:140,by:470},{x:535,y:325,bx:480,by:470}];
  const pinballUpgrades=[
    ['force','锐击','Sharp strike','每次直接撞击伤害 +5。','+5 direct impact damage.','M7 33L30 10M20 8H32V20',3],
    ['heavy','厚载球','Heavy ball','球更大；伤害 +7，重力 +8%。','Larger ball; +7 damage, +8% gravity.','M20 5A15 15 0 1 0 20 35A15 15 0 1 0 20 5M12 20H28M20 12V28',2],
    ['feather','轻灵球','Feather ball','重力降低14%，回弹更强。','14% less gravity; stronger rebounds.','M8 32Q2 8 33 5Q35 26 8 32ZM8 32L26 12',2],
    ['chain','连锁印','Conduction','命中向邻近目标传导45%伤害；可叠加。','Hits conduct 45% damage to a neighbour; stacks.','M5 12H15V28H25V12H35M5 8V16M35 8V16',3],
    ['blast','震荡印','Shockwave','击破目标时，震伤附近目标。','Destroyed targets damage nearby targets.','M20 4V11M20 29V36M4 20H11M29 20H36M9 9L14 14M26 26L31 31M9 31L14 26M26 14L31 9',3],
    ['ember','灼痕印','Afterburn','命中留下3秒灼痕，持续削减血量。','Hits burn targets for 3 seconds.','M20 4C30 16 12 17 26 27C29 35 11 38 8 27C4 17 16 13 20 4Z',3],
    ['split','双生印','Twin echo','每6次直接命中添一颗球，最多三球。','Every 6 direct hits adds a ball, up to three.','M13 10A10 10 0 1 0 13 30A10 10 0 1 0 13 10M27 10A10 10 0 1 0 27 30A10 10 0 1 0 27 10',2],
    ['recall','返照印','Second chance','每层多一次自动救球，不消耗球权。','One extra automatic ball rescue per floor.','M8 20A12 12 0 1 1 12 30M8 20V8M8 20H20',2],
    ['bloom','生息印','Renewal','每击破3个目标，恢复一次球权。','Restore a life every 3 destroyed targets.','M20 35V15M20 22Q4 24 5 8Q20 6 20 22M20 18Q36 20 35 4Q20 3 20 18',2],
    ['rewind','回溯印','Recall charge','每层增加一次回溯救球；不倒退得分。','One extra trajectory recall per floor; score stays.','M18 8L5 20L18 32ZM35 8L22 20L35 32Z',2],
    ['longarm','延臂印','Long reach','左右挡板各加长10，提高救球范围。','Extend both flippers by 10.','M4 30L17 18M36 30L23 18M13 18H17V22M23 22V18H27',2],
    ['echo','回流印','Return pegs','击破遗址变回流机关：反弹、得分。','Broken targets become upward-return scoring pegs.','M8 32V20Q8 6 20 6Q32 6 32 20M26 14L32 20L38 14',2]
  ];
  const pinballFloors=[
    {zh:'初鸣',en:'First note',trait:'calm',nodes:[[225,150,'plain'],[415,150,'plain'],[320,250,'volatile']]},
    {zh:'交织',en:'Cross-talk',trait:'crosswind',nodes:[[215,135,'armour'],[425,135,'plain'],[250,255,'volatile'],[400,255,'nourish']]},
    {zh:'潮汐枢核',en:'Tidal core',trait:'tide',nodes:[[230,135,'volatile'],[410,135,'nourish'],[320,245,'tidal']]},
    {zh:'疾雨回廊',en:'Quickening',trait:'quick',nodes:[[205,120,'plain'],[320,155,'armour'],[435,120,'volatile'],[240,270,'nourish'],[410,270,'plain']]},
    {zh:'归环枢核',en:'Linked core',trait:'linked',nodes:[[230,120,'armour'],[410,120,'volatile'],[220,270,'nourish'],[420,270,'plain'],[320,200,'core']]},
    {zh:'脉冲阵列',en:'Pulse array',trait:'pulse',nodes:[[220,130,'plain'],[420,130,'armour'],[270,225,'volatile'],[390,280,'nourish']]},
    {zh:'双潮之间',en:'Twin tides',trait:'tide',nodes:[[220,130,'tidal'],[420,130,'tidal'],[230,275,'volatile'],[420,275,'nourish']]},
    {zh:'回旋廊',en:'Orbit gallery',trait:'orbit',nodes:[[320,120,'armour'],[215,195,'volatile'],[425,195,'nourish'],[320,290,'plain']]},
    {zh:'瀑落阶梯',en:'Cascade',trait:'cascade',nodes:[[230,115,'volatile'],[400,160,'armour'],[240,220,'nourish'],[420,280,'plain']]},
    {zh:'风中星阵',en:'Wind constellation',trait:'crosswind',nodes:[[210,115,'plain'],[435,115,'armour'],[320,200,'tidal'],[215,285,'volatile'],[430,285,'nourish']]},
    {zh:'双环共振',en:'Coupled rings',trait:'pulse',nodes:[[235,120,'volatile'],[410,120,'nourish'],[210,260,'armour'],[430,260,'plain'],[320,200,'core']]},
    {zh:'万象回响',en:'All echoes',trait:'linked',nodes:[[220,115,'armour'],[425,115,'volatile'],[215,280,'nourish'],[430,280,'tidal'],[320,200,'core']]}
  ];
  function pinballFloor(s,floor){
    const plan=pinballFloors[floor-1];s.floor=floor;s.trait=plan.trait;s.floorBreaks=0;s.midDrafted=false;s.rerolls=1;s.history=[];s.historyAt=s.time;s.rewindCharges=1+(s.upgrades.rewind||0);s.rescues=s.upgrades.recall||0;s.drainRefund=false;
    s.bumpers=plan.nodes.map(([x,y,type],id)=>{const boss=['tidal','core'].includes(type),hp=Math.round((boss?62+floor*12:12+floor*7)*(1+s.rank*.16));return {id,x:x+(random(s)-.5)*8,y:y+(random(s)-.5)*8,homeX:x,homeY:y,r:boss?34:25,type,hp,maxHp:hp,lit:0,burn:0,burnClock:0,pegLock:0};});
    s.targets=s.bumpers.map(()=>false);s.balls=[];s.launchReady=true;s.ballSave=0;s.combo=0;s.comboClock=0;s.multiplier=1;s.flippers={left:0,right:0};s.nudgeCooldown=0;s.tiltLock=0;s.tilt=0;
  }
  function pinballOffers(s){
    const pool=pinballUpgrades.filter(([id,,,,,,max])=>(s.upgrades[id]||0)<max).map(([id])=>id),offers=[];
    while(offers.length<3&&pool.length)offers.push(pool.splice(Math.floor(random(s)*pool.length),1)[0]);return offers;
  }
  function pinballChoose(s,id){
    if(s.rule!=='expedition'||s.phase!=='draft'||!s.offers.includes(id))return false;
    const perk=pinballUpgrades.find(p=>p[0]===id);if(!perk||(s.upgrades[id]||0)>=perk[6])return false;
    s.upgrades[id]=(s.upgrades[id]||0)+1;s.build.push(id);s.events=[];
    if(id==='recall')s.rescues++;if(id==='rewind')s.rewindCharges++;
    if(s.draftReason==='floor')pinballFloor(s,s.floor+1);
    for(const b of s.balls)b.r=9+(s.upgrades.heavy||0)*1.5;
    s.offers=[];s.phase=s.balls.length?'active':'ready';event(s,'imprint',320,240,id);return true;
  }
  function pinballReroll(s){if(s.phase!=='draft'||s.rerolls<=0||s.draftReason==='start')return false;s.rerolls--;s.offers=pinballOffers(s);return true;}
  function pinballRewind(s){
    if(s.rule!=='expedition'||!['active','ready'].includes(s.phase)||!s.rewindCharges||!s.history.length)return false;
    const old=s.history.find(h=>h.at>=s.time-2.2)||s.history[0];if(s.time-old.at<.45||!old.balls.length)return false;
    s.balls=old.balls.map(b=>({...b,lock:.35}));s.launchReady=false;s.rewindCharges--;s.ballSave=Math.max(s.ballSave,1);s.phase='active';
    if(s.drainRefund){s.lives=Math.min(6,s.lives+1);s.drainRefund=false;}
    s.history=[];s.historyAt=s.time;event(s,'rewind',320,240);return true;
  }
  function pinballShielded(s,target){return target.type==='core'&&s.bumpers.some(b=>b!==target&&b.hp>0);}
  function pinballDamage(s,target,amount,origin,kind='damage'){
    if(target.hp<=0||amount<=0)return;
    if(pinballShielded(s,target)){if(kind==='damage')event(s,'shield',target.x,target.y);return;}
    const damage=Math.min(target.hp,Math.max(1,Math.round(amount)));target.hp-=damage;event(s,kind,target.x,target.y,damage);
    if(target.hp>0)return;
    s.destroyed++;s.floorBreaks++;s.score+=200*s.floor;s.targets[target.id]=true;event(s,'break',target.x,target.y,target.id);
    if(target.type==='nourish'){s.ballSave=Math.max(s.ballSave,4);event(s,'nourish',target.x,target.y);}
    if(s.upgrades.bloom&&s.destroyed%Math.max(2,4-s.upgrades.bloom)===0){s.lives=Math.min(6,s.lives+1);event(s,'life',target.x,target.y);}
    const power=target.type==='volatile'?14:0,blast=(s.upgrades.blast||0)*9;
    if(power||blast){event(s,'shock',target.x,target.y,150);for(const other of s.bumpers)if(other!==target&&other.hp>0&&distance(target,other)<150)pinballDamage(s,other,power+blast,target,'chain');}
  }
  function pinballImpact(s,target,b){
    const damage=(8+(s.upgrades.force||0)*5+(s.upgrades.heavy||0)*7)*(1+Math.min(12,s.combo)*.055),armour=target.type==='armour'?.68:1;
    pinballDamage(s,target,damage*armour,b);
    if(target.hp>0&&s.upgrades.ember){target.burn=3;target.burnClock=0;}
    if(s.upgrades.chain){const next=s.bumpers.filter(t=>t!==target&&t.hp>0&&distance(t,target)<240).sort((a,b)=>distance(a,target)-distance(b,target))[0];if(next){pinballDamage(s,next,damage*.45*s.upgrades.chain,target,'chain');s.events[s.events.length-1].from={x:target.x,y:target.y};}}
    if(s.upgrades.split&&s.hits%Math.max(4,8-s.upgrades.split*2)===0&&s.balls.length<3){s.balls.push({id:s.nextBall++,x:b.x,y:b.y-18,z:28,vx:-b.vx*.7||100,vy:-130,vz:80,r:9+(s.upgrades.heavy||0)*1.5,lock:.6});s.multi++;event(s,'multiball',b.x,b.y);}
  }
  function pinballProgress(s){
    if(s.bumpers.every(b=>b.hp<=0)){
      s.tablesCleared++;s.score+=700*s.floor;s.balls=[];s.history=[];s.launchReady=false;event(s,'table-clear',320,200,s.floor);
      if(s.floor===pinballFloors.length){s.phase='won';event(s,'win',320,200);}else{s.lives=Math.min(6,s.lives+1);s.phase='draft';s.draftReason='floor';s.offers=pinballOffers(s);}return;
    }
    if(!s.midDrafted&&s.floorBreaks>=Math.ceil(s.bumpers.length/2)){s.midDrafted=true;s.phase='draft';s.draftReason='mid';s.offers=pinballOffers(s);event(s,'draft',320,240);}
  }
  function pinballStart(seed=31,difficulty='challenge',mode='missions'){
    const s=Object.assign(base('pinball',seed,difficulty),{rule:['expedition','missions','classic','timed'].includes(mode)?mode:'expedition',limit:mode==='timed'?120:Infinity,balls:[],lives:3,launchReady:true,launchCharge:0,flippers:{left:0,right:0},bumpers:pinballBumpers.map(b=>({...b,lit:0})),targets:[false,false,false],mission:0,missionsGoal:3,combo:0,comboClock:0,multiplier:1,multi:0,nextBall:1,nudgeCooldown:0,tilt:0,tiltLock:0,drains:0,hits:0,ramps:0,ballSave:0,hitMemory:{},trails:[],lastAward:0,upgrades:{},build:[],floor:1,tablesCleared:0,destroyed:0,offers:[],rerolls:1,rewindCharges:0,history:[],historyAt:0});
    s.lives=s.rule==='expedition'?5-s.rank:s.rank===2?2:3;s.missionsGoal=3+s.rank;s.goal=6000+s.rank*6000;s.bumpers.forEach(b=>b.y+=Math.floor(random(s)*14)-7);
    if(s.rule==='expedition'){pinballFloor(s,1);s.phase='draft';s.draftReason='start';s.offers=['force','heavy','feather'];}return s;
  }
  function pinballLaunch(s,charge=.7){
    if(!['ready','active'].includes(s.phase)||!s.launchReady||s.lives<=0)return false;
    s.balls.push({id:s.nextBall++,x:540,y:435,z:0,launchRail:true,vx:0,vy:-490-clamp(charge,0,1)*150,vz:0,r:9+(s.upgrades.heavy||0)*1.5,lock:0});
    s.launchReady=false;s.ballSave=5;s.phase='active';s.drainRefund=false;event(s,'launch',523,435);return true;
  }
  function pinballNudge(s,direction=0){
    if(s.phase!=='active'||!s.balls.length||s.nudgeCooldown>0||s.tiltLock>0)return false;
    s.nudgeCooldown=.65;s.tilt+=.9;
    if(s.tilt>2.4){s.tiltLock=3;s.tilt=0;event(s,'tilt',320,240);return false;}
    for(const b of s.balls){const target=s.rule==='expedition'?s.bumpers.filter(t=>t.hp>0).sort((a,c)=>distance(a,b)-distance(c,b))[0]:null,steer=direction||(target?clamp((target.x-b.x)/180,-1,1):0);b.vx+=steer*100;b.vy-=110;}event(s,'nudge',320,240);return true;
  }
  function flipperSegment(s,side){const left=side==='left',amount=s.flippers[side],angle=left?.32-amount*.95:Math.PI-.32+amount*.95;const x=left?222:418,y=402,len=82+(s.upgrades.longarm||0)*10;return {x,y,bx:x+Math.cos(angle)*len,by:y+Math.sin(angle)*len,angle};}
  function contactSegment(b,wall,restitution=.78){
    const dx=wall.bx-wall.x,dy=wall.by-wall.y,t=clamp(((b.x-wall.x)*dx+(b.y-wall.y)*dy)/(dx*dx+dy*dy),0,1),x=wall.x+dx*t,y=wall.y+dy*t;
    let nx=b.x-x,ny=b.y-y;const d=Math.hypot(nx,ny),r=b.r+(wall.thick||0);if(d>=r)return false;
    if(d<.001){nx=-dy;ny=dx;}const len=Math.hypot(nx,ny)||1;nx/=len;ny/=len;b.x=x+nx*(r+.1);b.y=y+ny*(r+.1);const v=b.vx*nx+b.vy*ny;if(v<0){b.vx-=(1+restitution)*v*nx;b.vy-=(1+restitution)*v*ny;}return {x,y,nx,ny};
  }
  function pinballAward(s,b,value,kind){
    s.combo=s.comboClock>0?s.combo+1:1;s.comboClock=s.trait==='quick'?2:3;s.multiplier=Math.min(8,1+Math.floor(s.combo/4));const points=value*s.multiplier;s.score+=points;s.hits++;s.lastAward=points;event(s,kind,b.x,b.y,points);
  }
  function pinballStep(s,input={},delta=1/60){
    if(['won','lost','draft'].includes(s.phase))return s;s.events=[];const dt=clamp(delta,0,1/30);s.phase='active';s.time+=dt;
    const expedition=s.rule==='expedition';
    for(const key of ['comboClock','nudgeCooldown','tiltLock','ballSave'])s[key]=Math.max(0,s[key]-dt);s.tilt=Math.max(0,s.tilt-dt*.35);if(!s.comboClock){s.combo=0;s.multiplier=1;}
    for(const side of ['left','right']){const target=input[side]&&s.tiltLock===0?1:0;s.flippers[side]+=(target-s.flippers[side])*(1-Math.exp(-32*dt));}
    for(const b of s.bumpers){b.lit=Math.max(0,b.lit-dt);b.pegLock=Math.max(0,(b.pegLock||0)-dt);
      if(b.type==='tidal'&&b.hp>0)b.x=b.homeX+Math.sin(s.time*1.15)*25;
      if(expedition&&b.burn>0&&b.hp>0){b.burn=Math.max(0,b.burn-dt);b.burnClock+=dt;if(b.burnClock>=.5){b.burnClock-=.5;pinballDamage(s,b,(s.upgrades.ember||0)*2,b,'burn');}}
    }
    const sub=dt/4;
    for(let tick=0;tick<4;tick++)for(const b of s.balls){
      const gravity=(240+s.rank*26)*Math.pow(.86,s.upgrades.feather||0)*(1+(s.upgrades.heavy||0)*.08)*(s.trait==='tide'?1+Math.sin(s.time*1.3)*.25:s.trait==='pulse'?1+Math.max(0,Math.sin(s.time*2))*.3:s.trait==='cascade'?1.18:1);
      b.lock=Math.max(0,b.lock-sub);b.vy+=gravity*sub;if(s.trait==='crosswind'||s.trait==='orbit')b.vx+=Math.sin(s.time*(s.trait==='orbit'?1.7:.8))*(s.trait==='orbit'?75:55)*sub;b.vx*=Math.exp(-.045*sub);b.x+=b.vx*sub;b.y+=b.vy*sub;
      if(b.z>0||b.vz>0){b.vz-=520*sub;b.z+=b.vz*sub;if(b.z<=0){b.z=0;b.vz=0;event(s,'land',b.x,b.y);}}
      const speed=Math.hypot(b.vx,b.vy);if(speed>780){b.vx*=780/speed;b.vy*=780/speed;}
      if(b.launchRail&&b.y<100){b.launchRail=false;b.vx=-180;}
      for(const wall of pinballWalls)if(!(b.launchRail&&wall.x===535))contactSegment(b,wall);
      // Upper arcs and side slings make the return trajectory change on every contact.
      if(b.y<72&&b.x<130){b.vx=Math.abs(b.vx)+70;}if(b.y<72&&b.x>510)b.vx=-Math.abs(b.vx)-70;
      if(b.z<24){
        for(const bumper of s.bumpers){
          if(expedition&&bumper.hp<=0){if(s.upgrades.echo&&!bumper.pegLock&&distance(b,bumper)<bumper.r+b.r){b.vy=-290-s.upgrades.echo*35;bumper.pegLock=.65;s.score+=35*s.multiplier;event(s,'return',bumper.x,bumper.y);}continue;}
          const d=distance(b,bumper),r=bumper.r+b.r;if(d<r){const nx=(b.x-bumper.x)/(d||1),ny=(b.y-bumper.y)/(d||1);b.x=bumper.x+nx*(r+.5);b.y=bumper.y+ny*(r+.5);b.vx=nx*(360+s.rank*25)*(1+(s.upgrades.feather||0)*.08)*(s.trait==='cascade'?1.12:1);b.vy=ny*(360+s.rank*25)*(1+(s.upgrades.feather||0)*.08)*(s.trait==='cascade'?1.12:1);if(!b.lock){bumper.lit=.2;if(!expedition)s.targets[bumper.id]=true;pinballAward(s,b,120,'bumper');if(expedition)pinballImpact(s,bumper,b);b.lock=.12;}}
        }
        for(const side of ['left','right']){const segment=flipperSegment(s,side),hit=contactSegment(b,{...segment,thick:7},.7);if(hit&&input[side]&&s.tiltLock===0){b.vy=-400-Math.abs((b.x-segment.x)/82)*150;b.vx=(side==='left'?1:-1)*(100+Math.abs(b.x-segment.x)*5.5);if(!b.lock){event(s,'flip',b.x,b.y);b.lock=.08;}}}
        // A ramp is a real elevated flight; high balls clear the central bumpers.
        if(b.x>105&&b.x<165&&b.y<240&&b.y>180&&b.vy<0&&b.lock===0){b.x=145;b.vx=230;b.vy=-150;b.vz=225;b.z=2;b.lock=.6;s.ramps++;pinballAward(s,b,400,'ramp');
          if(expedition){event(s,'shock',320,200,230);for(const target of s.bumpers)pinballDamage(s,target,8+(s.upgrades.force||0)*3,b,'chain');}
          else if(s.targets.every(Boolean)){s.mission++;s.targets.fill(false);s.score+=800;event(s,'mission',320,150,s.mission);if(s.balls.length<3){for(let j=0;j<2&&s.balls.length<3;j++)s.balls.push({id:s.nextBall++,x:270+j*100,y:100,z:35,vx:j?130:-130,vy:70,vz:70,r:9,lock:.6});s.multi++;event(s,'multiball',320,150);}}
        }
      }
      if(b.x<60){b.x=60;b.vx=Math.abs(b.vx);}if(b.x>575){b.x=575;b.vx=-Math.abs(b.vx);}if(b.y<40){b.y=40;b.vy=Math.abs(b.vy);}
    }
    for(let i=s.balls.length-1;i>=0;i--)if(s.balls[i].y>490){const b=s.balls[i];s.balls.splice(i,1);s.drains++;event(s,'drain',b.x,470);}
    if(expedition){pinballProgress(s);if(['draft','won'].includes(s.phase))return s;
      if(s.balls.length&&s.time>=s.historyAt+.08){s.history.push({at:s.time,balls:s.balls.map(b=>({...b}))});s.history=s.history.filter(h=>s.time-h.at<4);s.historyAt=s.time;}
    }
    if(!s.balls.length&&!s.launchReady){if(s.ballSave>0||s.rescues>0){const remaining=s.ballSave;if(!remaining)s.rescues--;s.launchReady=true;pinballLaunch(s,.6);s.ballSave=remaining;event(s,'save',523,435);}else{if(s.rule!=='timed')s.lives--;s.launchReady=s.rule==='timed'||s.lives>0;if(expedition)s.drainRefund=true;}}
    if(s.rule==='missions'&&s.mission>=s.missionsGoal){s.phase='won';event(s,'win',320,240);}
    else if(s.time>=s.limit){s.phase='won';event(s,'win',320,240);}
    else if(s.lives<=0){s.phase=s.rule==='classic'&&s.score>=s.goal?'won':'lost';event(s,'end',320,240);}
    return s;
  }
  return {W,H,TAU,profiles,upgradeIds,clamp,distance,radius,uptakeStart,uptakeStep,uptakeBurst,uptakeSplit,uptakeMass,uptakeModes,survivorChapters,survivorStart,survivorStep,survivorUpgrade,survivorDash,survivorBreath,survivorReroll,survivorReward,survivorContinue,survivorSpawn,survivorRadius,survivorSplit,pinballStart,pinballStep,pinballLaunch,pinballNudge,pinballChoose,pinballReroll,pinballRewind,pinballShielded,pinballUpgrades,pinballFloors,pinballBumpers,pinballWalls,flipperSegment,contactSegment};
});

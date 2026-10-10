(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ArcadeLabs=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const W=640,H=480,TAU=Math.PI*2;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const profiles={explore:{rank:0,goal:2000,uptakeTime:240,survivorTime:180,gates:16,lives:4,speed:82},challenge:{rank:1,goal:3500,uptakeTime:330,survivorTime:240,gates:24,lives:3,speed:98},extreme:{rank:2,goal:5500,uptakeTime:420,survivorTime:300,gates:32,lives:2,speed:112}};
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
      x=35+random(s)*(s.world.w-70);y=35+random(s)*(s.world.h-70);
      if(distance({x,y},s.player)>(initial?55:100)&&s.motes.every(m=>distance({x,y},m)>radius(m.mass)+18))break;
    }
    const a=random(s)*TAU;return {id,x,y,mass:8+random(s)*16,vx:Math.cos(a)*6,vy:Math.sin(a)*6,rich:random(s)<.12,type:pick(s,[...Array(16).fill('plain'),'shield','haste','poison','poison'])};
  }
  function newMote(s,id){
    const mass=(75+random(s)*780)*(1+s.rank*.15+s.time*.002);
    let x,y;for(let n=0;n<25;n++){x=80+random(s)*(s.world.w-160);y=80+random(s)*(s.world.h-160);if(distance({x,y},s.player)>radius(mass)+170)break;}
    return {id,x,y,mass,vx:0,vy:0,role:pick(s,['grazer','hunter','shy','sprinter','jester']),feedClock:0,heading:random(s)*TAU};
  }
  function uptakeStart(seed=17,difficulty='challenge',mode='race'){
    const s=Object.assign(base('uptake',seed,difficulty),{world:{w:1600,h:1200},rule:uptakeModes.includes(mode)?mode:'race',limit:0,goal:0,player:{x:320,y:600,vx:0,vy:0,mass:100,hp:100},fragment:null,splitCooldown:0,haste:0,poison:0,powerShield:0,peak:100,rivalsEaten:0,eaten:0,tier:0,jetCooldown:0,invincible:0,burstCooldown:0,combo:0,comboClock:0,mode:'grow',foods:[],motes:[],hazards:[],current:{x:0,y:0},weather:'calm',nextWeather:'bloom',weatherAt:18,nextMote:24,feastAt:25,feast:null});
    s.limit=s.rule==='endless'?Infinity:s.rule==='timed'?90+s.rank*60:profiles[s.difficulty].uptakeTime;s.goal=profiles[s.difficulty].goal;
    s.motes=Array.from({length:12+s.rank*3},(_,i)=>newMote(s,i));
    s.foods=Array.from({length:100},(_,i)=>newFood(s,i,true));
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
    s.events=[];if(s.player.hp<=0){s.phase='lost';event(s,'end',s.player.x,s.player.y);return s;}
    const dt=clamp(delta,0,1/30),p=s.player;s.phase='active';s.time+=dt;
    for(const key of ['jetCooldown','invincible','burstCooldown','comboClock','splitCooldown','haste','poison','powerShield'])s[key]=Math.max(0,s[key]-dt);if(!s.comboClock)s.combo=0;
    if(s.time>=s.weatherAt){s.weather=s.nextWeather;s.nextWeather=pick(s,['bloom','drift','lean'].filter(v=>v!==s.weather));s.weatherAt+=22+random(s)*8;event(s,'weather',p.x,p.y,s.weather);}
    const flow=s.weather==='drift'?22+s.rank*5:4+s.rank*2;s.current.x=Math.cos(s.time*.13+s.seed%9)*flow;s.current.y=Math.sin(s.time*.17+s.seed%7)*flow*.7;
    const bodies=[p,...s.fragment?[s.fragment]:[]];
    for(const body of bodies){
      if(input.thrust&&Number.isFinite(input.x)&&Number.isFinite(input.y)){
        const dx=input.x-body.x,dy=input.y-body.y,d=Math.hypot(dx,dy)||1,speed=(210*(s.haste>0?1.65:1)/(1+Math.sqrt(body.mass)/95))*Math.min(1,d/50),ease=1-Math.exp(-8.5*dt);
        body.vx+=(dx/d*speed-body.vx)*ease;body.vy+=(dy/d*speed-body.vy)*ease;body.mass=Math.max(0,body.mass-(1.2+speed*.007)*dt);
      }else{body.vx*=Math.exp(-1.8*dt);body.vy*=Math.exp(-1.8*dt);}
      body.vx+=s.current.x*dt;body.vy+=s.current.y*dt;worldBounce(s,body,radius(body.mass),dt);body.mass=Math.max(0,body.mass-(s.weather==='lean'?1.6:.35)*dt);
      const reach=radius(body.mass)+5+s.tier*4;
      for(let i=0;i<s.foods.length;i++){
        const f=s.foods[i],d=distance(body,f);if(d<reach+30&&s.tier){f.x+=(body.x-f.x)*2*dt;f.y+=(body.y-f.y)*2*dt;}
        if(d<reach&&body.mass>f.mass*1.12){const gain=f.mass*(f.rich?1.4:.85)*(s.weather==='bloom'?1.25:1)/(1+uptakeMass(s)/7500);body.mass+=gain;if(f.type==='shield')s.powerShield=6;if(f.type==='haste')s.haste=7;if(f.type==='poison'){s.poison=7;event(s,'poison',body.x,body.y);}s.eaten++;s.combo=Math.min(12,s.combo+1);s.comboClock=4.5;s.score+=Math.round(gain*(1+s.combo*.1));event(s,'eat',f.x,f.y,gain);s.foods[i]=newFood(s,f.id);}
      }
      for(const h of s.hazards)if(distance(body,h)<radius(body.mass)+h.r&&s.invincible===0&&s.powerShield===0){body.mass*=.86;p.hp-=14;s.invincible=1.1;const d=distance(body,h)||1;body.vx=(body.x-h.x)/d*230;body.vy=(body.y-h.y)/d*230;event(s,'hit',body.x,body.y);}
    }
    if(s.fragment&&s.splitCooldown===0&&distance(p,s.fragment)<radius(p.mass)+radius(s.fragment.mass)+12)uptakeSplit(s);
    if(s.poison>0&&s.powerShield===0){p.mass=Math.max(0,p.mass-4*dt);p.hp-=1.5*dt;}
    s.mode=p.hp<99&&p.mass>110?'repair':uptakeMass(s)<70?'conserve':'grow';if(s.mode==='repair'){const repair=Math.min(100-p.hp,2*dt);p.hp+=repair;p.mass-=repair*.9;}
    for(const f of s.foods){f.vx*=Math.exp(-.3*dt);f.vy*=Math.exp(-.3*dt);f.vx+=s.current.x*.15*dt;f.vy+=s.current.y*.15*dt;worldBounce(s,f,radius(f.mass),dt);}
    if(s.time>=s.feastAt){const x=100+random(s)*(s.world.w-200),y=100+random(s)*(s.world.h-200);s.feast={x,y,until:s.time+16};s.feastAt+=30+random(s)*10;for(let i=0;i<16;i++){const a=random(s)*TAU,r=25+random(s)*70;s.foods[i]={id:i,x:x+Math.cos(a)*r,y:y+Math.sin(a)*r,mass:24+random(s)*18,vx:0,vy:0,rich:true};}event(s,'feast',x,y);}
    if(s.time>=s.nextMote&&s.motes.length<22){s.motes.push(newMote(s,100+Math.floor(s.time)));s.nextMote+=16;}
    for(let i=s.motes.length-1;i>=0;i--){
      const m=s.motes[i];let target=null;const threat=bodies.find(b=>b.mass>m.mass*1.18&&distance(b,m)<230),prey=s.time<7?null:bodies.find(b=>m.mass>b.mass*1.15&&distance(b,m)<(m.role==='hunter'?400:m.role==='shy'?100:220));
      if(threat)target={x:m.x+(m.x-threat.x),y:m.y+(m.y-threat.y)};else if(prey)target=prey;else{m.feedClock-=dt;if(m.feedClock<=0){m.food=s.foods.reduce((best,f)=>!best||distance(m,f)<distance(m,best)?f:best,null);m.feedClock=.4;}target=m.food||{x:m.x+Math.cos(m.heading)*80,y:m.y+Math.sin(m.heading)*80};}
      if(m.role==='jester'&&!prey&&!threat)target={x:m.x+Math.cos(s.time*3+m.id)*90,y:m.y+Math.sin(s.time*3+m.id)*90};
      const d=distance(m,target)||1,speed=(m.role==='sprinter'&&Math.sin(s.time*2+m.id)>.65?245:prey?105+s.rank*12:threat?115:55)/(1+Math.sqrt(m.mass)/120),ease=1-Math.exp(-2.2*dt);m.vx+=((target.x-m.x)/d*speed-m.vx)*ease;m.vy+=((target.y-m.y)/d*speed-m.vy)*ease;worldBounce(s,m,radius(m.mass),dt);
      for(let j=0;j<s.foods.length;j++)if(distance(m,s.foods[j])<radius(m.mass)){m.mass=Math.min(7000,m.mass+s.foods[j].mass*.65);s.foods[j]=newFood(s,s.foods[j].id);}
      let consumed=false;for(const b of bodies)if(distance(b,m)<Math.max(radius(b.mass),radius(m.mass))*.86){
        if(b.mass>m.mass*1.18){b.mass+=m.mass*.7;s.score+=Math.round(m.mass);s.rivalsEaten++;s.motes.splice(i,1);event(s,'eat',m.x,m.y,m.mass);consumed=true;break;}
        if(m.mass>b.mass*1.18&&s.invincible===0&&s.powerShield===0){const loss=b.mass*.18;b.mass-=loss;m.mass+=loss*.6;p.hp-=25+s.rank*4;s.combo=0;s.invincible=1.2;const d=distance(b,m)||1;b.vx=(b.x-m.x)/d*240;b.vy=(b.y-m.y)/d*240;event(s,'hit',b.x,b.y);}
      }
      if(consumed)continue;
    }
    const total=uptakeMass(s),tier=total>=1800?4:total>=900?3:total>=400?2:total>=180?1:0;s.peak=Math.max(s.peak,total);
    if(tier>s.tier){s.tier=tier;event(s,'evolve',p.x,p.y,tier);}
    if(p.hp<=0||p.mass<30||total<42){s.phase='lost';event(s,'end',p.x,p.y);}
    else if(s.rule==='race'&&total>=s.goal){s.score+=Math.round((s.limit-s.time)*4+p.hp*2);s.phase='won';event(s,'win',p.x,p.y);}
    else if(s.time>=s.limit){s.phase=s.rule==='timed'?'won':'lost';event(s,s.phase==='won'?'win':'end',p.x,p.y);}return s;
  }
  function offerUpgrades(s){const pool=upgradeIds.filter(id=>s.upgrades[id]<3),offers=[];while(pool.length&&offers.length<3)offers.push(pool.splice(Math.floor(random(s)*pool.length),1)[0]);s.offers=offers;return offers;}
  function survivorStart(seed=23,difficulty='challenge',mode='survive',school='orbit'){
    const s=Object.assign(base('survivor',seed,difficulty),{limit:0,player:{x:320,y:250,hp:100,maxHp:100,reserve:85},enemies:[],pickups:[],nextId:1,spawnClock:1.5,pulseClock:.25,tendrilClock:.5,pulse:0,invincible:0,kills:0,xp:0,level:0,nextXp:8,upgrades:Object.fromEntries(upgradeIds.map(id=>[id,0])),offers:[],mode:'guard',dashCooldown:0,dashTime:0,dashDir:{x:0,y:-1},lastDir:{x:0,y:-1},wave:0,waveAt:14,sector:0,nextSector:0,synergies:[],hazards:[],eliteAt:42,rule:mode==='core'?'core':'survive',school:['orbit','pulse','ranger'].includes(school)?school:'orbit',projectiles:[],enemyShots:[],fields:[],sites:[],siteAt:18,weaponClock:0,leafClock:0,rootClock:0,guard:0,guardClock:0,blocked:0,breath:0,breathCooldown:0,rerolls:2,boon:null,boonTime:0,rewardOffers:[],finalBoss:false,finalCleared:false,core:{x:320,y:240,hp:150,maxHp:150}});
    s.limit=profiles[s.difficulty].survivorTime;s.upgrades[s.school==='orbit'?'ring':s.school==='pulse'?'spore':'needle']=1;s.nextSector=Math.floor(random(s)*4);const angle=random(s)*TAU;s.pickups=Array.from({length:4},(_,i)=>({x:320+Math.cos(angle+i*TAU/4)*65,y:250+Math.sin(angle+i*TAU/4)*65,xp:4}));return s;
  }
  function survivorUpgrade(s,id){if(s.phase!=='upgrade'||!s.offers.includes(id)||s.upgrades[id]>=3)return false;s.upgrades[id]++;if(id==='membrane'){s.player.maxHp+=20;s.player.hp=Math.min(s.player.maxHp,s.player.hp+30);}s.level++;s.nextXp+=8+Math.floor(s.level*1.3);s.phase='active';s.offers=[];event(s,'evolve',s.player.x,s.player.y,id);
    const pairs=[['shelter','ring','membrane'],['reach','tendril','spore'],['renew','enzyme','cilia'],['rain','needle','spore'],['forest','leaf','root']];for(const [name,a,b]of pairs)if(s.upgrades[a]>=2&&s.upgrades[b]>=2&&!s.synergies.includes(name)){s.synergies.push(name);event(s,'synergy',s.player.x,s.player.y,name);}return true;}
  function survivorDash(s){if(!['ready','active'].includes(s.phase)||s.dashCooldown>0||s.player.reserve<20)return false;s.player.reserve-=20;s.breath=0;s.dashCooldown=5.5-s.upgrades.cilia*.65;s.dashDir={...s.lastDir};s.dashTime=.23;s.invincible=Math.max(s.invincible,.3);if(s.synergies.includes('renew'))for(const f of s.pickups)if(distance(s.player,f)<150){f.x+=(s.player.x-f.x)*.6;f.y+=(s.player.y-f.y)*.6;}event(s,'dash',s.player.x,s.player.y);return true;}
  function survivorSpawn(s,side,elite=false){side=side===undefined?Math.floor(random(s)*4):side;const v=random(s),roll=random(s),type=elite?'elite':s.time>50&&roll<.12?'ranged':s.time>70&&roll<.24?'splitter':s.time>30&&roll<.18?'tank':s.time>18&&roll<.42?'charger':s.time>10&&roll<.7?'fast':'slow',scale=1+s.rank*.12+s.time*.003;
    return {id:s.nextId++,x:side===0?-22:side===1?W+22:30+v*(W-60),y:side===2?-22:side===3?H+22:30+v*(H-60),hp:(type==='elite'?230+s.time*1.7+s.rank*55:type==='tank'?95:type==='charger'?44:type==='fast'?24:28)*scale,r:type==='elite'?25:type==='tank'?18:type==='fast'?8:12,speed:type==='elite'?24:type==='tank'?23:type==='fast'?64:32+s.time*.15,type,castClock:2,chargeClock:1+random(s),chargeState:'follow',target:null};}
  function survivorStep(s,input={},delta=1/60){
    if(['won','lost','upgrade','reward'].includes(s.phase))return s;const dt=clamp(delta,0,1/30);s.phase='active';s.events=[];s.time+=dt;const p=s.player;let dx=input.x||0,dy=input.y||0;const length=Math.hypot(dx,dy);if(length>1){dx/=length;dy/=length;}if(length>.15)s.lastDir={x:dx/(Math.hypot(dx,dy)||1),y:dy/(Math.hypot(dx,dy)||1)};
    s.dashCooldown=Math.max(0,s.dashCooldown-dt);s.dashTime=Math.max(0,s.dashTime-dt);s.breath=Math.max(0,s.breath-dt);s.breathCooldown=Math.max(0,s.breathCooldown-dt);if(s.breath>0){dx=0;dy=0;p.reserve=clamp(p.reserve+24*dt,0,100);}
    const move=s.dashTime>0?{x:s.dashDir.x*470,y:s.dashDir.y*470}:{x:dx*(145+s.upgrades.cilia*13),y:dy*(145+s.upgrades.cilia*13)};p.x=clamp(p.x+move.x*dt,16,W-16);p.y=clamp(p.y+move.y*dt,16,H-16);s.invincible=Math.max(0,s.invincible-dt);s.pulse=Math.max(0,s.pulse-dt);
    p.reserve=clamp(p.reserve+(length<.15?3.8+s.upgrades.enzyme*.8:-2.4-s.rank*.5)*dt,0,100);s.mode=p.reserve<20?'forage':p.hp<p.maxHp-1&&p.reserve>38?'repair':'guard';if(s.mode==='repair'){const amount=Math.min(p.maxHp-p.hp,(2+s.upgrades.membrane*.8)*dt);p.hp+=amount;p.reserve-=amount*.9;}
    if(s.time>=s.waveAt){s.wave++;s.sector=s.nextSector;s.nextSector=Math.floor(random(s)*4);s.waveAt+=17+random(s)*4;for(let i=0;i<Math.min(12,3+s.rank+s.wave)&&s.enemies.length<64;i++)s.enemies.push(survivorSpawn(s,s.sector));event(s,'wave',p.x,p.y,s.sector);}
    if(s.time>=s.eliteAt){if(s.enemies.length<64)s.enemies.push(survivorSpawn(s,undefined,true));s.eliteAt+=45;event(s,'elite',p.x,p.y);}
    survivorSystems(s,dt);
    s.spawnClock-=dt;if(s.spawnClock<=0&&s.enemies.length<64){s.enemies.push(survivorSpawn(s));s.spawnClock=Math.max(.22,1.15-s.rank*.16-s.time*.0075)*( .8+random(s)*.4);}
    s.pulseClock-=dt;if(s.pulseClock<=0&&p.reserve>=1.5&&s.breath===0){s.pulseClock=(s.mode==='forage'?1.1:.7-s.upgrades.spore*.07)*(s.boon==='focus'?.65:1);s.pulse=.24;p.reserve=Math.max(0,p.reserve-1.5);const reach=66+s.upgrades.spore*8,damage=(25+s.upgrades.spore*5)*(p.reserve>=65?1.2:1);for(const e of s.enemies)if(distance(p,e)<reach+e.r)e.hp-=damage;event(s,'pulse',p.x,p.y,reach);}
    s.tendrilClock-=dt;if(s.upgrades.tendril&&s.tendrilClock<=0&&s.breath===0){s.tendrilClock=.6;const targets=s.enemies.filter(e=>distance(p,e)<115+s.upgrades.tendril*20).sort((a,b)=>distance(p,a)-distance(p,b));for(const target of targets.slice(0,s.synergies.includes('reach')?3:1)){target.hp-=12+s.upgrades.tendril*8;event(s,'tendril',p.x,p.y,{x:target.x,y:target.y});}}
    for(const e of s.enemies){const target=s.rule==='core'&&e.id%3===0?s.core:p;const d=distance(target,e)||1;let vx=(target.x-e.x)/d*e.speed,vy=(target.y-e.y)/d*e.speed;
      if(e.type==='ranged'){if(d<220){vx*= -.25;vy*= -.25;}e.castClock-=dt;if(e.castClock<=0&&s.enemyShots.length<55){const dist=distance(p,e)||1;s.enemyShots.push({x:e.x,y:e.y,vx:(p.x-e.x)/dist*120,vy:(p.y-e.y)/dist*120,life:5});e.castClock=2.8;}}
      for(const f of s.fields)if(distance(e,f)<f.r){e.hp-=f.damage*dt;vx*=.45;vy*=.45;}
      if(s.rule==='core'&&distance(e,s.core)<e.r+20){s.core.hp-=7*dt;e.hp-=8*dt;}
      if(e.type==='charger'){e.chargeClock-=dt;if(e.chargeClock<=0){if(e.chargeState==='follow'){e.chargeState='warn';e.chargeClock=.9;e.target={x:(p.x-e.x)/d,y:(p.y-e.y)/d};}else if(e.chargeState==='warn'){e.chargeState='rush';e.chargeClock=.65;}else{e.chargeState='follow';e.chargeClock=2.2;}}
        if(e.chargeState==='warn'){vx=0;vy=0;}else if(e.chargeState==='rush'){vx=e.target.x*210;vy=e.target.y*210;}}
      if(e.type==='elite'){e.castClock-=dt;if(e.castClock<=0){if(s.hazards.length<8)s.hazards.push({x:p.x,y:p.y,r:40+s.rank*5,fuse:1.1,life:1.3,hit:false});e.castClock=3.8-s.rank*.3;}}
      e.x=clamp(e.x+vx*dt,-25,W+25);e.y=clamp(e.y+vy*dt,-25,H+25);
      if(s.upgrades.ring&&s.breath===0){const count=s.synergies.includes('shelter')?4:3;for(let i=0;i<count;i++){const angle=s.time*2.4+i*TAU/count,orb={x:p.x+Math.cos(angle)*(46+s.upgrades.ring*5),y:p.y+Math.sin(angle)*(46+s.upgrades.ring*5)};if(distance(e,orb)<e.r+9)e.hp-=75*dt*s.upgrades.ring;}}
      if(distance(p,e)<e.r+13&&s.invincible===0&&e.hp>0){survivorHarm(s,(e.type==='elite'?34:e.type==='tank'?28:19+s.rank*2)/(1+s.upgrades.membrane*.3));p.reserve=Math.max(0,p.reserve-7);s.invincible=.65;event(s,'hit',p.x,p.y);}}
    for(const h of s.hazards){h.fuse-=dt;h.life-=dt;if(h.fuse<=0&&!h.hit){h.hit=true;if(distance(p,h)<h.r+12&&s.invincible===0){survivorHarm(s,32/(1+s.upgrades.membrane*.3));p.reserve=Math.max(0,p.reserve-15);s.invincible=.65;event(s,'hit',p.x,p.y);}}}s.hazards=s.hazards.filter(h=>h.life>0);
    for(let i=s.enemies.length-1;i>=0;i--){const e=s.enemies[i];if(e.hp<=0){s.kills++;s.score+=e.type==='elite'?200:e.type==='tank'?45:15;if(s.pickups.length>=220){const oldest=s.pickups.findIndex(f=>!f.chest);if(oldest>=0)s.pickups.splice(oldest,1);}s.pickups.push({x:e.x,y:e.y,xp:e.type==='elite'?20:e.type==='tank'?7:3,chest:e.type==='elite'});if(e.final)s.finalCleared=true;if(e.type==='splitter'&&s.enemies.length<62)for(let j=0;j<2;j++){const child=survivorSpawn(s,0);child.type='fast';child.hp=22;child.speed=75;child.x=e.x+(j?14:-14);child.y=e.y;s.enemies.push(child);}s.enemies.splice(i,1);event(s,'clear',e.x,e.y);}}
    const reach=24+s.upgrades.tendril*23+(s.mode==='forage'?30:0)+(s.boon==='magnet'?180:0);for(let i=s.pickups.length-1;i>=0;i--){const f=s.pickups[i],d=distance(p,f);if(d<reach+20){f.x+=(p.x-f.x)*7*dt;f.y+=(p.y-f.y)*7*dt;}if(d<18){s.xp+=f.xp;p.reserve=Math.min(100,p.reserve+7+s.upgrades.enzyme*3);s.pickups.splice(i,1);event(s,'eat',f.x,f.y,f.xp);if(f.chest){s.phase='reward';s.rewardOffers=['renewal','harvest','purge'];event(s,'reward',p.x,p.y);}}}
    if(p.hp<=0||(s.rule==='core'&&s.core.hp<=0)){s.phase='lost';event(s,'end',p.x,p.y);}else if(s.time>=s.limit&&s.finalCleared){s.score+=Math.round(p.hp*3+s.level*70);s.phase='won';event(s,'win',p.x,p.y);}else if(s.time>=s.limit+45){s.phase='lost';event(s,'end',p.x,p.y);}else if(s.phase!=='reward'&&s.xp>=s.nextXp&&s.level<20){if(offerUpgrades(s).length){s.phase='upgrade';event(s,'upgrade',p.x,p.y);}}return s;
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
    if(s.time>=s.siteAt){s.siteAt+=23+random(s)*8;if(s.sites.length<3)s.sites.push({x:70+random(s)*(W-140),y:70+random(s)*(H-140),type:pick(s,['nectar','ward','focus']),life:20});}
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
    s.projectiles=s.projectiles.filter(b=>b.life>0&&b.x>-50&&b.x<W+50&&b.y>-50&&b.y<H+50).slice(-80);
    for(const b of s.enemyShots){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(distance(p,b)<18&&s.invincible===0){survivorHarm(s,18);s.invincible=.6;b.life=0;event(s,'hit',p.x,p.y);}}
    s.enemyShots=s.enemyShots.filter(b=>b.life>0);for(const f of s.fields)f.life-=dt;s.fields=s.fields.filter(f=>f.life>0).slice(-12);
    if(!s.finalBoss&&s.time>=s.limit-25){const boss=survivorSpawn(s,undefined,true);boss.final=true;boss.hp*=1.6;if(s.enemies.length>=64)s.enemies.pop();s.enemies.push(boss);s.finalBoss=true;event(s,'boss',p.x,p.y);}
  }
  function duetStart(seed=31,difficulty='challenge'){
    const s=Object.assign(base('duet',seed,difficulty),{angle:0,center:{x:320,y:340},orbit:64,nodeRadius:11,lives:0,maxLives:0,cleared:0,perfect:0,combo:0,bestCombo:0,gates:[],near:0,speed:0});const profile=profiles[s.difficulty];s.lives=s.maxLives=profile.lives;s.speed=profile.speed;let y=105;
    for(let i=0;i<profile.gates;i++){const progress=i/profile.gates,type=i===0?'slot':pick(s,['slot','pair','slant']),offset=type==='slot'?0:type==='pair'?64:44+random(s)*14,width=type==='slot'?82-s.rank*7-progress*13:72-s.rank*7-progress*11;s.gates.push({id:i,type,width,offset,baseOffset:offset,phase:random(s)*TAU,drift:i>3?2+random(s)*3:0,y,hit:false,passed:false});y-=235+random(s)*40;}return s;
  }
  function duetNodes(s){return [0,Math.PI].map(a=>({x:s.center.x+Math.cos(s.angle+a)*s.orbit,y:s.center.y+Math.sin(s.angle+a)*s.orbit}));}
  function gateRects(g){if(g.type==='slot')return [{x:0,y:g.y,w:320-g.width/2,h:16},{x:320+g.width/2,y:g.y,w:320-g.width/2,h:16}];const a=320-(g.offset??64),b=320+(g.offset??64),q=g.width/2;return [{x:0,y:g.y,w:a-q,h:16},{x:a+q,y:g.y,w:Math.max(0,b-a-g.width),h:16},{x:b+q,y:g.y,w:W-b-q,h:16}];}
  function circleRect(c,r,b){return Math.hypot(c.x-clamp(c.x,b.x,b.x+b.w),c.y-clamp(c.y,b.y,b.y+b.h))<r;}
  function duetStep(s,input={},delta=1/60){
    if(['won','lost'].includes(s.phase))return s;const dt=clamp(delta,0,1/30);s.phase='active';s.events=[];s.time+=dt;s.angle=(s.angle+clamp(input.turn||0,-1,1)*3.2*dt)%TAU;s.near=Math.max(0,s.near-dt);const nodes=duetNodes(s),speed=s.speed+Math.min(35,s.cleared*1.4);
    for(const g of s.gates){g.y+=speed*dt;if(g.baseOffset!==undefined&&g.type!=='slot')g.offset=g.baseOffset+Math.sin(s.time*.8+g.phase)*g.drift;
      if(!g.hit&&!g.passed){let collision=false,near=false;for(const b of gateRects(g))for(const p of nodes){if(circleRect(p,s.nodeRadius-1,b))collision=true;else if(circleRect(p,s.nodeRadius+5,b))near=true;}if(collision){g.hit=true;s.combo=0;s.lives--;event(s,'hit',s.center.x,g.y);if(s.lives===0){s.phase='lost';event(s,'end',s.center.x,s.center.y);return s;}}else if(near&&s.near===0){s.near=.6;event(s,'near',s.center.x,g.y);}}
      if(!g.passed&&g.y>s.center.y+s.orbit+s.nodeRadius){g.passed=true;s.cleared++;if(!g.hit){s.perfect++;s.combo++;s.bestCombo=Math.max(s.bestCombo,s.combo);s.score+=100+Math.min(8,s.combo)*25;if(s.combo%6===0&&s.lives<s.maxLives){s.lives++;event(s,'restore',s.center.x,s.center.y);}}event(s,'gate',s.center.x,s.center.y,!g.hit);}}
    if(s.cleared===s.gates.length){s.score+=s.lives*200;s.phase='won';event(s,'win',s.center.x,s.center.y);}return s;
  }
  function walkPlatform(s,p){return {...p,x:p.baseX+(p.type==='moving'?Math.sin(s.time*1.5+p.phase)*22:0),y:p.baseY+(p.type==='seesaw'?Math.sin(s.time*1.4+p.phase)*20:0)};}
  function walkStart(seed=31,difficulty='challenge'){
    const s=Object.assign(base('walk',seed,difficulty),{rule:'walk',platforms:[],feet:[{x:90,y:330,platform:0},{x:130,y:330,platform:0}],activeFoot:0,aim:{x:210,y:330},swing:null,fall:0,lives:4,steps:0,stars:0,combo:0,bestCombo:0,checkpoint:0,checkpointFeet:null,furthest:0,lean:0,wind:0,windAt:8,nextWind:0,boost:false,obstacles:[],collected:[],visited:[0],lastLanding:'',preview:null});
    s.lives=4-s.rank;let x=50,y=330;const count=18+s.rank*8;
    for(let i=0;i<count;i++){
      const type=i<3||i%6===0?'solid':pick(s,['solid','moving','brittle','spring','seesaw']);
      const width=i===0?155:72-s.rank*7+random(s)*25;
      s.platforms.push({id:i,type,baseX:x,baseY:y,w:width,phase:random(s)*TAU,usedAt:null,star:i>1&&i%2===0,checkpoint:i%6===0,crumbled:false});
      if(i>5&&i%5===2)s.obstacles.push({x:x+width/2,y:y-90,r:15,phase:random(s)*TAU});
      x+=width+20+random(s)*(30+s.rank*8);y=clamp(y+(random(s)-.5)*60,265,365);
    }
    s.platforms[0].baseY=330;s.checkpointFeet=s.feet.map(f=>({...f}));s.worldWidth=x+100;s.nextWind=pick(s,[-1,0,1]);return s;
  }
  function walkAim(s,x,y){if(s.phase==='won'||s.phase==='lost'||s.swing||s.fall)return false;s.aim={x,y};return true;}
  function walkTarget(s){const anchor=s.feet[1-s.activeFoot],reach=s.boost?245:185;let dx=s.aim.x-anchor.x,dy=s.aim.y-anchor.y,d=Math.hypot(dx,dy);if(d>reach){dx*=reach/d;dy*=reach/d;}return {x:anchor.x+dx,y:anchor.y+dy};}
  function walkStepFoot(s){
    if(!['ready','active'].includes(s.phase)||s.swing||s.fall)return false;
    const anchor=s.feet[1-s.activeFoot],foot=s.feet[s.activeFoot],reach=s.boost?245:185;
    let dx=s.aim.x-anchor.x,dy=s.aim.y-anchor.y,d=Math.hypot(dx,dy);if(d>reach){dx*=reach/d;dy*=reach/d;}
    const target=walkTarget(s);s.swing={from:{...foot},target,t:0,duration:.42+Math.abs(target.x-foot.x)/600,boost:s.boost};s.boost=false;s.phase='active';event(s,'step',foot.x,foot.y);return true;
  }
  function walkFall(s){if(s.fall||['won','lost'].includes(s.phase))return;s.fall=.7;s.swing=null;s.combo=0;s.lives--;event(s,'hit',s.feet[0].x,s.feet[0].y);}
  function walkStep(s,input={},delta=1/60){
    if(['won','lost'].includes(s.phase))return s;const dt=clamp(delta,0,1/30);s.events=[];s.phase='active';s.time+=dt;
    if(s.time>=s.windAt){s.wind=s.nextWind;s.nextWind=pick(s,[-1,0,1]);s.windAt+=12+random(s)*6;event(s,'wind',s.feet[0].x,250,s.wind);}
    if(s.fall){s.fall=Math.max(0,s.fall-dt);if(!s.fall){if(s.lives<=0){s.phase='lost';event(s,'end',s.feet[0].x,400);}else{s.feet=s.checkpointFeet.map(f=>({...f}));s.activeFoot=0;s.lean=0;s.aim={x:s.feet[1].x+100,y:s.feet[1].y};for(const p of s.platforms){p.usedAt=null;p.crumbled=false;}event(s,'checkpoint',s.feet[0].x,s.feet[0].y);}}return s;}
    if(input.aimX!==undefined)walkAim(s,input.aimX,input.aimY??s.aim.y);
    if(input.turn&&!s.swing){s.aim.x+=input.turn*100*dt;const candidate=s.platforms.map(p=>walkPlatform(s,p)).reduce((best,p)=>Math.abs((p.x+p.w/2)-s.aim.x)<Math.abs((best.x+best.w/2)-s.aim.x)?p:best);s.aim.y=candidate.y;}
    for(let i=0;i<2;i++)if(!s.swing||i!==s.activeFoot){const f=s.feet[i],raw=s.platforms[f.platform],p=walkPlatform(s,raw);f.x+=p.x-(f.lastX??p.x);f.y=p.y;f.lastX=p.x;if(raw.type==='brittle'&&raw.usedAt!==null&&s.time-raw.usedAt>2.8){raw.crumbled=true;walkFall(s);}}
    if(s.fall)return s;
    if(s.swing){
      const sw=s.swing;sw.t+=dt;const a=clamp(sw.t/sw.duration,0,1),ease=a*a*(3-2*a),f=s.feet[s.activeFoot];f.x=sw.from.x+(sw.target.x-sw.from.x)*ease+s.wind*8*Math.sin(a*Math.PI);f.y=sw.from.y+(sw.target.y-sw.from.y)*ease-Math.sin(a*Math.PI)*(sw.boost?105:60);
      const anchor=s.feet[1-s.activeFoot],body={x:(anchor.x+f.x)/2,y:Math.min(anchor.y,f.y)-65};
      for(const o of s.obstacles){const moving={x:o.x+Math.sin(s.time*1.8+o.phase)*27,y:o.y+Math.sin(s.time*1.3+o.phase)*40};if(distance(body,moving)<o.r+17){walkFall(s);return s;}}
      if(a===1){
        const raw=s.platforms.find(p=>{const v=walkPlatform(s,p);return !p.crumbled&&f.x>=v.x+5&&f.x<=v.x+v.w-5&&Math.abs(f.y-v.y)<23;});
        if(!raw){walkFall(s);return s;}const p=walkPlatform(s,raw);f.y=p.y;f.platform=raw.id;f.lastX=p.x;raw.usedAt=s.time;s.steps++;if(!s.visited.includes(raw.id)){s.visited.push(raw.id);s.combo++;s.bestCombo=Math.max(s.bestCombo,s.combo);s.score+=40+Math.min(s.combo,10)*10;}s.furthest=Math.max(s.furthest,raw.id);s.lastLanding=raw.type;
        if(raw.star&&!s.collected.includes(raw.id)){s.collected.push(raw.id);s.stars++;s.score+=120;event(s,'star',f.x,f.y-45);}
        if(raw.type==='spring'){s.boost=true;event(s,'spring',f.x,f.y);}
        s.activeFoot=1-s.activeFoot;s.swing=null;s.lean*=.5;const next=s.platforms[Math.min(raw.id+1,s.platforms.length-1)],v=walkPlatform(s,next);s.aim={x:v.x+v.w/2,y:v.y};
        if(raw.checkpoint&&raw.id>s.checkpoint){s.checkpoint=raw.id;s.checkpointFeet=[{x:p.x+p.w*.3,y:p.y,platform:raw.id},{x:p.x+p.w*.6,y:p.y,platform:raw.id}];event(s,'checkpoint',f.x,f.y);}
        if(s.feet.every(f=>f.platform===s.platforms.length-1)){s.phase='won';s.score+=s.lives*200;event(s,'win',f.x,f.y);}
        event(s,'landing',f.x,f.y,raw.type);
      }
    }
    const span=Math.abs(s.feet[0].x-s.feet[1].x);s.lean+=(s.wind*.025+(span>170?.13:0)-s.lean*.08)*dt;s.lean=clamp(s.lean,-.8,.8);
    // While a foot is airborne the body follows the shared support, rather than two independent players.
    return s;
  }
  return {W,H,TAU,profiles,upgradeIds,clamp,distance,radius,uptakeStart,uptakeStep,uptakeBurst,uptakeSplit,uptakeMass,uptakeModes,survivorStart,survivorStep,survivorUpgrade,survivorDash,survivorBreath,survivorReroll,survivorReward,walkStart,walkStep,walkAim,walkStepFoot,walkTarget,walkPlatform,duetStart,duetStep,duetNodes,gateRects,circleRect};
});

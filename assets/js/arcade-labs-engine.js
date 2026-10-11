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
  function survivorStart(seed=23,difficulty='challenge',mode='survive',school='orbit'){
    const s=Object.assign(base('survivor',seed,difficulty),{limit:0,player:{x:320,y:250,hp:100,maxHp:100,reserve:85},enemies:[],pickups:[],nextId:1,spawnClock:1.5,pulseClock:.25,tendrilClock:.5,pulse:0,invincible:0,kills:0,xp:0,level:0,nextXp:8,upgrades:Object.fromEntries(upgradeIds.map(id=>[id,0])),offers:[],mode:'guard',dashCooldown:0,dashTime:0,dashDir:{x:0,y:-1},lastDir:{x:0,y:-1},wave:0,waveAt:14,sector:0,nextSector:0,synergies:[],hazards:[],eliteAt:42,rule:mode==='core'?'core':'survive',school:['orbit','pulse','ranger'].includes(school)?school:'orbit',projectiles:[],enemyShots:[],fields:[],sites:[],siteAt:18,weaponClock:0,leafClock:0,rootClock:0,guard:0,guardClock:0,blocked:0,breath:0,breathCooldown:0,rerolls:2,boon:null,boonTime:0,rewardOffers:[],finalBoss:false,finalCleared:false,chapter:1,chapterCount:4,chapterStart:0,chapterResults:[],inheritance:[],perkOffers:[],core:{x:320,y:240,hp:150,maxHp:150}});
    s.chapterLength=45+s.rank*10;s.limit=s.chapterLength;s.upgrades[s.school==='orbit'?'ring':s.school==='pulse'?'spore':'needle']=1;s.nextSector=Math.floor(random(s)*4);const angle=random(s)*TAU;s.pickups=Array.from({length:4},(_,i)=>({x:320+Math.cos(angle+i*TAU/4)*65,y:250+Math.sin(angle+i*TAU/4)*65,xp:4}));return s;
  }
  function survivorUpgrade(s,id){if(s.phase!=='upgrade'||!s.offers.includes(id)||s.upgrades[id]>=3)return false;s.upgrades[id]++;if(id==='membrane'){s.player.maxHp+=20;s.player.hp=Math.min(s.player.maxHp,s.player.hp+30);}s.level++;s.nextXp+=8+Math.floor(s.level*1.3);s.phase='active';s.offers=[];event(s,'evolve',s.player.x,s.player.y,id);
    const pairs=[['shelter','ring','membrane'],['reach','tendril','spore'],['renew','enzyme','cilia'],['rain','needle','spore'],['forest','leaf','root']];for(const [name,a,b]of pairs)if(s.upgrades[a]>=2&&s.upgrades[b]>=2&&!s.synergies.includes(name)){s.synergies.push(name);event(s,'synergy',s.player.x,s.player.y,name);}return true;}
  function survivorDash(s){if(!['ready','active'].includes(s.phase)||s.dashCooldown>0||s.player.reserve<20)return false;s.player.reserve-=20;s.breath=0;s.dashCooldown=5.5-s.upgrades.cilia*.65;s.dashDir={...s.lastDir};s.dashTime=.23;s.invincible=Math.max(s.invincible,.3);if(s.synergies.includes('renew'))for(const f of s.pickups)if(distance(s.player,f)<150){f.x+=(s.player.x-f.x)*.6;f.y+=(s.player.y-f.y)*.6;}event(s,'dash',s.player.x,s.player.y);return true;}
  function survivorSpawn(s,side,elite=false){side=side===undefined?Math.floor(random(s)*4):side;const v=random(s),roll=random(s),type=elite?'elite':s.chapter>=3&&roll<.13?'leech':s.chapter>=2&&roll<.25?'ranged':s.chapter>=2&&roll<.38?'splitter':roll<.50?'tank':roll<.67?'charger':roll<.84?'fast':'slow',scale=1+s.rank*.12+(s.chapter-1)*.24;
    return {id:s.nextId++,x:side===0?-22:side===1?W+22:30+v*(W-60),y:side===2?-22:side===3?H+22:30+v*(H-60),hp:(type==='elite'?230+s.time*1.7+s.rank*55:type==='tank'?95:type==='charger'?44:type==='fast'?24:28)*scale,r:type==='elite'?25:type==='tank'?18:type==='fast'?8:12,speed:type==='elite'?24:type==='tank'?23:type==='fast'?64:32+s.time*.15,type,personality: type,orbitSign:random(s)<.5?-1:1,castClock:2,chargeClock:1+random(s),chargeState:'follow',target:null};}
  function survivorStep(s,input={},delta=1/60){
    if(['won','lost','upgrade','reward','chapter'].includes(s.phase))return s;const dt=clamp(delta,0,1/30);s.phase='active';s.events=[];s.time+=dt;const p=s.player;let dx=input.x||0,dy=input.y||0;const length=Math.hypot(dx,dy);if(length>1){dx/=length;dy/=length;}if(length>.15)s.lastDir={x:dx/(Math.hypot(dx,dy)||1),y:dy/(Math.hypot(dx,dy)||1)};
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
      if(e.type==='fast'){vx+=(target.y-e.y)/d*e.speed*Math.sin(s.time*2+e.id)*.8;vy-=(target.x-e.x)/d*e.speed*Math.sin(s.time*2+e.id)*.8;}
      if(e.type==='leech'){const food=s.pickups.find(f=>!f.chest);if(food){const gap=distance(food,e)||1;vx=(food.x-e.x)/gap*55;vy=(food.y-e.y)/gap*55;if(gap<18){e.hp+=food.xp*7;p.reserve=Math.max(0,p.reserve-5);s.pickups.splice(s.pickups.indexOf(food),1);event(s,'stolen',e.x,e.y);}}}
      if(e.type==='tank'&&s.guard>0&&d<130){vx*=1.35;vy*=1.35;}
      if(e.type==='ranged'){if(d<190){vx*= -.6;vy*= -.6;}else if(d<270){vx=(p.y-e.y)/d*e.speed*(e.orbitSign||1);vy=-(p.x-e.x)/d*e.speed*(e.orbitSign||1);}e.castClock-=dt;if(e.castClock<=0&&s.enemyShots.length<55){const dist=distance(p,e)||1;s.enemyShots.push({x:e.x,y:e.y,vx:(p.x-e.x)/dist*120,vy:(p.y-e.y)/dist*120,life:5});e.castClock=2.8;}}
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
    if(p.hp<=0||(s.rule==='core'&&s.core.hp<=0)){s.phase='lost';event(s,'end',p.x,p.y);}else if(s.time>=s.limit&&s.finalCleared){
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
    if(!s.finalBoss&&s.time>=s.limit-16){const boss=survivorSpawn(s,undefined,true);boss.final=true;boss.hp*=1.05+s.chapter*.16;if(s.enemies.length>=64)s.enemies.pop();s.enemies.push(boss);s.finalBoss=true;event(s,'boss',p.x,p.y);}
  }
  function survivorContinue(s,perk){
    if(s.phase!=='chapter'||!s.perkOffers.includes(perk))return false;
    s.inheritance.push(perk);
    if(perk==='vitality'){s.player.maxHp+=15;s.player.hp+=30;}
    if(perk==='reserve'){s.player.reserve=100;s.guard=3;}
    if(perk==='insight'){s.xp+=s.nextXp; s.rerolls++;}
    s.player.hp=Math.min(s.player.maxHp,s.player.hp+s.player.maxHp*.22);s.player.reserve=Math.min(100,s.player.reserve+30);
    s.chapter++;s.chapterStart=s.time;s.limit=s.time+s.chapterLength+(s.chapter-1)*5;s.eliteAt=s.time+28;s.waveAt=s.time+10;s.siteAt=s.time+8;
    s.enemies=[];s.enemyShots=[];s.hazards=[];s.projectiles=[];s.fields=[];s.pickups=[];s.sites=[];s.finalBoss=false;s.finalCleared=false;s.breathCooldown=0;s.dashCooldown=0;s.spawnClock=1;s.perkOffers=[];s.invincible=2;s.phase='active';s.core.hp=Math.min(150,s.core.hp+50);event(s,'inherit',s.player.x,s.player.y,s.chapter);return true;
  }
  // The table uses planar contact physics plus a separate height coordinate for ramps.
  const pinballBumpers=[{id:0,x:230,y:145,r:27},{id:1,x:410,y:145,r:27},{id:2,x:320,y:225,r:31}];
  const pinballWalls=[{x:85,y:50,bx:85,by:325},{x:555,y:50,bx:555,by:455},{x:85,y:50,bx:555,by:50},{x:85,y:325,bx:204,by:410},{x:535,y:325,bx:436,by:410},{x:85,y:325,bx:140,by:470},{x:535,y:325,bx:480,by:470}];
  function pinballStart(seed=31,difficulty='challenge',mode='missions'){
    const s=Object.assign(base('pinball',seed,difficulty),{rule:['missions','classic','timed'].includes(mode)?mode:'missions',limit:mode==='timed'?120:Infinity,balls:[],lives:3,launchReady:true,launchCharge:0,flippers:{left:0,right:0},bumpers:pinballBumpers.map(b=>({...b,lit:0})),targets:[false,false,false],mission:0,missionsGoal:3,combo:0,comboClock:0,multiplier:1,multi:0,nextBall:1,nudgeCooldown:0,tilt:0,tiltLock:0,drains:0,hits:0,ramps:0,ballSave:0,hitMemory:{},trails:[],lastAward:0});
    s.lives=s.rank===2?2:3;s.missionsGoal=3+s.rank;s.goal=6000+s.rank*6000;s.bumpers.forEach(b=>b.y+=Math.floor(random(s)*14)-7);return s;
  }
  function pinballLaunch(s,charge=.7){
    if(!['ready','active'].includes(s.phase)||!s.launchReady||s.lives<=0)return false;
    s.balls.push({id:s.nextBall++,x:540,y:435,z:0,launchRail:true,vx:0,vy:-490-clamp(charge,0,1)*150,vz:0,r:9,lock:0});
    s.launchReady=false;s.ballSave=5;s.phase='active';event(s,'launch',523,435);return true;
  }
  function pinballNudge(s,direction=0){
    if(s.phase!=='active'||!s.balls.length||s.nudgeCooldown>0||s.tiltLock>0)return false;
    s.nudgeCooldown=.65;s.tilt+=.9;
    if(s.tilt>2.4){s.tiltLock=3;s.tilt=0;event(s,'tilt',320,240);return false;}
    for(const b of s.balls){b.vx+=clamp(direction,-1,1)*100;b.vy-=110;}event(s,'nudge',320,240);return true;
  }
  function flipperSegment(s,side){const left=side==='left',amount=s.flippers[side],angle=left?.32-amount*.95:Math.PI-.32+amount*.95;const x=left?222:418,y=402;return {x,y,bx:x+Math.cos(angle)*82,by:y+Math.sin(angle)*82,angle};}
  function contactSegment(b,wall,restitution=.78){
    const dx=wall.bx-wall.x,dy=wall.by-wall.y,t=clamp(((b.x-wall.x)*dx+(b.y-wall.y)*dy)/(dx*dx+dy*dy),0,1),x=wall.x+dx*t,y=wall.y+dy*t;
    let nx=b.x-x,ny=b.y-y;const d=Math.hypot(nx,ny),r=b.r+(wall.thick||0);if(d>=r)return false;
    if(d<.001){nx=-dy;ny=dx;}const len=Math.hypot(nx,ny)||1;nx/=len;ny/=len;b.x=x+nx*(r+.1);b.y=y+ny*(r+.1);const v=b.vx*nx+b.vy*ny;if(v<0){b.vx-=(1+restitution)*v*nx;b.vy-=(1+restitution)*v*ny;}return {x,y,nx,ny};
  }
  function pinballAward(s,b,value,kind){
    s.combo=s.comboClock>0?s.combo+1:1;s.comboClock=3;s.multiplier=Math.min(5,1+Math.floor(s.combo/4));const points=value*s.multiplier;s.score+=points;s.hits++;s.lastAward=points;event(s,kind,b.x,b.y,points);
  }
  function pinballStep(s,input={},delta=1/60){
    if(['won','lost'].includes(s.phase))return s;s.events=[];const dt=clamp(delta,0,1/30);s.phase='active';s.time+=dt;
    for(const key of ['comboClock','nudgeCooldown','tiltLock','ballSave'])s[key]=Math.max(0,s[key]-dt);s.tilt=Math.max(0,s.tilt-dt*.35);if(!s.comboClock){s.combo=0;s.multiplier=1;}
    for(const side of ['left','right']){const target=input[side]&&s.tiltLock===0?1:0;s.flippers[side]+=(target-s.flippers[side])*(1-Math.exp(-32*dt));}
    for(const b of s.bumpers)b.lit=Math.max(0,b.lit-dt);
    const sub=dt/4;
    for(let tick=0;tick<4;tick++)for(const b of s.balls){
      b.lock=Math.max(0,b.lock-sub);b.vy+=(240+s.rank*26)*sub;b.vx*=Math.exp(-.045*sub);b.x+=b.vx*sub;b.y+=b.vy*sub;
      if(b.z>0||b.vz>0){b.vz-=520*sub;b.z+=b.vz*sub;if(b.z<=0){b.z=0;b.vz=0;event(s,'land',b.x,b.y);}}
      const speed=Math.hypot(b.vx,b.vy);if(speed>780){b.vx*=780/speed;b.vy*=780/speed;}
      if(b.launchRail&&b.y<100){b.launchRail=false;b.vx=-180;}
      for(const wall of pinballWalls)if(!(b.launchRail&&wall.x===535))contactSegment(b,wall);
      // Upper arcs and side slings make the return trajectory change on every contact.
      if(b.y<72&&b.x<130){b.vx=Math.abs(b.vx)+70;}if(b.y<72&&b.x>510)b.vx=-Math.abs(b.vx)-70;
      if(b.z<24){
        for(const bumper of s.bumpers){const d=distance(b,bumper),r=bumper.r+b.r;if(d<r){const nx=(b.x-bumper.x)/(d||1),ny=(b.y-bumper.y)/(d||1);b.x=bumper.x+nx*(r+.5);b.y=bumper.y+ny*(r+.5);b.vx=nx*(360+s.rank*25);b.vy=ny*(360+s.rank*25);if(!b.lock){bumper.lit=.2;s.targets[bumper.id]=true;pinballAward(s,b,120,'bumper');b.lock=.12;}}}
        for(const side of ['left','right']){const segment=flipperSegment(s,side),hit=contactSegment(b,{...segment,thick:7},.7);if(hit&&input[side]&&s.tiltLock===0){b.vy=-400-Math.abs((b.x-segment.x)/82)*150;b.vx=(side==='left'?1:-1)*(100+Math.abs(b.x-segment.x)*5.5);if(!b.lock){event(s,'flip',b.x,b.y);b.lock=.08;}}}
        // A ramp is a real elevated flight; high balls clear the central bumpers.
        if(b.x>105&&b.x<165&&b.y<240&&b.y>180&&b.vy<0&&b.lock===0){b.x=145;b.vx=230;b.vy=-150;b.vz=225;b.z=2;b.lock=.6;s.ramps++;pinballAward(s,b,400,'ramp');
          if(s.targets.every(Boolean)){s.mission++;s.targets.fill(false);s.score+=800;event(s,'mission',320,150,s.mission);if(s.balls.length<3){for(let j=0;j<2;j++)s.balls.push({id:s.nextBall++,x:270+j*100,y:100,z:35,vx:j?130:-130,vy:70,vz:70,r:9,lock:.6});s.multi++;event(s,'multiball',320,150);}}
        }
      }
      if(b.x<60){b.x=60;b.vx=Math.abs(b.vx);}if(b.x>575){b.x=575;b.vx=-Math.abs(b.vx);}if(b.y<40){b.y=40;b.vy=Math.abs(b.vy);}
    }
    for(let i=s.balls.length-1;i>=0;i--)if(s.balls[i].y>490){const b=s.balls[i];s.balls.splice(i,1);s.drains++;event(s,'drain',b.x,470);}
    if(!s.balls.length&&!s.launchReady){if(s.ballSave>0){const remaining=s.ballSave;s.launchReady=true;pinballLaunch(s,.6);s.ballSave=remaining;event(s,'save',523,435);}else{if(s.rule!=='timed')s.lives--;s.launchReady=s.rule==='timed'||s.lives>0;}}
    if(s.rule==='missions'&&s.mission>=s.missionsGoal){s.phase='won';event(s,'win',320,240);}
    else if(s.time>=s.limit){s.phase='won';event(s,'win',320,240);}
    else if(s.lives<=0){s.phase=s.rule==='classic'&&s.score>=s.goal?'won':'lost';event(s,'end',320,240);}
    return s;
  }
  return {W,H,TAU,profiles,upgradeIds,clamp,distance,radius,uptakeStart,uptakeStep,uptakeBurst,uptakeSplit,uptakeMass,uptakeModes,survivorStart,survivorStep,survivorUpgrade,survivorDash,survivorBreath,survivorReroll,survivorReward,survivorContinue,survivorSpawn,pinballStart,pinballStep,pinballLaunch,pinballNudge,pinballBumpers,pinballWalls,flipperSegment,contactSegment};
});

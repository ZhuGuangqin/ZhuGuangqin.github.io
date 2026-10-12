const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../assets/js/arcade-labs-engine.js');
function tick(s,step,n,input={}){for(let i=0;i<n*60;i++)step(s,input);}
function expedition(seed=17){const s=E.pinballStart(seed,'challenge','expedition');assert(E.pinballChoose(s,'force'));return s;}
function equip(s,id){s.phase='draft';s.draftReason='mid';s.offers=[id];assert(E.pinballChoose(s,id));}
function impact(s,id=0){const t=s.bumpers[id];s.phase='active';s.launchReady=false;s.balls=[{id:s.nextBall++,x:t.x,y:t.y-t.r-8.7,z:0,vx:0,vy:80,vz:0,r:9,lock:0}];E.pinballStep(s);}
function habitat(){const s=E.survivorStart(17);s.foods=[];s.pickups=[];s.spawnClock=s.waveAt=s.eliteAt=s.siteAt=s.pulseClock=9999;return s;}
function rival(s,mass,hp=100){return {id:1,x:s.player.x,y:s.player.y,mass,baseMass:mass,maxHp:hp,hp,r:E.survivorRadius(mass),speed:0,type:'slow'};}

test('expedition starts with a deliberate build choice; unoffered and over-cap imprints cannot be equipped',()=>{
 const s=E.pinballStart(17,'challenge','expedition');assert.equal(s.phase,'draft');assert.equal(s.offers.length,3);assert(!E.pinballLaunch(s));assert(!E.pinballChoose(s,'blast'));const before=JSON.stringify(s);tick(s,E.pinballStep,1);assert.equal(JSON.stringify(s),before);assert(E.pinballChoose(s,'force'));assert.equal(s.upgrades.force,1);equip(s,'force');equip(s,'force');s.phase='draft';s.offers=['force'];assert(!E.pinballChoose(s,'force'));
});
test('contacts remove real target health and conduction damages a neighbouring target',()=>{
 const s=expedition();equip(s,'chain');const hp=s.bumpers.map(b=>b.hp);impact(s);assert(s.bumpers[0].hp<hp[0]);assert(s.bumpers.slice(1).some((b,i)=>b.hp<hp[i+1]));assert(s.events.some(e=>e.kind==='chain'));
});
test('break blasts propagate and afterburn keeps acting without a second impact',()=>{
 const s=expedition();equip(s,'blast');s.bumpers[0].hp=1;s.bumpers[1].x=s.bumpers[0].x+110;const hp=s.bumpers[1].hp;impact(s);assert.equal(s.bumpers[0].hp,0);assert(s.bumpers[1].hp<hp);assert.equal(s.destroyed,1);
 const b=expedition();equip(b,'ember');impact(b);const h=b.bumpers[0].hp;b.balls=[];b.launchReady=true;tick(b,E.pinballStep,.7);assert(b.bumpers[0].hp<h);
});
test('heavy and feather balls change contact size and acceleration; long reach changes physical segment',()=>{
 const plain=expedition(),heavy=expedition(),feather=expedition();equip(heavy,'heavy');equip(feather,'feather');for(const s of [plain,heavy,feather]){E.pinballLaunch(s);s.balls[0].x=320;s.balls[0].y=330;s.balls[0].launchRail=false;s.balls[0].vx=s.balls[0].vy=0;E.pinballStep(s);}assert(heavy.balls[0].r>plain.balls[0].r);assert(heavy.balls[0].vy>plain.balls[0].vy);assert(feather.balls[0].vy<plain.balls[0].vy);const len=E.distance(E.flipperSegment(plain,'left'),{x:E.flipperSegment(plain,'left').bx,y:E.flipperSegment(plain,'left').by});equip(plain,'longarm');const f=E.flipperSegment(plain,'left');assert(E.distance(f,{x:f.bx,y:f.by})>len+9);
});
test('linked core is protected by actual living neighbours and exposed when those relationships break',()=>{
 const s=expedition();for(let floor=1;floor<5;floor++){s.bumpers.forEach(b=>b.hp=0);E.pinballStep(s);assert.equal(s.phase,'draft');assert(E.pinballChoose(s,s.offers[0]));}const core=s.bumpers.find(b=>b.type==='core');assert(E.pinballShielded(s,core));const hp=core.hp;impact(s,core.id);assert.equal(core.hp,hp);s.bumpers.filter(b=>b!==core).forEach(b=>b.hp=0);assert(!E.pinballShielded(s,core));impact(s,core.id);assert(core.hp<hp);
});
test('mid-table choices preserve the balls; floor transitions preserve the build and reset limited tools',()=>{
 const s=expedition();s.bumpers[0].hp=s.bumpers[1].hp=0;s.floorBreaks=2;s.balls=[{id:1,x:320,y:350,z:0,vx:50,vy:0,vz:0,r:9,lock:0}];s.launchReady=false;E.pinballStep(s);assert.equal(s.phase,'draft');assert.equal(s.draftReason,'mid');const ball={...s.balls[0]},before=JSON.stringify(s);E.pinballStep(s);assert.equal(JSON.stringify(s),before);E.pinballChoose(s,s.offers[0]);assert.deepEqual(s.balls[0],{...ball,r:9+(s.upgrades.heavy||0)*1.5});s.bumpers.forEach(b=>b.hp=0);E.pinballStep(s);assert.equal(s.draftReason,'floor');const built=[...s.build];s.rewindCharges=0;E.pinballChoose(s,s.offers[0]);assert.equal(s.floor,2);assert.deepEqual(s.build.slice(0,-1),built);assert(s.rewindCharges>=1);assert(s.launchReady);
});
test('recall restores a trajectory and one just-spent life without rolling back damage or score',()=>{
 const s=expedition();E.pinballLaunch(s);tick(s,E.pinballStep,1);s.score=1234;s.bumpers[0].hp=3;const lives=s.lives;s.ballSave=0;s.balls.forEach(b=>b.y=500);E.pinballStep(s);assert.equal(s.lives,lives-1);assert(E.pinballRewind(s));assert.equal(s.lives,lives);assert.equal(s.score,1234);assert.equal(s.bumpers[0].hp,3);assert.equal(s.rewindCharges,0);assert(!E.pinballRewind(s));assert.equal(s.history.length,0);
});
test('automatic rescue charges are spent once; return pegs work only after that target is broken',()=>{
 const s=expedition();equip(s,'recall');E.pinballLaunch(s);s.ballSave=0;s.balls.forEach(b=>b.y=500);E.pinballStep(s);assert.equal(s.rescues,0);assert.equal(s.lives,4);s.balls.forEach(b=>b.y=500);E.pinballStep(s);assert.equal(s.lives,3);
 const p=expedition();equip(p,'echo');p.bumpers[0].hp=0;const node=p.bumpers[0];p.phase='active';p.launchReady=false;p.balls=[{id:1,x:node.x,y:node.y,z:0,vx:0,vy:100,vz:0,r:9,lock:0}];E.pinballStep(p);assert(p.balls[0].vy<0);assert(p.score>0);
});
test('all twelve floors have a legal physical route, with drafts and limited skill actions',()=>{
 for(const difficulty of ['explore','challenge','extreme']){
  const s=E.pinballStart(7,difficulty,'expedition'),priority=['force','longarm','chain','ember','heavy','split','blast','recall','feather','bloom','echo','rewind'];let lastNudge=0;
  for(let i=0;i<18000&&!['won','lost'].includes(s.phase);i++){
   if(s.phase==='draft')E.pinballChoose(s,[...s.offers].sort((a,b)=>priority.indexOf(a)-priority.indexOf(b))[0]);
   if(s.launchReady)E.pinballLaunch(s,s.rank===0?.5:.8);const b=s.balls.reduce((a,b)=>!a||b.y>a.y?b:a,null);
   if(b&&b.y>430&&s.rewindCharges>0)E.pinballRewind(s);
   if(s.time-lastNudge>5&&s.comboClock===0){E.pinballNudge(s);lastNudge=s.time;}
   E.pinballStep(s,{left:b&&b.x<335&&b.y>325,right:b&&b.x>305&&b.y>325});
  }
  assert.equal(s.phase,'won',difficulty);assert.equal(s.tablesCleared,12);assert(s.build.length>=12);assert(s.destroyed>=48);assert(s.balls.length<=3);
 }
});
test('merged habitat food feeds mass and growth; power food has actual effects and camera scales are reachable',()=>{
 const s=habitat();for(const type of ['plain','haste','shield','magnet','nectar','poison']){s.powerShield=0;s.foods=[{id:1,x:s.player.x,y:s.player.y,mass:50,type}];E.survivorStep(s);}assert(s.player.mass>=400);assert.equal(s.eaten,6);assert(s.xp>=6);assert(s.tier>=2);assert(s.haste>0);assert(s.magnet>0);assert(s.poison>0);s.foods=[];s.player.mass=1900;E.survivorStep(s);assert.equal(s.tier,4);assert.equal(s.world.w,2400);
});
test('weakening changes rival size and allows absorption; a larger rival is lethal unless reserve guards intervene',()=>{
 const s=habitat();s.player.mass=200;s.enemies=[rival(s,300)];s.enemies[0].hp=1;E.survivorStep(s);assert.equal(s.swallowed,1);assert(s.player.mass>200);
 const d=habitat();d.enemies=[rival(d,600)];E.survivorStep(d);assert.equal(d.phase,'respawn');assert.equal(d.deaths,1);
 const g=habitat();g.guard=1;g.player.reserve=100;g.enemies=[rival(g,600)];E.survivorStep(g);assert.notEqual(g.phase,'respawn');assert.equal(g.guard,0);assert.equal(g.blocked,1);
});
test('fragment survives loss of the main body, and otherwise timed respawns keep the inherited build',()=>{
 const s=habitat();s.player.mass=300;s.phase='active';assert(E.survivorSplit(s));const total=s.player.mass+s.fragment.mass;assert.equal(total,300);s.fragment.x+=200;s.enemies=[rival(s,1000)];E.survivorStep(s);assert.equal(s.deaths,0);assert.equal(s.fragment,null);assert(s.player.x>400);
 const d=habitat();d.upgrades.needle=3;d.level=5;d.player.mass=600;d.enemies=[rival(d,2000,10000)];E.survivorStep(d);assert.equal(d.phase,'respawn');assert.equal(d.deaths,1);const at=d.time;tick(d,E.survivorStep,3.1);assert(d.time>at+3);assert.equal(d.phase,'active');assert.equal(d.upgrades.needle,3);assert.equal(d.level,5);assert(d.player.mass>=420);assert(d.invincible>2);
 const end=habitat();end.phase='respawn';end.respawnAt=end.limit+48;end.time=end.limit+44.9;tick(end,E.survivorStep,.2);assert.equal(end.phase,'lost');
});
test('twelve habitats inherit mass, body upgrades, scores and all prior discoveries in one game',()=>{
 const s=habitat();s.player.mass=1700;s.peak=1700;s.upgrades.leaf=2;s.level=8;s.score=900;s.finalBoss=true;s.finalCleared=true;s.time=s.limit;E.survivorStep(s);assert.equal(s.phase,'chapter');const mass=s.player.mass,score=s.score;E.survivorContinue(s,'reserve');assert.equal(s.player.mass,mass);assert.equal(s.score,score);assert.equal(s.upgrades.leaf,2);assert.equal(s.level,8);assert.equal(s.foods.length,180);assert.equal(s.world.h,1800);
});
test('world movement passes the old viewport edge and remains inside the large habitat',()=>{
 const s=habitat();s.player.x=630;s.player.y=900;tick(s,E.survivorStep,1,{x:1,y:0});assert(s.player.x>700);tick(s,E.survivorStep,30,{x:1,y:1});assert(s.player.x<s.world.w);assert(s.player.y<s.world.h);assert(Number.isFinite(s.player.vx));
});

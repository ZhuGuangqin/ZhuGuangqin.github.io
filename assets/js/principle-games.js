/* Native, bilingual games. Simulation advances only by explicit play or step. */
(function () {
  'use strict';
  const source=document.getElementById('principles-data'),E=window.PrinciplesEngine;
  if(!source||!E)return;
  let data;try{data=JSON.parse(source.textContent);}catch(error){return;}
  const root=document.documentElement,key='principles-progress-v1',media=matchMedia('(prefers-reduced-motion: reduce)');
  let saved,canSave=true;try{saved=E.restore(localStorage.getItem(key),data);}catch(error){saved=E.restore(null,data);canSave=false;}
  const isEn=()=>root.dataset.lang==='en',t=(zh,en)=>isEn()?en:zh,name=level=>isEn()?level.en:level.zh;
  function node(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
  function svg(tag,attrs){const n=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs||{}).forEach(([k,v])=>n.setAttribute(k,v));return n;}
  function staticMotion(){return media.matches||root.dataset.motion==='off'||root.dataset.focus==='on'||document.hidden;}
  const mounts=[];
  function save(){try{localStorage.setItem(key,JSON.stringify(saved));canSave=true;}catch(error){canSave=false;}mounts.forEach(m=>m.saveLabel());}
  function award(stars){const box=node('span','pe-award');box.setAttribute('aria-label',t(stars+'枚叶章',stars+' leaf marks'));for(let i=0;i<3;i++){const mark=svg('svg',{viewBox:'0 0 12 12','aria-hidden':'true'});mark.append(svg('path',{d:'M2 10C1 4 5 1 10 2C11 7 8 11 2 10Z',class:i<stars?'is-earned':''}));box.append(mark);}return box;}
  function mount(kind){
    const host=document.querySelector('[data-principle="'+kind+'"]');if(!host)return;
    const q=s=>host.querySelector('[data-pe-'+s+']'),qa=s=>Array.from(host.querySelectorAll('[data-pe-'+s+']')),shell=q('shell'),levels=data[kind];
    let level=levels.find(l=>l.id===saved[kind+'Level'])||levels[0],board,turns,angles,moves=0,hints=0,undo=[],status='ready',hinted=null,animations=[],garden=E.gardenStart(levels[0]),running=false,timer=null;
    function saveLabel(){q('save').textContent=canSave?(kind==='flow'?t('布局与通关记录保存在本机，刷新可继续。','Your layout and collection are saved on this device.'):t('关卡与规则保存在本机；刷新会从本轮起点重开。','Levels and rules are saved on this device; refresh restarts the current run.')):t('浏览器未允许保存；当前页面仍可完整游玩。','Storage is unavailable; both games still work on this page.');}
    function stopEffects(){animations.forEach(a=>a.cancel());animations=[];}
    function pause(reason){if(!running)return;running=false;clearTimeout(timer);timer=null;if(reason)status='paused';renderGarden();}
    function focusField(){const destination=kind==='flow'?q('board').querySelector('button'):q('run');destination?.focus({preventScroll:true});host.querySelector('.pe-playfield').scrollIntoView({block:'start',behavior:'instant'});}
    function entry(){q('entry-action').textContent=shell.open?t('收起游戏','Close game'):t('开始游玩','Play');}
    function records(){
      const completed=levels.filter(l=>saved[kind][l.id]?.best).length;q('collection').textContent=t('已收藏 '+completed+' / '+levels.length,completed+' / '+levels.length+' collected');
      const list=q('records');levels.forEach((l,i)=>{let b=list.children[i];if(!b){b=node('button');b.type='button';b.addEventListener('click',()=>{choose(l.id);q('level').value=l.id;focusField();});list.append(b);}b.setAttribute('aria-current',String(l.id===level.id));b.replaceChildren(node('span','',String(i+1).padStart(2,'0')+' · '+name(l)),award(saved[kind][l.id]?.best||0));});
    }
    function persistFlow(){const previous=saved.flow[level.id]||{};saved.flow[level.id]={...previous,turns:turns.slice(),moves,hints};save();}
    function choose(id){
      pause();stopEffects();level=levels.find(l=>l.id===id)||levels[0];saved[kind+'Level']=level.id;status='ready';hinted=null;undo=[];
      if(kind==='flow'){board=E.makeBoard(level);const progress=saved.flow[level.id];turns=progress?.turns?.slice()||board.turns.slice();moves=progress?.moves||0;hints=progress?.hints||0;angles=turns.map(t=>t*90);makeTiles();renderFlow();}
      else{garden=E.gardenStart(level);renderGarden();}
      labels();save();
    }
    function makeTiles(){
      const grid=q('board');grid.style.setProperty('--pe-size',board.size);grid.replaceChildren();
      board.masks.forEach((mask,i)=>{const b=node('button','pe-tile');b.type='button';b.dataset.peTile=i;const graphic=svg('svg',{viewBox:'0 0 64 64','aria-hidden':'true'}),paths=svg('g',{class:'pe-conduit'});
        E.directions.forEach(d=>{if(!(mask&d.bit))return;const x=32+d.dc*32,y=32+d.dr*32;paths.append(svg('path',{d:'M32 32L'+x+' '+y}));});
        graphic.append(paths,svg('circle',{cx:32,cy:32,r:3,class:'pe-port'}));if(i===board.source){graphic.append(svg('circle',{cx:32,cy:32,r:9,class:'pe-source-ring'}));b.classList.add('is-source');b.setAttribute('aria-disabled','true');}
        b.append(graphic);b.addEventListener('click',()=>turn(i));b.addEventListener('keydown',event=>{const offsets={ArrowUp:-board.size,ArrowDown:board.size,ArrowLeft:-1,ArrowRight:1};if(Object.hasOwn(offsets,event.key)){event.preventDefault();let next=i+offsets[event.key];if(event.key==='ArrowLeft'&&i%board.size===0)next=i;if(event.key==='ArrowRight'&&i%board.size===board.size-1)next=i;if(next>=0&&next<board.masks.length)grid.querySelector('[data-pe-tile="'+next+'"]').focus({preventScroll:false});}if(event.key==='r'||event.key==='R'){event.preventDefault();turn(i,3);}});grid.append(b);
      });
    }
    function flowMessage(result){
      if(result.won)return t('全网接通！同一批构件，因为组织改变而畅流。','Connected! The same pieces now work as an organised whole.');
      if(status==='source')return t('双环泉眼固定不动。试着旋转它周围的通路。','The double-ring spring is fixed. Turn the paths around it.');
      if(status==='hint')return t('已转动一格并标出位置。提示只向一个已知解迈进一步。','One highlighted tile was turned. A hint advances toward one known solution.');
      if(status==='test')return t('泉水到达 '+result.connected.length+' 格；还有 '+result.leaks.length+' 个接口未接好。', 'Water reaches '+result.connected.length+' tiles; '+result.leaks.length+' ports still need a match.');
      if(status==='undo')return t('已撤回上一次转动。','Last turn undone.');
      return t('让所有通路连到泉眼，并且不留下断口。每格可反复转动，按 R 可逆时针转。','Connect every tile to the spring without unmatched ports. Turn as often as you like; R turns back.');
    }
    function renderFlow(){
      const result=E.inspect(board,turns),directionNames=isEn()?['north','east','south','west']:['北','东','南','西'];
      qa('tile').forEach((b,i)=>{b.classList.toggle('is-connected',result.connected.includes(i));b.classList.toggle('is-hinted',hinted===i);b.querySelector('.pe-conduit').style.transform='rotate('+angles[i]+'deg)';const ports=E.directions.filter(d=>result.tiles[i]&d.bit).map(d=>directionNames[E.directions.indexOf(d)]).join(t('、',', '));b.setAttribute('aria-label',t('第'+(Math.floor(i/board.size)+1)+'行，第'+(i%board.size+1)+'列，'+(i===board.source?'泉眼，':'')+'朝'+ports+'，'+(result.connected.includes(i)?'已连通':'待连接'),'Row '+(Math.floor(i/board.size)+1)+', column '+(i%board.size+1)+', '+(i===board.source?'spring, ':'')+ports+', '+(result.connected.includes(i)?'connected':'unconnected')));});
      q('readings').replaceChildren(node('span','',t('连通 '+result.connected.length+' / '+turns.length,result.connected.length+' / '+turns.length+' connected')),node('span','',t('转动 '+moves,moves+' turns')),node('span','',t('断口 '+result.leaks.length,result.leaks.length+' unmatched ports')));q('status').textContent=flowMessage(result);q('undo').disabled=!undo.length;q('hint').disabled=result.won;q('next').hidden=!result.won||level===levels[levels.length-1];q('hint-note').textContent=t('无提示完成可得两枚叶章；接近最少转动可得三枚。复位保留已获记录。','Finish without hints for two leaf marks; an efficient route earns three. Restart keeps your collection.');
      if(result.won){const stars=E.flowStars(moves,hints,board),previous=saved.flow[level.id]?.best||0;if(stars>previous){saved.flow[level.id]={...saved.flow[level.id],best:stars};save();}}records();return result;
    }
    function revealWin(result){if(!result.won)return;const rect=q('status').getBoundingClientRect();if(rect.top<85||rect.bottom>innerHeight-100){q('status').scrollIntoView({block:'center',behavior:'instant'});(q('next').hidden?q('retry'):q('next')).focus({preventScroll:true});}}
    function turn(index,amount=1){stopEffects();if(index===board.source){status='source';renderFlow();return;}undo.push({turns:turns.slice(),moves,hints});if(undo.length>200)undo.shift();turns[index]=(turns[index]+amount)%4;angles[index]+=amount===3?-90:90;moves++;hinted=null;status='ready';const result=renderFlow();persistFlow();if(result.won){pulse(result);revealWin(result);}}
    function pulse(result){
      stopEffects();if(staticMotion()||!shell.open)return;qa('tile').forEach((b,i)=>{if(result.distance[i]<0)return;animations.push(b.animate([{opacity:.45},{opacity:1}],{duration:300,delay:Math.min(result.distance[i]*40,480),easing:'cubic-bezier(.16,1,.3,1)'}));});
    }
    function curve(values){return values.map((v,i)=>(i?'L':'M')+(12+i*456/level.weather.length).toFixed(2)+' '+(142-v*1.4).toFixed(2)).join(' ');}
    function renderGarden(){
      if(kind!=='garden')return;const score=E.gardenScore(level,garden),condition=garden.water<35?t('偏干','Dry'):garden.water>65?t('偏湿','Wet'):t('舒适','Comfortable');
      q('water-fill').style.transform='translateY('+(200-garden.water*2)+'px)';q('waterline').style.transform='translateY('+((50-garden.water)*2)+'px)';q('water-number').textContent=garden.water;q('water-caption').textContent=condition;q('reservoir').setAttribute('aria-label',t('水量 '+garden.water+'，'+condition,'Water '+garden.water+', '+condition));
      const petals=q('petals');if(!petals.children.length)for(let i=0;i<12;i++)petals.append(svg('path',{d:'M174 34Q164 18 180 10Q196 18 186 34Z',transform:'rotate('+(i*30)+' 180 139)',class:'pe-petal'}));Array.from(petals.children).forEach((p,i)=>p.classList.toggle('is-earned',i<Math.floor(garden.safe/2)));
      const next=level.weather[garden.tick],weather=next===undefined?t('本轮结束','Run complete'):t('下一拍：','Next beat: ')+(next>=0?t('来水 +','Rain +'):t('蒸散 ','Drying '))+next;
      q('weather').textContent=weather;q('beat').textContent=t('节拍 '+garden.tick+' / '+level.weather.length,'Beat '+garden.tick+' / '+level.weather.length);q('safe').textContent=t('舒适 '+garden.safe+' 拍',garden.safe+' comfortable beats');q('actual-line').setAttribute('d',curve(garden.history));q('base-line').setAttribute('d',curve(garden.baseHistory));q('history').setAttribute('aria-label',t('已运行'+garden.tick+'拍，花园舒适'+garden.safe+'拍，定时补水对照舒适'+score.baseSafe+'拍',garden.tick+' beats: garden comfortable for '+garden.safe+', constant watering for '+score.baseSafe));
      let text=t('先设规则。开始会自动推进，也可逐拍试验。舒适区内允许波动。','Set your rules. Start to advance automatically, or try one beat at a time. Fluctuations within the comfort range are fine.');
      if(running&&!garden.tick)text=t('正在自主运行。规则已锁定；可随时暂停或逐拍观察。','Running autonomously. Rules are locked; pause or step at any time.');
      if(status==='paused')text=t('已暂停。可继续运行或逐拍观察；重试后可改规则。','Paused. Resume or step through; retry to change rules.');
      else if(garden.tick&&!garden.done)text=t((running?'正在自主运行。':'')+'刚才：'+(garden.lastWeather>=0?'来水 +':'蒸散 ')+garden.lastWeather+'，规则选择'+({add:'补水',wait:'等待',drain:'排水'}[garden.lastAction])+'。',(running?'Running autonomously. ':'')+'Last beat: weather '+(garden.lastWeather>=0?'+':'')+garden.lastWeather+', rule chose '+({add:'water',wait:'wait',drain:'drain'}[garden.lastAction])+'.');
      if(garden.done)text=(score.won?t('花园守衡成功！','Garden complete! '):t('这次还差一点。重试，调整规则或幅度。','Not quite. Retry with different rules or strength. '))+t('舒适 '+garden.safe+' / '+level.weather.length+' 拍；定时补水对照 '+score.baseSafe+' 拍。','Comfortable for '+garden.safe+' / '+level.weather.length+' beats; constant watering: '+score.baseSafe+'.');
      if(q('status').textContent!==text&&(!running||garden.done||status==='started'))q('status').textContent=text;
      q('run').textContent=garden.done?t('本轮结束','Complete'):running?t('暂停','Pause'):garden.tick?t('继续运行','Resume'):t('让花园运行','Start the garden');q('run').disabled=garden.done;q('step').disabled=garden.done;q('next').hidden=!score.won||level===levels[levels.length-1];qa('rule').forEach(s=>s.disabled=garden.tick>0);q('strength').disabled=garden.tick>0;
      q('rescue-note').textContent=t('应急余量 '+(3-garden.rescues)+' / 3 · 会推进一拍，使用后本轮最多一枚叶章。',(3-garden.rescues)+' / 3 rescues left · Advances a beat; using one caps the run at one leaf mark.');qa('rescue').forEach(b=>b.disabled=garden.done||garden.rescues>=3);
      if(score.won){const previous=saved.garden[level.id]?.best||0;if(score.stars>previous){saved.garden[level.id]={best:score.stars};save();}}records();
    }
    function step(rescue){if(garden.done)return;status='playing';garden=E.gardenStep(level,garden,saved.rule,rescue);if(garden.done){running=false;clearTimeout(timer);timer=null;}renderGarden();}
    function schedule(){clearTimeout(timer);if(!running)return;timer=setTimeout(()=>{if(!running)return;step();if(running)schedule();},700);}
    function labels(){
      entry();q('level').replaceChildren(...levels.map((l,i)=>{const option=node('option','',(i+1)+' · '+name(l));option.value=l.id;return option;}));q('level').value=level.id;q('level-title').textContent=name(level);q('retry').textContent=t('重试本关','Retry');q('next').textContent=t('下一关','Next level');q('reset').textContent=t('清空本游戏记录','Clear this game’s records');q('reset-copy').textContent=t('清空本游戏的布局、收藏与关卡，回到第一关。','Clear this game’s layout, collection and level, and return to level one.');q('reset-confirm').textContent=t('确认清空','Clear records');q('reset-cancel').textContent=t('保留记录','Keep records');
      if(kind==='flow'){q('instruction').textContent=t('同一批构件，试着组织成没有断口的网络。泉眼固定，其他通路都可转动。','Organise the same pieces into a network without open ports. The spring stays fixed; every other path turns.');q('test').textContent=t('试流','Test the flow');q('hint').textContent=t('帮我转一格','Turn one for me');q('undo').textContent=t('撤回一步','Undo');renderFlow();}
      else{q('instruction').textContent=isEn()?level.description_en:level.description_zh;qa('rule-label').forEach(label=>{const id=label.dataset.peRuleLabel;label.textContent={dry:t('偏干（低于45）','Dry (below 45)'),ok:t('适中（45–55）','In range (45–55)'),wet:t('偏湿（高于55）','Wet (above 55)')}[id];});qa('rule').forEach(select=>{select.replaceChildren(...['add','wait','drain'].map(id=>{const o=node('option','',{add:t('补水','Add water'),wait:t('等待','Wait'),drain:t('排水','Drain')}[id]);o.value=id;return o;}));select.value=saved.rule[select.dataset.peRule];});Array.from(q('strength').options).forEach(o=>o.textContent={3:t('轻 · 3','Gentle · 3'),5:t('中 · 5','Steady · 5'),8:t('强 · 8','Strong · 8')}[o.value]);q('strength').value=saved.rule.strength;q('step').textContent=t('下一拍','Step');qa('rescue').forEach(b=>b.textContent=b.dataset.peRescue==='add'?t('应急补水 +8','Rescue water +8'):t('应急排水 −8','Rescue drain −8'));q('goal').textContent=t('目标：'+level.weather.length+'拍中至少'+level.target+'拍舒适。感知延迟'+level.delay+'拍。','Goal: '+level.target+' comfortable beats out of '+level.weather.length+'. Sensor delay: '+level.delay+' beat'+(level.delay===1?'':'s')+'.');renderGarden();}saveLabel();
    }
    q('reset').addEventListener('click',()=>{pause('manual');q('reset-box').hidden=false;q('reset-confirm').focus({preventScroll:false});});q('reset-cancel').addEventListener('click',()=>{q('reset-box').hidden=true;q('reset').focus({preventScroll:true});});q('reset-confirm').addEventListener('click',()=>{saved[kind]={};if(kind==='garden')saved.rule=E.normalRule();q('reset-box').hidden=true;choose(levels[0].id);focusField();});q('level').addEventListener('change',()=>choose(q('level').value));q('retry').addEventListener('click',()=>{pause();stopEffects();status='ready';if(kind==='flow'){turns=board.turns.slice();angles=turns.map(t=>t*90);moves=0;hints=0;undo=[];hinted=null;renderFlow();persistFlow();}else{garden=E.gardenStart(level);renderGarden();}});q('next').addEventListener('click',()=>{const index=levels.indexOf(level);if(index<levels.length-1){choose(levels[index+1].id);focusField();}});
    if(kind==='flow'){
      q('test').addEventListener('click',()=>{status='test';const result=renderFlow();q('board').scrollIntoView({block:'start',behavior:'instant'});pulse(result);});q('hint').addEventListener('click',()=>{const i=E.flowHint(board,turns);if(i===null)return;hints++;turn(i);hinted=i;status='hint';renderFlow();persistFlow();q('board').querySelector('[data-pe-tile="'+i+'"]').focus({preventScroll:true});q('board').scrollIntoView({block:'start',behavior:'instant'});revealWin(E.inspect(board,turns));});q('undo').addEventListener('click',()=>{stopEffects();const previous=undo.pop();if(!previous)return;turns=previous.turns;angles=turns.map(t=>t*90);moves=previous.moves;hints=Math.max(hints,previous.hints);hinted=null;status='undo';renderFlow();persistFlow();});
    }else{
      qa('rule').forEach(select=>select.addEventListener('change',()=>{if(garden.tick)return;saved.rule[select.dataset.peRule]=select.value;save();}));q('strength').addEventListener('change',()=>{if(garden.tick)return;saved.rule.strength=Number(q('strength').value);save();});q('preview').addEventListener('click',focusField);q('run').addEventListener('click',()=>{if(running){pause('manual');return;}if(garden.done||!shell.open)return;running=true;status='started';renderGarden();focusField();schedule();});q('step').addEventListener('click',()=>{pause();step();});qa('rescue').forEach(b=>b.addEventListener('click',()=>{pause();step(b.dataset.peRescue);}));
    }
    shell.addEventListener('toggle',()=>{entry();if(!shell.open){stopEffects();pause('closed');}});
    const control={host,saveLabel,labels,stop:()=>{stopEffects();pause('context');},open:()=>{shell.open=true;host.scrollIntoView({block:'start',behavior:'instant'});}};mounts.push(control);choose(level.id);q('app').hidden=false;
    new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)control.stop();}).observe(host);
  }
  mount('flow');mount('garden');
  function stopAll(){mounts.forEach(m=>m.stop());}
  function hash(){const current=mounts.find(m=>'#'+m.host.id===location.hash);if(current)current.open();}
  document.addEventListener('site:language',()=>mounts.forEach(m=>m.labels()));document.addEventListener('visibilitychange',stopAll);window.addEventListener('blur',stopAll);window.addEventListener('beforeprint',stopAll);media.addEventListener('change',stopAll);new MutationObserver(stopAll).observe(root,{attributes:true,attributeFilter:['data-motion','data-focus']});window.addEventListener('hashchange',hash);hash();
})();

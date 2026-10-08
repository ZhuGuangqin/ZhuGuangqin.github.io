/* A composed celestial hemisphere, not an astronomical ephemeris.
   The same projected surface carries the day phenology and night mansions.
   No wheel listeners, remote assets, or animation dependencies. */
(function () {
  'use strict';
  var hero = document.querySelector('.research-hero'), root = document.documentElement;
  if (!hero) return;
  var field = hero.querySelector('.sky-field'), canvas = field.querySelector('canvas');
  var ctx = canvas.getContext('2d', { alpha:true });
  if (!ctx) return;
  var media = matchMedia('(prefers-reduced-motion: reduce)');
  var picker = hero.querySelector('#sky-mansion-select'), note = hero.querySelector('[data-sky-note]');
  var tau = Math.PI * 2, w = 1, h = 1, r = 1, cx = 0, cy = 0, dpr = 1;
  var clock = 0, last = 0, raf = null, visible = true, night = false, season = 'spring';
  var palette = {}, selected = -1, rotationOffset = .4, heldUntil = 0;
  var previousScene = document.createElement('canvas'), transitionAt = -1;
  var names = '角亢氐房心尾箕井鬼柳星张翼轸奎娄胃昴毕觜参斗牛女虚危室壁'.split('');
  var groups = [['东方青龙','Azure Dragon'],['南方朱雀','Vermilion Bird'],['西方白虎','White Tiger'],['北方玄武','Black Tortoise']];
  var notes = {
    spring:['柳色新生，风雨成丝。','Willow shoots. Threads of rain.'],
    summer:['日光炽盛，花渐次开。','High sun. Flowers unfolding.'],
    'late-summer':['禾穗渐满，水汽氤氲。','Ripening grain. Warm, mist-laden air.'],
    autumn:['银杏旋落，云淡风轻。','Ginkgo falling. Clouds drifting.'],
    winter:['雪落无声，冰晶映光。','Quiet snowfall. Facets of ice.']
  };
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function fraction(n) { return n - Math.floor(n); }
  function seed(n) { return fraction(Math.sin(n * 127.1 + 311.7) * 43758.5453); }
  function allowed() { return !media.matches && root.dataset.motion !== 'off' && root.dataset.focus !== 'on'; }
  function rotation() { return rotationOffset + clock * (night ? .038 : .018); }
  // Rotation about the page's centre diameter; a fixed camera tilt exposes the dome.
  function project(lon, lat, turn) {
    var a = lon + turn, c = Math.cos(lat), x = Math.sin(a) * c;
    var y = -Math.sin(lat), z = Math.cos(a) * c;
    return { x:cx + x * r, y:cy + (y * .921 - z * .389) * r,
      z:y * .389 + z * .921, scale:.5 + .5 * Math.max(0, y * .389 + z * .921) };
  }
  function alpha(p) { return clamp(p.z * 3, 0, 1); }
  function dot(x, y, radius, color, opacity) {
    ctx.globalAlpha = opacity; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, radius, 0, tau); ctx.fill();
  }
  function curve(points, color, opacity, width) {
    ctx.globalAlpha = opacity; ctx.strokeStyle = color; ctx.lineWidth = width || 1; ctx.beginPath();
    var started = false;
    points.forEach(function (p) { if (p.z < .015) { started = false; return; } if (started) ctx.lineTo(p.x,p.y); else { ctx.moveTo(p.x,p.y); started = true; } });
    ctx.stroke();
  }
  function dome(turn) {
    ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,r,0,tau); ctx.clip();
    var light = ctx.createRadialGradient(cx+r*.45,cy-r*.65,r*.03,cx,cy,r);
    light.addColorStop(0, night ? 'rgba(225,239,231,.09)' : 'rgba(255,255,255,.36)');
    light.addColorStop(1,'rgba(255,255,255,0)'); ctx.fillStyle=light;ctx.globalAlpha=1;ctx.fillRect(0,0,w,h);
    // Geodesic linework describes curvature, rather than a screen-space grid.
    var points, i, j;
    for (i=0;i<9;i++) {
      points=[]; for(j=0;j<=90;j++) points.push(project(j/90*tau,-.6+i*.23,turn));
      curve(points,palette.ink,night?.105:.12,.6);
    }
    for(i=0;i<16;i++) {
      points=[];for(j=0;j<=65;j++)points.push(project(i/16*tau,-Math.PI/2+j/65*Math.PI,turn));
      curve(points,palette.ink,night?.09:.10,.6);
    }
    ctx.restore(); ctx.globalAlpha=night?.24:.2;ctx.lineWidth=.8;ctx.strokeStyle=palette.accent;
    ctx.beginPath();ctx.arc(cx,cy,r,Math.PI,0);ctx.stroke();
    ctx.setLineDash([2,7]);ctx.globalAlpha=.2;ctx.beginPath();ctx.moveTo(cx,Math.max(0,cy-r));ctx.lineTo(cx,h);ctx.stroke();ctx.setLineDash([]);
  }
  var stars = Array.from({length:116},function(_,i){return{lon:seed(i+7)*tau,lat:Math.asin(seed(i+170)*1.8-.5),size:.45+seed(i+80)*1.2};});
  var mansions = names.map(function(name,i){return{name:name,lon:i/28*tau,lat:.24+Math.sin(i*2.2)*.13,group:Math.floor(i/7)};});
  function nightSky(turn) {
    var mobile=w<600;
    stars.slice(0,mobile?66:116).forEach(function(star,i){
      var p=project(star.lon,star.lat,turn), opacity=alpha(p);
      if(!opacity)return;
      var trail=[];for(var j=0;j<=18;j++)trail.push(project(star.lon,star.lat,turn-.55+j/18*.55));
      curve(trail,palette.ink,.15*opacity,.55+star.size*.3);
      dot(p.x,p.y,star.size*(.7+p.scale*.4),palette.ink,(.35+seed(i)*.55)*opacity);
    });
    // Each named point is one mansion. Chains preserve the four traditional name groups.
    for(var g=0;g<4;g++){
      var chain=[];for(var k=g*7;k<g*7+7;k++){
        var m=mansions[k];for(var s=0;s<6;s++){
          if(k===g*7&&s===0)chain.push(project(m.lon,m.lat,turn));
          if(k<g*7+6){var n=mansions[k+1];chain.push(project(m.lon+(n.lon-m.lon)*s/5,m.lat+(n.lat-m.lat)*s/5,turn));}
        }
      }
      curve(chain,g===['spring','summer','autumn','winter'].indexOf(season)?palette.accent:palette.ink,.38,.85);
    }
    mansions.forEach(function(m,i){
      var p=project(m.lon,m.lat,turn), opacity=alpha(p);if(!opacity)return;
      var active=i===selected, trail=[];
      for(var j=0;j<=28;j++)trail.push(project(m.lon,m.lat,turn-.28+j/28*.28));
      curve(trail,active?palette.accent:palette.ink,.42*opacity,active?1.5:.9);
      dot(p.x,p.y,active?4.2:2.2,palette.ink,.95*opacity);
      if(active){ctx.globalAlpha=.8*opacity;ctx.strokeStyle=palette.accent;ctx.lineWidth=1;ctx.beginPath();ctx.arc(p.x,p.y,10,0,tau);ctx.stroke();}
      ctx.globalAlpha=(active?1:.8)*opacity;ctx.fillStyle=active?palette.accent:palette.ink;
      ctx.font=(active?'16':'13')+'px "Songti SC",serif';ctx.textAlign='center';ctx.fillText(m.name,p.x,p.y+21);
    });
  }
  var willowLeaf = new Path2D('M0 0C-5 9-7 18 0 28C7 17 5 5 0 0Z');
  // A broad fan with a shallow apical notch, scalloped edge and radiating veins.
  var ginkgoLeaf = new Path2D('M0 4C-10-7-29-12-42-27Q-47-32-40-38Q-35-43-30-40Q-25-47-18-44Q-11-49-5-45L0-40L5-45Q12-49 18-44Q25-47 30-40Q36-43 40-38Q47-32 42-27C28-12 9-7 0 4Z');
  var lotusPetal = new Path2D('M0 8C-18-1-22-28 0-54C15-36 23-8 0 8Z');
  var lotusLeaf = new Path2D('M0 0L-14-20C-48-34-56 9-19 20C12 33 48 13 36-13C28-31 4-29 0 0Z');
  function at(p, size, angle, draw) {
    if(p.z<=.02)return;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(angle||0);ctx.scale(size*p.scale,size*p.scale);draw(alpha(p));ctx.restore();
  }
  function willow(p,i) {
    at(p, w<600?.7:1, Math.sin(clock*.65+i)*.05, function(opacity){
      ctx.globalAlpha=.8*opacity;ctx.strokeStyle='#426d46';ctx.lineWidth=1.1;
      ctx.beginPath();ctx.moveTo(-65,-35);ctx.bezierCurveTo(-20,-70,46,-78,100,-50);ctx.stroke();
      for(var b=0;b<7;b++){
        var x=-52+b*23, y=-47-Math.sin(b/6*Math.PI)*22, length=78+seed(i*7+b)*100;
        var wind=Math.sin(clock*.9+i+b*.25)*17;
        ctx.globalAlpha=.64*opacity;ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x-16,y+length*.35,x+wind,y+length*.75,x+wind+7,y+length);ctx.stroke();
        for(var j=1;j<8;j++){
          var u=j/8, lx=x-12*Math.sin(u*Math.PI)+wind*u*u, ly=y+u*length;
          ctx.save();ctx.translate(lx,ly);ctx.rotate(j%2?.45:-.5);ctx.scale(.34,.6);
          ctx.globalAlpha=(.5+u*.25)*opacity;ctx.fillStyle=j%2?'#508948':'#7eac58';ctx.fill(willowLeaf);ctx.restore();
        }
      }
    });
  }
  function rain(turn) {
    for(var i=0;i<(w<600?52:95);i++){
      var lat=1.5-fraction(seed(i+59)+clock*.11)*1.8, lon=seed(i+240)*tau;
      var p=project(lon,lat,turn);if(p.z<=0)continue;
      ctx.globalAlpha=.13*alpha(p);ctx.strokeStyle='#355c50';ctx.lineWidth=.7;
      ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-4,p.y+10+p.scale*10);ctx.stroke();
    }
  }
  function blossom(p,i) {
    at(p, (w<600?.7:.9)*(1+seed(i+33)*.35), Math.sin(clock*.45+i)*.055, function(opacity){
      ctx.strokeStyle='#62774d';ctx.lineWidth=1.05;ctx.globalAlpha=.6*opacity;
      ctx.beginPath();ctx.moveTo(-5,77);ctx.bezierCurveTo(-15,42,6,21,0,-6);ctx.stroke();
      if(i%2===0){
        ctx.save();ctx.translate(14,51);ctx.rotate(-.18);ctx.scale(.72,.5);
        ctx.fillStyle='#7b9263';ctx.globalAlpha=.42*opacity;ctx.fill(lotusLeaf);
        ctx.strokeStyle='#506848';ctx.lineWidth=.6;ctx.globalAlpha=.3*opacity;
        ctx.beginPath();for(var l=0;l<9;l++){var a=l/9*tau;ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*30,Math.sin(a)*22);}ctx.stroke();ctx.restore();
      }
      ctx.translate(0,-5);var open=.88+.08*Math.sin(clock*.22+i*.8);
      // Cupped petals overlap in depth; the bloom opens rather than spinning like a rosette.
      var shades=i%3===0?['#fff9e9','#efb6a2','#bd695c']:['#fff2eb','#e4a0a0','#ab5965'];
      for(var layer=0;layer<2;layer++){
        var count=layer?5:7;
        for(var j=0;j<count;j++){
          var angle=(j/(count-1)-.5)*(layer?2.5:2.9)*open;
          ctx.save();ctx.rotate(angle);ctx.scale(layer?.77:1,layer?.68:.9);
          var tint=ctx.createLinearGradient(0,-54,0,8);
          tint.addColorStop(0,shades[0]);tint.addColorStop(.5,shades[1]);tint.addColorStop(1,shades[2]);
          ctx.fillStyle=tint;ctx.globalAlpha=(layer?.92:.76)*opacity;ctx.fill(lotusPetal);
          ctx.strokeStyle=shades[2];ctx.lineWidth=.55;ctx.globalAlpha=.24*opacity;ctx.stroke(lotusPetal);
          ctx.beginPath();ctx.moveTo(0,4);ctx.quadraticCurveTo(-4,-22,0,-47);ctx.stroke();ctx.restore();
        }
      }
      ctx.globalAlpha=.8*opacity;ctx.fillStyle='#b98a3c';ctx.beginPath();ctx.ellipse(0,3,8,3,0,0,tau);ctx.fill();
      for(var d=0;d<7;d++)dot(-6+d*2,2+Math.sin(d)*1.1,.8,'#f9df9c',.85*opacity);
    });
  }
  function sun(turn) {
    var p=project(.75,.42,turn*.2), size=w<600?34:52;
    var glow=ctx.createRadialGradient(p.x,p.y,size*.4,p.x,p.y,size*2.7);
    glow.addColorStop(0,'rgba(255,221,153,.5)');glow.addColorStop(1,'rgba(255,221,153,0)');ctx.globalAlpha=1;ctx.fillStyle=glow;ctx.fillRect(p.x-size*3,p.y-size*3,size*6,size*6);
    dot(p.x,p.y,size,'#f5cf8e',.88);ctx.strokeStyle='#c78443';ctx.globalAlpha=.18;
    for(var i=0;i<10;i++){
      var y=p.y+size+28+i*18, x=p.x-90+Math.sin(clock*.65+i)*12;
      ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x+70,y-9,x+95,y+8,x+170,y-3);ctx.stroke();
    }
  }
  function clouds(turn) {
    for(var i=0;i<3;i++){
      var pts=[];for(var j=0;j<=60;j++)pts.push(project(-1.1+j/60*2.4,.85-i*.16+Math.sin(j*.12+i)*.016,turn*.2+clock*.008));
      curve(pts,'#fff7e5',.32,5-i);curve(pts,palette.accent,.12,.65);
    }
  }
  function autumn(turn) {
    clouds(turn);
    for(var i=0;i<(w<600?20:34);i++){
      var lat=1.55-fraction(seed(i+31)+clock*(.018+seed(i)*.015))*1.8;
      var lon=seed(i+9)*tau+Math.sin(clock*.22+i)*.09, p=project(lon,lat,turn);
      at(p,(.4+seed(i+88)*.45)*(w<600?.75:1),Math.sin(clock*.5+i)*.6+i,function(opacity){
        var gold=ctx.createLinearGradient(0,4,0,-48);gold.addColorStop(0,'#b3832b');gold.addColorStop(1,i%3?'#e3bd57':'#d5a546');
        ctx.globalAlpha=.8*opacity;ctx.fillStyle=gold;ctx.fill(ginkgoLeaf);
        ctx.globalAlpha=.5*opacity;ctx.strokeStyle='#896623';ctx.lineWidth=.6;ctx.stroke(ginkgoLeaf);
        ctx.beginPath();ctx.moveTo(0,23);ctx.quadraticCurveTo(-3,12,0,4);
        for(var j=-4;j<=4;j++){var vx=j*9,vy=-45+Math.abs(j)*2.6;ctx.moveTo(0,3);ctx.quadraticCurveTo(vx*.3,-18,vx,vy);}ctx.stroke();
      });
    }
  }
  function crystal(p,i) {
    at(p,(w<600?.55:.8)*(1+seed(i+150)*.6),Math.sin(clock*.12+i)*.15,function(opacity){
      var size=26+seed(i+90)*22;ctx.globalAlpha=.23*opacity;ctx.fillStyle='#f6fdff';ctx.beginPath();
      for(var v=0;v<6;v++){var a=v/6*tau;v?ctx.lineTo(Math.cos(a)*size*.65,Math.sin(a)*size*.65):ctx.moveTo(size*.65,0);}ctx.closePath();ctx.fill();
      ctx.strokeStyle='#eefaff';ctx.lineWidth=1.1;ctx.globalAlpha=.85*opacity;
      for(var j=0;j<6;j++){
        ctx.save();ctx.rotate(j/6*tau);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-size);
        for(var k=1;k<=3;k++){var y=-size*k/4;ctx.moveTo(-size*.17,y-size*.13);ctx.lineTo(0,y);ctx.lineTo(size*.17,y-size*.13);}ctx.stroke();ctx.restore();
      }
      ctx.strokeStyle='#628fa6';ctx.globalAlpha=.35*opacity;ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(-size*.4,0);ctx.lineTo(0,-size*.7);ctx.lineTo(size*.4,0);ctx.lineTo(0,size*.7);ctx.closePath();ctx.stroke();
    });
  }
  function winter(turn) {
    // Frost follows latitude: translucent layered shelves lie on the sphere itself.
    for(var l=0;l<4;l++){
      var pts=[];for(var j=0;j<=80;j++)pts.push(project(j/80*tau,.26+l*.12+Math.sin(j*.2+l)*.025,turn));
      curve(pts,'#f5fdff',.2,6-l);curve(pts,'#578ba8',.2,.7);
    }
    for(var i=0;i<11;i++)crystal(project(i/11*tau,-.18+seed(i+38)*.8,turn),i);
    for(var k=0;k<(w<600?45:80);k++){
      var p=project(seed(k+250)*tau+Math.sin(clock*.3+k)*.035,1.6-fraction(seed(k+45)+clock*.035)*2,turn);
      if(p.z>0){dot(p.x,p.y,(.9+seed(k+74)*1.9)*p.scale,'#fff',.9*alpha(p));if(k%9===0)dot(p.x-.8,p.y-.8,.65,'#6c9db8',.5*alpha(p));}
    }
  }
  var grainKernel = new Path2D('M0 0C-7-5-8-15 0-23C7-15 7-5 0 0Z');
  function lateSummer(turn) {
    // Ripening ears and humid ribbons share the dome's depth and rotation.
    for(var band=0;band<3;band++){
      var mist=[];for(var j=0;j<=70;j++)mist.push(project(j/70*tau,.08+band*.22+Math.sin(j*.11+clock*.12)*.04,turn));
      curve(mist,'#fbf6d6',.15,12-band*3);
    }
    var count=w<600?7:13;
    for(var i=0;i<count;i++){
      var p=project(i/count*tau,-.22+seed(i+97)*.82,turn);
      at(p,(w<600?.8:1)*(1+seed(i+102)*.3),Math.sin(clock*.35+i)*.075,function(opacity){
        ctx.strokeStyle='#7c7947';ctx.lineWidth=.9;ctx.globalAlpha=.7*opacity;
        ctx.beginPath();ctx.moveTo(-7,77);ctx.quadraticCurveTo(-12,20,0,-68);ctx.stroke();
        for(var k=0;k<7;k++)for(var side=-1;side<=1;side+=2){
          ctx.save();ctx.translate(k*.7-4,-k*9-7);ctx.rotate(side*(.6-k*.035));ctx.scale(.7,.8);
          ctx.fillStyle=k%2?'#bea75d':'#d8c27c';ctx.globalAlpha=.85*opacity;ctx.fill(grainKernel);
          ctx.strokeStyle='#8f7d40';ctx.globalAlpha=.5*opacity;ctx.lineWidth=.6;
          ctx.beginPath();ctx.moveTo(0,-19);ctx.lineTo(side*5,-34);ctx.stroke();ctx.restore();
        }
        ctx.globalAlpha=.5*opacity;ctx.strokeStyle='#85894e';ctx.lineWidth=.7;
        ctx.beginPath();ctx.moveTo(-6,52);ctx.bezierCurveTo(-32,31,-33,11,-30,4);ctx.bezierCurveTo(-13,18,-10,36,-6,52);ctx.stroke();
        dot(-12,36,1.8,'#fff7d7',.7*opacity);
      });
    }
  }
  function daySky(turn) {
    ctx.save();ctx.beginPath();ctx.arc(cx,cy,r-1,0,tau);ctx.clip();
    if(season==='spring'){
      var boughCount=w<600?7:12;
      for(var i=0;i<boughCount;i++)willow(project(i/boughCount*tau,-.16+seed(i+67)*.68,turn),i);rain(turn);
    }else if(season==='summer'){
      var flowerCount=w<600?7:12;
      sun(turn);for(var j=0;j<flowerCount;j++)blossom(project(j/flowerCount*tau,-.18+seed(j+91)*.74,turn),j);
    }else if(season==='late-summer')lateSummer(turn);else if(season==='autumn')autumn(turn);else winter(turn);
    ctx.restore();
  }
  function draw() {
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.lineCap='round';ctx.lineJoin='round';
    dome(rotation());if(night)nightSky(rotation());else daySky(rotation());
    if(transitionAt>=0){
      var mix=clamp((clock-transitionAt)/.65,0,1);
      if(mix<1){ctx.globalAlpha=1-mix;ctx.drawImage(previousScene,0,0,previousScene.width,previousScene.height,0,0,w,h);}else transitionAt=-1;
    }
    field.dataset.skyTransition=transitionAt>=0?'changing':'settled';
    ctx.globalAlpha=1;field.classList.add('is-ready');
    // Observable render state is useful for verifying pause/visibility without a private control API.
    canvas.dataset.phase=clock.toFixed(3);
  }
  function frame(now) {
    raf=null;if(!allowed()||!visible||document.hidden){last=0;return;}
    var interval=w<600?50:33;
    if(!last)last=now;
    var delta=now-last;
    if(delta>=interval){
      var elapsed=Math.min(delta/1000,.08);clock+=elapsed;
      if(clock<heldUntil)rotationOffset-=elapsed*(night?.038:.018);
      draw();last=now;
    }
    raf=requestAnimationFrame(frame);
  }
  function schedule() {
    if(raf!==null)cancelAnimationFrame(raf);raf=null;last=0;
    field.dataset.skyState=document.hidden?'hidden':!visible?'offscreen':allowed()?'running':'still';
    if(allowed()&&visible&&!document.hidden)raf=requestAnimationFrame(frame);
  }
  function resize() {
    var box=hero.getBoundingClientRect();if(!box.width||!box.height){schedule();return;}
    w=box.width;h=box.height;dpr=Math.min(devicePixelRatio||1,w<600?1.5:1.75);
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    cx=w*.5;cy=h*(w<600?.71:.88);r=Math.min(w*(w<600?.65:.48),h*1.04);
    transitionAt=-1;draw();schedule();
  }
  function updateNote() {
    var text=night?['二十八宿，循天穹而行。','Twenty-eight mansions in motion.']:notes[season];
    if(night&&selected>=0){var g=groups[Math.floor(selected/7)];text=[g[0]+' · '+names[selected]+'宿',g[1]+' · '+names[selected]];}
    note.querySelector('[data-i18n="zh"]').textContent=text[0];note.querySelector('[data-i18n="en"]').textContent=text[1];
    picker.options[0].textContent=root.dataset.lang==='en'?'28 lunar mansions':'二十八宿';
  }
  function sync() {
    var nextNight=root.dataset.theme==='dark', nextSeason=notes[root.dataset.season]?root.dataset.season:'spring';
    var changed=nextNight!==night||nextSeason!==season;
    if(changed&&allowed()&&canvas.width>1){
      previousScene.width=canvas.width;previousScene.height=canvas.height;
      previousScene.getContext('2d').drawImage(canvas,0,0);transitionAt=clock;
    }else if(!allowed())transitionAt=-1;
    night=nextNight;season=nextSeason;
    var css=getComputedStyle(root);palette={ink:css.getPropertyValue('--ink').trim(),accent:css.getPropertyValue('--accent').trim()};
    updateNote();draw();schedule();
  }
  picker.addEventListener('change',function(){
    selected=picker.value===''?-1:Number(picker.value);
    if(selected>=0){rotationOffset=.9-mansions[selected].lon-clock*(night?.038:.018);heldUntil=clock+8;}
    updateNote();draw();schedule();
  });
  new MutationObserver(sync).observe(root,{attributes:true,attributeFilter:['data-season','data-theme','data-motion','data-focus','data-lang']});
  if('IntersectionObserver'in window)new IntersectionObserver(function(entries){visible=entries[0].isIntersecting;schedule();},{rootMargin:'60px'}).observe(hero);
  if('ResizeObserver'in window)new ResizeObserver(resize).observe(hero);else window.addEventListener('resize',resize);
  document.addEventListener('visibilitychange',schedule);
  document.addEventListener('site:language',updateNote);
  if(media.addEventListener)media.addEventListener('change',function(){transitionAt=-1;draw();schedule();});
  window.addEventListener('beforeprint',function(){visible=false;schedule();});
  window.addEventListener('afterprint',function(){visible=true;resize();});
  sync();resize();
})();

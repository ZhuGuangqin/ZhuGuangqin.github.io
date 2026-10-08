/* A finite, on-demand typographic experiment. No idle animation or tracking. */
(function () {
  "use strict";
  var hero = document.querySelector(".research-hero");
  if (!hero) return;
  var root = document.documentElement;
  var media = matchMedia("(prefers-reduced-motion: reduce)");
  var canvas = document.createElement("canvas");
  var ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.className = "order-canvas";
  canvas.setAttribute("aria-hidden", "true");
  canvas.hidden = true;
  hero.appendChild(canvas);
  var active = null, points = [], edges = [], frame = 0, timer = 0, visible = true;
  var held = false, start = null, shift = {x:0,y:0};
  var started = 0, released = 0, last = 0, width = 0, height = 0;
  function quiet() { return media.matches || root.dataset.motion === "off"; }
  function stop() {
    cancelAnimationFrame(frame); clearTimeout(timer); frame = 0;
    if (active) active.classList.remove("is-playing");
    active = null; held = false; canvas.hidden = true;
    hero.removeAttribute("data-order-state");
  }
  function label(button) {
    button.setAttribute("aria-label", root.dataset.lang === "en" ? "Disturb the order: click or drag" : "拨动秩序：点击或拖动");
    button.title = root.dataset.lang === "en" ? "Click or drag. Release to let it reorganize." : "点击或拖动，松手后重新组织。";
  }
  function prepare(button) {
    var box = hero.getBoundingClientRect(), word = button.getBoundingClientRect();
    var style = getComputedStyle(button), size = parseFloat(style.fontSize);
    var sample = document.createElement("canvas"), ink = sample.getContext("2d", {willReadFrequently:true});
    if (!ink) return false;
    sample.width = Math.ceil(word.width + 8); sample.height = Math.ceil(size * 1.6);
    ink.font = style.fontWeight + " " + style.fontSize + " " + style.fontFamily;
    ink.textBaseline = "middle"; ink.fillText(button.textContent, 2, sample.height / 2);
    var pixels = ink.getImageData(0,0,sample.width,sample.height).data;
    points = [];
    var step = size < 36 ? 3 : 4;
    for (var y=0;y<sample.height;y+=step) for (var x=0;x<sample.width;x+=step) {
      if (pixels[(y*sample.width+x)*4+3] < 80) continue;
      var px = word.left-box.left+x-2, py = word.top-box.top+(word.height-sample.height)/2+y;
      var angle = points.length * 2.39996;
      var radius = 35 + (points.length % 9) * 9;
      points.push({x:px,y:py,ax:px,ay:py,vx:0,vy:0,dx:Math.cos(angle)*radius,dy:Math.sin(angle)*radius*.72});
    }
    if (!points.length) return false;
    var stride = Math.ceil(points.length / 240);
    if (stride > 1) points = points.filter(function (_, i) { return i % stride === 0; });
    edges = [];
    points.forEach(function (p,i) {
      var nearest = points.map(function (q,j) { return {j:j,d:Math.hypot(p.ax-q.ax,p.ay-q.ay)}; }).filter(function (q) { return q.j>i; }).sort(function (a,b) {return a.d-b.d;});
      nearest.slice(0,2).forEach(function (q) { edges.push([i,q.j]); });
    });
    width = box.width; height = box.height;
    var scale = Math.min(devicePixelRatio || 1,2);
    canvas.width = Math.round(width*scale); canvas.height = Math.round(height*scale);
    ctx.setTransform(scale,0,0,scale,0,0);
    return true;
  }
  function paint(strength) {
    ctx.clearRect(0,0,width,height);
    var style = getComputedStyle(root), accent = style.getPropertyValue("--accent").trim();
    ctx.strokeStyle = accent; ctx.fillStyle = accent; ctx.lineWidth = .7;
    ctx.globalAlpha = .35 * Math.min(strength*2,1);
    ctx.beginPath(); edges.forEach(function (edge) { var a=points[edge[0]],b=points[edge[1]];ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y); }); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.beginPath(); points.forEach(function (p) {ctx.moveTo(p.x+1.15,p.y);ctx.arc(p.x,p.y,1.15,0,Math.PI*2);});ctx.fill();
  }
  function tick(now) {
    if (!active || document.hidden || quiet() || root.dataset.focus === "on") { stop(); return; }
    if (now-last < 30) { frame=requestAnimationFrame(tick); return; }
    var dt = Math.min((now-last)/33.33,2); last=now;
    var elapsed = now-started;
    var strength = held ? 1 : released ? Math.max(0,1-(now-released)/1400) : Math.max(0,Math.sin(Math.min(elapsed/2100,1)*Math.PI));
    var distance = 0;
    points.forEach(function (p) {
      var tx=p.ax+(p.dx+shift.x*.6)*strength, ty=p.ay+(p.dy+shift.y*.6)*strength;
      p.vx=(p.vx+(tx-p.x)*.095*dt)*Math.pow(.77,dt); p.vy=(p.vy+(ty-p.y)*.095*dt)*Math.pow(.77,dt);
      p.x+=p.vx*dt; p.y+=p.vy*dt; distance+=Math.abs(p.x-p.ax)+Math.abs(p.y-p.ay);
    });
    paint(strength); hero.dataset.orderState = held ? "held" : strength>.05 ? "reorganizing" : "settling";
    var recovery = released ? now-released : elapsed;
    if (!held && ((recovery>2200 && distance<points.length*.3) || recovery>4800)) { stop(); return; }
    frame=requestAnimationFrame(tick);
  }
  function play(button, hold) {
    stop();
    if (!visible || root.dataset.focus === "on" || document.hidden || !prepare(button)) return;
    active=button; held=hold && !quiet(); shift={x:0,y:0}; released=0;
    button.classList.add("is-playing"); canvas.hidden=false;
    document.dispatchEvent(new CustomEvent("site:notice",{detail:{zh:"你拨动了秩序。松手，看看它如何重新组织。",en:"You disturbed the order. Release it and watch it reorganize."}}));
    if (quiet()) {
      points.forEach(function(p){p.x=p.ax+p.dx*.65;p.y=p.ay+p.dy*.65;});
      paint(1); hero.dataset.orderState="static"; timer=setTimeout(stop,1800); return;
    }
    started=performance.now(); last=started-34; frame=requestAnimationFrame(tick);
  }
  hero.querySelectorAll("[data-order-word]").forEach(function (seed) {
    var button = document.createElement("button"); button.type="button"; button.className="order-trigger"; button.textContent=seed.textContent;
    seed.replaceWith(button); label(button);
    var suppress = false;
    button.addEventListener("pointerdown",function(e){
      if (e.button!==0 || e.isPrimary===false) return;
      suppress=false; start={x:e.clientX,y:e.clientY};
      // Native vertical scrolling remains available on touch screens.
      if (e.pointerType!=="touch") { play(button,true); button.setPointerCapture(e.pointerId); }
    });
    button.addEventListener("pointermove",function(e){
      if (!start) return;
      var dx=e.clientX-start.x,dy=e.clientY-start.y;
      if (!active && Math.abs(dx)>8 && Math.abs(dx)>Math.abs(dy)) { play(button,true); button.setPointerCapture(e.pointerId); }
      if (active===button && Math.hypot(dx,dy)>4) shift={x:Math.max(-140,Math.min(140,dx)),y:Math.max(-100,Math.min(100,dy))};
    });
    button.addEventListener("pointerup",function(){if(active===button){held=false;released=performance.now();suppress=true;}start=null;});
    button.addEventListener("pointercancel",function(){start=null;stop();});
    button.addEventListener("lostpointercapture",function(){if(held){held=false;released=performance.now();}start=null;});
    button.addEventListener("click",function(){if(suppress){suppress=false;return;}play(button,false);});
  });
  document.addEventListener("keydown",function(e){if(e.key==="Escape")stop();});
  document.addEventListener("visibilitychange",function(){if(document.hidden)stop();});
  document.addEventListener("site:language",function(){stop();hero.querySelectorAll(".order-trigger").forEach(label);});
  window.addEventListener("resize",stop,{passive:true}); window.addEventListener("blur",function(){start=null;stop();}); window.addEventListener("beforeprint",stop);
  new MutationObserver(function(){if(quiet() || root.dataset.focus==="on")stop();}).observe(root,{attributes:true,attributeFilter:["data-motion","data-focus"]});
  if(media.addEventListener)media.addEventListener("change",stop);
  if("IntersectionObserver" in window)new IntersectionObserver(function(entries){visible=entries[0].isIntersecting;if(!visible)stop();}).observe(hero);
})();

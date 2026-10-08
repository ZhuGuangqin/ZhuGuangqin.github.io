(function (factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else api.mount(document);
})(function () {
  "use strict";
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function proximity(a, b) { return clamp(1 - Math.hypot(a.x-b.x, a.y-b.y) / 310, 0, 1); }
  function geometry(points, phase) {
    var blend = proximity(points[0], points[1]), paths = [];
    points.forEach(function (p, field) {
      for (var line = 0; line < 32; line++) {
        var coords = [], radius = 32 + line * 5.8;
        for (var step = 0; step <= 144; step++) {
          var angle = step / 144 * Math.PI * 2;
          var wave = Math.sin(angle * 3 + phase + field * Math.PI) * (5 + blend * 22);
          var interaction = Math.sin(angle * 7 - phase * 1.3 + line * .19) * blend * 28;
          var r = radius + wave + interaction;
          coords.push([p.x + Math.cos(angle + field * .15) * r * 1.3, p.y + Math.sin(angle) * r * .88]);
        }
        paths.push(coords);
      }
    });
    return paths;
  }
  function pathData(coords) { return coords.map(function (p,i) { return (i ? "L" : "M") + p[0].toFixed(2) + "," + p[1].toFixed(2); }).join("") + "Z"; }
  function svgExport(points, phase, ink, paper) {
    // Colours come from computed CSS, restricted before embedding in the export.
    function colour(value, fallback) { return /^(#[0-9a-f]{3,8}|rgba?\([\d.,%\s]+\))$/i.test(value) ? value : fallback; }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 430"><title>Between two fields — visitor composition</title><rect width="800" height="430" fill="'+colour(paper,"#f7faf5")+'"/><g fill="none" stroke="'+colour(ink,"#276b50")+'" stroke-width=".8" opacity=".7">' + geometry(points,phase).map(function (path) { return '<path d="'+pathData(path)+'"/>'; }).join("") + '</g></svg>';
  }
  function mount(doc) {
    var lab = doc.querySelector("[data-line-lab]"); if (!lab) return;
    var root = doc.documentElement, stage = lab.querySelector("[data-line-stage]"), group = lab.querySelector("[data-line-paths]");
    var handles = Array.from(lab.querySelectorAll("[data-line-handle]")), slider = lab.querySelector("input"), play = lab.querySelector("[data-line-play]"), state = lab.querySelector("[data-line-state]");
    var media = matchMedia("(prefers-reduced-motion: reduce)"), points = [{x:224,y:215},{x:576,y:215}], phase = 1.25, running = false, visible = false, active = true, frame = 0, last = 0, label = "", drag = null;
    var paths = Array.from({length:64}, function (_,i) { var path=doc.createElementNS("http://www.w3.org/2000/svg","path"); path.setAttribute("opacity",i<32?".6":".8");group.appendChild(path);return path; });
    function en() { return root.dataset.lang === "en"; }
    function motion() { return !media.matches && root.dataset.motion !== "off" && root.dataset.focus !== "on"; }
    function render() {
      geometry(points,phase).forEach(function (coords,i) { paths[i].setAttribute("d",pathData(coords)); });
      // The SVG widens on phones, while the two controls remain within the touch surface.
      var scale = stage.clientWidth <= 700 && matchMedia("(max-width:700px)").matches ? 1.49 : 1;
      handles.forEach(function (handle,i) { handle.style.left = ((points[i].x/800-.5)*scale+.5)*100+"%"; handle.style.top=points[i].y/430*100+"%"; });
      var blend=proximity(points[0],points[1]),next=blend>.35?"together":blend>0?"approaching":"apart";
      if (next!==label) { label=next; state.textContent=next==="together"?(en()?"A shared texture emerges":"交织，生出新的纹理"):next==="approaching"?(en()?"Two fields, moving closer":"两束线，正在靠近"):(en()?"Two independent fields":"两束独立的线"); }
    }
    function stopFrame() { cancelAnimationFrame(frame);frame=0;last=0; }
    function tick(time) {
      frame=0;
      if (!running || !lab.open || !visible || !active || doc.hidden || !motion()) return;
      if (!last || time-last>45) { phase=(phase+.018)%(Math.PI*2);slider.value=Math.round(phase*100);render();last=time; }
      frame=requestAnimationFrame(tick);
    }
    function sync() {
      play.disabled=!motion();
      play.setAttribute("aria-pressed",String(running&&motion()));
      play.querySelector('[data-i18n="zh"]').textContent=running&&motion()?"暂停光场":"让光场流动";
      play.querySelector('[data-i18n="en"]').textContent=running&&motion()?"Pause the field":"Set it in motion";
      stopFrame();if(running&&motion()&&lab.open&&visible&&active&&!doc.hidden)frame=requestAnimationFrame(tick);
      label="";render();
    }
    function setPoint(index,x,y) {
      var mobile=matchMedia("(max-width:700px)").matches;
      points[index]={x:clamp(x,mobile?165:65,mobile?635:735),y:clamp(y,60,370)};render();
    }
    handles.forEach(function (handle,i) {
      handle.addEventListener("pointerdown",function(e){if(e.button!==0||e.isPrimary===false)return;drag={id:e.pointerId,index:i,x:e.clientX,y:e.clientY,point:{x:points[i].x,y:points[i].y},touch:e.pointerType!=="mouse"};handle.setPointerCapture(e.pointerId);});
      handle.addEventListener("pointermove",function(e){if(!drag||drag.id!==e.pointerId)return;var box=stage.getBoundingClientRect(),scale=matchMedia("(max-width:700px)").matches?1.49:1;setPoint(i,drag.point.x+(e.clientX-drag.x)*800/box.width/scale,drag.touch?drag.point.y:drag.point.y+(e.clientY-drag.y)*430/box.height);});
      ["pointerup","pointercancel","lostpointercapture"].forEach(function(type){handle.addEventListener(type,function(){drag=null;});});
      handle.addEventListener("keydown",function(e){var move={ArrowLeft:[-12,0],ArrowRight:[12,0],ArrowUp:[0,-12],ArrowDown:[0,12]}[e.key];if(move){e.preventDefault();setPoint(i,points[i].x+move[0]*(e.shiftKey?3:1),points[i].y+move[1]*(e.shiftKey?3:1));}});
    });
    slider.addEventListener("input",function(){phase=Number(slider.value)/100;render();});
    play.addEventListener("click",function(){running=!running;sync();});
    lab.querySelector("[data-line-reset]").addEventListener("click",function(){points=[{x:224,y:215},{x:576,y:215}];phase=1.25;slider.value=125;running=false;sync();});
    lab.querySelector("[data-line-save]").addEventListener("click",function(){var style=getComputedStyle(stage),blob=new Blob([svgExport(points,phase,style.color,style.backgroundColor)],{type:"image/svg+xml"}),url=URL.createObjectURL(blob),a=doc.createElement("a");a.href=url;a.download="between-two-fields.svg";a.click();setTimeout(function(){URL.revokeObjectURL(url);},30000);});
    lab.addEventListener("toggle",sync);
    new IntersectionObserver(function(entries){visible=entries[0].isIntersecting;sync();},{threshold:.1}).observe(stage);
    new ResizeObserver(function(){var mobile=matchMedia("(max-width:700px)").matches;points=points.map(function(p){return {x:clamp(p.x,mobile?165:65,mobile?635:735),y:p.y};});render();}).observe(stage);
    new MutationObserver(sync).observe(root,{attributes:true,attributeFilter:["data-motion","data-focus"]});
    media.addEventListener("change",sync);doc.addEventListener("visibilitychange",sync);doc.addEventListener("site:language",sync);
    window.addEventListener("blur",function(){active=false;sync();});window.addEventListener("focus",function(){active=true;sync();});
    window.addEventListener("beforeprint",stopFrame);window.addEventListener("afterprint",sync);
    function reveal(){lab.open=true;requestAnimationFrame(function(){lab.scrollIntoView({block:"start",behavior:"instant"});});}
    if(location.hash==="#line-lab")reveal();
    window.addEventListener("hashchange",function(){if(location.hash==="#line-lab")reveal();});
    render();
  }
  return {proximity:proximity,geometry:geometry,pathData:pathData,svgExport:svgExport,mount:mount};
});

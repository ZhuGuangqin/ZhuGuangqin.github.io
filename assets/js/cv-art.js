(function () {
  "use strict";
  var root = document.documentElement;
  var cv = document.querySelector(".cv-system");
  if (!cv) return;
  var sculpture = cv.querySelector("[data-cv-sculpture]");
  var scene = cv.querySelector("[data-cv-scene]");
  var svg = scene.querySelector("svg");
  var lineGroup = svg.querySelector("[data-cv-flow-lines]");
  var backGroup = svg.querySelector("[data-cv-flow-back]");
  var scan = svg.querySelector("[data-cv-flow-scan]");
  var note = cv.querySelector("[data-cv-phase-note]");
  var pulseButton = cv.querySelector("[data-cv-pulse]");
  var media = window.matchMedia("(prefers-reduced-motion: reduce)");
  var phaseNotes = {
    "2017": ["2017.09 — 2022.06 · 中医学（实验班），医学学士", "Sep 2017 — Jun 2022 · Bachelor of Medicine, Chinese Medicine (experimental class)"],
    "2022": ["2022.09 — 2024.08 · 中医基础理论硕士研究生（转段）", "Sep 2022 — Aug 2024 · Master's studies in Basic Theory of Chinese Medicine (transfer to PhD)"],
    "2024": ["2024.09 — 至今 · 中医基础理论博士研究生", "Sep 2024 — present · PhD student in Basic Theory of Chinese Medicine"]
  };
  var phaseModes = { "2017":0, "2022":1, "2024":2 };
  var desired = [0, 0, 1], weights = [0, 0, 1];
  var width = 1200, height = 460, lineCount = 60, steps = 80;
  var paths = [], backPaths = [], shapes = [], view = null;
  var frame = null, lastTime = 0, elapsed = 2.8;
  var inView = true, printing = false;
  var pointer = { x:0, y:0, tx:0, ty:0, strength:0, target:0 };
  var pulseStarted = -100;
  var ns = "http://www.w3.org/2000/svg";
  function allowsMotion() { return !media.matches && root.dataset.motion !== "off" && root.dataset.focus !== "on" && !printing; }
  function running() { return allowsMotion() && inView && !document.hidden; }
  function makePath(className, parent) { var path = document.createElementNS(ns, "path"); path.setAttribute("class", className); parent.appendChild(path); return path; }
  function buildGeometry() {
    lineCount = width < 650 ? 36 : 60;
    steps = width < 650 ? 56 : 80;
    lineGroup.replaceChildren(); backGroup.replaceChildren(); paths = []; backPaths = [];
    shapes = [new Float32Array(lineCount * (steps + 1) * 3), new Float32Array(lineCount * (steps + 1) * 3), new Float32Array(lineCount * (steps + 1) * 3)];
    for (var i = 0; i < lineCount; i++) {
      paths.push(makePath(i % 10 === 0 ? "cv-flow-accent" : "cv-flow-silver", lineGroup));
      var v = i / (lineCount - 1) * Math.PI * 2;
      for (var j = 0; j <= steps; j++) {
        var u = j / steps * Math.PI * 2;
        var offset = (i * (steps + 1) + j) * 3;
        shapes[0][offset] = (j / steps - .5) * 7.5;
        shapes[0][offset + 1] = (i / (lineCount - 1) - .5) * 3.4;
        shapes[0][offset + 2] = Math.sin(u * 1.5 + v) * .6;
        var r = 1.65 + .6 * Math.cos(v);
        shapes[1][offset] = r * Math.cos(u);
        shapes[1][offset + 1] = r * Math.sin(u);
        shapes[1][offset + 2] = .6 * Math.sin(v);
        var knotR = 1.8 + .65 * Math.cos(3 * u) + .3 * Math.cos(v);
        shapes[2][offset] = knotR * Math.cos(2 * u);
        shapes[2][offset + 1] = knotR * Math.sin(2 * u);
        shapes[2][offset + 2] = .75 * Math.sin(3 * u) + .3 * Math.sin(v);
      }
    }
    for (var k = 0; k < 24; k++) backPaths.push(makePath("cv-flow-back", backGroup));
  }
  function resize() {
    view = scene.getBoundingClientRect();
    if (!view.width || !view.height) return;
    width = view.width; height = view.height;
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    inView = view.bottom > 0 && view.top < window.innerHeight;
    buildGeometry(); draw(); updateMotion();
  }
  function draw() {
    var t = elapsed;
    var scale = Math.min(width / 6.2, height / 3.1);
    var ax = .98 + Math.sin(t * .19) * .24 + pointer.y * .4;
    var ay = t * .24 + pointer.x * .65;
    var az = Math.sin(t * .12) * .25;
    var cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), sy = Math.sin(ay), cz = Math.cos(az), sz = Math.sin(az);
    var pulseAge = elapsed - pulseStarted;
    var pulse = pulseAge < 3 ? Math.exp(-pulseAge * 1.25) : 0;
    var lastD = "";
    for (var i = 0; i < lineCount; i++) {
      var d = "";
      for (var j = 0; j <= steps; j++) {
        var o = (i * (steps + 1) + j) * 3;
        var x = 0, y = 0, z = 0;
        for (var mode = 0; mode < 3; mode++) { x += shapes[mode][o] * weights[mode]; y += shapes[mode][o + 1] * weights[mode]; z += shapes[mode][o + 2] * weights[mode]; }
        z += Math.sin(j / steps * Math.PI * 3 + i * .12 + t) * .13;
        var yy = y * cx - z * sx, zz = y * sx + z * cx;
        var xx = x * cy + zz * sy;
        z = -x * sy + zz * cy;
        x = xx * cz - yy * sz; y = xx * sz + yy * cz;
        var perspective = 7 / (7 - z);
        var px = width / 2 + x * scale * perspective;
        var py = height / 2 + y * scale * perspective;
        var dx = px - (pointer.x + 1) * width / 2, dy = py - (pointer.y + 1) * height / 2;
        var distance = Math.sqrt(dx * dx + dy * dy);
        var influence = Math.exp(-distance * distance / (width < 650 ? 18000 : 42000));
        px += dx * influence * pointer.strength * .6;
        py += dy * influence * pointer.strength * .6;
        var radius = Math.sqrt(x * x + y * y);
        var ripple = Math.sin(radius * 8 - pulseAge * 11) * pulse * 26;
        px += Math.sin(j / steps * Math.PI * 2) * ripple;
        py += Math.cos(j / steps * Math.PI * 2) * ripple;
        d += (j ? "L" : "M") + px.toFixed(1) + "," + py.toFixed(1);
      }
      paths[i].setAttribute("d", d);
      if (i === Math.floor(lineCount * .54)) lastD = d;
    }
    scan.setAttribute("d", lastD); scan.setAttribute("stroke-dashoffset", (-t * 90).toFixed(1));
    for (var k = 0; k < backPaths.length; k++) {
      var backD = "";
      for (var q = 0; q <= 36; q++) {
        var bx = q / 36 * width;
        var base = (k / 23 - .5) * height * 1.35;
        var by = height / 2 + base + Math.sin(q / 36 * Math.PI * 2.2 + t * .45 + k * .13) * height * .12;
        by += Math.sin(q / 36 * Math.PI * 5 + t + k * .2) * 13 * pointer.strength;
        backD += (q ? "L" : "M") + bx.toFixed(1) + "," + by.toFixed(1);
      }
      backPaths[k].setAttribute("d", backD);
    }
  }
  function tick(now) {
    frame = null;
    if (!running()) return;
    var interval = width < 650 ? 33 : 24;
    if (!lastTime) lastTime = now - interval;
    var delta = now - lastTime;
    if (delta >= interval) {
      var dt = Math.min(delta / 1000, .08); elapsed += dt; lastTime = now;
      var smooth = 1 - Math.exp(-dt * 5);
      for (var i = 0; i < 3; i++) weights[i] += (desired[i] - weights[i]) * smooth;
      pointer.x += (pointer.tx - pointer.x) * smooth; pointer.y += (pointer.ty - pointer.y) * smooth;
      pointer.strength += (pointer.target - pointer.strength) * smooth;
      draw();
    }
    frame = requestAnimationFrame(tick);
  }
  function updateMotion() {
    cv.dataset.cvActive = String(running());
    pulseButton.disabled = !allowsMotion();
    if (running()) { if (frame === null) { lastTime = 0; frame = requestAnimationFrame(tick); } }
    else { if (frame !== null) cancelAnimationFrame(frame); frame = null; weights = desired.slice(); pointer.strength = 0; draw(); }
  }
  cv.querySelectorAll("[data-cv-phase]").forEach(function (button) {
    button.addEventListener("click", function () {
      var phase = button.dataset.cvPhase;
      sculpture.dataset.phase = phase;
      desired = [0, 0, 0]; desired[phaseModes[phase]] = 1;
      cv.querySelectorAll("[data-cv-phase]").forEach(function (item) { item.setAttribute("aria-pressed", String(item === button)); });
      note.querySelector('[data-i18n="zh"]').textContent = phaseNotes[phase][0];
      note.querySelector('[data-i18n="en"]').textContent = phaseNotes[phase][1];
      if (!running()) { weights = desired.slice(); draw(); }
    });
  });
  scene.addEventListener("pointermove", function (event) {
    if (!allowsMotion()) return;
    var box = scene.getBoundingClientRect();
    pointer.tx = Math.max(-1, Math.min(1, (event.clientX - box.left) / box.width * 2 - 1));
    pointer.ty = Math.max(-1, Math.min(1, (event.clientY - box.top) / box.height * 2 - 1));
    pointer.target = event.pointerType === "mouse" || event.buttons ? 1 : .4;
  });
  scene.addEventListener("pointerleave", function () { pointer.target = 0; pointer.tx = 0; pointer.ty = 0; });
  scene.addEventListener("pointerdown", function () { if (allowsMotion()) pulseStarted = elapsed; });
  pulseButton.addEventListener("click", function () { if (allowsMotion()) pulseStarted = elapsed; });
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(scene);
  else window.addEventListener("resize", resize);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) { inView = entries[entries.length - 1].isIntersecting; updateMotion(); }, { threshold:.01 }).observe(scene);
    var links = cv.querySelectorAll(".cv-index a");
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (link) { if (link.hash === "#" + entry.target.id) link.setAttribute("aria-current", "location"); else link.removeAttribute("aria-current"); });
      });
    }, { rootMargin:"-15% 0px -60% 0px" });
    cv.querySelectorAll(".cv-section[id]").forEach(function (section) { sectionObserver.observe(section); });
  }
  var shutter = cv.querySelector(".cv-shutter"), jumpTimer = null, clearTimer = null, pendingTarget = null;
  function jump(target, hash) {
    var previous = root.style.scrollBehavior; root.style.scrollBehavior = "auto";
    target.scrollIntoView({ behavior:"auto", block:"start" }); root.style.scrollBehavior = previous;
    if (location.hash !== hash) history.pushState(null, "", hash);
    if (target.tagName === "DETAILS") target.open = true;
    var heading = target.tagName === "DETAILS" ? target.querySelector("summary") : (target.querySelector("h1,h2") || target); heading.setAttribute("tabindex", "-1"); heading.focus({ preventScroll:true });
    pendingTarget = null;
  }
  cv.querySelectorAll(".cv-index a,.cv-top").forEach(function (link) {
    link.addEventListener("click", function (event) {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      var target = document.getElementById(link.hash.slice(1)); if (!target) return;
      event.preventDefault(); clearTimeout(jumpTimer); clearTimeout(clearTimer); shutter.classList.remove("is-changing");
      if (!allowsMotion()) { jump(target, link.hash); return; }
      pendingTarget = [target, link.hash];
      // Restart the short chapter curtain. Native wheel and touch scrolling are never intercepted.
      requestAnimationFrame(function () { shutter.classList.add("is-changing"); });
      jumpTimer = setTimeout(function () { jump(target, link.hash); }, 380);
      clearTimer = setTimeout(function () { shutter.classList.remove("is-changing"); }, 850);
    });
  });
  function preferencesChanged() {
    updateMotion();
    if (!allowsMotion() && pendingTarget) { clearTimeout(jumpTimer); clearTimeout(clearTimer); shutter.classList.remove("is-changing"); jump(pendingTarget[0], pendingTarget[1]); }
  }
  new MutationObserver(preferencesChanged).observe(root, { attributes:true, attributeFilter:["data-motion", "data-focus"] });
  if (media.addEventListener) media.addEventListener("change", preferencesChanged);
  document.addEventListener("visibilitychange", updateMotion);
  var printState = [];
  window.addEventListener("beforeprint", function () { printing = true; updateMotion(); printState = []; cv.querySelectorAll("details").forEach(function (item) { printState.push([item, item.open]); item.open = true; }); });
  window.addEventListener("afterprint", function () { printState.forEach(function (entry) { entry[0].open = entry[1]; }); printState = []; printing = false; updateMotion(); });
  cv.querySelector("[data-cv-print]").addEventListener("click", function () { window.print(); });
  resize(); updateMotion();
})();

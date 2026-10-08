/* Know Me: native scrolling is the camera. All public content remains in the document. */
(function () {
  "use strict";
  var root = document.documentElement, cv = document.querySelector('.cv-system');
  if (!cv) return;
  var media = matchMedia('(prefers-reduced-motion: reduce)');
  var opening = cv.querySelector('.cv-opening'), blocks = cv.querySelector('.cv-block-scene');
  var blockItems = Array.from(cv.querySelectorAll('.cv-block'));
  var cinema = cv.querySelector('.cv-cinema'), film = cv.querySelector('.cv-film-track');
  var frames = Array.from(cv.querySelectorAll('.cv-film-frame'));
  var prev = cv.querySelector('[data-cv-prev]'), next = cv.querySelector('[data-cv-next]');
  var tunnel = cv.querySelector('.cv-tunnel'), stage = cv.querySelector('.cv-tunnel__stage');
  var works = Array.from(cv.querySelectorAll('[data-cv-work]'));
  var select = cv.querySelector('#cv-work-select'), driftButton = cv.querySelector('[data-cv-drift]');
  var reader = cv.querySelector('#cv-work-reader'), since = cv.querySelector('.cv-since');
  var contact = cv.querySelector('.cv-contact'), loader = document.querySelector('.cv-loader');
  var replay = cv.querySelector('[data-cv-replay]');
  var bounds = {}, width = 1200, height = 450, viewport = innerHeight;
  var raf = null, scrollFrame = null, previousTime = 0, drift = 0, drifting = true, offset = 0;
  var selected = 0, currentFrame = 0, forcedSelection = false, opened = null, dragging = null;
  var printing = false, hidden = document.hidden, loaderTimer = null, loaderRemove = null, loaderOpener = null;
  var motion = true, loaderStart = performance.now();
  function en() { return root.dataset.lang === 'en'; }
  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
  function scrollInstant(top) { var previous = root.style.scrollBehavior; root.style.scrollBehavior = 'auto'; window.scrollTo({ top:top, behavior:'auto' }); root.style.scrollBehavior = previous; }
  function allowed() { return !media.matches && root.dataset.motion !== 'off' && root.dataset.focus !== 'on' && !printing; }
  function topOffset() { return innerWidth <= 700 ? 104 : 120; }
  function progress(name) { var b = bounds[name]; return clamp((scrollY + topOffset() - b.top) / Math.max(1, b.height - viewport + topOffset()), 0, 1); }
  function onScreen(name) { var b = bounds[name]; return !!b && b.top < scrollY + viewport && b.top + b.height > scrollY + topOffset(); }
  function measure() {
    viewport = innerHeight;
    // A tall or localized grid reads in normal document flow instead of pinning below the screen.
    var blockStage = blocks.querySelector('.cv-block-stage');
    blocks.classList.toggle('is-flowing', innerWidth <= 700 || blockStage.scrollHeight > viewport - topOffset());
    [['opening', opening], ['blocks', blocks], ['cinema', cinema], ['tunnel', tunnel], ['since', since], ['contact', contact]].forEach(function (pair) {
      var box = pair[1].getBoundingClientRect(); bounds[pair[0]] = { top:box.top + scrollY, height:box.height };
    });
    var box = stage.getBoundingClientRect(); width = box.width; height = box.height;
    renderScroll(); schedule();
  }
  function frameProgress(index, focus) {
    index = clamp(index, 0, frames.length - 1);
    currentFrame = index;
    if (!motion) { frames[index].scrollIntoView({ behavior:'auto', block:'center' }); }
    else {
      var range = Math.max(1, bounds.cinema.height - viewport + topOffset());
      scrollInstant(bounds.cinema.top - topOffset() + range * index / (frames.length - 1));
      renderScroll();
    }
    if (focus) frames[index].focus({ preventScroll:true });
  }
  function renderScroll() {
    if (!Object.keys(bounds).length) return;
    var p = progress('opening');
    opening.style.setProperty('--cv-opening-scale', motion ? (1 + p * .14).toFixed(3) : '1');
    blockItems.forEach(function (item, i) {
      // Reveal each flat panel from top to bottom during entry. All panels are open at the reading stop.
      var arrival = clamp((scrollY + viewport - bounds.blocks.top - 100 - i * 20) / Math.min(360, viewport * .42), 0, 1);
      var mask = motion ? Math.pow(1 - arrival, 3) * 100 : 0;
      item.style.setProperty('--block-mask', mask.toFixed(2) + '%');
    });
    var cp = progress('cinema');
    var available = Math.max(0, film.scrollWidth - (innerWidth - innerWidth * .07) + 20);
    film.style.setProperty('--film-x', motion ? (-cp * available).toFixed(1) + 'px' : '0px');
    cinema.style.setProperty('--film-progress', cp.toFixed(4));
    cinema.style.setProperty('--film-rotation', (cp * 60).toFixed(1) + 'deg');
    currentFrame = Math.round(cp * (frames.length - 1));
    prev.disabled = motion && currentFrame === 0; next.disabled = motion && currentFrame === frames.length - 1;
    cv.querySelector('[data-cv-frame-count]').textContent = (currentFrame + 1) + ' / ' + frames.length;
    frames.forEach(function (item, i) { if (i === currentFrame) item.setAttribute('aria-current','step'); else item.removeAttribute('aria-current'); });
    if (!forcedSelection) offset = progress('tunnel') * (works.length - 1) + drift;
    tunnel.style.setProperty('--tunnel-turn', motion ? ((progress('tunnel') - .5) * 15).toFixed(1) + 'deg' : '0deg');
    since.style.setProperty('--since-turn', motion ? ((progress('since') - .5) * 55).toFixed(1) + 'deg' : '0deg');
    contact.style.setProperty('--contact-turn', motion ? ((progress('contact') - .5) * 28).toFixed(1) + 'deg' : '0deg');
    renderWorks();
  }
  function renderWorks() {
    if (!width || !height) return;
    var nearest = 0, nearestDepth = Infinity;
    works.forEach(function (item, i) {
      // Modular depth keeps every original record reachable; scroll and drift advance one camera.
      var distance = ((i - offset) % works.length + works.length) % works.length;
      if (distance > works.length - .5) distance -= works.length;
      var visible = distance >= -.48 && distance < 5.8;
      item.style.visibility = visible ? 'visible' : 'hidden';
      item.style.pointerEvents = visible ? 'auto' : 'none';
      item.tabIndex = visible ? 0 : -1;
      item.setAttribute('aria-hidden', String(!visible));
      if (!visible) return;
      if (distance >= -.4 && distance < nearestDepth) { nearest = i; nearestDepth = distance; }
      var depth = Math.max(0, distance);
      var angle = i * 2.39996 + offset * .06;
      var z = 100 - depth * 265;
      var radius = width < 600 ? width * .38 : Math.min(width * .36, 425);
      var x = Math.sin(angle) * radius, y = Math.cos(angle) * Math.min(height * .32, 155);
      if (forcedSelection && i === selected) { x = 0; y = 0; z = 160; }
      var tilt = Math.sin(angle) * -12;
      if (dragging && dragging.item === item) { x += dragging.dx; y += dragging.dy; z = 220; tilt = dragging.dx * .035; }
      item.style.transform = 'translate(-50%,-50%) translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,' + z.toFixed(1) + 'px) rotateY(' + tilt.toFixed(1) + 'deg)';
      item.style.zIndex = String(100 - Math.round(depth * 10));
      item.style.opacity = String(clamp(1.25 - depth * .14, .3, 1));
    });
    if (!forcedSelection && !reader.open) { selected = nearest; select.value = String(selected); }
  }
  function animate(now) {
    raf = null;
    if (!motion || hidden || !drifting || !onScreen('tunnel') || reader.open || dragging) { previousTime = 0; return; }
    if (!previousTime) previousTime = now;
    var delta = now - previousTime;
    if (delta >= 32) {
      drift += Math.min(delta / 1000, .1) * .16;
      offset = progress('tunnel') * (works.length - 1) + drift;
      forcedSelection = false; renderWorks(); previousTime = now;
    }
    raf = requestAnimationFrame(animate);
  }
  function schedule() { if (motion && !hidden && drifting && onScreen('tunnel') && !reader.open && !dragging && raf === null) raf = requestAnimationFrame(animate); }
  function requestScroll() {
    if (scrollFrame !== null) return;
    scrollFrame = requestAnimationFrame(function () { scrollFrame = null; if (drifting) forcedSelection = false; renderScroll(); schedule(); });
  }
  function syncDrift() {
    driftButton.setAttribute('aria-pressed', String(drifting));
    driftButton.querySelector('i').className = 'fa-solid ' + (drifting ? 'fa-pause' : 'fa-play');
    driftButton.querySelector('[data-i18n="zh"]').textContent = drifting ? '暂停漂流' : '继续漂流';
    driftButton.querySelector('[data-i18n="en"]').textContent = drifting ? 'Pause drift' : 'Resume drift';
    driftButton.disabled = !motion; schedule();
  }
  function choose(index) {
    selected = clamp(index, 0, works.length - 1); select.value = String(selected);
    drifting = false; forcedSelection = true; offset = selected; syncDrift(); renderWorks();
  }
  function openWork(item) {
    if (typeof reader.showModal !== 'function') { item.nextElementSibling.content.querySelector('a[href]').click(); return; }
    opened = item; selected = Number(item.dataset.cvWork); choose(selected);
    var template = cv.querySelector('[data-cv-work-detail="' + selected + '"]');
    reader.querySelector('[data-cv-reader-body]').replaceChildren(template.content.cloneNode(true));
    reader.showModal(); reader.scrollTop = 0;
  }
  function dissolve(item) {
    if (!motion || !item || !onScreen('tunnel')) return;
    var box = item.getBoundingClientRect(), face = item.querySelector('.cv-work__face');
    var overlay = document.createElement('div'); overlay.className = 'cv-dissolve'; overlay.setAttribute('aria-hidden','true');
    var rows = 6, cols = 5;
    for (var i = 0; i < rows * cols; i++) {
      var piece = document.createElement('div'); piece.className = 'cv-dissolve__piece';
      piece.style.cssText = 'left:' + box.left + 'px;top:' + box.top + 'px;width:' + box.width + 'px;height:' + box.height + 'px;clip-path:inset(' + Math.floor(i / cols) / rows * 100 + '% ' + (cols - 1 - i % cols) / cols * 100 + '% ' + (rows - 1 - Math.floor(i / cols)) / rows * 100 + '% ' + (i % cols) / cols * 100 + '%);';
      var clone = face.cloneNode(true); clone.querySelectorAll('[id]').forEach(function (node) { node.removeAttribute('id'); }); piece.appendChild(clone); overlay.appendChild(piece);
      piece.animate([{ transform:'translate(0,0) scale(1)', opacity:1 }, { transform:'translate(' + ((i % cols - 2) * 40 + Math.sin(i * 9) * 35) + 'px,' + (-80 - Math.floor(i / cols) * 25) + 'px) rotate(' + (i % 2 ? 8 : -8) + 'deg) scale(.5)', opacity:0 }], { duration:640 + i % 5 * 30, easing:'cubic-bezier(.16,1,.3,1)', fill:'forwards' });
    }
    document.body.appendChild(overlay); item.classList.add('is-dissolving');
    setTimeout(function () { overlay.remove(); item.classList.remove('is-dissolving'); }, 850);
  }
  works.forEach(function (item) {
    var suppressClick = false;
    item.addEventListener('dragstart', function (event) { event.preventDefault(); });
    item.addEventListener('click', function (event) { if (suppressClick) { event.preventDefault(); suppressClick = false; return; } openWork(item); });
    item.addEventListener('pointerdown', function (event) {
      if (!motion || event.button !== 0) return;
      drifting = false; syncDrift(); dragging = { item:item, startX:event.clientX, startY:event.clientY, dx:0, dy:0, id:event.pointerId };
      item.setPointerCapture(event.pointerId);
    });
    item.addEventListener('pointermove', function (event) {
      if (!dragging || dragging.item !== item) return;
      dragging.dx = event.clientX - dragging.startX; dragging.dy = (event.clientY - dragging.startY) * .35;
      renderWorks();
    });
    item.addEventListener('pointerup', function () {
      if (!dragging || dragging.item !== item) return;
      var didDrag = Math.abs(dragging.dx) > 12;
      dragging = null; renderWorks();
      if (didDrag) { suppressClick = true; openWork(item); }
    });
    item.addEventListener('pointercancel', function () { dragging = null; renderWorks(); });
  });
  reader.querySelector('[data-cv-close]').addEventListener('click', function () { reader.close(); });
  reader.addEventListener('click', function (event) { if (event.target !== reader) return; var box = reader.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) reader.close(); });
  reader.addEventListener('close', function () { if (opened) { dissolve(opened); opened.focus({ preventScroll:true }); } schedule(); });
  select.addEventListener('change', function () { choose(Number(select.value)); });
  cv.querySelector('[data-cv-read]').addEventListener('click', function () { choose(Number(select.value)); openWork(works[selected]); });
  driftButton.addEventListener('click', function () { if (!motion) return; drifting = !drifting; forcedSelection = false; drift = offset - progress('tunnel') * (works.length - 1); syncDrift(); });
  prev.addEventListener('click', function () { frameProgress(currentFrame - 1, true); });
  next.addEventListener('click', function () { frameProgress(currentFrame + 1, true); });
  frames.forEach(function (item, i) { item.addEventListener('keydown', function (event) { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); frameProgress(i + (event.key === 'ArrowRight' ? 1 : -1), true); } }); item.addEventListener('focusin', function () { if (motion && Math.abs(i - currentFrame) > 1) frameProgress(i, false); }); });
  contact.addEventListener('pointermove', function (event) { if (!motion || event.pointerType !== 'mouse') return; var box = contact.getBoundingClientRect(); contact.style.setProperty('--contact-x', ((event.clientX - box.left - box.width / 2) * .025).toFixed(1) + 'px'); contact.style.setProperty('--contact-y', ((event.clientY - box.top - box.height / 2) * .025).toFixed(1) + 'px'); });
  contact.addEventListener('pointerleave', function () { contact.style.setProperty('--contact-x','0px'); contact.style.setProperty('--contact-y','0px'); });
  function finishLoader() {
    clearTimeout(loaderTimer); clearTimeout(loaderRemove);
    if (!root.dataset.cvLoading) return;
    root.dataset.cvLoading = motion ? 'leaving' : '';
    loader.setAttribute('aria-hidden','true');
    loaderRemove = setTimeout(function () { root.removeAttribute('data-cv-loading'); if (loader.contains(document.activeElement) && loaderOpener) { if (!loaderOpener.matches('button,a,[tabindex]')) loaderOpener.setAttribute('tabindex','-1'); loaderOpener.focus({ preventScroll:true }); } }, motion ? 660 : 0);
  }
  function startLoader(opener) {
    if (!motion) return;
    clearTimeout(loaderTimer); clearTimeout(loaderRemove); loaderOpener = opener || cv.querySelector('h1');
    root.dataset.cvLoading = 'pending'; loader.setAttribute('aria-hidden','false'); loaderStart = performance.now();
    loaderTimer = setTimeout(finishLoader, 1350);
  }
  loader.querySelector('[data-cv-skip]').addEventListener('click', finishLoader);
  replay.addEventListener('click', function () { startLoader(replay); loader.querySelector('button').focus({ preventScroll:true }); });
  function syncMotion() {
    motion = allowed(); root.dataset.cvStatic = String(!motion);
    if (raf !== null) cancelAnimationFrame(raf); raf = null; previousTime = 0;
    if (!motion) { finishLoader(); cv.querySelector('.cv-dossier').open = true; }
    syncDrift(); measure();
  }
  new MutationObserver(syncMotion).observe(root, { attributes:true, attributeFilter:['data-motion','data-focus'] });
  if (media.addEventListener) media.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', function () { hidden = document.hidden; if (hidden && raf !== null) { cancelAnimationFrame(raf); raf = null; } schedule(); });
  function translateChooser() {
    var templates = Array.from(cv.querySelectorAll('[data-cv-work-detail]'));
    Array.from(select.options).forEach(function (option, i) { var title = templates[i].content.querySelector('h2 [data-i18n="' + (en() ? 'en' : 'zh') + '"]'); option.textContent = works[i].querySelector('small').textContent.trim().slice(0,4) + ' · ' + title.textContent; });
  }
  document.addEventListener('site:language', function () {
    translateChooser();
    syncDrift(); measure();
  });
  window.addEventListener('scroll', requestScroll, { passive:true });
  window.addEventListener('resize', measure);
  window.addEventListener('beforeprint', function () { printing = true; syncMotion(); });
  window.addEventListener('afterprint', function () { printing = false; syncMotion(); });
  translateChooser(); syncMotion();
  if (root.dataset.cvLoading) {
    loader.setAttribute('aria-hidden','false');
    var ready = document.fonts ? document.fonts.ready : Promise.resolve();
    ready.then(function () { loaderTimer = setTimeout(finishLoader, Math.max(0, 1000 - (performance.now() - loaderStart))); });
    loaderTimer = setTimeout(finishLoader, 1800);
  }
  if (document.fonts) document.fonts.ready.then(measure);
})();

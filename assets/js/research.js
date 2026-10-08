/* Academic tools. No framework, analytics, or third-party animation runtime. */
(function () {
  "use strict";
  var root = document.documentElement;
  var tools = document.getElementById("research-tools");
  if (!tools) return;
  var motionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
  function en() { return root.dataset.lang === "en"; }
  function t(zh, english) { return en() ? english : zh; }
  function read(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function save(key, value) { try { localStorage.setItem(key, value); } catch (e) {} }
  function reduced() { return motionMedia.matches || root.dataset.motion === "off"; }
  function normalize(value) { return String(value || "").normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim(); }
  var toastTimer;
  function toast(message) {
    var node = document.getElementById("research-toast");
    clearTimeout(toastTimer);
    node.textContent = message;
    node.classList.add("is-visible");
    toastTimer = setTimeout(function () { node.classList.remove("is-visible"); }, 2600);
  }
  document.addEventListener("site:notice", function (event) { toast(t(event.detail.zh, event.detail.en)); });
  async function copy(value) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        var field = document.createElement("textarea");
        field.value = value;
        field.style.cssText = "position:fixed;top:0;left:-9999px";
        document.body.appendChild(field);
        var previous = document.activeElement;
        field.select();
        var copied = document.execCommand("copy");
        field.remove();
        if (previous) previous.focus({ preventScroll: true });
        if (!copied) throw new Error("Copy unavailable");
      }
      toast(t("已复制，可以直接粘贴。", "Copied. Ready to paste."));
    } catch (e) {
      toast(t("未能自动复制，请手动选取复制。", "Could not copy automatically. Please select and copy the text."));
    }
  }
  document.addEventListener("click", function (event) {
    var button = event.target.closest("[data-copy-email], [data-copy-citation]");
    if (button) copy(button.dataset.copyEmail || button.dataset.copyCitation);
  });

  /* Persisted preferences; the OS reduction setting always takes priority. */
  var focusButton = document.getElementById("focus-toggle");
  var motionButton = document.getElementById("motion-toggle");
  function syncPreferences() {
    focusButton.setAttribute("aria-pressed", String(root.dataset.focus === "on"));
    focusButton.title = t("切换专注阅读，隐藏首屏与侧栏", "Focus reading: hide the hero and sidebar");
    motionButton.setAttribute("aria-pressed", String(!reduced()));
    motionButton.setAttribute("aria-disabled", String(motionMedia.matches));
    motionButton.title = motionMedia.matches ? t("已遵循系统的减少动效设置", "Following your system's reduced motion preference") : t("开关动效", "Toggle motion");
  }
  focusButton.addEventListener("click", function () {
    var focused = root.dataset.focus !== "on";
    root.dataset.focus = focused ? "on" : "off";
    save("site-focus", root.dataset.focus);
    syncPreferences();
    // Ensure a reader already near the bottom does not lose the article.
    if (focused) document.getElementById("main").scrollIntoView({ behavior: "auto", block: "start" });
    window.dispatchEvent(new Event("resize"));
    toast(focused ? t("专注阅读已开启，再点一次即可退出。", "Focus mode on. Click again to exit.") : t("已恢复完整页面。", "Full page restored."));
  });
  motionButton.addEventListener("click", function () {
    if (motionMedia.matches) { toast(t("系统已启用减少动效，本站会遵循该设置。", "Reduced motion is enabled in your system settings.")); return; }
    root.dataset.motion = root.dataset.motion === "off" ? "on" : "off";
    save("site-motion", root.dataset.motion);
    syncPreferences();
  });
  if (motionMedia.addEventListener) motionMedia.addEventListener("change", syncPreferences);
  syncPreferences();

  /* Seasons belong to the document, so every surface and route stays in sync. */
  var hero = document.querySelector(".research-hero");
  var seasons = { spring: ["春", "Spring", "东方青龙", "Azure Dragon"], summer: ["夏", "Summer", "南方朱雀", "Vermilion Bird"], "late-summer": ["长夏", "Late summer"], autumn: ["秋", "Autumn", "西方白虎", "White Tiger"], winter: ["冬", "Winter", "北方玄武", "Black Tortoise"] };
  // Deliberately in memory: a reload starts with four seasons, never a persisted unlock.
  var fiveSeasons = false, seasonProgress = 0, seasonCycle = ["spring", "summer", "autumn", "winter"];
  function season(name) {
    if (!seasons[name] || (name === "late-summer" && !fiveSeasons)) name = "spring";
    root.dataset.season = name;
    if (hero) {
      hero.querySelector(".season-orbit__han").textContent = seasons[name][0];
      hero.querySelector(".season-orbit__english").textContent = seasons[name][1].toUpperCase();
    }
    document.querySelectorAll("[data-season-choice]").forEach(function (button) { button.setAttribute("aria-pressed", String(button.dataset.seasonChoice === name)); });
    document.querySelectorAll("[data-celestial-group]").forEach(function (group) { group.classList.toggle("is-current", group.dataset.celestialGroup === name); });
    document.querySelector(".current-season-name").textContent = seasons[name][en() ? 1 : 0];
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = getComputedStyle(root).getPropertyValue("--canvas").trim();
  }
  season(read("site-season") || root.dataset.season);
  var seasonMenu = document.getElementById("season-menu");
  var seasonMenuToggle = document.getElementById("season-menu-toggle");
  function closeSeasons() { seasonMenu.hidden = true; seasonMenuToggle.setAttribute("aria-expanded", "false"); }
  seasonMenuToggle.addEventListener("click", function () { var show = seasonMenu.hidden; seasonMenu.hidden = !show; seasonMenuToggle.setAttribute("aria-expanded", String(show)); });
  function unlockLateSummer() {
    if (!hero || fiveSeasons) return;
    fiveSeasons = true;
    root.dataset.fiveSeasons = "on";
    hero.querySelector('[data-season-heading="zh"]').textContent = "在五季变化中，";
    hero.querySelector('[data-season-heading="en"]').textContent = "five seasons.";
    document.querySelectorAll('[data-season-choice="late-summer"], [data-season-discovery]').forEach(function (node) { node.hidden = false; });
    season("late-summer");
    toast(t("四时之外，你发现了长夏。刷新后重新隐藏。", "Beyond four seasons: late summer. Refresh to hide it again."));
  }
  document.querySelectorAll("[data-season-choice]").forEach(function (button) {
    var suppressClick = false;
    button.addEventListener("click", function () {
      if (suppressClick) { suppressClick = false; return; }
      var choice = button.dataset.seasonChoice;
      if (choice === "late-summer" && !fiveSeasons) return;
      var completed = false;
      if (hero && !fiveSeasons) {
        seasonProgress = choice === seasonCycle[seasonProgress] ? seasonProgress + 1 : choice === "spring" ? 1 : 0;
        completed = seasonProgress === seasonCycle.length;
      }
      if (completed) unlockLateSummer(); else season(choice);
      // Keep the visitor's normal four-season preference, even while the secret is selected.
      if (choice !== "late-summer") save("site-season", choice);
      if (seasonMenu.contains(button)) { closeSeasons(); seasonMenuToggle.focus(); }
    });
    if (!hero || button.dataset.seasonChoice !== "summer") return;
    var holdTimer = null, holding = false, holdWon = false, pointerStart = null;
    function clearHold() {
      clearTimeout(holdTimer); holdTimer = null; holding = false;
      button.classList.remove("is-discovering");
    }
    function startHold() {
      if (fiveSeasons || holding) return;
      holding = true; holdWon = false; button.classList.add("is-discovering");
      holdTimer = setTimeout(function () { holdWon = true; suppressClick = true; unlockLateSummer(); clearHold(); }, 1500);
    }
    button.addEventListener("pointerdown", function (event) {
      if (event.button !== 0 || event.isPrimary === false) return;
      suppressClick = false; holdWon = false;
      pointerStart = { x:event.clientX, y:event.clientY }; startHold();
    });
    button.addEventListener("pointermove", function (event) {
      if (pointerStart && Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)>12) clearHold();
    });
    button.addEventListener("pointerup", function () { if (holdWon) suppressClick = true; clearHold(); holdWon = false; pointerStart = null; });
    ["pointercancel", "pointerleave", "blur"].forEach(function (type) { button.addEventListener(type, function () { clearHold(); holdWon = false; pointerStart = null; }); });
    button.addEventListener("keydown", function (event) {
      if (event.key !== " " && event.key !== "Enter") return;
      if (fiveSeasons && !holdWon && !holding) return;
      event.preventDefault(); if (!event.repeat) startHold();
    });
    button.addEventListener("keyup", function (event) {
      if (event.key !== " " && event.key !== "Enter") return;
      if (!holding && !holdWon) return;
      event.preventDefault(); var won = holdWon; clearHold(); holdWon = false; suppressClick = false;
      if (!won) button.click();
    });
    document.addEventListener("visibilitychange", function () { if (document.hidden) { clearHold(); holdWon = false; } });
  });
  document.addEventListener("click", function (event) { if (!seasonMenu.contains(event.target) && !seasonMenuToggle.contains(event.target)) closeSeasons(); });
  document.addEventListener("keydown", function (event) { if (event.key === "Escape" && !seasonMenu.hidden) { closeSeasons(); seasonMenuToggle.focus(); } });
  document.addEventListener("site:language", function () { season(root.dataset.season); });
  new MutationObserver(function () { season(root.dataset.season); }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });

  /* Native, keyboard-accessible site search. The index is fetched on demand. */
  var dialog = document.getElementById("research-search");
  var input = document.getElementById("site-search-input");
  var results = document.getElementById("site-search-results");
  var status = document.getElementById("search-status");
  var index = null;
  var loading = null;
  var failed = false;
  var opener = null;
  var selected = -1;
  var inputTimer;
  function typeLabel(type) {
    var types = { page: ["页面", "Page"], publications: ["学术成果", "Publication"], talks: ["学术会议", "Talk"], portfolio: ["科研项目", "Project"], teaching: ["教学", "Teaching"] };
    return (types[type] || types.page)[en() ? 1 : 0];
  }
  function localUrl(path) {
    var url = new URL(path, location.href);
    if (url.origin !== location.origin) return null;
    if (en()) url.searchParams.set("lang", "en");
    else url.searchParams.set("lang", "zh");
    return url.href;
  }
  function markSelected(next, focus) {
    var links = results.querySelectorAll(".research-search__result");
    if (!links.length) return;
    selected = (next + links.length) % links.length;
    links.forEach(function (link, i) { link.classList.toggle("is-selected", i === selected); });
    if (focus) links[selected].focus({ preventScroll: true });
    links[selected].scrollIntoView({ block: "nearest", behavior: "auto" });
  }
  function renderSearch() {
    selected = -1;
    results.replaceChildren();
    input.placeholder = t("搜索标题、作者、期刊或研究关键词…", "Search titles, authors, journals or research topics…");
    if (failed) {
      status.textContent = t("搜索索引未能加载。可以重试，或从导航直接浏览。", "Could not load the search index. Retry or browse via the navigation.");
      var retry = document.createElement("button");
      retry.type = "button";
      retry.className = "research-search__retry";
      retry.textContent = t("重新加载", "Retry");
      retry.addEventListener("click", function () { failed = false; loadIndex(); });
      results.appendChild(retry);
      return;
    }
    if (!index) { status.textContent = t("正在加载本站内容…", "Loading site content…"); return; }
    var query = normalize(input.value);
    var words = query.split(" ").filter(Boolean);
    var matches = index.map(function (entry) {
      var title = normalize(entry.title + " " + entry.title_en);
      var haystack = normalize(title + " " + entry.text + " " + entry.venue + " " + entry.venue_en + " " + entry.citation + " " + entry.year);
      if (!words.every(function (word) { return haystack.indexOf(word) !== -1; })) return null;
      var score = query && title.indexOf(query) !== -1 ? 10 : 0;
      if (entry.type === "page") score += query ? 1 : 20;
      return { entry: entry, score: score };
    }).filter(Boolean).sort(function (a, b) { return b.score - a.score; });
    var limit = query ? 50 : 10;
    var shown = matches.slice(0, limit);
    status.textContent = !query ? t("快速前往，或输入关键词检索全站", "Quick navigation, or type to search the site") : matches.length ? t("找到 " + matches.length + " 条" + (matches.length > limit ? "，显示前 " + limit + " 条" : ""), matches.length + " results" + (matches.length > limit ? "; showing the first " + limit : "")) : t("未找到匹配内容，试试更短的关键词。", "No matches. Try a shorter keyword.");
    shown.forEach(function (match, i) {
      var entry = match.entry;
      var href = localUrl(entry.url);
      if (!href) return;
      var link = document.createElement("a");
      link.href = href;
      link.className = "research-search__result";
      var title = document.createElement("strong");
      title.textContent = en() ? entry.title_en || entry.title : entry.title;
      var meta = document.createElement("small");
      meta.textContent = [typeLabel(entry.type), entry.year, en() ? entry.venue_en || entry.venue : entry.venue].filter(Boolean).join(" · ");
      link.append(title, meta);
      link.addEventListener("focus", function () { markSelected(i, false); });
      results.appendChild(link);
    });
  }
  async function loadIndex() {
    if (index) { renderSearch(); return; }
    if (loading) return loading;
    failed = false;
    renderSearch();
    loading = (async function () {
      var controller = new AbortController();
      var timeout = setTimeout(function () { controller.abort(); }, 12000);
      try {
        var response = await fetch(tools.dataset.indexUrl, { signal: controller.signal, credentials: "same-origin" });
        if (!response.ok) throw new Error("Index unavailable");
        var data = await response.json();
        if (!Array.isArray(data)) throw new Error("Invalid index");
        index = data.filter(function (entry) { return entry && typeof entry.url === "string" && typeof entry.title === "string"; });
      } catch (e) { failed = true; }
      finally { clearTimeout(timeout); loading = null; if (dialog.open) renderSearch(); }
    })();
    return loading;
  }
  function openSearch(query, button) {
    opener = button || document.activeElement;
    if (typeof dialog.showModal !== "function") { toast(t("请使用较新的浏览器打开搜索。", "Please use a current browser to open search.")); return; }
    input.value = query || "";
    if (!dialog.open) dialog.showModal();
    renderSearch();
    input.focus();
    loadIndex();
  }
  document.querySelectorAll("[data-open-search], [data-search-query]").forEach(function (button) {
    button.addEventListener("click", function () { openSearch(button.dataset.searchQuery, button); });
  });
  document.querySelector("[data-close-search]").addEventListener("click", function () { dialog.close(); });
  dialog.addEventListener("click", function (event) { if (event.target === dialog) { var box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close(); } });
  dialog.addEventListener("close", function () { if (opener && document.contains(opener)) opener.focus({ preventScroll: true }); });
  input.addEventListener("input", function () { clearTimeout(inputTimer); inputTimer = setTimeout(renderSearch, 100); });
  dialog.addEventListener("keydown", function (event) {
    if (event.isComposing) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); markSelected(selected + (event.key === "ArrowDown" ? 1 : -1), true); }
    if (event.key === "Enter" && event.target === input) { var first = results.querySelector(".research-search__result"); if (first) { event.preventDefault(); first.click(); } }
  });
  document.addEventListener("keydown", function (event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); if (dialog.open) dialog.close(); else openSearch(); }
  });

  /* Topic links are calculated from the same public index used by search. */
  var atlas = document.querySelector("[data-research-atlas]");
  if (atlas) {
    var atlasTopic = "systems";
    var topicTerms = { systems: /系统|形气神|元整体|有序|自组织|wholeness|systems/i, seasons: /季节|五脏应时|肝应春|免疫|seasonal|immune/i, practice: /针|临床|辨治|论治|验案|传承|acupuncture|clinical/i };
    function renderAtlas() {
      var output = document.getElementById("atlas-results");
      var label = document.getElementById("atlas-status");
      if (!index) { label.textContent = t("暂未加载研究索引，可从下方直接浏览。", "Index unavailable. Browse using the links below."); return; }
      var matches = index.filter(function (entry) { return (entry.type === "publications" || entry.type === "portfolio") && topicTerms[atlasTopic].test(entry.title + " " + entry.title_en + " " + entry.text); });
      matches.sort(function (a, b) { return (b.year || "").localeCompare(a.year || ""); });
      label.textContent = t("自动关联 " + matches.length + " 项研究 · 展示最近 " + Math.min(matches.length, 3) + " 项", matches.length + " connected records · " + Math.min(matches.length, 3) + " most recent");
      output.replaceChildren();
      matches.slice(0, 3).forEach(function (entry) {
        var href = localUrl(entry.url); if (!href) return;
        var link = document.createElement("a"); link.href = href;
        var title = document.createElement("strong"); title.textContent = en() ? entry.title_en || entry.title : entry.title;
        var meta = document.createElement("small"); meta.textContent = [entry.year, typeLabel(entry.type), en() ? entry.venue_en || entry.venue : entry.venue].filter(Boolean).join(" · ");
        var arrow = document.createElement("span"); arrow.className = "atlas-arrow"; arrow.textContent = "↗"; arrow.setAttribute("aria-hidden", "true");
        link.append(title, meta, arrow); output.appendChild(link);
      });
      if (!matches.length) label.textContent = t("此线索暂未匹配到公开记录，可浏览完整期刊架。", "No public records match yet. Browse the full shelf.");
    }
    function startAtlas() { loadIndex().then(renderAtlas); }
    atlas.querySelectorAll("[data-atlas-topic]").forEach(function (button) { button.addEventListener("click", function () { atlasTopic = button.dataset.atlasTopic; atlas.querySelectorAll("[data-atlas-topic]").forEach(function (node) { node.setAttribute("aria-pressed", String(node === button)); }); if (index) renderAtlas(); else startAtlas(); }); });
    if ("IntersectionObserver" in window) {
      var atlasObserver = new IntersectionObserver(function (entries) { if (entries[0].isIntersecting) { startAtlas(); atlasObserver.disconnect(); } }, { rootMargin: "150px" }); atlasObserver.observe(atlas);
    } else startAtlas();
    document.addEventListener("site:language", renderAtlas);
  }

  /* A volume opens immediately; CSS supplies the short page-like transition. */
  var reader = document.getElementById("publication-reader");
  if (reader) {
    var picked = null;
    var readerOpener = null;
    var viewButtons = document.querySelectorAll("[data-library-view]");
    function libraryView(name) {
      root.dataset.libraryView = name === "list" ? "list" : "shelf";
      viewButtons.forEach(function (button) { button.setAttribute("aria-pressed", String(button.dataset.libraryView === root.dataset.libraryView)); });
    }
    libraryView(read("site-library-view"));
    viewButtons.forEach(function (button) { button.addEventListener("click", function () { libraryView(button.dataset.libraryView); save("site-library-view", root.dataset.libraryView); document.dispatchEvent(new Event("site:filtered")); }); });
    function openPublication(button, origin) {
        if (typeof reader.showModal !== "function") { button.closest("[data-publication]").querySelector(".publication-caption a").click(); return; }
        if (picked) picked.classList.remove("is-picked");
        picked = button; picked.classList.add("is-picked");
        readerOpener = origin || button;
        var item = button.closest("[data-publication]");
        var cover = button.querySelector(".publication-volume").cloneNode(true);
        var detail = item.querySelector(".publication-detail").cloneNode(true);
        detail.querySelector("h2").id = "publication-reader-title";
        reader.setAttribute("aria-labelledby", "publication-reader-title");
        reader.querySelector(".publication-reader__body").replaceChildren(cover, detail);
        reader.showModal(); reader.scrollTop = 0;
        document.dispatchEvent(new CustomEvent("site:publication-read", { detail: { id:item.dataset.publicationId } }));
    }
    document.addEventListener("site:open-publication", function (event) {
      var item = Array.from(document.querySelectorAll("[data-publication]")).find(function (node) { return node.dataset.publicationId === event.detail.id; });
      if (item) openPublication(item.querySelector("[data-pick-publication]"), event.detail.opener);
    });
    document.querySelectorAll("[data-pick-publication]").forEach(function (button) {
      button.addEventListener("click", function () { openPublication(button); });
      button.addEventListener("keydown", function (event) {
        if (["ArrowRight", "ArrowLeft", "Home", "End"].indexOf(event.key) === -1) return;
        event.preventDefault();
        var visible = Array.from(document.querySelectorAll("[data-publication]:not([hidden]) [data-pick-publication]"));
        var at = visible.indexOf(button); var next = event.key === "Home" ? 0 : event.key === "End" ? visible.length - 1 : (at + (event.key === "ArrowRight" ? 1 : -1) + visible.length) % visible.length;
        if (visible[next]) visible[next].focus();
      });
    });
    reader.querySelector("[data-close-publication]").addEventListener("click", function () { reader.close(); });
    reader.addEventListener("close", function () {
      if (picked) picked.classList.remove("is-picked");
      var target = readerOpener;
      if (target && document.contains(target) && target.getClientRects().length) target.focus({ preventScroll: true });
      else { var fallback = document.querySelector("#relations-disclosure > summary"); if (fallback && fallback.getClientRects().length) fallback.focus({ preventScroll: true }); }
    });
    reader.addEventListener("click", function (event) { if (event.target !== reader) return; var box = reader.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) reader.close(); });
  }

  /* Filter the static publication list and keep the selection shareable. */
  var controls = document.querySelector(".publication-controls");
  var refreshPublications = function () {};
  if (controls) {
    var cards = Array.from(document.querySelectorAll("[data-publication]"));
    var queryField = document.getElementById("publication-query");
    var yearField = document.getElementById("publication-year");
    var pdfField = document.getElementById("publication-pdf");
    var count = controls.querySelector(".publication-result-count");
    var empty = document.getElementById("publication-empty");
    var params = new URLSearchParams(location.search);
    var category = params.get("category") || "all";
    var categoryButtons = Array.from(controls.querySelectorAll("[data-filter-category]"));
    if (!categoryButtons.some(function (button) { return button.dataset.filterCategory === category; })) category = "all";
    var years = Array.from(new Set(cards.map(function (card) { return card.dataset.year; }).filter(Boolean))).sort().reverse();
    yearField.appendChild(new Option("", "all"));
    years.forEach(function (year) { yearField.appendChild(new Option(year, year)); });
    yearField.value = years.indexOf(params.get("year")) !== -1 ? params.get("year") : "all";
    queryField.value = params.get("q") || "";
    pdfField.checked = params.get("pdf") === "1";
    var searchable = cards.map(function (card) { return normalize(card.textContent); });
    refreshPublications = function (updateUrl) {
      queryField.placeholder = t("标题、作者、期刊或关键词…", "Title, author, journal or keyword…");
      yearField.options[0].textContent = t("全部年份", "All years");
      var words = normalize(queryField.value).split(" ").filter(Boolean);
      var visible = 0;
      cards.forEach(function (card, i) {
        var match = (category === "all" || card.dataset.category === category) && (yearField.value === "all" || card.dataset.year === yearField.value) && (!pdfField.checked || card.dataset.hasPdf === "true") && words.every(function (word) { return searchable[i].indexOf(word) !== -1; });
        card.hidden = !match;
        if (match) { visible++; card.querySelectorAll(".reveal").forEach(function (node) { node.classList.add("is-in"); }); }
      });
      document.querySelectorAll("[data-publication-group]").forEach(function (group) { group.hidden = !group.querySelector("[data-publication]:not([hidden])"); });
      categoryButtons.forEach(function (button) { button.setAttribute("aria-pressed", String(button.dataset.filterCategory === category)); });
      count.textContent = t(visible + " / " + cards.length + " 项", visible + " / " + cards.length + " outputs");
      empty.hidden = visible > 0;
      if (updateUrl) {
        var url = new URL(location.href);
        [["category", category === "all" ? "" : category], ["year", yearField.value === "all" ? "" : yearField.value], ["q", queryField.value.trim()], ["pdf", pdfField.checked ? "1" : ""]].forEach(function (pair) { if (pair[1]) url.searchParams.set(pair[0], pair[1]); else url.searchParams.delete(pair[0]); });
        history.replaceState(null, "", url.href);
      }
      document.dispatchEvent(new Event("site:filtered"));
    };
    categoryButtons.forEach(function (button) { button.addEventListener("click", function () { category = button.dataset.filterCategory; refreshPublications(true); }); });
    queryField.addEventListener("input", function () { refreshPublications(true); });
    yearField.addEventListener("change", function () { refreshPublications(true); });
    pdfField.addEventListener("change", function () { refreshPublications(true); });
    controls.querySelector(".publication-reset").addEventListener("click", function () { category = "all"; queryField.value = ""; yearField.value = "all"; pdfField.checked = false; refreshPublications(true); queryField.focus(); });
    controls.hidden = false;
    refreshPublications(false);
  }

  /* Contextual outline: rebuild for the current language and filtered groups. */
  var outlineButton = document.getElementById("outline-toggle");
  var outline = document.getElementById("research-outline");
  var outlineLinks = document.getElementById("outline-links");
  var headings = [];
  var sectionObserver = "IntersectionObserver" in window ? new IntersectionObserver(markSection, { rootMargin: "-80px 0px -65% 0px", threshold: 0 }) : null;
  function closeOutline(returnFocus) { outline.hidden = true; outlineButton.setAttribute("aria-expanded", "false"); if (returnFocus) outlineButton.focus(); }
  function rebuildOutline() {
    if (sectionObserver) sectionObserver.disconnect();
    headings = Array.from(document.querySelectorAll(".page__content > h2, #home-en > h2, .archive > h2, .publication-group > h2")).filter(function (heading) { return heading.getClientRects().length > 0; });
    outlineLinks.replaceChildren();
    headings.forEach(function (heading, i) {
      if (!heading.id) heading.id = "section-" + (en() ? "en-" : "zh-") + i;
      var link = document.createElement("a");
      var label = heading.querySelector('[data-i18n="' + (en() ? "en" : "zh") + '"]');
      link.textContent = (label || heading).textContent.trim();
      link.href = "#" + encodeURIComponent(heading.id);
      link.addEventListener("click", function () { closeOutline(false); heading.setAttribute("tabindex", "-1"); heading.focus({ preventScroll: true }); });
      outlineLinks.appendChild(link);
    });
    outlineButton.hidden = headings.length < 2;
    if (outlineButton.hidden) closeOutline(false);
    markSection();
    if (sectionObserver) headings.forEach(function (heading) { sectionObserver.observe(heading); });
  }
  function markSection() {
    var current = 0;
    headings.forEach(function (heading, i) { if (heading.getBoundingClientRect().top < 160) current = i; });
    outlineLinks.querySelectorAll("a").forEach(function (link, i) { if (i === current) link.setAttribute("aria-current", "location"); else link.removeAttribute("aria-current"); });
  }
  outlineButton.addEventListener("click", function () { var show = outline.hidden; outline.hidden = !show; outlineButton.setAttribute("aria-expanded", String(show)); });
  document.addEventListener("click", function (event) { if (!outline.hidden && !outline.contains(event.target) && !outlineButton.contains(event.target)) closeOutline(false); });
  document.addEventListener("keydown", function (event) { if (event.key === "Escape" && !outline.hidden) closeOutline(true); });
  document.addEventListener("site:filtered", rebuildOutline);
  document.addEventListener("site:language", function () { syncPreferences(); refreshPublications(false); rebuildOutline(); if (dialog.open) renderSearch(); });
  requestAnimationFrame(rebuildOutline);
})();

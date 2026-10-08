/* ==========================================================================
   学术主页 · 自定义脚本
   1) 顶部阅读进度条   2) 滚动进场   3) 回到顶部   4) 中英切换
   动效全部走 CSS，本文件只负责打标记与状态切换；尊重 prefers-reduced-motion
   ========================================================================== */
(function () {
  "use strict";

  var REDUCED = window.matchMedia &&
                (window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "off");

  /* ---------------------------------------------------------------------
     1. 中英切换
     优先级：URL 参数 ?lang=  >  localStorage  >  默认中文
     切换后把 ?lang= 写回地址栏，这样链接直接分享出去就是对应语言
     --------------------------------------------------------------------- */
  var LANG_KEY = "site-lang";

  function currentLang() {
    var m = new URLSearchParams(location.search).get("lang");
    if (m === "en" || m === "zh") return m;
    try {
      var saved = localStorage.getItem(LANG_KEY);
      if (saved === "en" || saved === "zh") return saved;
    } catch (e) { /* 隐私模式忽略 */ }
    return "zh";
  }

  function applyLang(lang, updateUrl) {
    document.documentElement.setAttribute("data-lang", lang);
    document.documentElement.setAttribute("lang", lang === "en" ? "en" : "zh-CN");
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}

    // 同步按钮上的高亮
    var btn = document.getElementById("lang-toggle");
    if (btn) {
      btn.querySelectorAll(".lang-code").forEach(function (el) {
        el.classList.toggle("lang-on", el.dataset.code === lang);
      });
    }

    if (updateUrl) {
      var url = new URL(location.href);
      if (lang === "zh") url.searchParams.delete("lang");
      else url.searchParams.set("lang", lang);
      history.replaceState(null, "", url.toString());
    }
    document.dispatchEvent(new Event("site:language"));
    if (typeof window.updateNav === "function") requestAnimationFrame(window.updateNav);
  }

  function initLang() {
    applyLang(currentLang(), false);

    var btn = document.getElementById("lang-toggle");
    if (!btn) return;
    btn.addEventListener("click", function (ev) {
      ev.preventDefault();
      applyLang(currentLang() === "en" ? "zh" : "en", true);
    });
  }

  /* ---------------------------------------------------------------------
     2. 顶部阅读进度条
     --------------------------------------------------------------------- */
  function initProgress() {
    var bar = document.getElementById("read-progress");
    if (!bar) return;
    var ticking = false;

    function update() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      bar.style.width = Math.min(100, Math.max(0, pct)) + "%";
      bar.classList.toggle("active", window.scrollY > 40);
      ticking = false;
    }
    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    document.addEventListener("site:filtered", onScroll);
    document.addEventListener("site:language", onScroll);
    update();
  }

  /* ---------------------------------------------------------------------
     3. 滚动进场
     给内容块打上 .reveal，进入视口时加 .is-in；同一批之间错开 60ms
     --------------------------------------------------------------------- */
  function initReveal() {
    if (REDUCED) return;
    var SELECTOR = [
      ".archive__item",
      ".page__content > h2",
      ".page__content > h3",
      ".author__avatar",
      ".author__content"
    ].join(",");

    var targets = Array.prototype.slice.call(document.querySelectorAll(SELECTOR));
    if (!targets.length) return;

    if (!("IntersectionObserver" in window)) return;   // 老浏览器：直接显示

    targets.forEach(function (el) { el.classList.add("reveal"); });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var sibs = targets.filter(function (t) {
          return t.parentNode === el.parentNode;
        });
        var idx = sibs.indexOf(el);
        var delay = idx > 0 ? Math.min(idx, 5) * 60 : 0;
        setTimeout(function () { el.classList.add("is-in"); }, delay);
        io.unobserve(el);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });

    targets.forEach(function (el) { io.observe(el); });

    // 首屏内容立即显示，避免"空白一瞬"
    requestAnimationFrame(function () {
      targets.forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight * 0.9) {
          el.classList.add("is-in");
          io.unobserve(el);
        }
      });
    });
  }

  /* ---------------------------------------------------------------------
     4. 回到顶部
     --------------------------------------------------------------------- */
  function initToTop() {
    var btn = document.createElement("button");
    btn.id = "to-top";
    btn.type = "button";
    btn.setAttribute("aria-label", "回到顶部");
    btn.title = "回到顶部";
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"' +
      ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>';
    document.body.appendChild(btn);

    btn.addEventListener("click", function () {
      var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "off";
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    });

    var ticking = false;
    function update() {
      btn.classList.toggle("show", window.scrollY > 420);
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* --------------------------------------------------------------------- */
  function boot() {
    initLang();
    initProgress();
    initReveal();
    initToTop();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

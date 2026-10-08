---
layout: cv-art
title: "了解我"
title_en: "Know Me"
permalink: /cv/
author_profile: false
cv_experiment: true
redirect_from:
  - /resume
---

<div class="cv-opening"><div class="cv-hero">
  <div class="cv-identity">
    <h1><span data-i18n="zh">祝广钦</span><span data-i18n="en">Guangqin <br>Zhu</span></h1>
    <p class="cv-name"><span data-i18n="zh">GUANGQIN ZHU</span><span data-i18n="en">祝广钦</span></p>
    <p class="cv-intro"><span data-i18n="zh">北京中医药大学中医学院<br>中医基础理论 · 博士研究生</span><span data-i18n="en">PhD student in Basic Theory of Chinese Medicine<br>Beijing University of Chinese Medicine</span></p>
    <button class="cv-print" type="button" data-cv-print><span data-i18n="zh">打印简历</span><span data-i18n="en">Print CV</span><i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></button>
  </div>
  <figure class="cv-sculpture" data-cv-sculpture data-phase="2024">
    <div class="cv-sculpture__space" data-cv-scene>{% include cv-flow.svg %}</div>
    <figcaption><span data-i18n="zh">拨动线条，让空间回应。</span><span data-i18n="en">Set the lines in motion.</span></figcaption>
    <div class="cv-phase" role="group" aria-label="选择学习阶段 / Select a study stage"><button type="button" data-cv-phase="2017" aria-pressed="false">2017<span data-i18n="zh">学士</span><span data-i18n="en">Bachelor</span></button><button type="button" data-cv-phase="2022" aria-pressed="false">2022<span data-i18n="zh">硕士</span><span data-i18n="en">Master</span></button><button type="button" data-cv-phase="2024" aria-pressed="true">2024<span data-i18n="zh">博士在读</span><span data-i18n="en">PhD studies</span></button></div>
    <button type="button" class="cv-pulse" data-cv-pulse><span data-i18n="zh">拨动线场</span><span data-i18n="en">Send a pulse</span><i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button>
    <p class="cv-phase-note" aria-live="polite" data-cv-phase-note><span data-i18n="zh">2024.09 — 至今 · 中医基础理论博士研究生</span><span data-i18n="en">Sep 2024 — present · PhD student in Basic Theory of Chinese Medicine</span></p>
  </figure>
</div>

</div>
<nav class="cv-index" aria-label="了解我章节 / Know Me chapters"><a href="#cv-tags"><span data-i18n="zh">坐标</span><span data-i18n="en">Identity</span></a><a href="#cv-journey"><span data-i18n="zh">经历</span><span data-i18n="en">Journey</span></a><a href="#cv-works"><span data-i18n="zh">作品</span><span data-i18n="en">Work</span></a><a href="#cv-dossier"><span data-i18n="zh">履历</span><span data-i18n="en">CV</span></a><a href="#cv-contact"><span data-i18n="zh">联系</span><span data-i18n="en">Contact</span></a></nav>

{% include cv-blocks.html %}
{% include cv-cinema.html %}
{% include cv-tunnel.html %}
<details class="cv-dossier" id="cv-dossier"><summary><span data-i18n="zh">完整履历与学术记录</span><span data-i18n="en">Full CV & academic record</span><i class="fa-solid fa-plus" aria-hidden="true"></i></summary><section class="cv-section cv-education" id="cv-education">
  <h2><span data-i18n="zh">求学轨迹</span><span data-i18n="en">A course of study.</span></h2>
  <div class="cv-education__rows">{% for item in site.data.cv_profile.education %}<article class="cv-education__row"><div class="cv-education__year" aria-hidden="true">{{ item.year }}</div><div><p class="cv-date"><span data-i18n="zh">{{ item.date }}</span><span data-i18n="en">{{ item.date_en }}</span></p><h3><span data-i18n="zh">{{ item.degree }}</span><span data-i18n="en">{{ item.degree_en }}</span></h3><p><span data-i18n="zh">{{ item.area }}<br>{{ item.institution }}</span><span data-i18n="en">{{ item.area_en }}<br>{{ item.institution_en }}</span></p></div></article>{% endfor %}</div>
</section>

{% include cv-threadline.html %}
<section class="cv-section cv-research" id="cv-research">
  <div class="cv-research__heading"><h2><span data-i18n="zh">把局部，<br>放回整体。</span><span data-i18n="en">The part.<br>The whole.</span></h2><p class="cv-directions"><span data-i18n="zh">中医天人相应与五脏应时<br>系统中医学</span><span data-i18n="en">Nature–human correspondence and seasonal responses of the five zang organs<br>Systems TCM</span></p></div>
  <div class="cv-projects"><h3><span data-i18n="zh">科研与教学研究项目</span><span data-i18n="en">Research & teaching projects</span></h3>{% for item in site.data.cv_profile.projects %}<article><p class="cv-project-type"><span data-i18n="zh">{{ item.type }}</span><span data-i18n="en">{{ item.type_en }}</span></p><h4><a href="{{ item.url | relative_url }}"><span data-i18n="zh">{{ item.title }}</span><span data-i18n="en">{{ item.title_en }}</span><i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></a></h4></article>{% endfor %}</div>
</section>

<section class="cv-section cv-practice" id="cv-practice">
  <h2><span data-i18n="zh">在研究之外，<br>与人连接。</span><span data-i18n="en">Knowledge,<br>in company.</span></h2>
  <div class="cv-service"><article><p class="cv-date">2024 — 2026</p><h3><span data-i18n="zh">研究生会 · 执行主席</span><span data-i18n="en">Executive Chair · Graduate Student Union</span></h3><p><span data-i18n="zh">北京中医药大学中医学院。统筹研究生会日常工作，组织学术、文化类活动，承担学院研究生服务与管理工作。</span><span data-i18n="en">School of Chinese Medicine, Beijing University of Chinese Medicine. Coordinating daily operations, academic and cultural events, and graduate student services.</span></p></article><article><p class="cv-date">2025 — 2026</p><h3><span data-i18n="zh">北京 101 中学 · 选修课教学</span><span data-i18n="en">Elective teaching · Beijing 101 Middle School</span></h3><p><span data-i18n="zh">参与中医药健康管理实用技能与实训选修课的教学，学生抽样调查中，5 分满分率 100%。</span><span data-i18n="en">Teaching practical skills in TCM health management. In the sampled student survey, all responses received the maximum score of 5.</span></p></article></div>
  <div class="cv-skills"><h3><span data-i18n="zh">方法与工具</span><span data-i18n="en">Methods & tools</span></h3><dl><div><dt><span data-i18n="zh">专业资质</span><span data-i18n="en">Qualifications</span></dt><dd><span data-i18n="zh">中医执业医师资格证<br>普通话水平测试一级乙等<br>英语 CET-6</span><span data-i18n="en">TCM physician qualification<br>Putonghua Level 1-B<br>CET-6 English</span></dd></div><div><dt><span data-i18n="zh">统计与数智</span><span data-i18n="en">Data & computation</span></dt><dd><span data-i18n="zh">SPSS、R、Python；Office 系列；Codex、DeepSeek Harness 等数智工具的开发与应用</span><span data-i18n="en">SPSS, R, Python; Office; development and use of tools including Codex and DeepSeek Harness</span></dd></div><div><dt><span data-i18n="zh">实验方法</span><span data-i18n="en">Experimental methods</span></dt><dd><span data-i18n="zh">动物实验、ELISA、Western Blot、qPCR、流式细胞术、流式多因子检测、分子对接、分子动力学模拟</span><span data-i18n="en">Animal experiments, ELISA, Western blot, qPCR, flow cytometry, multiplex flow assays, molecular docking and molecular dynamics</span></dd></div></dl></div>
</section>

{% include cv-threadline.html %}
<section class="cv-section cv-outputs" id="cv-outputs">
  <h2><span data-i18n="zh">成果与记录</span><span data-i18n="en">Work, on record.</span></h2>
  <details class="cv-output-group"><summary><span data-i18n="zh">论文与著作</span><span data-i18n="en">Publications & books</span><span class="cv-output-count">{{ site.publications | size }}</span><i class="fa-solid fa-plus" aria-hidden="true"></i></summary>{% include cv-records.html records=site.publications %}</details>
  <details class="cv-output-group"><summary><span data-i18n="zh">学术会议</span><span data-i18n="en">Academic meetings</span><span class="cv-output-count">{{ site.talks | size }}</span><i class="fa-solid fa-plus" aria-hidden="true"></i></summary>{% include cv-records.html records=site.talks %}</details>
  <details class="cv-output-group"><summary><span data-i18n="zh">教学</span><span data-i18n="en">Teaching</span><span class="cv-output-count">{{ site.teaching | size }}</span><i class="fa-solid fa-plus" aria-hidden="true"></i></summary>{% include cv-records.html records=site.teaching %}</details>
</section>

</details>
<section class="cv-section cv-since" id="cv-since" aria-label="生于 1998 / Born in 1998"><div class="cv-since__stage"><p>SINCE</p><div class="cv-since__year" aria-hidden="true"><span>1998</span><span>1998</span><span>1998</span><span>1998</span></div><h2><span data-i18n="zh">生于 1998。<br>仍在探索。</span><span data-i18n="en">Born in 1998.<br>Still exploring.</span></h2></div></section>
<section class="cv-section cv-contact" id="cv-contact"><div class="cv-contact__field" aria-hidden="true"><svg viewBox="0 0 1000 600" fill="none"><g stroke="currentColor">{% for i in (1..28) %}<ellipse cx="500" cy="300" rx="{{ i | times: 18 }}" ry="{{ i | times: 8 }}" transform="rotate(-25 500 300)"/>{% endfor %}</g></svg></div><div class="cv-contact__content"><h2><span data-i18n="zh">让想法，<br>继续发生。</span><span data-i18n="en">LET’S<br>CONNECT.</span></h2><a class="cv-email" href="mailto:{{ site.author.email }}">{{ site.author.email }}<i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></a><div class="cv-contact__actions"><button type="button" data-copy-email="{{ site.author.email }}"><span data-i18n="zh">复制邮箱</span><span data-i18n="en">Copy email</span><i class="fa-regular fa-copy" aria-hidden="true"></i></button><a href="https://github.com/{{ site.author.github }}">GitHub<i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></a><button type="button" data-cv-replay><span data-i18n="zh">重播开场</span><span data-i18n="en">Replay opening</span>{% include cv-logo.svg %}</button></div><p><span data-i18n="zh">祝广钦 · 北京中医药大学</span><span data-i18n="en">Guangqin Zhu · Beijing University of Chinese Medicine</span></p><a class="cv-top" href="#main"><span data-i18n="zh">回到开篇</span><span data-i18n="en">Back to the opening</span><i class="fa-solid fa-arrow-up" aria-hidden="true"></i></a></div></section>
<div class="cv-shutter" aria-hidden="true"><span style="--slice:0"></span><span style="--slice:1"></span><span style="--slice:2"></span><span style="--slice:3"></span><span style="--slice:4"></span><span style="--slice:5"></span><span style="--slice:6"></span><span style="--slice:7"></span><span style="--slice:8"></span><span style="--slice:9"></span><span style="--slice:10"></span><span style="--slice:11"></span></div>

/* Title-based reading connections. Current-page memory only; no network calls. */
(function (factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else api.mount(document);
})(function () {
  "use strict";
  function normalize(value) { return String(value || "").normalize("NFKC").toLowerCase(); }
  function classify(title, topics) {
    var text = normalize(title);
    return topics.filter(function (topic) {
      return topic.terms.some(function (term) {
        term=normalize(term);
        if(!/^[a-z]/.test(term))return text.indexOf(term)!==-1;
        var escaped=term.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
        return new RegExp("(^|[^a-z])"+escaped+"(?=$|[^a-z])").test(text);
      });
    }).map(function (topic) { return topic.id; });
  }
  function discoveries(records, seen, topics) {
    var unique = Array.from(new Set(seen));
    return topics.filter(function (topic) {
      return unique.filter(function (id) { var record=records.find(function(r){return r.id===id;});return record && record.topics.indexOf(topic.id)!==-1; }).length>=2;
    });
  }
  function selectWorks(records, seen, topicId, limit) {
    var matching=records.filter(function(r){return r.topics.indexOf(topicId)!==-1;});
    var read=seen.slice().reverse().map(function(id){return matching.find(function(r){return r.id===id;});}).filter(Boolean);
    return read.concat(matching.filter(function(r){return seen.indexOf(r.id)===-1;})).filter(function(r,i,all){return all.indexOf(r)===i;}).slice(0,limit);
  }
  function mount(doc) {
    var section=doc.getElementById("publication-relations"), data=doc.getElementById("publication-relation-topics");
    if(!section || !data)return;
    var topics;
    try {topics=JSON.parse(data.textContent);} catch(e){return;}
    if(!Array.isArray(topics))return;
    var root=doc.documentElement, details=doc.getElementById("relations-disclosure"), map=doc.getElementById("paper-map");
    var lines=map.querySelector("svg"), hub=map.querySelector(".paper-map__hub"), reader=doc.getElementById("publication-reader");
    var seen=[], unlocked=[], selected=null, notification=false, queued=0;
    var media=matchMedia("(prefers-reduced-motion: reduce)");
    var records=Array.from(doc.querySelectorAll("[data-publication-id]")).map(function(card){
      var title=card.querySelector(".publication-caption h3");
      var zh=title.querySelector('[data-i18n="zh"]').textContent, en=title.querySelector('[data-i18n="en"]').textContent;
      return {id:card.dataset.publicationId,card:card,zh:zh,en:en,year:card.dataset.year,topics:classify(zh+" "+en,topics)};
    });
    function english(){return root.dataset.lang==="en";}
    function text(zh,en){return english()?en:zh;}
    function reduced(){return media.matches || root.dataset.motion==="off";}
    function cover(record){
      var copy=record.card.querySelector(".publication-volume").cloneNode(true);
      copy.querySelectorAll("[id]").forEach(function(n){n.removeAttribute("id");});
      copy.querySelectorAll("img").forEach(function(img){img.alt="";img.loading="lazy";});
      return copy;
    }
    function topicName(topic){return english()?topic.en:topic.zh;}
    function syncRead(){
      seen.forEach(function(id){
        var record=records.find(function(r){return r.id===id;}); if(!record)return;
        var button=record.card.querySelector("[data-pick-publication]");button.classList.add("is-read");
        var hint=button.querySelector(".publication-pick__hint");
        hint.querySelector('[data-i18n="zh"]').textContent="再次取阅";
        hint.querySelector('[data-i18n="en"]').textContent="Read again";
      });
      map.querySelectorAll("[data-map-id]").forEach(function(node){
        var record=records.find(function(r){return r.id===node.dataset.mapId;});
        var opened=seen.indexOf(record.id)!==-1;node.classList.toggle("is-read",opened);
        node.querySelector("small").textContent=record.year+" · "+(opened?text("已取阅","Opened"):text("继续探索","Explore"));
      });
    }
    function layout(animate){
      if(!details.open || section.hidden || document.hidden)return;
      var box=map.getBoundingClientRect(), center=hub.getBoundingClientRect();
      if(!box.width)return;
      lines.setAttribute("viewBox","0 0 "+box.width+" "+box.height);lines.replaceChildren();
      var x=center.left-box.left+center.width/2,y=center.top-box.top+center.height/2;
      map.querySelectorAll(".paper-map__node").forEach(function(node,i){
        var coverBox=node.querySelector(".paper-map__cover").getBoundingClientRect();
        var nx=coverBox.left-box.left+coverBox.width/2,ny=coverBox.top-box.top+coverBox.height/2;
        var curve=(i%2?1:-1)*Math.min(Math.abs(ny-y)*.2,35);
        var path=doc.createElementNS("http://www.w3.org/2000/svg","path");
        path.setAttribute("d","M"+x+","+y+" C"+(x+curve)+","+((y+ny)/2)+" "+(nx-curve)+","+((y+ny)/2)+" "+nx+","+ny);
        path.setAttribute("pathLength","1");lines.appendChild(path);
      });
      lines.classList.toggle("is-drawing",Boolean(animate && !reduced()));
    }
    function queueLayout(animate){cancelAnimationFrame(queued);queued=requestAnimationFrame(function(){layout(animate);});}
    function renderMap(){
      if(!selected)return;
      doc.getElementById("paper-map-topic").textContent=topicName(selected);
      map.querySelectorAll(".paper-map__node").forEach(function(n){n.remove();});
      selectWorks(records,seen,selected.id,6).forEach(function(record,i){
        var button=doc.createElement("button");button.type="button";button.className="paper-map__node";button.dataset.mapId=record.id;
        button.style.setProperty("--map-col",String(i%3+1));button.style.setProperty("--map-row",i<3?"1":"3");
        button.style.setProperty("--map-mobile-col",String(i%2+1));button.style.setProperty("--map-mobile-row",i<2?"1":String(Math.floor(i/2)+2));
        var image=doc.createElement("span");image.className="paper-map__cover";image.setAttribute("aria-hidden","true");image.appendChild(cover(record));
        var title=doc.createElement("strong");title.textContent=english()?record.en:record.zh;
        var meta=doc.createElement("small");button.append(image,title,meta);button.setAttribute("aria-haspopup","dialog");
        button.addEventListener("click",function(){doc.dispatchEvent(new CustomEvent("site:open-publication",{detail:{id:record.id,opener:button}}));});
        map.appendChild(button);
      });
      syncRead();queueLayout(true);
    }
    function renderTopics(){
      var host=section.querySelector(".paper-relations__topics");host.replaceChildren();
      unlocked.forEach(function(topic){
        var button=doc.createElement("button");button.type="button";button.textContent=topicName(topic);button.setAttribute("aria-pressed",String(selected.id===topic.id));
        button.addEventListener("click",function(){selected=topic;renderIntro();host.querySelectorAll("button").forEach(function(n){n.setAttribute("aria-pressed",String(n===button));});renderMap();});
        host.appendChild(button);
      });
    }
    function renderIntro(){
      var pair=selectWorks(records,seen,selected.id,2);
      pair.forEach(function(record,i){section.querySelector('[data-relation-cover="'+i+'"]').replaceChildren(cover(record));});
      doc.getElementById("relations-reason").textContent=text("共同主题：","Shared subject: ")+topicName(selected);
    }
    function readerLink(){
      if(!selected || !reader.open)return;
      var actions=reader.querySelector(".publication-actions");if(!actions)return;
      var old=actions.querySelector("[data-open-research-map]");if(old)old.remove();
      var button=doc.createElement("button");button.type="button";button.dataset.openResearchMap="";
      button.textContent=text("发现共同主题，查看星图","Shared subject found. View map");
      button.addEventListener("click",function(){reader.close();details.open=true;renderMap();section.scrollIntoView({block:"start",behavior:reduced()?"auto":"smooth"});details.querySelector("summary").focus({preventScroll:true});});
      actions.appendChild(button);
    }
    doc.addEventListener("site:publication-read",function(event){
      var record=records.find(function(r){return r.id===event.detail.id;});if(!record)return;
      if(seen.indexOf(record.id)===-1)seen.push(record.id);
      var next=discoveries(records,seen,topics), isNew=next.length>unlocked.length;
      unlocked=next;syncRead();
      if(!unlocked.length)return;
      if(!selected)selected=unlocked.slice().sort(function(a,b){return records.filter(function(r){return r.topics.indexOf(a.id)!==-1;}).length-records.filter(function(r){return r.topics.indexOf(b.id)!==-1;}).length;})[0];
      section.hidden=false;renderIntro();renderTopics();readerLink();
      if(isNew)notification=true;
    });
    reader.addEventListener("close",function(){
      if(notification){notification=false;doc.dispatchEvent(new CustomEvent("site:notice",{detail:{zh:"你发现了论文之间的联系。书架上方已出现星图入口。",en:"A shared subject found. The research map is now above the shelf."}}));}
    });
    details.addEventListener("toggle",function(){
      section.querySelector('[data-relation-toggle][data-i18n="zh"]').textContent=details.open?"收起研究星图":"展开研究星图";
      section.querySelector('[data-relation-toggle][data-i18n="en"]').textContent=details.open?"Close the research map":"Explore the research map";
      if(details.open)renderMap();else{cancelAnimationFrame(queued);lines.classList.remove("is-drawing");}
    });
    doc.addEventListener("site:language",function(){if(selected){renderIntro();renderTopics();if(details.open)renderMap();readerLink();}});
    if("ResizeObserver" in window)new ResizeObserver(function(){queueLayout(false);}).observe(map);
    else window.addEventListener("resize",function(){queueLayout(false);},{passive:true});
    doc.addEventListener("visibilitychange",function(){if(doc.hidden){cancelAnimationFrame(queued);lines.classList.remove("is-drawing");}else queueLayout(false);});
    new MutationObserver(function(){if(reduced())lines.classList.remove("is-drawing");}).observe(root,{attributes:true,attributeFilter:["data-motion"]});
    if(media.addEventListener)media.addEventListener("change",function(){if(reduced())lines.classList.remove("is-drawing");});
  }
  return {classify:classify,discoveries:discoveries,selectWorks:selectWorks,mount:mount};
});

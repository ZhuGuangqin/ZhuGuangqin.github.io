(function(factory){var api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else api.mount(document);})(function(){
  "use strict";
  function normalize(value){return String(value||"").normalize("NFKC").toLowerCase().replace(/[–—-]/g," ").replace(/\s+/g," ").trim();}
  function match(query,concepts){var key=normalize(query);return key?concepts.find(function(c){return c.aliases.some(function(alias){return normalize(alias)===key;});})||null:null;}
  function works(concept,entries){return entries.filter(function(entry){return entry.type==="publications"&&concept.terms.some(function(term){return normalize(entry.title+" "+(entry.title_en||"")).includes(normalize(term));});}).sort(function(a,b){return Number(b.year)-Number(a.year);}).slice(0,3);}
  function mount(doc){
    var panel=doc.querySelector("[data-concept-door]"),data=doc.getElementById("concept-key-data");if(!panel||!data)return;
    var concepts;try{concepts=JSON.parse(data.textContent);}catch(e){return;}
    var root=doc.documentElement, title=panel.querySelector("[data-concept-title]"),neighbours=panel.querySelector("[data-concept-neighbours]"),description=panel.querySelector("[data-concept-description]"),list=panel.querySelector("[data-concept-works]"),play=panel.querySelector("[data-concept-play]");
    function local(path){try{var url=new URL(path,location.href);if(url.origin!==location.origin)return null;url.searchParams.set("lang",root.dataset.lang==="en"?"en":"zh");return url.href;}catch(e){return null;}}
    play.addEventListener("click",function(event){var destination=doc.getElementById(new URL(play.href,location.href).hash.slice(1)),target=destination&&destination.querySelector('details');if(!target)return;event.preventDefault();doc.getElementById('research-search').close();target.open=true;target.scrollIntoView({block:'start',behavior:'instant'});target.querySelector('summary').focus({preventScroll:true});});
    doc.addEventListener("site:search-query",function(event){
      var detail=event.detail,concept=match(detail.query,concepts),en=root.dataset.lang==="en";detail.concept=Boolean(concept);panel.hidden=!concept;if(!concept)return;
      title.textContent=en?concept.en:concept.zh;description.textContent=en?concept.description_en:concept.description_zh;
      var gameLinks={nonadditivity:{hash:'wuxing-lab',zh:'进入造物实验室',en:'Explore Creation Lab'},order:{hash:'flow-game',zh:'进入有序实验室',en:'Enter Order Lab'},autonomy:{hash:'garden-game',zh:'进入自主实验室',en:'Enter Autonomy Lab'}},gameLink=gameLinks[concept.id];play.hidden=!gameLink;if(gameLink){var home=new URL(panel.dataset.publicationsUrl,location.href);home.pathname=home.pathname.replace(/publications\/?$/,'');home.pathname+='labs/';home.hash=gameLink.hash;play.href=local(home.href);play.querySelector('[data-i18n=zh]').textContent=gameLink.zh;play.querySelector('[data-i18n=en]').textContent=gameLink.en;}
      // Reuse buttons so changing language or the search index never discards keyboard focus.
      concept.neighbours.forEach(function(id,i){var next=concepts.find(function(c){return c.id===id;}),button=neighbours.children[i];if(!next)return;if(!button){button=doc.createElement("button");button.type="button";button.addEventListener("click",function(){doc.dispatchEvent(new CustomEvent("site:search-concept",{detail:{query:button.dataset.query}}));});neighbours.appendChild(button);}button.dataset.query=en?next.aliases.find(function(a){return /^[a-z]/i.test(a);})||next.zh:next.zh;button.textContent=en?next.en:next.zh;});
      list.replaceChildren();works(concept,detail.entries).forEach(function(entry){var href=local(entry.url);if(!href)return;var a=doc.createElement("a");a.href=href;a.textContent=(en?entry.title_en||entry.title:entry.title)+" · "+entry.year;list.appendChild(a);});
      if(!list.children.length){var fallback=doc.createElement("a");fallback.href=local(panel.dataset.publicationsUrl);fallback.textContent=en?"Browse the publication shelf":"浏览论文与著作";list.appendChild(fallback);}
    });
  }
  return {normalize:normalize,match:match,works:works,mount:mount};
});

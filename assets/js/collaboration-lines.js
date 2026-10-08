(function(factory){var api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else api.mount(document);})(function(){
  "use strict";
  var topics={systems:["系统中医学","Systems TCM"],seasons:["天人相应与季节","nature–human correspondence and seasonality"],practice:["中医理论与临床","TCM theory and clinical practice"],education:["中医基础理论教学","teaching the basic theory of Chinese medicine"]};
  function validPair(pair){return Array.isArray(pair)&&pair.length===2&&pair[0]!==pair[1]&&pair.every(function(id){return Object.prototype.hasOwnProperty.call(topics,id);});}
  function draft(pair,en){
    if(!validPair(pair))return null;
    var a=topics[pair[0]][en?1:0],b=topics[pair[1]][en?1:0];
    return en?{subject:"A conversation about "+a+" and "+b,body:"Dear Guangqin,\n\nI came across your academic website and am interested in the connection between "+a+" and "+b+". I would be glad to exchange ideas with you.\n\nMy idea or question:\n[Describe the question you would like to discuss.]\n\nA little about me:\n[Your name, affiliation and relevant background.]\n\nThank you for your time.\n[Your name]"}:{subject:"关于“"+a+"”与“"+b+"”的交流",body:"祝广钦，你好：\n\n我在你的学术主页看到了相关研究，对“"+a+"”与“"+b+"”之间的联系很感兴趣，希望有机会与你交流。\n\n我想讨论的问题或想法：\n[请补充具体问题，以及你希望交流的内容。]\n\n关于我：\n[请补充姓名、单位与相关背景。]\n\n期待交流，感谢你的时间！\n[你的姓名]"};
  }
  function mailto(email,subject,body){if(!/^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(email))return "";return "mailto:"+email+"?subject="+encodeURIComponent(String(subject).replace(/[\r\n]+/g," "))+"&body="+encodeURIComponent(body);}
  function mount(doc){
    var panel=doc.querySelector("[data-collab-lines]");if(!panel)return;
    var root=doc.documentElement,board=panel.querySelector("[data-collab-board]"),path=panel.querySelector("[data-collab-path]"),buttons=Array.from(panel.querySelectorAll("[data-collab-topic]")),status=panel.querySelector("[data-collab-status]"),generate=panel.querySelector("[data-collab-generate]"),editor=panel.querySelector("[data-collab-draft]"),subject=panel.querySelector("input"),message=panel.querySelector("textarea"),copy=panel.querySelector("[data-collab-copy]"),mail=panel.querySelector("[data-collab-mail]");
    var pair=[],drag=null,suppress=false;
    function en(){return root.dataset.lang==="en";}
    function point(button){var box=board.getBoundingClientRect(),port=button.querySelector(".collab-lines__port").getBoundingClientRect();return {x:port.left+port.width/2-box.left,y:port.top+port.height/2-box.top};}
    function draw(end){if(!pair.length){path.removeAttribute("d");return;}var a=point(buttons.find(function(b){return b.dataset.collabTopic===pair[0];})),b=end||(pair[1]?point(buttons.find(function(btn){return btn.dataset.collabTopic===pair[1];})):null);if(!b){path.removeAttribute("d");return;}var centre=board.clientWidth/2,middle=Math.abs(a.x-b.x)<20?centre+Math.sign(centre-a.x)*Math.max(60,board.clientWidth*.16):(a.x+b.x)/2;path.setAttribute("d","M"+a.x+","+a.y+"C"+middle+","+a.y+" "+middle+","+b.y+" "+b.x+","+b.y);}
    function sync(){
      buttons.forEach(function(button){button.setAttribute("aria-pressed",String(pair.includes(button.dataset.collabTopic)));});generate.disabled=!validPair(pair);
      var words=pair.map(function(id){return topics[id][en()?1:0];});
      status.textContent=pair.length===2?(en()?words.join(" ↔ ")+". Ready to start a conversation.":words.join(" ↔ ")+"。可以开始一次交流了。"):pair.length===1?(en()?"Choose a second thread to connect with "+words[0]+".":"已选择“"+words[0]+"”，再选一个方向。"):en()?"Choose two threads. Keyboard and touch work too.":"请选择两个方向，也可用键盘或触屏点选。";
      generate.querySelector('[data-i18n="zh"]').textContent=editor.hidden?"生成交流草稿":"按当前连线重写草稿";
      generate.querySelector('[data-i18n="en"]').textContent=editor.hidden?"Create a conversation draft":"Rewrite with these threads";
      board.classList.toggle("is-connected",pair.length===2);draw();
    }
    function updateDraft(){copy.dataset.copyText=(en()?"Subject: ":"主题：")+subject.value+"\n\n"+message.value;mail.href=mailto(panel.dataset.email,subject.value,message.value);}
    buttons.forEach(function(button){
      button.addEventListener("click",function(){if(suppress){suppress=false;return;}var id=button.dataset.collabTopic,index=pair.indexOf(id);if(index!==-1)pair.splice(index,1);else if(pair.length===2)pair[1]=id;else pair.push(id);sync();});
      button.addEventListener("pointerdown",function(e){if(e.button!==0||e.isPrimary===false)return;suppress=false;drag={id:e.pointerId,topic:button.dataset.collabTopic,x:e.clientX,y:e.clientY,moved:false,touch:e.pointerType!=="mouse",original:pair.slice()};button.setPointerCapture(e.pointerId);});
      button.addEventListener("pointermove",function(e){if(!drag||drag.id!==e.pointerId)return;var dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)<12)return;if(drag.touch&&!drag.moved&&Math.abs(dy)>Math.abs(dx)){drag=null;return;}drag.moved=true;pair=[drag.topic];board.classList.remove("is-connected");var box=board.getBoundingClientRect();draw({x:e.clientX-box.left,y:e.clientY-box.top});});
      button.addEventListener("pointerup",function(e){if(!drag||drag.id!==e.pointerId)return;if(drag.moved){var target=doc.elementFromPoint(e.clientX,e.clientY),other=target&&target.closest("[data-collab-topic]");pair=other&&other!==button&&board.contains(other)?[drag.topic,other.dataset.collabTopic]:[drag.topic];suppress=true;sync();}drag=null;});
      ["pointercancel","lostpointercapture"].forEach(function(type){button.addEventListener(type,function(){if(drag){pair=drag.original;drag=null;sync();}});});
    });
    generate.addEventListener("click",function(){var next=draft(pair,en());if(!next)return;subject.value=next.subject;message.value=next.body;editor.hidden=false;updateDraft();sync();subject.focus({preventScroll:true});editor.scrollIntoView({block:"nearest",behavior:"auto"});});
    panel.querySelector("[data-collab-reset]").addEventListener("click",function(){pair=[];subject.value="";message.value="";editor.hidden=true;updateDraft();sync();});
    [subject,message].forEach(function(field){field.addEventListener("input",updateDraft);});
    panel.addEventListener("toggle",function(){draw();});new ResizeObserver(function(){draw();}).observe(board);doc.addEventListener("site:language",function(){sync();updateDraft();});
    sync();
  }
  return {topics:topics,validPair:validPair,draft:draft,mailto:mailto,mount:mount};
});

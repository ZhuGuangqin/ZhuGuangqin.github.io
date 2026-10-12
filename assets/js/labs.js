(function(){
  'use strict';
  const page=document.querySelector('.labs-page');if(!page)return;
  const sections=Array.from(page.querySelectorAll(':scope > section')),links=Array.from(page.querySelectorAll('.labs-index a'));
  function select(id,scroll){if(id==='uptake-game'){id='survivor-game';history.replaceState(null,'',location.pathname+location.search+'#'+id);}const chosen=sections.find(s=>s.id===id)||sections[0];sections.forEach(s=>{const shell=s.querySelector(':scope > details');if(shell)shell.open=s===chosen;});links.forEach(a=>a.setAttribute('aria-current',String(a.hash==='#'+chosen.id)));if(scroll)links.find(a=>a.hash==='#'+chosen.id)?.scrollIntoView({block:'nearest',inline:'nearest'});if(scroll)chosen.scrollIntoView({block:'start',behavior:'instant'});}
  sections.forEach(s=>s.querySelector(':scope > details')?.addEventListener('toggle',event=>{if(!event.target.open)return;sections.filter(other=>other!==s).forEach(other=>(()=>{const shell=other.querySelector(':scope > details');if(shell)shell.open=false;})());links.forEach(a=>a.setAttribute('aria-current',String(a.hash==='#'+s.id)));}));
  links.forEach(a=>a.addEventListener('click',()=>select(a.hash.slice(1),true)));
  // Arrow keys return to the working surface after a pointer selects a tool.
  const grids=[['#flow-game','.pe-app','[data-pe-tile]'],['#garden-game','.td-app','[data-td-cell]:not(:disabled)'],['#network-game','.nl-app','[data-station]:not(:disabled)'],['#contraption-game','.cl-app','[data-mount]:not(:disabled)']];
  grids.forEach(([id,appSelector,cellSelector])=>{const host=page.querySelector(id);if(!host)return;let last=null;
    host.addEventListener('focusin',e=>{if(e.target.matches(cellSelector))last=e.target;});
    host.addEventListener('keydown',e=>{if(e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)||!e.target.closest(appSelector)||e.target.closest('input,select,textarea,summary,dialog,[contenteditable=true],[data-td-reset-box],[data-pe-reset-box]'))return;
      const cells=[...host.querySelectorAll(cellSelector)].filter(el=>!el.disabled&&el.getBoundingClientRect().width);if(!cells.length)return;
      e.preventDefault();const current=cells.includes(document.activeElement)?document.activeElement:null;if(!current){(cells.includes(last)?last:cells[0]).focus({preventScroll:true});return;}
      const rect=current.getBoundingClientRect(),origin={x:rect.x+rect.width/2,y:rect.y+rect.height/2},horizontal=e.key==='ArrowLeft'||e.key==='ArrowRight',sign=e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:1;
      const next=cells.filter(el=>el!==current).map(el=>{const r=el.getBoundingClientRect(),x=r.x+r.width/2-origin.x,y=r.y+r.height/2-origin.y,forward=(horizontal?x:y)*sign,side=Math.abs(horizontal?y:x);return {el,forward,score:forward+side*4};}).filter(n=>n.forward>2).sort((a,b)=>a.score-b.score)[0];next?.el.focus({preventScroll:true});
    });
  });
  window.addEventListener('hashchange',()=>select(location.hash.slice(1),true));select(location.hash.slice(1),Boolean(location.hash));
})();

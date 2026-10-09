(function(){
  'use strict';
  const page=document.querySelector('.labs-page');if(!page)return;
  const sections=Array.from(page.querySelectorAll(':scope > section')),links=Array.from(page.querySelectorAll('.labs-index a'));
  function select(id,scroll){const chosen=sections.find(s=>s.id===id)||sections[0];sections.forEach(s=>{const shell=s.querySelector(':scope > details');if(shell)shell.open=s===chosen;});links.forEach(a=>a.setAttribute('aria-current',String(a.hash==='#'+chosen.id)));if(scroll)links.find(a=>a.hash==='#'+chosen.id)?.scrollIntoView({block:'nearest',inline:'nearest'});if(scroll)chosen.scrollIntoView({block:'start',behavior:'instant'});}
  sections.forEach(s=>s.querySelector(':scope > details')?.addEventListener('toggle',event=>{if(!event.target.open)return;sections.filter(other=>other!==s).forEach(other=>other.querySelector(':scope > details').open=false);links.forEach(a=>a.setAttribute('aria-current',String(a.hash==='#'+s.id)));}));
  links.forEach(a=>a.addEventListener('click',()=>select(a.hash.slice(1),true)));
  window.addEventListener('hashchange',()=>select(location.hash.slice(1),true));select(location.hash.slice(1),Boolean(location.hash));
})();

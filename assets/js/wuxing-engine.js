/* Original discovery rules and validated local progress. No network or account. */
(function(factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else window.WuxingEngine=api;})(function(){
  'use strict';
  function pair(a,b){return [a,b].sort().join('|');}
  function create(data){
    var elements=new Map(data.elements.map(function(e){return [e.id,e];})), recipes=new Map(data.recipes.map(function(r){return [r.id,r];}));
    var pairs=new Map(data.recipes.map(function(r){return [pair(r.a,r.b),r];}));
    function initial(){return {version:1,recipes:[]};}
    function known(state){var ids=new Set(data.starters);state.recipes.forEach(function(id){var r=recipes.get(id);if(r){ids.add(r.result);(r.grants||[]).forEach(function(x){ids.add(x);});}});return ids;}
    function restore(raw){
      var source;try{source=typeof raw==='string'?JSON.parse(raw):raw;}catch(e){return initial();}
      if(!source||source.version!==1||!Array.isArray(source.recipes))return initial();
      var state=initial(),pending=new Set(source.recipes.filter(function(id){return typeof id==='string'&&recipes.has(id);})), changed=true;
      while(changed){changed=false;var ids=known(state);pending.forEach(function(id){var r=recipes.get(id);if(ids.has(r.a)&&ids.has(r.b)){state.recipes.push(id);pending.delete(id);changed=true;}});}
      return state;
    }
    function combine(state,a,b){var ids=known(state),r=pairs.get(pair(a,b));if(!ids.has(a)||!ids.has(b)||!r)return {state:state,recipe:null};var fresh=!state.recipes.includes(r.id);return {state:fresh?{version:1,recipes:state.recipes.concat(r.id)}:state,recipe:r,fresh:fresh,newElement:!ids.has(r.result)};}
    function hints(state){var ids=known(state);return data.recipes.filter(function(r){return ids.has(r.a)&&ids.has(r.b)&&!state.recipes.includes(r.id);}).sort(function(a,b){return Number(ids.has(a.result))-Number(ids.has(b.result));});}
    function text(state,en){var ids=known(state),name=function(id){var e=elements.get(id);return en?e.en:e.zh;};return [en?'Wuxing Lab · My discoveries':'造物实验室 · 我的发现',ids.size+' / '+data.elements.length,'',en?'ELEMENT ATLAS':'元素图鉴',...data.elements.filter(function(e){return ids.has(e.id);}).map(function(e){return (en?e.en:e.zh)+' · '+(en?e.description_en:e.description_zh);}), '',en?'DISCOVERED FORMULAS':'已发现公式',...state.recipes.map(function(id){var r=recipes.get(id);return name(r.a)+' + '+name(r.b)+' → '+name(r.result)+(r.grants?' ['+r.grants.map(name).join(' / ')+']':'')+'\n'+(en?r.en:r.zh);}), '',en?'These are game metaphors and simplified making routes, not chemical equations or medical instructions.':'配方为游戏象意与简化造物路线，不是化学方程或医学指导。'].join('\n');}
    return {data:data,elements:elements,recipes:recipes,initial:initial,known:known,restore:restore,combine:combine,hints:hints,text:text};
  }
  return {create:create,pair:pair};
});

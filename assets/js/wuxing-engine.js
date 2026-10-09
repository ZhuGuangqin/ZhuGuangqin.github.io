/* Original discovery rules. Rewards derive from validated discoveries. */
(function(factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else window.WuxingEngine=api;})(function(){
  'use strict';
  function pair(a,b){return [a,b].sort().join('|');}
  function create(data){
    var elements=new Map(data.elements.map(function(e){return [e.id,e];})),recipes=new Map(data.recipes.map(function(r){return [r.id,r];}));
    var pairs=new Map(data.recipes.map(function(r){return [pair(r.a,r.b),r];})),legacy=new Map((data.legacyRecipes||[]).map(function(r){return [r.id,r];}));
    var oldMap=new Map([...recipes].filter(function(entry){return !data.legacyEditionRecipeIds||data.legacyEditionRecipeIds.includes(entry[0]);}));legacy.forEach(function(r,id){oldMap.set(id,r);});
    function initial(){return {version:1,edition:2,recipes:[],legacyRecipes:[],mark:'taiji'};}
    function knownIn(state,map){
      var ids=new Set(data.starters);
      state.recipes.forEach(function(id){var r=map.get(id);if(!r)return;ids.add(r.result);(r.grants||[]).forEach(function(x){ids.add(x);});
      });
      (state.legacyRecipes||[]).forEach(function(id){var r=oldMap.get(id);if(r){ids.add(r.result);(r.grants||[]).forEach(function(x){ids.add(x);});}});return ids;
    }
    function known(state){return knownIn(state,recipes);}
    function missing(state,r){var ids=known(state);return [...new Set([r.a,r.b].concat(r.requires||[]))].filter(function(id){return !ids.has(id);});}
    function ready(state,r){return missing(state,r).length===0;}
    function replay(source,map,legacyIds){
      var state=initial(),pending=new Set(source.filter(function(id){return typeof id==='string'&&map.has(id);})),changed=true;
      state.legacyRecipes=legacyIds||[];
      while(changed){changed=false;var ids=knownIn(state,map);pending.forEach(function(id){var r=map.get(id);if([r.a,r.b].concat(r.requires||[]).every(function(x){return ids.has(x);})){state.recipes.push(id);pending.delete(id);changed=true;}});}
      return state;
    }
    function restore(raw){
      var source;try{source=typeof raw==='string'?JSON.parse(raw):raw;}catch(e){return initial();}
      if(!source||source.version!==1||!Array.isArray(source.recipes))return initial();
      var state;
      if(source.edition===undefined){
        var previous=replay(source.recipes,oldMap,[]);
        state=replay(previous.recipes,recipes,previous.recipes);
      }else if(source.edition===2){
        var carried=Array.isArray(source.legacyRecipes)?replay(source.legacyRecipes,oldMap,[]).recipes:[];
        state=replay(source.recipes,recipes,carried);
      }else return initial();
      var count=known(state).size,earned=(data.collections||[]).filter(function(c){return count>=c.at;});
      if(source.mark==='taiji'||earned.some(function(c){return c.symbol===source.mark;}))state.mark=source.mark;
      return state;
    }
    function combine(state,a,b){
      var ids=known(state),r=pairs.get(pair(a,b));
      if(!ids.has(a)||!ids.has(b)||!r)return {state:state,recipe:null};
      if(!ready(state,r))return {state:state,recipe:null,blocked:r,missing:missing(state,r)};
      var fresh=!state.recipes.includes(r.id);
      return {state:fresh?Object.assign({},state,{recipes:state.recipes.concat(r.id)}):state,recipe:r,fresh:fresh,newElement:!ids.has(r.result)};
    }
    function hints(state){var ids=known(state);return data.recipes.filter(function(r){return ready(state,r)&&!state.recipes.includes(r.id);}).sort(function(a,b){return Number(ids.has(a.result))-Number(ids.has(b.result));});}
    function progress(state){
      var ids=known(state);
      return {
        groups:data.groups.map(function(g){var members=data.elements.filter(function(e){return e.group===g.id;});return {group:g,total:members.length,count:members.filter(function(e){return ids.has(e.id);}).length};}),
        collections:(data.collections||[]).map(function(c){return {reward:c,unlocked:ids.size>=c.at,count:Math.min(ids.size,c.at)};}),
        relations:(data.relations||[]).map(function(r){var found=r.members.filter(function(id){return ids.has(id);});return {relation:r,count:found.length,unlocked:found.length===r.members.length,missing:r.members.filter(function(id){return !ids.has(id);})};}),
        ultimates:data.elements.filter(function(e){return e.tier==='ultimate';}).map(function(e){var r=data.recipes.find(function(x){return x.result===e.id;});return {element:e,recipe:r,unlocked:ids.has(e.id),ready:ready(state,r),missing:missing(state,r)};}),
        endings:(data.endings||[]).map(function(e){return {ending:e,count:e.members.filter(function(id){return ids.has(id);}).length,unlocked:e.members.every(function(id){return ids.has(id);})};})
      };
    }
    function text(state,en){
      var ids=known(state),name=function(id){var e=elements.get(id);return en?e.en:e.zh;},p=progress(state);
      return [en?'Creation Lab · My discoveries':'造物实验室 · 我的发现',ids.size+' / '+data.elements.length,'',en?'ELEMENT ATLAS':'元素图鉴',...data.elements.filter(function(e){return ids.has(e.id);}).map(function(e){return (en?e.en:e.zh)+' · '+(en?e.description_en:e.description_zh);}), '',en?'DISCOVERED FORMULAS':'已发现公式',...state.recipes.map(function(id){var r=recipes.get(id);return name(r.a)+' + '+name(r.b)+' → '+name(r.result)+(r.grants?' ['+r.grants.map(name).join(' / ')+']':'')+(r.requires?'\n'+(en?'Also collect: ':'还需收集：')+r.requires.map(name).join(' / '):'')+'\n'+(en?r.en:r.zh);}), '',en?'COLLECTION REWARDS':'收集奖励',...p.collections.filter(function(c){return c.unlocked;}).map(function(c){return en?c.reward.en:c.reward.zh;}),'',en?'RELATIONSHIPS DISCOVERED':'关系彩蛋',...p.relations.filter(function(r){return r.unlocked;}).map(function(r){return (en?r.relation.en:r.relation.zh)+' · '+r.relation.members.map(name).join(' / ')+'\n'+(en?r.relation.description_en:r.relation.description_zh);}), '',en?'These are game metaphors and simplified making routes, not chemical equations or medical instructions.':'配方为游戏象意与简化造物路线，不是化学方程或医学指导。'].join('\n');
    }
    return {data:data,elements:elements,recipes:recipes,initial:initial,known:known,restore:restore,combine:combine,hints:hints,text:text,ready:ready,missing:missing,progress:progress};
  }
  return {create:create,pair:pair};
});

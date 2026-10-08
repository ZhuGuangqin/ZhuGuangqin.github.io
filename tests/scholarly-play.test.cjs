const test = require('node:test');
const assert = require('node:assert/strict');
const field = require('../assets/js/line-field.js');
const concepts = require('../assets/js/concept-door.js');
const collaboration = require('../assets/js/collaboration-lines.js');

test('nearby fields change shape rather than only translating two independent drawings', () => {
  const apart = [{x:200,y:215},{x:600,y:215}], near = [{x:350,y:215},{x:450,y:215}];
  assert.equal(field.proximity(...apart), 0);
  assert.ok(field.proximity(...near) > .6);
  const a = field.geometry(apart, 1), b = field.geometry(near, 1);
  assert.equal(a.length, 64);
  assert.notEqual(a[0][10][0]-apart[0].x, b[0][10][0]-near[0].x);
  for (const phase of [0, 1.25, 6.28]) for (const points of [apart,near,[{x:400,y:215},{x:400,y:215}]]) {
    assert.ok(field.geometry(points,phase).flat(2).every(Number.isFinite));
  }
});

test('SVG export preserves the composed paths and prevents injected colour markup', () => {
  const points=[{x:350,y:215},{x:450,y:215}], svg=field.svgExport(points,1,'rgb(39, 107, 80)','#f7faf5');
  assert.equal((svg.match(/<path /g)||[]).length,64);
  assert.ok(svg.includes(field.pathData(field.geometry(points,1)[17])));
  assert.ok(!field.svgExport(points,1,'"/><script>bad</script>','bad').includes('<script>'));
});

test('concept passwords require whole aliases, normalize case and dashes, and ignore unrelated searches', () => {
  const keys=[{id:'meta',aliases:['元整体','meta-wholeness']},{id:'nature',aliases:['天人相应']}];
  assert.equal(concepts.match(' META–WHOLENESS ',keys).id,'meta');
  assert.equal(concepts.match('天人相应',keys).id,'nature');
  for(const value of ['', '天人', '元整体论文', '<script>']) assert.equal(concepts.match(value,keys),null);
});

test('concept connections select actual public publications with title evidence, newest first, capped at three', () => {
  const entries=[{type:'page',title:'元整体',year:2026},{type:'publications',title:'无关论文',year:2026},...Array.from({length:5},(_,i)=>({type:'publications',title:'元整体研究',year:2020+i,url:'/publication/'+i}))];
  assert.deepEqual(concepts.works({terms:['元整体']},entries).map(e=>e.year),[2024,2023,2022]);
});

test('drafts require two distinct maintained research directions and use only those names', () => {
  for(const pair of [[],['systems'],['systems','systems'],['unknown','systems'],['__proto__','seasons']]) assert.equal(collaboration.draft(pair,false),null);
  const zh=collaboration.draft(['systems','education'],false), en=collaboration.draft(['seasons','practice'],true);
  assert.ok(zh.subject.includes('系统中医学')&&zh.body.includes('中医基础理论教学'));
  assert.ok(en.body.includes('nature–human correspondence')&&en.body.includes('[Your name]'));
  assert.ok(!en.body.includes('proven')&&!zh.body.includes('已证实'));
});

test('mailto handles Chinese, ampersands and multiline drafts without subject header injection', () => {
  const url=collaboration.mailto('researcher@example.com','交流\r\nBcc: nope','A & B\n你好');
  const params=new URLSearchParams(url.split('?')[1]);
  assert.equal(params.get('body'),'A & B\n你好');
  assert.equal(params.get('subject'),'交流 Bcc: nope');
  assert.equal(params.get('bcc'),null);
  assert.equal(collaboration.mailto('bad?cc=x@example.com','hello','body'),'');
});

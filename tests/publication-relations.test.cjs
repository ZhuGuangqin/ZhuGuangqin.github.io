const test = require('node:test');
const assert = require('node:assert/strict');
const { classify, discoveries, selectWorks } = require('../assets/js/publication-relations.js');

const topics = [
  { id: 'systems', terms: ['系统中医', '中医系统', 'Systems TCM'] },
  { id: 'seasons', terms: ['五脏应时', 'seasonal'] }
];
const records = [
  { id: 'harmony', title: '从系统中医学原理解读中医“和”的本质内涵' },
  { id: 'organicity', title: '基于中医系统论有机性原理探讨虚实夹杂证的本质内涵' },
  { id: 'eczema', title: 'Effects of seasonal changes on T-helper 1/T-helper 2 immune balance and eczema onset in rats' },
  { id: 'wuzang', title: '从自组织原理看中医“五脏应时”的内涵及机制' },
  { id: 'vitiligo', title: '过敏煎加味治疗白癜风验案三则' }
].map(r => ({ ...r, topics: classify(r.title, topics) }));

test('reopening one work cannot unlock a connection', () => {
  assert.deepEqual(discoveries(records, ['harmony', 'harmony'], topics), []);
});
test('unrelated works and unknown records cannot create a false connection', () => {
  assert.deepEqual(discoveries(records, ['harmony', 'vitiligo', 'private-draft'], topics), []);
});
test('distinct works unlock only their evidenced shared subject', () => {
  assert.deepEqual(discoveries(records, ['harmony', 'organicity', 'eczema'], topics).map(t => t.id), ['systems']);
});
test('Chinese and English titles can connect the same seasonal subject', () => {
  assert.deepEqual(discoveries(records, ['eczema', 'wuzang'], topics).map(t => t.id), ['seasons']);
});
test('new public works join by title without inventing a relationship', () => {
  assert.deepEqual(classify('A new investigation in SYSTEMS TCM', topics), ['systems']);
  assert.deepEqual(classify('A report on an unrelated subject', topics), []);
  assert.deepEqual(classify('A report about unseasonal conditions', topics), []);
});
test('the map starts with the actual read pair, excludes unrelated records, and stays bounded', () => {
  const next = records.concat({ id: 'new-systems-work', topics: ['systems'] });
  assert.deepEqual(selectWorks(next, ['harmony', 'organicity'], 'systems', 6).map(r => r.id), ['organicity', 'harmony', 'new-systems-work']);
  assert.equal(selectWorks(next, ['harmony'], 'systems', 2).length, 2);
});

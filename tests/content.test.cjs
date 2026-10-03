const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness.cjs');
test('every shipped rule has a scoped review and a traceable source', () => {
  const { get } = load(['grammar-rules', 'grammar-lessons']);
  const rules = get('GRAMMAR_RULES').flatMap(g => g.rules);
  assert.equal(rules.length, 35); assert.equal(new Set(rules.map(r => r.id)).size, 35);
  rules.forEach(r => {
    assert.ok(r.review.scope); assert.equal(r.review.status, 'pattern-reviewed');
    assert.ok(r.review.sources.length); r.review.sources.forEach(url => assert.ok(url.startsWith('https://www.coelang.tufs.ac.jp/')));
  });
});
test('Polish lessons include explanations, warnings and example translations', () => {
  const { get } = load(['grammar-lessons']);
  const groups = get('GRAMMAR_LESSONS'); const lessons = groups.flatMap(g => g.items);
  assert.equal(lessons.length, 19);
  groups.forEach(g => { assert.ok(g.stage_pl); assert.ok(g.blurb_pl); });
  lessons.forEach(it => {
    assert.ok(it.pl.job); assert.ok(it.pl.plain); assert.ok(it.pl.watch); assert.ok(it.review.sources.length);
    it.examples.forEach(ex => { assert.ok(ex.pl); assert.ok(ex.jp); assert.ok(ex.reading); });
  });
});
test('simplified lessons preserve the corrected exceptions', () => {
  const { get } = load(['grammar-rules', 'grammar-lessons']);
  const lessons = get('GRAMMAR_LESSONS').flatMap(g => g.items);
  const lesson = p => lessons.find(it => it.particle === p);
  assert.match(lesson('を').watch, /家を出る/);
  assert.match(lesson('で').watch, /公園でコンサートがあります/);
  assert.match(lesson('と').watch, /と思います/);
  assert.match(lesson('だけ').watch, /negative/);
  assert.match(lesson('の').watch, /泳ぐのが好きです/);
  const de = get('GRAMMAR_RULES').flatMap(g => g.rules).find(r => r.id === 'DE-1');
  assert.ok(!de.pattern.includes('not いる/ある'));
});

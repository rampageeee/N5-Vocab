const test = require('node:test');
const assert = require('node:assert/strict');
const { load, word } = require('./harness.cjs');
// Representative forms checked against TUFS 038/039/043 and 030/032/040.
const verbs = [
  ['買う', 'かう', 'godan', '買います', '買わない', '買った', '買って'],
  ['書く', 'かく', 'godan', '書きます', '書かない', '書いた', '書いて'],
  ['泳ぐ', 'およぐ', 'godan', '泳ぎます', '泳がない', '泳いだ', '泳いで'],
  ['話す', 'はなす', 'godan', '話します', '話さない', '話した', '話して'],
  ['待つ', 'まつ', 'godan', '待ちます', '待たない', '待った', '待って'],
  ['死ぬ', 'しぬ', 'godan', '死にます', '死なない', '死んだ', '死んで'],
  ['遊ぶ', 'あそぶ', 'godan', '遊びます', '遊ばない', '遊んだ', '遊んで'],
  ['読む', 'よむ', 'godan', '読みます', '読まない', '読んだ', '読んで'],
  ['帰る', 'かえる', 'godan', '帰ります', '帰らない', '帰った', '帰って'],
  ['食べる', 'たべる', 'ichidan', '食べます', '食べない', '食べた', '食べて'],
  ['見る', 'みる', 'ichidan', '見ます', '見ない', '見た', '見て'],
  ['する', 'する', 'irregular', 'します', 'しない', 'した', 'して'],
  ['来る', 'くる', 'irregular', '来ます', '来ない', '来た', '来て'],
  ['行く', 'いく', 'godan', '行きます', '行かない', '行った', '行って'],
  ['ある', 'ある', 'godan', 'あります', 'ない', 'あった', 'あって'],
];
for (const [k, r, cls, masu, nai, ta, te] of verbs) test('conjugation table: ' + k, () => {
  const { db } = load(); const w = word(db, k, r, 'verb', { verb_class: cls });
  for (const [form, expected] of Object.entries({ masu, nai, ta, te })) {
    assert.equal(w.forms[form], expected); assert.ok(db.acceptedForms(w, form).includes(expected));
  }
  assert.equal(w.forms.mashita, masu.slice(0, -2) + 'ました');
  assert.equal(w.forms.masendeshita, masu.slice(0, -2) + 'ませんでした');
  assert.equal(w.forms.nakatta, nai.slice(0, -2) + 'なかった');
});
test('adjectives include lexical いい exceptions without overgeneralizing', () => {
  const { db } = load();
  for (const [k, expected] of [['いい', 'よ'], ['かっこいい', 'かっこよ'], ['格好いい', '格好よ'], ['かわいい', 'かわい'], ['高い', '高']]) {
    const w = word(db, k, k, 'i-adj');
    assert.equal(w.forms.negative, expected + 'くない');
    assert.equal(w.forms.past, expected + 'かった');
    assert.equal(w.forms.pastNegative, expected + 'くなかった');
  }
  const quiet = word(db, '静か', 'しずか', 'na-adj');
  assert.ok(db.acceptedForms(quiet, 'negative').includes('静かではない'));
  assert.ok(db.acceptedForms(quiet, 'pastNegative').includes('しずかじゃなかった'));
});
test('editing identity discards old overrides and confirmed class; translation edits keep them', async () => {
  const { db } = load(); const w = word(db, '行く', 'いく', 'verb');
  const p = JSON.parse(db.exportJSON()); p.words[0].irregular_forms = { ta: '行った', te: '行って' };
  await db.importJSON(JSON.stringify(p));
  db.updateWord(w.id, { kanji: '書く', reading: 'かく' });
  assert.equal(db.getWord(w.id).forms.ta, '書いた'); assert.equal(db.getWord(w.id).forms.te, '書いて');
  db.updateWord(w.id, { kanji: '見る', reading: 'みる' });
  assert.equal(db.getWord(w.id).class_confirmed, undefined); assert.equal(db.drillable(db.getWord(w.id)), false);
  db.setVerbClass(w.id, 'ichidan'); db.updateWord(w.id, { translation: 'see' });
  assert.equal(db.getWord(w.id).forms.masu, '見ます');
});
test('kana spellings use the same exception rules and ambiguous verbs make no claim', () => {
  const { db } = load();
  for (const [k, r, form, good, bad] of [
    ['行く', 'いく', 'te', 'いって', '行いて'], ['来る', 'くる', 'nai', 'こない', 'くない'],
    ['食べる', 'たべる', 'mashita', 'たべました', 'たべりました']]) {
    const w = word(db, k, r, 'verb', { verb_class: k === '食べる' ? 'ichidan' : undefined });
    assert.ok(db.acceptedForms(w, form).includes(good)); assert.ok(!db.acceptedForms(w, form).includes(bad));
  }
  const ambiguous = word(db, 'きる', 'きる', 'verb');
  assert.equal(db.verbAudit(ambiguous).state, 'ambiguous'); assert.equal(db.drillable(ambiguous), false);
  assert.deepEqual(Object.keys(ambiguous.forms), []);
  const okuru = word(db, 'おくる', 'おくる', 'verb'); assert.equal(okuru.forms.masu, 'おくります');
  assert.equal(word(db, '勉強する', 'べんきょうする', 'verb').forms.mashita, '勉強しました');
});

const test = require('node:test');
const assert = require('node:assert/strict');
const { load, word } = require('./harness.cjs');
function setup() {
  const env = load(['grammar-rules', 'checker']);
  const items = [['食べる', 'たべる', 'verb', 'ichidan'], ['泳ぐ', 'およぐ', 'verb'],
    ['好き', 'すき', 'na-adj'], ['雨', 'あめ', 'noun'], ['降る', 'ふる', 'verb'],
    ['思う', 'おもう', 'verb'], ['安い', 'やすい', 'i-adj'], ['高い', 'たかい', 'i-adj'],
    ['行く', 'いく', 'verb'], ['書く', 'かく', 'verb'], ['ある', 'ある', 'verb'],
    ['いい', 'いい', 'i-adj'], ['かっこいい', 'かっこいい', 'i-adj'], ['学生', 'がくせい', 'noun']];
  items.forEach(([k,r,pos,cls]) => word(env.db,k,r,pos,{verb_class:cls}));
  return { ...env, checker: env.get('ParticleChecker') };
}
// Valid patterns are backed by TUFS 025, 030, 032, 077, 080 and 082.
for (const jp of ['食べました。', '食べませんでした。', '食べなかったです。', 'たべました。',
  '泳ぐのが好きです。', '雨が降ると思います。', '安いですが高いです。',
  '安いです。高いです。', '学生です。', '行ってください。', 'いいです。', 'よかったです。',
  'かっこよくないです。', '書きました。', '食べます。「学生です」']) {
  test('valid example is unflagged: ' + jp, () => {
    const { checker } = setup(); const r = checker.analyze(jp);
    assert.equal(r.violations.length, 0); assert.equal(r.formErrors.length, 0);
    assert.equal(r.tokens.map(t => t.text).join(''), jp);
  });
}
for (const [bad, good] of [['行いて。', '行って'], ['いくない。', 'よくない'],
  ['いかった。', 'よかった'], ['かっこいかった。', 'かっこよかった'],
  ['書かます。', '書きます'], ['書きない。', '書かない'], ['あらない。', 'ない']]) {
  test('form error has a defensible table replacement: ' + bad, () => {
    const { db, checker } = setup(); const r = checker.analyze(bad);
    assert.equal(r.formErrors.length, 1); assert.ok(r.formErrors[0].suggestions.includes(good));
    checker.logConfidentMistakes(bad, r.tokens); checker.logConfidentMistakes(bad, r.tokens);
    assert.equal(db.activeMistakes().length, 1);
  });
}
test('copula check stays within punctuation boundaries and offers no invented replacement', () => {
  const { checker } = setup();
  for (const jp of ['食べるです。', '食べますです。', '食べましたです。']) {
    const r = checker.analyze(jp); assert.equal(r.violations.length, 1);
    assert.equal(r.violations[0].candidates.length, 0);
  }
  for (const jp of ['食べます。です。', '食べます、です。', '食べます「です」']) assert.equal(checker.analyze(jp).violations.length, 0);
});
test('ambiguous/unsupported constructions do not become confident corrections or reviews', () => {
  const { db, checker } = setup();
  word(db, 'きる', 'きる', 'verb');
  for (const jp of ['書き。', '書きながら。', 'きました。', '学生が学生。', '雨の。', '未知語が好きです。']) {
    const r = checker.analyze(jp); assert.equal(r.formErrors.length, 0); assert.equal(r.violations.length, 0);
    assert.equal(checker.logConfidentMistakes(jp, r.tokens).length, 0);
  }
  assert.equal(db.logMistake({ kind: 'particle', original_sentence: '学生が学生', wrong_token: 'が', correct_tokens: ['の'], rule_violated: 'POS pattern' }), null);
});
test('legacy unverified mistake exercises remain in backups but do not teach guessed answers', async () => {
  const { db } = setup(); const p = JSON.parse(db.exportJSON());
  p.mistakes.push({ id: 'old', kind: 'particle', original_sentence: '学生が学生', wrong_token: 'が',
    correct_tokens: ['の', 'と'], rule_violated: 'POS pattern', date: '2026-01-01', resolved: false, streak: 2 });
  await db.importJSON(JSON.stringify(p));
  assert.equal(db.activeMistakes().length, 0); assert.equal(db.allMistakes().length, 1);
  assert.equal(db.scoreMistake('old', 'の').correct, false);
});

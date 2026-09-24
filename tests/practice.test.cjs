const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.join(__dirname, '..');
function load(files) {
  let stored = null;
  const context = vm.createContext({
    window: {}, Intl, console,
    localStorage: { getItem: () => stored, setItem: (_key, value) => { stored = value; } }
  });
  for (const file of files) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  return { context, get: name => vm.runInContext(name, context) };
}

test('the water strokes parse to finite geometry and can be traced', () => {
  const { context, get } = load(['www/js/stroke-engine.js', 'www/data/kanji-data.js']);
  const engine = get('StrokeEngine');
  const strokes = context.window.KANJI_DATA['水'];
  assert.equal(strokes.length, 4);
  for (const path of strokes) {
    const points = engine.parsePath(path);
    assert.ok(points.length > 2);
    assert.ok(points.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)));
    const reference = engine.resample(points, engine.N);
    assert.ok(engine.grade(engine.scoreStroke(points, reference), engine.TOL.normal) > 0.99);
  }
});

test('one dictionary word has one saved sentence and earns gold after three exercises', () => {
  const { context, get } = load([
    'www/js/data.js', 'www/js/sentence-practice.js', 'www/data/sentence-bank.js'
  ]);
  const db = get('DB'), practice = get('SentencePractice');
  db.addCategory('N5');
  const water = db.addWord({ kanji: '水', reading: 'みず', translation: 'water', pos: 'noun', category: 'N5' });
  const candidate = practice.candidates(water)[0];
  assert.ok(candidate);
  assert.ok(candidate.x.jp.includes('水'));
  assert.ok(candidate.x.jp.length <= 10, 'the default example should be short enough for N5 practice');
  assert.equal(db.setSentencePractice(water.id, {
    id: candidate.x.id, jp: candidate.x.jp, en: candidate.x.en, pl: candidate.x.pl,
    surfaces: candidate.x.s, lemmas: candidate.x.w, target: candidate.target
  }), true);
  assert.equal(db.completeSentenceStep(water.id, 2), false);
  assert.equal(db.stars(water).gold, false);
  assert.equal(db.completeSentenceStep(water.id, 0), true);
  assert.equal(db.completeSentenceStep(water.id, 1), true);
  assert.equal(db.stars(water).gold, false);
  assert.equal(db.completeSentenceStep(water.id, 2), true);
  assert.equal(db.stars(water).gold, true);
  const backup = db.exportJSON();
  db.importJSON(backup);
  assert.equal(db.stars(db.getWord(water.id)).gold, true);
  assert.deepEqual([...db.sentenceProgress(water.id)], [true, true, true]);
});

test('a custom sentence works without the sentence bank and old gold stars survive import', () => {
  const { get } = load(['www/js/data.js', 'www/js/sentence-practice.js']);
  const db = get('DB'), practice = get('SentencePractice');
  db.addCategory('N5');
  const word = db.addWord({ kanji: '猫', reading: 'ねこ', translation: 'cat', pos: 'noun', category: 'N5' });
  assert.equal(db.stars(word).gold, false);
  assert.equal(practice.candidates(word).length, 0);
  assert.equal(db.setSentencePractice(word.id, {
    jp: '猫がいます。', pl: 'Jest kot.', target: '猫',
    surfaces: ['猫', 'が', 'います'], lemmas: ['猫', 'が', 'いる']
  }), true);
  assert.deepEqual([...db.sentenceProgress(word.id)], [false, false, false]);
  const old = JSON.parse(db.exportJSON());
  old.words[0].sentencePoints = 5;
  db.importJSON(JSON.stringify(old));
  assert.equal(db.stars(db.getWord(word.id)).gold, true);
});

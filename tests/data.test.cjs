const test = require('node:test');
const assert = require('node:assert/strict');
const { load, word } = require('./harness.cjs');

test('malformed and future backups leave live and stored data intact', async () => {
  const { db, values } = load(); word(db);
  const before = db.exportJSON(), stored = values.get('n5data');
  const changes = [p => p.words = {}, p => p.kanji = [], p => p.settings = [],
    p => p.grammar = null, p => p.mistakes = null, p => p.words.push(p.words[0]),
    p => p.words[0].reading = 23, p => p.kanji['水'].testPasses = -1,
    p => p.schemaVersion = 99, p => p.categories = ['N5', 'N5'],
    p => p.words[0].sentencePractice = { steps: 'invalid' }];
  for (const change of changes) {
    const payload = JSON.parse(before); change(payload);
    await assert.rejects(db.importJSON(JSON.stringify(payload)));
    assert.equal(db.exportJSON(), before); assert.equal(values.get('n5data'), stored);
  }
  await assert.rejects(db.importJSON('{'));
  db.addCategory('Still usable');
});

test('failed browser writes throw and roll back additions, edits and progress', async () => {
  let fail = false;
  const { db, values } = load([], { failWrite: () => fail });
  const w = word(db), before = db.exportJSON(), stored = values.get('n5data'); fail = true;
  assert.throws(() => db.addCategory('Other'), /not saved/);
  assert.throws(() => db.updateWord(w.id, { kanji: '火' }), /not saved/);
  assert.throws(() => db.recordKanjiPass('水'), /not saved/);
  await assert.rejects(db.importJSON(before), /not saved/);
  assert.equal(db.exportJSON(), before); assert.equal(values.get('n5data'), stored);
  assert.ok(db.storageStatus().error);
  fail = false; await db.retrySave(); assert.equal(db.storageStatus().error, null);
});

test('corrupt startup is write-blocked, recoverable, and repair preserves original bytes', async () => {
  const raw = '{"words":broken';
  const { db, values } = load([], { stored: { n5data: raw } });
  await db.hydrate(); assert.equal(db.recoveryData(), raw);
  assert.throws(() => db.addCategory('Accidental overwrite'), /could not be loaded/);
  assert.equal(values.get('n5data'), raw);
  const repaired = load().db; word(repaired);
  await db.importJSON(repaired.exportJSON());
  assert.equal(values.get('n5data-recovery'), raw);
  assert.equal(db.storageStatus().locked, false);
});

test('version zero migrates; backups preserve notes, settings and inactive character progress', async () => {
  const { db } = load(); const w = word(db);
  for (let i = 0; i < 5; i++) db.recordKanjiPass('水');
  db.recordKanaPass('あ'); db.setKanjiPriority('水', 'high');
  db.addGrammarEntry({ pattern_name: 'note', structure: 'A', example: '例', note: 'my note' });
  db.setLocale('pl'); db.setTolerance('lenient');
  db.deleteWord(w.id); assert.equal(db.kanjiProgress('水'), 5);
  word(db); assert.equal(db.kanjiProgress('水'), 5);
  const old = JSON.parse(db.exportJSON()); delete old.schemaVersion; delete old.app;
  await db.importJSON(JSON.stringify(old));
  assert.equal(db.kanjiProgress('水'), 5); assert.equal(db.kanaProgress('あ'), 1);
  assert.equal(db.grammarEntries()[0].note, 'my note'); assert.equal(db.getLocale(), 'pl');
  assert.equal(JSON.parse(db.exportJSON()).schemaVersion, 1);
});

test('reorders must be genuine permutations', () => {
  const { db } = load(); const a = word(db), b = word(db, '火', 'ひ'); db.addCategory('B');
  assert.equal(db.reorderCategories(['N5', 'N5']), false);
  assert.equal(db.reorderCategories(['B', 'N5']), true);
  assert.equal(db.reorderWords('N5', [a.id, a.id]), false);
  assert.equal(db.reorderWords('N5', null), false);
  assert.equal(db.reorderWords('N5', [b.id, a.id]), true);
});

test('native writes are serial and flush exposes an asynchronous failure', async () => {
  const writes = []; let active = 0, fail = false;
  const Preferences = { get: async () => ({ value: null }), set: async ({ value }) => {
    assert.equal(active++, 0); await new Promise(r => setTimeout(r, 1)); active--;
    if (fail) throw new Error('native disk full'); writes.push(JSON.parse(value));
  } };
  const { db } = load([], { window: { Capacitor: { Plugins: { Preferences } } } });
  word(db); db.addCategory('Second'); await db.flush();
  assert.deepEqual(writes.at(-1).categories, ['N5', 'Second']);
  fail = true; db.addCategory('Unsaved'); await assert.rejects(db.flush(), /not saved/);
  assert.ok(db.storageStatus().error);
  fail = false; await db.retrySave(); assert.equal(writes.at(-1).categories.at(-1), 'Unsaved');
});

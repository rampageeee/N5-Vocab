/* ============================================================
   DATA LAYER
   Single source of truth. Everything reads/writes through here.
   Auto-saves to localStorage on every mutation.

   STAR RULES (all derived, never stored on the word):
     bronze  = flashPoints    >= 5   (daily cadence)
     gold    = all three sentence exercises complete (legacy 5-point stars kept)
     silver  = every non-kana char in word.kanji has testPasses >= 5

   Conjugation comes from js/conjugation.js. Generated exceptions are pure
   rules rather than stored overrides; legacy/manual irregular_forms remain
   exportable and are discarded when the word's identity changes.
   ============================================================ */
const DB = (() => {
  const KEY = 'n5data';
  const BRONZE_TARGET = 5;
  const GOLD_TARGET   = 3;   // three sentence exercises for one word
  const SILVER_TARGET = 5;   // successful test-mode passes per kanji
  const MISTAKE_RESOLVE_TARGET = 5;   // consecutive correct reviews before a logged mistake resolves

  const blank = () => ({
    categories: [],
    words: [],
    kanji: {},
    kana: {},     // per-kana test passes, keyed by character — see recordKanaPass
    grammar: [],   // user-added entries { id, pattern_name, structure, example, note } —
                   // the built-in 35-rule reference lives in js/grammar-rules.js, not here
    mistakes: [],  // §3.7 — logged sentence-checker errors the user can review;
                   // see logMistake/scoreMistake below
    settings: {
      theme: 'light', palette: 'summer', tolerance: 'normal',
      locale: 'en', lastPos: '', lastExport: null
    }
  });

  /* Storage writes are ordered on native. Synchronous callers keep the existing
     API; await flush() at an async boundary to observe native completion. */
  const Store = (() => {
    const pref = () => (window.Capacitor?.Plugins?.Preferences) || null;
    async function get(key) {
      const p = pref();
      if (p) { const r = await p.get({ key }); return r?.value ?? null; }
      return localStorage.getItem(key);
    }
    function set(key, value) {
      const p = pref();
      return p ? p.set({ key, value }) : localStorage.setItem(key, value);
    }
    return { get, set, native: () => !!pref() };
  })();

  let state = blank(), recoveryRaw = null, locked = false;
  let storageError = null, pending = Promise.resolve(), serial = 0;
  let transaction = false, needsSave = false;
  function storageStatus() { return { error: storageError?.message || null, locked, recoverable: recoveryRaw != null }; }
  function report(error) {
    storageError = error;
    if (typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
      window.dispatchEvent(new CustomEvent('n5-storage', { detail: storageStatus() }));
    }
  }
  function prepare(raw) {
    const candidate = BackupSchema.decode(raw, blank());
    reconcileKanji(candidate);
    candidate.words.forEach(regenerateForms);
    return candidate;
  }
  async function hydrate() {
    let raw;
    try {
      raw = await Store.get(KEY);
      if (raw == null && Store.native()) {
        raw = localStorage.getItem(KEY);
        if (raw != null) await Store.set(KEY, raw);
      }
      if (raw != null) state = prepare(raw);
      report(null);
    } catch (error) {
      // Never overwrite unreadable data with a blank database. Settings can
      // export the original payload or import a repaired backup.
      recoveryRaw = raw ?? null;
      locked = true;
      report(new Error('Could not load saved data. Writes are blocked. ' + error.message));
    }
    return state;
  }
  function persist() {
    const payload = exportJSON();
    if (!Store.native()) {
      try { Store.set(KEY, payload); report(null); }
      catch (error) { report(new Error('Data was not saved: ' + error.message)); throw storageError; }
      return;
    }
    const write = ++serial;
    pending = pending.then(async () => {
      try { await Store.set(KEY, payload); if (write === serial) report(null); }
      catch (error) { if (write === serial) report(new Error('Changes are not saved: ' + error.message)); }
    });
  }
  function save() { if (transaction) needsSave = true; else persist(); }
  async function flush() { await pending; if (storageError) throw new Error(storageError.message); }
  async function retrySave() { if (locked) throw new Error('Import a repaired backup before saving.'); persist(); await flush(); }
  function mutate(fn) {
    return (...args) => {
      if (locked) throw new Error('Saved data could not be loaded. Export recovery data or import a valid backup.');
      const before = JSON.stringify(state);
      transaction = true; needsSave = false;
      try {
        const result = fn(...args);
        transaction = false;
        if (needsSave) persist();
        return result;
      } catch (error) { transaction = false; state = JSON.parse(before); throw error; }
    };
  }

  /* Characters the kana chart can actually teach. Kept here rather than read
     from KANA_DATA because stars() runs on every dictionary/flashcard render,
     long before the lazy kana stroke file has loaded — a star rule that
     depended on load order would flicker. ー and small っ/ッ are deliberately
     absent: they have no chart entry, so requiring them would be another
     gate that can never open. */
  const KANA_TRACEABLE = new Set([
    ...'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん',
    ...'がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ', ...'ゃゅょ',
    ...'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン',
    ...'ガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポ', ...'ャュョ'
  ]);

  // ---- kanji extraction ------------------------------------
  const isKanji = ch => /[\u4e00-\u9faf\u3400-\u4dbf]/.test(ch);
  function kanjiOf(str) { return [...(str || '')].filter(isKanji); }

  function reconcileKanji(target = state) {
    const used = new Set();
    target.words.forEach(w => kanjiOf(w.kanji).forEach(c => used.add(c)));
    used.forEach(c => { if (!target.kanji[c]) target.kanji[c] = { testPasses: 0 }; });
    // Character progress is independent of vocabulary membership and retained.
  }

  const uid = () => 'w_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  // Pure morphology is shared; only persistence/word lookup lives in DB.
  const inflectionKey = Conjugation.key;
  const verbAudit = Conjugation.audit;
  const regenerateForms = Conjugation.regenerate;
  const previewForms = (w, cls) => Conjugation.forms(w, cls);
  const acceptedForms = Conjugation.accepted;
  const DRILL_FORMS = { verb: ['masu', 'masen', 'mashita', 'masendeshita', 'nai', 'nakatta', 'ta', 'te'],
    'i-adj': ['past', 'negative', 'pastNegative'], 'na-adj': ['past', 'negative', 'pastNegative'] };
  function drillFormsFor(w) {
    if (!w || (w.pos === 'verb' && !w.class_confirmed)) return [];
    return (DRILL_FORMS[w.pos] || []).filter(k => w.forms?.[k]);
  }
  const drillable = w => drillFormsFor(w).length > 0;
  function verbsNeedingAudit() {
    return state.words.filter(w => { const a = verbAudit(w); return a && (a.state === 'unusable' || !w.class_confirmed); });
  }
  function setVerbClass(id, cls) {
    const w = getWord(id);
    if (!w || !['godan', 'ichidan', 'irregular'].includes(cls)) return false;
    const a = verbAudit(w);
    if (a.state === 'unusable' || (a.state === 'clear' && a.cls !== cls)) return false;
    w.verb_class = cls; w.class_confirmed = true; regenerateForms(w); save(); return true;
  }
  function findWordByStem(stem) {
    for (const w of state.words) {
      const s = Conjugation.stems(w).find(s => s.stem === stem);
      if (s) return { word: w, stemType: s.stemType };
    }
    return null;
  }

  // ---- categories ------------------------------------------
  function addCategory(name) {
    name = (name || '').trim();
    if (!name) return false;
    if (state.categories.includes(name)) return false;
    state.categories.push(name);
    save();
    return true;
  }

  function categories() { return [...state.categories]; }
  function countInCategory(name) { return state.words.filter(w => w.category === name).length; }

  function deleteCategory(name) {
    state.categories = state.categories.filter(c => c !== name);
    state.words = state.words.filter(w => w.category !== name);
    reconcileKanji();
    save();
  }

  // Rename cascades to every word carrying the old category name.
  function renameCategory(oldName, newName) {
    newName = (newName || '').trim();
    if (!newName) return false;
    if (oldName === newName) return true;
    if (state.categories.includes(newName)) return false;
    const i = state.categories.indexOf(oldName);
    if (i < 0) return false;
    state.categories[i] = newName;
    state.words.forEach(w => { if (w.category === oldName) w.category = newName; });
    save();
    return true;
  }

  // Reorder the category list (drag, or ▲▼ in Settings). `order` must be
  // a permutation of the current category list.
  function reorderCategories(order) {
    if (!Array.isArray(order) || order.length !== state.categories.length) return false;
    const set = new Set(state.categories);
    if (new Set(order).size !== order.length || !order.every(n => set.has(n))) return false;
    state.categories = order.slice();
    save();
    return true;
  }

  // Reorder words WITHIN a category. Walks the flat array, refilling each
  // slot that belongs to `cat` from the new id order — other categories'
  // relative positions untouched. No schema change; wordsIn() stays honest.
  function reorderWords(cat, ids) {
    const inCat = state.words.filter(w => w.category === cat);
    if (!Array.isArray(ids) || ids.length !== inCat.length || new Set(ids).size !== ids.length) return false;
    const byId = Object.create(null); inCat.forEach(w => byId[w.id] = w);
    if (!ids.every(id => byId[id])) return false;
    let oi = 0;
    state.words = state.words.map(w => w.category === cat ? byId[ids[oi++]] : w);
    save();
    return true;
  }

  // ---- words -----------------------------------------------
  function wordsIn(cat) { return state.words.filter(w => w.category === cat); }
  function allWords()   { return [...state.words]; }
  function getWord(id)  { return state.words.find(w => w.id === id) || null; }

  function addWord({ kanji, reading, translation, pos, category, verb_class }) {
    const w = {
      id: uid(),
      kanji: (kanji || '').trim(),
      reading: (reading || '').trim(),
      translation: (translation || '').trim(),
      pos: pos || '',
      category,
      flashPoints: 0,
      sentencePoints: 0,
      lastFlashDate: null,
      lastSentenceDate: null
    };
    // An explicit pick in the word modal IS the audit answer for that word —
    // otherwise choosing "ichidan" by hand still left it locked out of the drill.
    if (pos === 'verb' && verb_class) { w.verb_class = verb_class; w.class_confirmed = true; }
    regenerateForms(w);
    state.words.push(w);
    reconcileKanji();
    save();
    return w;
  }

  function updateWord(id, fields) {
    const w = getWord(id);
    if (!w) return false;
    const old = { ...w };
    const oldHeadword = w.kanji || w.reading;
    ['kanji', 'reading', 'translation', 'pos'].forEach(k => {
      if (k in fields) w[k] = (fields[k] || '').trim();
    });
    if (oldHeadword !== (w.kanji || w.reading)) delete w.sentencePractice;
    Conjugation.clearForEdit(w, old);
    if ('verb_class' in fields) {
      w.verb_class = fields.verb_class || undefined;
      if (fields.verb_class) w.class_confirmed = true;
      else delete w.class_confirmed;        // cleared back to "not set" → returns to the audit
    }
    // category is a controlled value (from a select) — assign as-is, enables
    // moving a word between categories from the edit modal.
    if ('category' in fields && fields.category && state.categories.includes(fields.category)) {
      w.category = fields.category;
    }
    if (w.pos !== 'verb') { delete w.verb_class; delete w.class_confirmed; }
    regenerateForms(w);
    reconcileKanji();
    save();
    return true;
  }

  function deleteWord(id) {
    state.words = state.words.filter(w => w.id !== id);
    reconcileKanji();
    save();
  }

  // ---- grammar entries (user-added; built-in 35-rule reference is
  // static data in js/grammar-rules.js, not stored/persisted here) ------
  function grammarEntries() { return [...state.grammar]; }
  function getGrammarEntry(id) { return state.grammar.find(g => g.id === id) || null; }

  function addGrammarEntry({ pattern_name, structure, example, note }) {
    const g = {
      id: uid(),
      pattern_name: (pattern_name || '').trim(),
      structure: (structure || '').trim(),
      example: (example || '').trim(),
      note: (note || '').trim()
    };
    state.grammar.push(g);
    save();
    return g;
  }

  function updateGrammarEntry(id, fields) {
    const g = getGrammarEntry(id);
    if (!g) return false;
    ['pattern_name', 'structure', 'example', 'note'].forEach(k => {
      if (k in fields) g[k] = (fields[k] || '').trim();
    });
    save();
    return true;
  }

  function deleteGrammarEntry(id) {
    state.grammar = state.grammar.filter(g => g.id !== id);
    save();
  }

  // Only documented form-table conflicts become exercises. Legacy guessed
  // particle replacements stay exportable but are excluded from active review.
  function activeMistakes() { return state.mistakes.filter(m => !m.resolved && m.evidence === 'form-table'); }
  function allMistakes()    { return [...state.mistakes]; }
  function getMistake(id)   { return state.mistakes.find(m => m.id === id) || null; }

  function logMistake({ kind, original_sentence, wrong_token, correct_tokens, rule_violated, evidence }) {
    if (evidence !== 'form-table' || kind !== 'conjugation') return null;
    if (!correct_tokens || !correct_tokens.length) return null;   // nothing to quiz on — don't log
    // Dedup on (sentence, wrong_token) only — for a given context the
    // candidate set is deterministic, so re-checking the same draft
    // sentence repeatedly doesn't pile up duplicate active entries.
    const dup = state.mistakes.find(m => !m.resolved && m.evidence === evidence
      && m.original_sentence === original_sentence
      && m.wrong_token === wrong_token);
    if (dup) return dup;
    const m = {
      id: uid(), kind, evidence,
      original_sentence, wrong_token, correct_tokens: [...correct_tokens], rule_violated,
      date: new Date().toISOString(),
      resolved: false, streak: 0
    };
    state.mistakes.push(m);
    save();
    return m;
  }

  // Resolution only ever advances through THIS function (the Review tab) —
  // re-checking the same sentence again in the Sentences tab creates/dedupes
  // a log entry but never resolves one; only a deliberate correct re-answer
  // in Review counts toward the streak.
  function scoreMistake(id, typed) {
    const m = getMistake(id);
    if (!m || m.evidence !== 'form-table') return { correct: false, resolved: false, streak: 0 };
    const norm = normKana(typed);
    const correct = norm !== '' && m.correct_tokens.some(c => normKana(c) === norm);
    if (correct) {
      m.streak = (m.streak || 0) + 1;
      if (m.streak >= MISTAKE_RESOLVE_TARGET) m.resolved = true;
    } else {
      m.streak = 0;
    }
    save();
    return { correct, resolved: m.resolved, streak: m.streak };
  }

  // ---- flashcard scoring -----------------------------------
  const todayStr = () => new Date().toISOString().slice(0, 10);

  function normKana(s) {
    return Conjugation.kana(s).trim();
  }

  // Has this word already banked its one point for today? Read-only view of
  // the same lastFlashDate field scoreFlash writes — the flashcard deck
  // filter and the scorer can't disagree about what "today" means.
  function scoredToday(w) { return !!w && w.lastFlashDate === todayStr(); }

  function scoreFlash(id, typed) {
    const w = getWord(id);
    if (!w) return { correct: false, awarded: false, cappedToday: false };
    const correct = normKana(typed) === normKana(w.reading) && normKana(typed) !== '';
    if (!correct) return { correct: false, awarded: false, cappedToday: false };

    const today = todayStr();
    if (w.lastFlashDate === today) return { correct: true, awarded: false, cappedToday: true };

    w.flashPoints = (w.flashPoints || 0) + 1;
    w.lastFlashDate = today;
    save();
    return { correct: true, awarded: true, cappedToday: false };
  }

  // A word keeps one chosen example and the three completed exercises with
  // it, so imports and phone backups preserve both the sentence and progress.
  function sentencePractice(id) {
    const p = getWord(id)?.sentencePractice;
    return p ? { ...p, surfaces: [...p.surfaces], lemmas: [...p.lemmas],
      baseWords: p.baseWords ? [...p.baseWords] : null, steps: [...p.steps] } : null;
  }

  function setSentencePractice(id, example) {
    const w = getWord(id);
    if (!w || !example || !example.jp || !(example.en || example.pl) ||
        !Array.isArray(example.surfaces) || example.surfaces.length < 2 ||
        !Array.isArray(example.lemmas) || example.lemmas.length !== example.surfaces.length ||
        example.surfaces.join('').normalize('NFKC') !== example.jp.normalize('NFKC').replace(/[\s。、！？!?.,「」『』]/g, '') ||
        !example.surfaces.some(s => s === example.target)) return false;
    w.sentencePractice = {
      id: example.id || null, jp: example.jp, en: example.en, pl: example.pl || '',
      source: example.source || '', review: example.review || '',
      surfaces: [...example.surfaces], lemmas: [...example.lemmas],
      baseWords: Array.isArray(example.baseWords) ? [...example.baseWords] : null,
      target: example.target, steps: [false, false, false]
    };
    save();
    return true;
  }

  function completeSentenceStep(id, step) {
    const p = getWord(id)?.sentencePractice;
    if (!p || !Number.isInteger(step) || step < 0 || step > 2 ||
        (step > 0 && !p.steps[step - 1])) return false;
    if (p.steps[step]) return true;
    p.steps[step] = true;
    save();
    return true;
  }

  function sentenceProgress(id) {
    return sentencePractice(id)?.steps || [false, false, false];
  }

  /* Category star. Every word in the category carrying all three — which is
     only a meaningful bar now that each of the three has a route for every
     word shape. An empty category is NOT complete; otherwise a category
     would ship its reward before holding anything. */
  function categoryStar(cat) {
    const words = wordsIn(cat);
    if (!words.length) return false;
    return words.every(w => { const s = stars(w); return s.bronze && s.silver && s.gold; });
  }

  function categoryProgress(cat) {
    const words = wordsIn(cat);
    const done = words.filter(w => { const s = stars(w); return s.bronze && s.silver && s.gold; }).length;
    return { done, total: words.length };
  }

  // ---- stars (derived) -------------------------------------
  /* Silver, restated. The old rule was `every kanji in the word is mastered`,
     with a `chars.length > 0` guard — which meant a word with NO kanji
     (ください, とても, コーヒー) had silver permanently false. Not unearned:
     unreachable. Any category holding one such word could therefore never be
     completed either.

     Words that DO have kanji keep the identical rule, so nothing already
     earned is disturbed. Kana-only words now fall back to the kana chart:
     every traceable character in the reading has to be mastered there. */
  function silverOf(word) {
    const chars = kanjiOf(word.kanji);
    if (chars.length > 0) {
      return chars.every(c => (state.kanji[c]?.testPasses || 0) >= SILVER_TARGET);
    }
    const kana = [...(word.reading || word.kanji || '')].filter(c => KANA_TRACEABLE.has(c));
    return kana.length > 0 && kana.every(c => (state.kana[c]?.testPasses || 0) >= SILVER_TARGET);
  }

  function stars(word) {
    const silver = silverOf(word);
    return {
      bronze: (word.flashPoints || 0)    >= BRONZE_TARGET,
      silver,
      // Preserve stars earned under the former five-day drill, while new
      // stars require all three exercises on the word's example sentence.
      gold:   (word.sentencePoints || 0) >= 5 ||
              !!(word.sentencePractice?.steps?.length === 3 && word.sentencePractice.steps.every(Boolean))
    };
  }

  function kanjiProgress(ch) { return state.kanji[ch]?.testPasses || 0; }

  /* Priority override. The N5 kanji set is a community RECONSTRUCTION — the
     JLPT publishes no official list, and the sources disagree on membership
     — so the bundled list is a default, not an authority. Anything can be
     pushed into or out of the priority group by hand and that choice wins.
     'auto' means "use the bundled list". */
  function kanjiPriority(ch) { return (state.kanji[ch] && state.kanji[ch].priority) || 'auto'; }
  function setKanjiPriority(ch, v) {
    if (!['auto', 'high', 'low'].includes(v)) return false;
    if (!state.kanji[ch]) state.kanji[ch] = { testPasses: 0 };
    if (v === 'auto') delete state.kanji[ch].priority;
    else state.kanji[ch].priority = v;
    save();
    return true;
  }
  function uniqueKanji() { return Object.keys(state.kanji); }

  function kanaProgress(ch) { return state.kana[ch]?.testPasses || 0; }
  function kanaTraceable(ch) { return KANA_TRACEABLE.has(ch); }

  function recordKanaPass(ch) {
    if (!KANA_TRACEABLE.has(ch)) return 0;
    if (!state.kana[ch]) state.kana[ch] = { testPasses: 0 };
    if (state.kana[ch].testPasses < SILVER_TARGET) {
      state.kana[ch].testPasses++;
      save();
    }
    return state.kana[ch].testPasses;
  }

  function recordKanjiPass(ch) {
    if (!state.kanji[ch]) state.kanji[ch] = { testPasses: 0 };
    if (state.kanji[ch].testPasses < SILVER_TARGET) {
      state.kanji[ch].testPasses++;
      save();
    }
    return state.kanji[ch].testPasses;
  }

  // ---- stats -----------------------------------------------
  function stats() {
    const mastered = state.words.filter(w => {
      const s = stars(w);
      return s.bronze && s.silver && s.gold;
    }).length;
    return { categories: state.categories.length, words: state.words.length, mastered };
  }

  // ---- settings --------------------------------------------
  function getTheme() { return state.settings.theme; }
  function setTheme(t) { state.settings.theme = t; save(); }
  function getPalette() { return state.settings.palette || 'summer'; }
  function setPalette(p) { state.settings.palette = p; save(); }
  function getTolerance() { return state.settings.tolerance || 'normal'; }
  function setTolerance(t) { state.settings.tolerance = t; save(); }
  function getLocale() { return state.settings.locale || 'en'; }
  function setLocale(l) { state.settings.locale = l; save(); }
  // Deck filters — persisted so a preference survives app restarts (set once,
  // not re-checked every session). Read at session START only; toggling them
  // mid-session is impossible anyway (the setup panel is hidden while a deck
  // is running), which keeps the deck array stable for its whole life.
  const FLASH_FILTER_DEFAULTS = { hideScoredToday: false, hideStarred: false };
  function getFlashFilters() {
    return Object.assign({}, FLASH_FILTER_DEFAULTS, state.settings.flashFilters || {});
  }
  function setFlashFilter(key, on) {
    if (!(key in FLASH_FILTER_DEFAULTS)) return false;
    const f = getFlashFilters();
    f[key] = !!on;
    state.settings.flashFilters = f;
    save();
    return true;
  }

  function getLastPos() { return state.settings.lastPos || ''; }
  function setLastPos(p) { state.settings.lastPos = p || ''; save(); }
  function lastExport() { return state.settings.lastExport; }
  function markExport() { state.settings.lastExport = new Date().toISOString(); save(); }

  // ---- export / import -------------------------------------
  function exportJSON() { return JSON.stringify({ ...state, app: 'n5-vocab', schemaVersion: BackupSchema.VERSION }, null, 2); }
  async function importJSON(raw) {
    const candidate = prepare(raw); // All validation/regeneration before writes or adoption.
    await pending;
    try {
      if (recoveryRaw != null) await Store.set(KEY + '-recovery', recoveryRaw);
      await Store.set(KEY, JSON.stringify(candidate));
    } catch (error) { report(new Error('Import was not saved: ' + error.message)); throw storageError; }
    state = candidate;
    locked = false;
    report(null);
  }


  const api = {
    hydrate, flush, retrySave, storageStatus, recoveryData: () => recoveryRaw,
    SILVER_TARGET, BRONZE_TARGET, GOLD_TARGET, MISTAKE_RESOLVE_TARGET,
    addCategory, categories, countInCategory, deleteCategory,
    renameCategory, reorderCategories, reorderWords,
    wordsIn, allWords, getWord, addWord, updateWord, deleteWord, findWordByStem,
    grammarEntries, getGrammarEntry, addGrammarEntry, updateGrammarEntry, deleteGrammarEntry,
    activeMistakes, allMistakes, getMistake, logMistake, scoreMistake,
    kanjiOf, uniqueKanji, kanjiProgress, recordKanjiPass,
    kanjiPriority, setKanjiPriority,
    kanaProgress, recordKanaPass, kanaTraceable,
    verbAudit, verbsNeedingAudit, previewForms, setVerbClass, inflectionKey,
    scoreFlash, scoredToday, normKana,
    sentencePractice, setSentencePractice, completeSentenceStep, sentenceProgress,
    drillFormsFor, drillable, acceptedForms, categoryStar, categoryProgress,
    getFlashFilters, setFlashFilter,
    stars, stats,
    getTheme, setTheme, getPalette, setPalette, getTolerance, setTolerance,
    getLocale, setLocale, getLastPos, setLastPos, lastExport, markExport,
    exportJSON, importJSON
  };
  const mutations = [addCategory, deleteCategory, renameCategory, reorderCategories, reorderWords,
    addWord, updateWord, deleteWord, addGrammarEntry, updateGrammarEntry, deleteGrammarEntry,
    logMistake, scoreMistake, scoreFlash, setSentencePractice, completeSentenceStep,
    recordKanjiPass, recordKanaPass, setKanjiPriority, setVerbClass,
    setTheme, setPalette, setTolerance, setLocale, setFlashFilter, setLastPos, markExport];
  mutations.forEach(fn => { api[fn.name] = mutate(fn); });
  return api;
})();

/* `const DB = …` at classic-script top level creates a binding in the global
   DECLARATIVE record, not a property on `window` — so `window.DB` was
   undefined everywhere it was tested. That silently pinned I18N.t()'s locale
   lookup to 'en' (see i18n.js) and made App.refreshExportStatus() a no-op.
   Publish the reference explicitly instead of rewriting every call site. */
window.DB = DB;

/* ============================================================
   DATA LAYER
   Single source of truth. Everything reads/writes through here.
   Auto-saves to localStorage on every mutation (spec §1).

   SCHEMA (localStorage key "n5data"):
   {
     categories: [ "食べ物", ... ]        // ordered, creation order
     words: [ {
        id, kanji, reading, translation, pos, category,
        flashPoints, sentencePoints,
        lastFlashDate, lastSentenceDate
     } ]
     kanji: { "食": { testPasses: 0 }, ... }   // per single char
     settings: { theme, lastExport }
   }

   STAR RULES (all derived, never stored on the word):
     bronze  = flashPoints    >= 10
     gold    = sentencePoints >= 10
     silver  = every non-kana char in word.kanji has testPasses >= 5
   ============================================================ */
const DB = (() => {
  const KEY = 'n5data';
  const BRONZE_TARGET = 10;
  const GOLD_TARGET   = 10;
  const SILVER_TARGET = 5;   // successful test-mode passes per kanji

  const blank = () => ({
    categories: [],
    words: [],
    kanji: {},
    settings: { theme: 'light', palette: 'summer', tolerance: 'normal', lastExport: null }
  });

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return blank();
      const p = JSON.parse(raw);
      // defensive fill for forward-compat
      return Object.assign(blank(), p, { settings: Object.assign(blank().settings, p.settings || {}) });
    } catch { return blank(); }
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  // ---- kanji extraction ------------------------------------
  // CJK unified ideographs range; excludes kana & latin.
  const isKanji = ch => /[\u4e00-\u9faf\u3400-\u4dbf]/.test(ch);

  function kanjiOf(str) {
    return [...(str || '')].filter(isKanji);
  }

  // Rebuild the kanji map from all words. Adds missing chars,
  // preserves existing progress, prunes chars no word uses.
  function reconcileKanji() {
    const used = new Set();
    state.words.forEach(w => kanjiOf(w.kanji).forEach(c => used.add(c)));
    // add new
    used.forEach(c => { if (!state.kanji[c]) state.kanji[c] = { testPasses: 0 }; });
    // prune orphans
    Object.keys(state.kanji).forEach(c => { if (!used.has(c)) delete state.kanji[c]; });
  }

  // ---- id --------------------------------------------------
  const uid = () => 'w_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

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

  // Cascade: removes the category AND its words (confirmed in UI).
  function deleteCategory(name) {
    state.categories = state.categories.filter(c => c !== name);
    state.words = state.words.filter(w => w.category !== name);
    reconcileKanji();
    save();
  }

  // ---- words -----------------------------------------------
  function wordsIn(cat) { return state.words.filter(w => w.category === cat); }
  function allWords()   { return [...state.words]; }
  function getWord(id)  { return state.words.find(w => w.id === id) || null; }

  function addWord({ kanji, reading, translation, pos, category }) {
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
    state.words.push(w);
    reconcileKanji();
    save();
    return w;
  }

  function updateWord(id, fields) {
    const w = getWord(id);
    if (!w) return false;
    ['kanji', 'reading', 'translation', 'pos'].forEach(k => {
      if (k in fields) w[k] = (fields[k] || '').trim();
    });
    reconcileKanji();
    save();
    return true;
  }

  function deleteWord(id) {
    state.words = state.words.filter(w => w.id !== id);
    reconcileKanji();
    save();
  }

  // ---- flashcard scoring -----------------------------------
  const todayStr = () => new Date().toISOString().slice(0, 10);

  // katakana → hiragana, trim, so か matches カ and stray spaces don't fail.
  function normKana(s) {
    return (s || '').trim().replace(/[\u30a1-\u30f6]/g,
      c => String.fromCharCode(c.charCodeAt(0) - 0x60));
  }

  // Returns { correct, awarded, cappedToday } — awarded=false if right but
  // already counted today (daily cap), so UI can explain the non-increment.
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

  // ---- stars (derived) -------------------------------------
  function stars(word) {
    const chars = kanjiOf(word.kanji);
    const silver = chars.length > 0 &&
      chars.every(c => (state.kanji[c]?.testPasses || 0) >= SILVER_TARGET);
    return {
      bronze: (word.flashPoints || 0)    >= BRONZE_TARGET,
      silver,
      gold:   (word.sentencePoints || 0) >= GOLD_TARGET
    };
  }

  // per-kanji progress, for the drawing grid later
  function kanjiProgress(ch) { return state.kanji[ch]?.testPasses || 0; }
  function uniqueKanji() { return Object.keys(state.kanji); }

  // Record one successful (≥80%) Test attempt for a kanji. Counts up to
  // SILVER_TARGET; further passes are no-ops. Returns the new count.
  function recordKanjiPass(ch) {
    if (!state.kanji[ch]) state.kanji[ch] = { testPasses: 0 };
    if (state.kanji[ch].testPasses < SILVER_TARGET) {
      state.kanji[ch].testPasses++;
      save();
    }
    return state.kanji[ch].testPasses;
  }

  // ---- settings --------------------------------------------
  function getTheme() { return state.settings.theme; }
  function setTheme(t) { state.settings.theme = t; save(); }
  function getPalette() { return state.settings.palette || 'summer'; }
  function setPalette(p) { state.settings.palette = p; save(); }
  function getTolerance() { return state.settings.tolerance || 'normal'; }
  function setTolerance(t) { state.settings.tolerance = t; save(); }
  function lastExport() { return state.settings.lastExport; }
  function markExport() { state.settings.lastExport = new Date().toISOString(); save(); }

  // ---- export / import -------------------------------------
  function exportJSON() { return JSON.stringify(state, null, 2); }
  function importJSON(raw) {
    const p = JSON.parse(raw);            // throws on bad input → caller catches
    if (!p.words || !p.categories) throw new Error('Nieprawidłowy plik.');
    state = Object.assign(blank(), p, { settings: Object.assign(blank().settings, p.settings || {}) });
    reconcileKanji();
    save();
  }

  return {
    // constants exposed for progress displays
    SILVER_TARGET, BRONZE_TARGET, GOLD_TARGET,
    // categories
    addCategory, categories, countInCategory, deleteCategory,
    // words
    wordsIn, allWords, getWord, addWord, updateWord, deleteWord,
    // kanji
    kanjiOf, uniqueKanji, kanjiProgress, recordKanjiPass,
    // scoring
    scoreFlash, normKana,
    // stars
    stars,
    // settings
    getTheme, setTheme, getPalette, setPalette, getTolerance, setTolerance, lastExport, markExport,
    // backup
    exportJSON, importJSON
  };
})();

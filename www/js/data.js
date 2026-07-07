/* ============================================================
   DATA LAYER
   Single source of truth. Everything reads/writes through here.
   Auto-saves to localStorage on every mutation.

   STAR RULES (all derived, never stored on the word):
     bronze  = flashPoints    >= 5   (daily cadence)
     gold    = sentencePoints >= 5
     silver  = every non-kana char in word.kanji has testPasses >= 5
   ============================================================ */
const DB = (() => {
  const KEY = 'n5data';
  const BRONZE_TARGET = 5;
  const GOLD_TARGET   = 5;
  const SILVER_TARGET = 5;   // successful test-mode passes per kanji

  const blank = () => ({
    categories: [],
    words: [],
    kanji: {},
    settings: {
      theme: 'light', palette: 'summer', tolerance: 'normal',
      locale: 'en', lastPos: '', lastExport: null
    }
  });

  /* ---- storage seam ----------------------------------------
     Native (APK): @capacitor/preferences → SharedPreferences, which
     survives app updates and rides Android auto-backup. Browser (or
     any context without the Capacitor bridge): localStorage. Same
     data.js runs in both — the only async surface is the initial
     read (hydrate); writes are fire-and-forget (Preferences flushes
     fast and this app isn't write-heavy, so a mutation-then-kill
     losing the last write is a non-issue; awaiting every save() would
     ripple async through ~40 call sites for no real gain). */
  const Store = (() => {
    const pref = () => (window.Capacitor && window.Capacitor.Plugins
      && window.Capacitor.Plugins.Preferences) || null;
    async function get(key) {
      const p = pref();
      if (p) { try { const r = await p.get({ key }); return (r && r.value != null) ? r.value : null; } catch { return null; } }
      try { return localStorage.getItem(key); } catch { return null; }
    }
    function set(key, value) {
      const p = pref();
      if (p) { p.set({ key, value }).catch(() => {}); return; }
      try { localStorage.setItem(key, value); } catch {}
    }
    return { get, set };
  })();

  // Starts blank so every synchronous getter works before hydrate resolves;
  // main.js awaits hydrate() before first paint, so real values are in place.
  let state = blank();

  function merge(p) {
    return Object.assign(blank(), p, { settings: Object.assign(blank().settings, p.settings || {}) });
  }

  async function hydrate() {
    let raw = await Store.get(KEY);
    // One-time migration: pre-Preferences builds wrote to localStorage. On
    // native, if Preferences is empty but a legacy localStorage copy survived
    // the update, adopt it (and persist forward). No-op on web, where Store
    // already IS localStorage. Falls through to manual .json import if the
    // WebView cleared localStorage across the update.
    if (raw == null) {
      try {
        const legacy = localStorage.getItem(KEY);
        if (legacy != null) { raw = legacy; Store.set(KEY, legacy); }
      } catch { /* localStorage unavailable */ }
    }
    if (raw) {
      try { state = merge(JSON.parse(raw)); reconcileKanji(); } catch { /* keep blank */ }
    }
    return state;
  }

  function save() { Store.set(KEY, JSON.stringify(state)); }

  // ---- kanji extraction ------------------------------------
  const isKanji = ch => /[\u4e00-\u9faf\u3400-\u4dbf]/.test(ch);
  function kanjiOf(str) { return [...(str || '')].filter(isKanji); }

  function reconcileKanji() {
    const used = new Set();
    state.words.forEach(w => kanjiOf(w.kanji).forEach(c => used.add(c)));
    used.forEach(c => { if (!state.kanji[c]) state.kanji[c] = { testPasses: 0 }; });
    Object.keys(state.kanji).forEach(c => { if (!used.has(c)) delete state.kanji[c]; });
  }

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

  // Reorder the category list (drag). `order` must be a permutation.
  function reorderCategories(order) {
    if (!Array.isArray(order) || order.length !== state.categories.length) return false;
    const set = new Set(state.categories);
    if (!order.every(n => set.has(n))) return false;
    state.categories = order.slice();
    save();
    return true;
  }

  // Reorder words WITHIN a category. Walks the flat array, refilling each
  // slot that belongs to `cat` from the new id order — other categories'
  // relative positions untouched. No schema change; wordsIn() stays honest.
  function reorderWords(cat, ids) {
    const inCat = state.words.filter(w => w.category === cat);
    if (ids.length !== inCat.length) return false;
    const byId = {}; inCat.forEach(w => byId[w.id] = w);
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
    // category is a controlled value (from a select) — assign as-is, enables
    // moving a word between categories from the edit modal.
    if ('category' in fields && fields.category && state.categories.includes(fields.category)) {
      w.category = fields.category;
    }
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

  function normKana(s) {
    return (s || '').trim().replace(/[\u30a1-\u30f6]/g,
      c => String.fromCharCode(c.charCodeAt(0) - 0x60));
  }

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

  function kanjiProgress(ch) { return state.kanji[ch]?.testPasses || 0; }
  function uniqueKanji() { return Object.keys(state.kanji); }

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
  function getLastPos() { return state.settings.lastPos || ''; }
  function setLastPos(p) { state.settings.lastPos = p || ''; save(); }
  function lastExport() { return state.settings.lastExport; }
  function markExport() { state.settings.lastExport = new Date().toISOString(); save(); }

  // ---- export / import -------------------------------------
  function exportJSON() { return JSON.stringify(state, null, 2); }
  function importJSON(raw) {
    const p = JSON.parse(raw);
    if (!p.words || !p.categories) throw new Error('Invalid file.');
    state = merge(p);
    reconcileKanji();
    save();
  }

  return {
    hydrate,
    SILVER_TARGET, BRONZE_TARGET, GOLD_TARGET,
    addCategory, categories, countInCategory, deleteCategory,
    renameCategory, reorderCategories, reorderWords,
    wordsIn, allWords, getWord, addWord, updateWord, deleteWord,
    kanjiOf, uniqueKanji, kanjiProgress, recordKanjiPass,
    scoreFlash, normKana,
    stars, stats,
    getTheme, setTheme, getPalette, setPalette, getTolerance, setTolerance,
    getLocale, setLocale, getLastPos, setLastPos, lastExport, markExport,
    exportJSON, importJSON
  };
})();

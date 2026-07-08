/* ============================================================
   DATA LAYER
   Single source of truth. Everything reads/writes through here.
   Auto-saves to localStorage on every mutation.

   STAR RULES (all derived, never stored on the word):
     bronze  = flashPoints    >= 5   (daily cadence)
     gold    = sentencePoints >= 5
     silver  = every non-kana char in word.kanji has testPasses >= 5

   CONJUGATION CACHE (new)
     verb_class: "godan"|"ichidan"|"irregular" — the ONE new schema
     field (gated on pos==='verb'). Everything else the sentence-
     checker spec asked for already exists: adj_class is just pos
     ('i-adj'/'na-adj'), hiragana/meaning are reading/translation.
     `category` is the user's own freeform grouping and is never
     touched by any of this.

     w.forms holds the precomputed conjugated surface forms (built
     once on add/edit, not per sentence-check). Two rule tables stay
     separate on purpose (row-stem swap vs onbin) — collapsing them
     is exactly where て/た-form mistakes creep in. w.irregular_forms
     is a per-word override merged on top of the generated forms —
     visible in the data (inspectable, exportable, editable) rather
     than a shadow rule the data layer hides. The four known N5
     exceptions (する/来る/行く/ある) auto-seed this field the first
     time a matching headword is saved; nothing else does.
   ============================================================ */
const DB = (() => {
  const KEY = 'n5data';
  const BRONZE_TARGET = 5;
  const GOLD_TARGET   = 5;
  const SILVER_TARGET = 5;   // successful test-mode passes per kanji
  const MISTAKE_RESOLVE_TARGET = 5;   // consecutive correct reviews before a logged mistake resolves —
                                       // same number as bronze/gold/silver, one mastery rhythm app-wide

  const blank = () => ({
    categories: [],
    words: [],
    kanji: {},
    grammar: [],   // user-added entries { id, pattern_name, structure, example, note } —
                   // the built-in 35-rule reference lives in js/grammar-rules.js, not here
    mistakes: [],  // §3.7 — logged sentence-checker errors the user can review;
                   // see logMistake/scoreMistake below
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
      try {
        state = merge(JSON.parse(raw));
        reconcileKanji();
        state.words.forEach(regenerateForms);   // backfill verb_class + forms on upgrade
      } catch { /* keep blank */ }
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

  // ---- conjugation tables (§0.1) ----------------------------
  // Table A — row-stem swap, GODAN only. u-row kana → i/a/e row of the
  // same consonant. う's a-row is わ, not あ — the one exception baked
  // into the table itself so callers never have to special-case it.
  const GODAN_ROW = {
    'う': { i:'い', a:'わ', e:'え' }, 'く': { i:'き', a:'か', e:'け' },
    'ぐ': { i:'ぎ', a:'が', e:'げ' }, 'す': { i:'し', a:'さ', e:'せ' },
    'つ': { i:'ち', a:'た', e:'て' }, 'ぬ': { i:'に', a:'な', e:'ね' },
    'ぶ': { i:'び', a:'ば', e:'べ' }, 'む': { i:'み', a:'ま', e:'め' },
    'る': { i:'り', a:'ら', e:'れ' }
  };
  // Table B — onbin (て/た), GODAN only, keyed on final kana. Governed by
  // the verb's own last kana, NOT one blanket "godan" rule.
  const ONBIN = {
    'く': { te:'いて', ta:'いた' }, 'ぐ': { te:'いで', ta:'いだ' },
    'う': { te:'って', ta:'った' }, 'つ': { te:'って', ta:'った' }, 'る': { te:'って', ta:'った' },
    'ぬ': { te:'んで', ta:'んだ' }, 'ぶ': { te:'んで', ta:'んだ' }, 'む': { te:'んで', ta:'んだ' },
    'す': { te:'して', ta:'した' }
  };

  const headword = w => w.kanji || w.reading || '';

  function genGodan(word) {
    const last = word.slice(-1), stem = word.slice(0, -1);
    const rowT = GODAN_ROW[last], onb = ONBIN[last];
    if (!rowT || !onb) return {};   // not a real godan ending — leave empty, never guess
    return {
      masu: stem + rowT.i + 'ます', masen: stem + rowT.i + 'ません',
      nai:  stem + rowT.a + 'ない',
      ta:   stem + onb.ta,          te:    stem + onb.te,
      ba:   stem + rowT.e + 'ば',
      potential: stem + rowT.e + 'る'   // required for GA-2 (…が話せます-type predicates)
    };
  }
  function genIchidan(word) {
    const stem = word.slice(0, -1);   // drop る, attach directly — no onbin step
    return {
      masu: stem + 'ます', masen: stem + 'ません', nai: stem + 'ない',
      ta: stem + 'た', te: stem + 'て', ba: stem + 'れば', potential: stem + 'られる'
    };
  }
  // Adjectives: row-stem-style, no onbin step.
  function genAdj(w) {
    const key = headword(w);
    if (w.pos === 'i-adj') {
      const stem = key.slice(0, -1);   // drop い
      return { past: stem + 'かった', negative: stem + 'くない' };
    }
    return { past: key + 'だった', negative: key + 'じゃない' };   // na-adj
  }

  // ---- §0.2 closed exception set (exactly four) -------------
  // Stored as a per-word `irregular_forms` override rather than a hidden
  // lookup — visible in exported data, inspectable, and the same
  // mechanism a future genuinely-new exception would use, without a
  // schema change. This function is the ONLY thing that writes to it
  // automatically, and only the first time (never clobbers a manual edit).
  const KNOWN_VERB_EXCEPTIONS = {
    'する':  { masu:'します', masen:'しません', nai:'しない', ta:'した', te:'して', ba:'すれば', potential:'できる' },
    'くる':  { masu:'きます', masen:'きません', nai:'こない', ta:'きた', te:'きて', ba:'くれば', potential:'こられる' },
    '来る':  { masu:'来ます', masen:'来ません', nai:'来ない', ta:'来た', te:'来て', ba:'来れば', potential:'来られる' },
    '行く':  { te:'行って', ta:'行った' },     // godan; only onbin disagrees (行いて would be wrong)
    'いく':  { te:'いって', ta:'いった' },
    'ある':  { nai:'ない' }                    // suppletive negative — NOT あらない
    // 帰る is deliberately NOT here: verb_class:"godan" + plain onbin
    // already yields 帰って correctly on its own.
  };
  function seedKnownVerbException(w) {
    if (w.irregular_forms) return;             // never overwrite an existing/manual override
    const hit = KNOWN_VERB_EXCEPTIONS[headword(w)];
    if (hit) w.irregular_forms = Object.assign({}, hit);
  }
  function inferVerbClass(w) {
    const k = headword(w);
    if (k === 'する' || k === 'くる' || k === '来る') return 'irregular';
    return 'godan';   // safe default; ichidan verbs need explicit selection —
                       // -iru/-eru endings are NOT a reliable ichidan signal
                       // (帰る, 走る, 要る are godan despite looking ichidan).
  }

  // ---- cache entry point -------------------------------------
  function regenerateForms(w) {
    if (w.pos === 'verb') {
      if (!w.verb_class) w.verb_class = inferVerbClass(w);
      seedKnownVerbException(w);
      const base = w.verb_class === 'ichidan' ? genIchidan(headword(w))
                 : w.verb_class === 'irregular' ? {}
                 : genGodan(headword(w));
      w.forms = Object.assign({}, base, w.irregular_forms || {});
    } else if (w.pos === 'i-adj' || w.pos === 'na-adj') {
      w.forms = Object.assign({}, genAdj(w), w.irregular_forms || {});
    } else {
      delete w.forms;
    }
  }

  // ---- stem lookup (checker tier-2 use) -----------------------
  // Given a bare, possibly-incomplete fragment (e.g. "書か" written where
  // a full conjugated form was needed), find which dictionary entry it
  // could be a row-stem of. Reuses GODAN_ROW directly rather than a
  // second copy of the row table, so the checker's idea of "a valid stem"
  // can never drift from what the cache generator itself used.
  function stemsOf(w) {
    const hw = headword(w);
    if (!hw) return [];
    if (w.pos === 'verb') {
      if (w.verb_class === 'ichidan') return [{ stem: hw.slice(0, -1), stemType: 'ichidan' }];
      if (w.verb_class === 'godan') {
        const last = hw.slice(-1), before = hw.slice(0, -1);
        const row = GODAN_ROW[last];
        if (!row) return [];
        return [
          { stem: before + row.i, stemType: 'i-row' },
          { stem: before + row.a, stemType: 'a-row' },
          { stem: before + row.e, stemType: 'e-row' }
        ];
      }
      return [];   // irregular (する/来る) — stems too short/ambiguous to search reliably
    }
    if (w.pos === 'i-adj') return [{ stem: hw.slice(0, -1), stemType: 'i-adj' }];
    // na-adj "stem" is the bare headword — only meaningful when checking
    // whether an i-adjective-style ending (くない/かった) was mistakenly
    // stripped off a na-adjective by the caller.
    if (w.pos === 'na-adj') return [{ stem: hw, stemType: 'na-adj' }];
    return [];
  }

  function findWordByStem(stem) {
    if (!stem) return null;
    for (const w of state.words) {
      for (const s of stemsOf(w)) {
        if (s.stem === stem) return { word: w, stemType: s.stemType };
      }
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
    if (pos === 'verb' && verb_class) w.verb_class = verb_class;
    regenerateForms(w);
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
    if ('verb_class' in fields) w.verb_class = fields.verb_class || undefined;
    // category is a controlled value (from a select) — assign as-is, enables
    // moving a word between categories from the edit modal.
    if ('category' in fields && fields.category && state.categories.includes(fields.category)) {
      w.category = fields.category;
    }
    if (w.pos !== 'verb') delete w.verb_class;
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

  // ---- mistake log (§3.7) --------------------------------------
  // correct_tokens is a SET, not a single value. Testing showed requiring
  // exactly one confident candidate — the bar the inline "suggested
  // correction" box uses — meant almost NOTHING would ever get logged for
  // particle mistakes: の/と/や all share the same noun-noun shape, は/が/
  // に/も/まで all share noun-predicate, so a real violation's candidate
  // set is nearly always 3–8 particles, never exactly 1. Logging accepts
  // any violation/error with AT LEAST ONE known candidate (i.e. anything
  // the checker could actually explain), and review scoring accepts ANY
  // of that set as correct — same "don't claim one truth when several fit"
  // principle the inline suggestion box already uses, just applied to
  // what gets persisted instead of only what's shown once inline.
  function activeMistakes() { return state.mistakes.filter(m => !m.resolved); }
  function allMistakes()    { return [...state.mistakes]; }
  function getMistake(id)   { return state.mistakes.find(m => m.id === id) || null; }

  function logMistake({ kind, original_sentence, wrong_token, correct_tokens, rule_violated }) {
    if (!correct_tokens || !correct_tokens.length) return null;   // nothing to quiz on — don't log
    // Dedup on (sentence, wrong_token) only — for a given context the
    // candidate set is deterministic, so re-checking the same draft
    // sentence repeatedly doesn't pile up duplicate active entries.
    const dup = state.mistakes.find(m => !m.resolved
      && m.original_sentence === original_sentence
      && m.wrong_token === wrong_token);
    if (dup) return dup;
    const m = {
      id: uid(), kind,
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
    if (!m) return { correct: false, resolved: false, streak: 0 };
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
    state.words.forEach(regenerateForms);
    save();
  }

  return {
    hydrate,
    SILVER_TARGET, BRONZE_TARGET, GOLD_TARGET, MISTAKE_RESOLVE_TARGET,
    addCategory, categories, countInCategory, deleteCategory,
    renameCategory, reorderCategories, reorderWords,
    wordsIn, allWords, getWord, addWord, updateWord, deleteWord, findWordByStem,
    grammarEntries, getGrammarEntry, addGrammarEntry, updateGrammarEntry, deleteGrammarEntry,
    activeMistakes, allMistakes, getMistake, logMistake, scoreMistake,
    kanjiOf, uniqueKanji, kanjiProgress, recordKanjiPass,
    scoreFlash, normKana,
    stars, stats,
    getTheme, setTheme, getPalette, setPalette, getTolerance, setTolerance,
    getLocale, setLocale, getLastPos, setLastPos, lastExport, markExport,
    exportJSON, importJSON
  };
})();

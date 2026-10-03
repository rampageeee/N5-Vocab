/* Versioned backups. Decode and validate a detached value before DB adopts it. */
const BackupSchema = (() => {
  const VERSION = 1;
  const object = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const fail = path => { throw new Error('Invalid backup: ' + path); };
  const str = (x, path) => { if (typeof x !== 'string') fail(path + ' must be text'); };
  const count = (x, path) => { if (!Number.isSafeInteger(x) || x < 0) fail(path + ' must be a non-negative integer'); };
  function safeKeys(x) {
    if (!x || typeof x !== 'object') return;
    Object.keys(x).forEach(k => {
      if (['__proto__', 'constructor', 'prototype'].includes(k)) fail('unsafe key');
      safeKeys(x[k]);
    });
  }
  function texts(x, path) {
    if (!Array.isArray(x)) fail(path + ' must be an array');
    x.forEach(v => str(v, path));
  }
  function records(x, path) {
    if (!object(x)) fail(path + ' must be an object');
    Object.entries(x).forEach(([k, v]) => {
      if (!object(v)) fail(path + '.' + k);
      count(v.testPasses, path + '.' + k + '.testPasses');
      if (v.priority != null && !['auto', 'high', 'low'].includes(v.priority)) fail(path + '.priority');
    });
  }
  function ids(items, path) {
    if (!Array.isArray(items)) fail(path + ' must be an array');
    const seen = new Set();
    items.forEach(v => {
      if (!object(v)) fail(path + ' entry');
      str(v.id, path + '.id');
      if (!v.id || seen.has(v.id)) fail(path + ' duplicate/empty id');
      seen.add(v.id);
    });
  }
  function sentence(p) {
    if (!object(p)) fail('sentencePractice');
    ['jp', 'target'].forEach(k => str(p[k], 'sentencePractice.' + k));
    ['source', 'review'].forEach(k => { if (p[k] != null) str(p[k], 'sentencePractice.' + k); });
    if (p.source && !/^https:\/\//.test(p.source)) fail('sentence source URL');
    ['en', 'pl'].forEach(k => { if (p[k] != null) str(p[k], 'sentencePractice.' + k); });
    texts(p.surfaces, 'surfaces'); texts(p.lemmas, 'lemmas');
    if (p.baseWords != null) texts(p.baseWords, 'baseWords');
    if (p.surfaces.length < 2 || p.surfaces.length !== p.lemmas.length ||
        p.surfaces.some(s => !s) || !p.surfaces.includes(p.target) ||
        p.surfaces.join('').normalize('NFKC') !== p.jp.normalize('NFKC').replace(/[\s。、！？!?.,「」『』]/g, '')) fail('sentence token alignment');
    if (!Array.isArray(p.steps) || p.steps.length !== 3 || p.steps.some(v => typeof v !== 'boolean') ||
        (p.steps[1] && !p.steps[0]) || (p.steps[2] && !p.steps[1])) fail('sentence progress');
  }
  function decode(raw, defaults) {
    const p = JSON.parse(raw);
    if (!object(p)) fail('root must be an object');
    safeKeys(p);
    if ('schemaVersion' in p && p.schemaVersion !== VERSION) fail('unsupported schema version ' + p.schemaVersion);
    if (p.app != null && p.app !== 'n5-vocab') fail('wrong application');
    texts(p.categories, 'categories');
    if (new Set(p.categories).size !== p.categories.length || p.categories.some(c => !c.trim())) fail('categories');
    ids(p.words, 'words');
    p.words.forEach(w => {
      ['kanji', 'reading', 'translation', 'pos', 'category'].forEach(k => str(w[k], 'word.' + k));
      if (!p.categories.includes(w.category)) fail('word category');
      ['flashPoints', 'sentencePoints'].forEach(k => { if (w[k] != null) count(w[k], 'word.' + k); });
      ['lastFlashDate', 'lastSentenceDate'].forEach(k => { if (w[k] != null) str(w[k], 'word.' + k); });
      if (w.verb_class != null && !['godan', 'ichidan', 'irregular'].includes(w.verb_class)) fail('verb_class');
      if (w.class_confirmed != null && typeof w.class_confirmed !== 'boolean') fail('class_confirmed');
      ['forms', 'irregular_forms', 'automatic_forms'].forEach(k => {
        if (w[k] == null) return;
        if (!object(w[k])) fail(k);
        Object.values(w[k]).forEach(v => str(v, k));
      });
      if (w.sentencePractice != null) sentence(w.sentencePractice);
    });
    ['kanji', 'kana'].forEach(k => { if (k in p) records(p[k], k); });
    if ('grammar' in p) {
      ids(p.grammar, 'grammar');
      p.grammar.forEach(g => ['pattern_name', 'structure', 'example', 'note'].forEach(k => str(g[k], 'grammar.' + k)));
    }
    if ('mistakes' in p) {
      ids(p.mistakes, 'mistakes');
      p.mistakes.forEach(m => {
        ['kind', 'original_sentence', 'wrong_token', 'rule_violated', 'date'].forEach(k => str(m[k], 'mistake.' + k));
        texts(m.correct_tokens, 'correct_tokens');
        if (!m.correct_tokens.length || typeof m.resolved !== 'boolean') fail('mistake answers/status');
        count(m.streak, 'mistake.streak');
      });
    }
    if ('settings' in p) {
      if (!object(p.settings)) fail('settings');
      const enums = { theme: ['light', 'dark'], palette: ['summer', 'winter', 'fall', 'spring', 'geisha'],
        tolerance: ['lenient', 'normal', 'strict'], locale: ['en', 'pl'] };
      Object.entries(enums).forEach(([k, vals]) => { if (p.settings[k] != null && !vals.includes(p.settings[k])) fail('settings.' + k); });
      if (p.settings.lastPos != null) str(p.settings.lastPos, 'lastPos');
      if (p.settings.lastExport != null && !Number.isFinite(Date.parse(p.settings.lastExport))) fail('lastExport');
      if (p.settings.flashFilters != null) {
        if (!object(p.settings.flashFilters)) fail('flashFilters');
        Object.values(p.settings.flashFilters).forEach(v => { if (typeof v !== 'boolean') fail('flashFilters'); });
      }
    }
    // Version 0 had no metadata and optional collections. Preserve its fields,
    // filling only missing collections/settings; earned points stay unchanged.
    return { ...defaults, ...p, schemaVersion: VERSION, app: 'n5-vocab',
      settings: { ...defaults.settings, ...(p.settings || {}) } };
  }
  return { VERSION, decode };
})();

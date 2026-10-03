/* Conservative dictionary-assisted checks, not a general Japanese parser.
   Unknown constructions are uncovered, never proof of incorrect Japanese.
   See docs/LANGUAGE-SOURCES.md and tests/checker.test.cjs. */
const Checker = (() => {
  const PARTICLES = [...new Set(GRAMMAR_RULES.flatMap(g => g.particle.split('／')))];
  const COPULAS = ['ではありませんでした', 'じゃありませんでした', 'ではありません', 'じゃありません',
    'ではなかった', 'じゃなかった', 'ではない', 'じゃない', 'でした', 'だった', 'です', 'だ'];
  const SKIP = /[\s。、！？!?,.;:；：\u3000「」『』（）()“”"\n]/;
  function buildLexicon() {
    const valid = new Map(), wrong = new Map();
    function add(surface, entry) {
      if (!surface) return;
      const key = DB.normKana(surface), prior = valid.get(key);
      if (prior && prior.wordId && entry.wordId && prior.wordId !== entry.wordId) prior.ambiguous = true;
      else if (!prior) valid.set(key, entry);
    }
    PARTICLES.forEach(p => add(p, { type: 'particle', particle: p }));
    COPULAS.forEach(c => add(c, { type: 'copula', posCat: 'predicate' }));
    DB.allWords().forEach(w => {
      const posCat = w.pos === 'verb' ? 'verb' : ['i-adj', 'na-adj'].includes(w.pos) ? 'adjective' : w.pos === 'noun' ? 'noun' : 'other';
      const entry = { type: 'known', wordId: w.id, posCat };
      [w.kanji, w.reading].forEach(s => add(s, { ...entry, form: 'plain' }));
      if (w.pos === 'verb' && !w.class_confirmed) return;
      Object.keys(w.forms || {}).forEach(form => DB.acceptedForms(w, form).forEach(s => add(s, { ...entry, form })));
      function bad(surface, form) {
        const suggestions = DB.acceptedForms(w, form);
        if (!surface || !suggestions.length || suggestions.includes(surface)) return;
        const key = DB.normKana(surface), prior = wrong.get(key);
        if (prior && prior.wordId !== w.id) { prior.confidence = 'ambiguous'; return; }
        wrong.set(key, { type: 'conjugation-error', wordId: w.id, posCat, form,
          headword: w.kanji || w.reading, suggestions, confidence: 'confirmed', evidence: 'form-table' });
      }
      // Explicit malformed combinations. Bare stems and arbitrary unfamiliar
      // suffixes are not errors: 書き can be a noun/continuative and 食べ is a stem.
      for (const k of new Set([Conjugation.key(w), DB.normKana(w.reading)].filter(Boolean))) {
        if (['行く', 'いく'].includes(k)) { bad(k.slice(0,-1)+'いて', 'te'); bad(k.slice(0,-1)+'いた', 'ta'); }
        if (['ある', '有る', '在る'].includes(k)) bad(k.slice(0,-1)+'らない', 'nai');
        if (w.pos === 'i-adj' && ['いい', 'かっこいい', 'カッコいい', '格好いい'].includes(k)) {
          bad(k.slice(0,-1)+'かった', 'past'); bad(k.slice(0,-1)+'くない', 'negative');
          bad(k.slice(0,-1)+'くなかった', 'pastNegative');
        }
        if (w.pos === 'verb' && w.verb_class === 'godan') {
          const fake = Conjugation.generated(w, 'godan', k);
          if (fake.nai && fake.masu) {
            bad(fake.nai.slice(0,-2)+'ます', 'masu');
            bad(fake.masu.slice(0,-2)+'ない', 'nai');
          }
        }
      }
    });
    // A valid known surface always wins, even if another entry would call it malformed.
    valid.forEach((_v, k) => wrong.delete(k));
    let max = 1; [...valid.keys(), ...wrong.keys()].forEach(k => max = Math.max(max, [...k].length));
    return { valid, wrong, max };
  }
  function tokenize(sentence) {
    const chars = [...(sentence || '')], lex = buildLexicon(), tokens = [];
    let i = 0;
    while (i < chars.length) {
      if (SKIP.test(chars[i])) { tokens.push({ type: 'skip', text: chars[i++] }); continue; }
      let hit = null;
      for (let n = Math.min(lex.max, chars.length-i); n > 0; n--) {
        const text = chars.slice(i,i+n).join(''), key = DB.normKana(text);
        const known = lex.valid.get(key), malformed = lex.wrong.get(key);
        if (known) { hit = { ...known, text, n }; break; }
        if (malformed && malformed.confidence === 'confirmed') {
          const next = chars[i+n];
          const boundary = !next || SKIP.test(next) || PARTICLES.some(p => chars.slice(i+n,i+n+[...p].length).join('') === p);
          if (boundary) { hit = { ...malformed, text, n }; break; }
        }
      }
      if (hit) { const { n, ...tok } = hit; tokens.push(tok); i += n; }
      else {
        const prior = tokens.at(-1);
        if (prior?.type === 'unknown') prior.text += chars[i];
        else tokens.push({ type: 'unknown', text: chars[i] });
        i++;
      }
    }
    return tokens;
  }
  return { tokenize };
})();

const ParticleChecker = (() => {
  // Particle choice needs clause structure, lexical meaning, and discourse.
  // Matching a broad noun/verb shape is insufficient evidence for a replacement.
  function checkParticles(tokens) {
    tokens.forEach(t => {
      if (t.type !== 'particle') return;
      delete t.violations;
      t.confidence = 'unassessed';
    });
    return [];
  }
  function checkCopula(tokens) {
    const violations = [];
    tokens.forEach((tok, i) => {
      if (tok.type !== 'copula' || !['だ', 'です'].includes(tok.text)) return;
      let j = i-1;
      while (j >= 0 && tokens[j].type === 'skip' && /^\s+$/.test(tokens[j].text)) j--;
      const prev = tokens[j];
      // Never cross punctuation/quotes or use uncertain dictionary homographs.
      if (prev?.type !== 'known' || prev.ambiguous || prev.posCat !== 'verb' || !['plain', 'masu', 'masen', 'mashita', 'masendeshita'].includes(prev.form)) return;
      const v = { type: 'copula-violation', after: prev.text, candidates: [], correctToken: null,
        confidence: 'confirmed', evidence: 'verb-copula' };
      violations.push(v); tok.violations = [v];
    });
    return violations;
  }
  function analyze(sentence) {
    const tokens = Checker.tokenize(sentence);
    checkParticles(tokens);
    const violations = checkCopula(tokens);
    const formErrors = tokens.filter(t => t.type === 'conjugation-error');
    return { tokens, violations, formErrors, coverage: 'limited',
      unknown: tokens.filter(t => t.type === 'unknown').map(t => t.text) };
  }
  function logConfidentMistakes(sentence, tokens) {
    const logged = [];
    tokens.forEach(tok => {
      if (tok.type !== 'conjugation-error' || tok.confidence !== 'confirmed' || tok.evidence !== 'form-table') return;
      const m = DB.logMistake({ kind: 'conjugation', original_sentence: sentence,
        wrong_token: tok.text, correct_tokens: tok.suggestions,
        rule_violated: 'Dictionary form table: ' + tok.headword, evidence: 'form-table' });
      if (m) logged.push(m);
    });
    return logged;
  }
  return { checkParticles, checkCopula, analyze, logConfidentMistakes };
})();

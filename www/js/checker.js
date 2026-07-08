/* ============================================================
   SENTENCE CHECKER — TOKENIZER (§3.1/§3.1a)
   Two-tier tokenizer. Classifies each chunk of a sentence as
   particle / copula / known word-form / conjugation-error / unknown,
   tagged (posCat) for the ParticleChecker pass further down this
   file, which walks the stream and applies the coarse §3.0 shapes.

   Not wired to any view yet (§3.6 output, §3.7 mistake log still
   pending). Test from devtools console:
     Checker.tokenize("学生です。")
     ParticleChecker.analyze("猫が学生")

   ---- Tier 1 (fast path) ----
   Longest-match scan against one flat set: particles ∪ copula-forms
   ∪ {every cached conjugated form + raw headword from DB.allWords()}.
   Safe ONLY because the dictionary is the user's own small closed set
   (general-Japanese longest-match mis-segments; this doesn't, at this
   scale) — no external tokenizer dependency (kuromoji etc.) pulled in.

   One addition beyond what the build spec's tier-1 description names
   explicitly: copula endings (だ/です and their conjugated forms) are
   tier-1 STANDALONE tokens, not only a tier-2 strip suffix. The spec's
   own completeness claim — "most tokens in a correct sentence resolve
   at tier 1" — requires this: だ/です attaches directly after a noun
   with nothing to strip, so if it weren't tier-1-recognizable, EVERY
   plain copula sentence (the single most common N5 pattern) would
   need tier-2 fallback just for its final word. Reuses the exact
   §3.1a copula-endings list for this — no new table, just a second use
   of the one the spec already enumerates.

   ---- Tier 2 (fallback, only on tier-1 misses) ----
   Strip known endings right-to-left, longest-first (verb table and
   copula table kept separate, matching §3.1a exactly); check whether
   the remainder is a real dictionary stem via DB.findWordByStem(),
   which reuses the SAME row-stem table the conjugation cache uses.
   Also tries the chunk as a BARE stem with no ending stripped at all
   — necessary once copula tokens peel off at tier 1: a mis-written
   "書か" + "です" now arrives at tier 2 as just "書か" with nothing
   left to strip, so tier 2 must recognize a stem on its own, not only
   after removing a real ending.
   ============================================================ */
const Checker = (() => {

  // Particle list is DERIVED from GRAMMAR_RULES (grammar-rules.js), not a
  // second hand-maintained list — ぐらい／くらい is the one combined entry
  // in that data, split here into its two real surface forms.
  const ALL_PARTICLES = [].concat(...GRAMMAR_RULES.map(g => g.particle.split('／')));

  // §3.1a — enumerated, longest-first, exactly as pinned. Verb endings
  // attach to a STEM (never stand alone); copula endings attach directly
  // after a noun/na-adj and DO stand alone — that asymmetry is why only
  // the copula table also feeds tier 1 (see file header).
  const VERB_ENDINGS = [
    'ませんでした', 'ましょう', 'ませんか', 'ません', 'ました',
    'たくない', 'たかった', 'ないで', 'なかった', 'ています', 'ている',
    'ます', 'たい', 'ない'
  ];
  const COPULA_ENDINGS = [
    'ではありませんでした', 'じゃありませんでした', 'ではありません', 'じゃありません',
    'じゃなかった', 'ではない', 'じゃない', 'でした', 'だった', 'です', 'だ'
  ];

  const SKIP_RE = /[\s。、！？!?,.\u3000「」『』]/;

  // ---- tier 1 lexicon ------------------------------------------
  // Rebuilt per call rather than cached across calls: the dictionary can
  // change between checks (words added/edited) and this app's dictionary
  // is small enough that rebuilding is cheap — no invalidation logic needed.
  function buildLexicon() {
    const map = new Map();   // surface -> entry; first write wins on collision
    const add = (surface, entry) => { if (surface && !map.has(surface)) map.set(surface, entry); };

    ALL_PARTICLES.forEach(p => add(p, { kind: 'particle', particle: p }));
    COPULA_ENDINGS.forEach(c => add(c, { kind: 'copula' }));

    DB.allWords().forEach(w => {
      const hw = w.kanji || w.reading;
      if (hw) add(hw, { kind: 'word', wordId: w.id, form: 'plain' });
      if (w.forms) {
        Object.entries(w.forms).forEach(([form, surface]) => {
          if (surface) add(surface, { kind: 'word', wordId: w.id, form });
        });
      }
    });

    let maxLen = 1;
    map.forEach((_, k) => { if (k.length > maxLen) maxLen = k.length; });
    return { map, maxLen };
  }

  function matchAt(chars, i, lex) {
    const remaining = chars.length - i;
    for (let len = Math.min(lex.maxLen, remaining); len >= 1; len--) {
      const cand = chars.slice(i, i + len).join('');
      const entry = lex.map.get(cand);
      if (entry) return { len, entry, text: cand };
    }
    return null;
  }

  function posCatOf(word) {
    if (word.pos === 'verb') return 'verb';
    if (word.pos === 'i-adj' || word.pos === 'na-adj') return 'adjective';
    if (word.pos === 'noun') return 'noun';
    return 'other';   // adverb/counter/particle-as-word/expression — not
                       // load-bearing for the coarse §3.0 shapes
  }

  function tagWordToken(entry, text) {
    const w = DB.getWord(entry.wordId);
    return { type: 'known', text, wordId: entry.wordId, form: entry.form, posCat: w ? posCatOf(w) : 'other' };
  }

  // ---- tier 2 ----------------------------------------------------
  // stemType narrows which cached form(s) the writer likely needed. Godan's
  // three row-stems are each valid input to a specific small set of endings
  // at N5 scope, so the suggestion isn't a guess for those. Ichidan/i-adj
  // stems genuinely ARE ambiguous (one stem feeds several endings), so
  // multiple candidates are offered rather than a single invented guess.
  const STEM_SUGGESTS = {
    'i-row':   ['masu', 'masen'],
    'a-row':   ['nai'],
    'e-row':   ['ba', 'potential'],
    'ichidan': ['masu', 'nai', 'te', 'ta', 'ba', 'potential'],
    'i-adj':   ['negative', 'past'],
    // only relevant when an i-adjective-style ending was wrongly stripped
    // off a na-adjective (a real N5 mistake: 静かくない instead of 静かじゃない)
    'na-adj':  ['negative', 'past']
  };

  function buildConjugationError(hit, writtenEnding, chunk) {
    const w = hit.word;
    const forms = w.forms || {};
    const suggestions = (STEM_SUGGESTS[hit.stemType] || []).map(k => forms[k]).filter(Boolean);
    return {
      type: 'conjugation-error',
      text: chunk,
      wordId: w.id,
      headword: w.kanji || w.reading,
      stemType: hit.stemType,
      writtenEnding,       // '' when the chunk was a bare stem with nothing stripped
      posCat: posCatOf(w),
      suggestions          // pulled straight from the cache — never recomputed here
    };
  }

  function tryTier2(chunk) {
    const candidates = [{ stem: chunk, ending: '' }];
    [...VERB_ENDINGS, ...COPULA_ENDINGS].forEach(ending => {
      if (chunk.length > ending.length && chunk.endsWith(ending)) {
        candidates.push({ stem: chunk.slice(0, -ending.length), ending });
      }
    });
    // Prefer explaining the chunk via a real stripped ending before falling
    // back to "the whole chunk is itself a bare stem" (the zero-strip entry
    // pushed first above, tried last here).
    const ordered = candidates.filter(c => c.ending).concat(candidates.filter(c => !c.ending));
    for (const { stem, ending } of ordered) {
      const hit = DB.findWordByStem(stem);
      if (hit) return buildConjugationError(hit, ending, chunk);
    }
    return null;   // no known stem at all → genuinely unknown (§3.4)
  }

  // ---- main tokenizer ---------------------------------------------
  // On a tier-1 miss, tries tier 2 on progressively SHORTER spans, longest
  // first — mirrors tier 1's own longest-match preference. This matters:
  // a real mis-conjugation can legitimately end in a kana that ALSO
  // happens to be a valid particle on its own (書か's か, e.g.) — scanning
  // forward for "the nearest position where anything tier-1-matches" (the
  // first version of this function) let that coincidence truncate the
  // chunk before tier 2 ever saw the whole broken word. Longest-first
  // tier-2 search claims the full mis-conjugation instead.
  function tokenize(sentence) {
    const lex = buildLexicon();
    const chars = [...(sentence || '')];
    const tokens = [];
    let i = 0;

    while (i < chars.length) {
      if (SKIP_RE.test(chars[i])) { tokens.push({ type: 'skip', text: chars[i] }); i++; continue; }

      const m = matchAt(chars, i, lex);
      if (m) {
        if (m.entry.kind === 'particle')    tokens.push({ type: 'particle', text: m.text, particle: m.entry.particle });
        else if (m.entry.kind === 'copula') tokens.push({ type: 'copula', text: m.text, posCat: 'predicate' });
        else                                tokens.push(tagWordToken(m.entry, m.text));
        i += m.len;
        continue;
      }

      let limit = chars.length;
      for (let j = i; j < chars.length; j++) { if (SKIP_RE.test(chars[j])) { limit = j; break; } }

      let resolved = false;
      for (let end = limit; end > i; end--) {
        const span = chars.slice(i, end).join('');
        const err = tryTier2(span);
        if (err) { tokens.push(err); i = end; resolved = true; break; }
      }
      if (!resolved) {
        // No tier-2 explanation at any length in this run. Consume ONE
        // character as unknown and let the main loop re-try from the next
        // position — a real particle/copula genuinely starting there is
        // still picked up correctly on the next iteration; this just
        // avoids claiming a longer, wrong interpretation when nothing in
        // the dictionary explains this run at all.
        tokens.push({ type: 'unknown', text: chars[i] });
        i += 1;
      }
    }

    // Cosmetic merge only — does not change any classification, just keeps
    // a contiguous unrecognized run as one highlighted span instead of one
    // per character.
    const merged = [];
    tokens.forEach(tok => {
      const prev = merged[merged.length - 1];
      if (tok.type === 'unknown' && prev && prev.type === 'unknown') prev.text += tok.text;
      else merged.push(tok);
    });
    return merged;
  }

  return { tokenize };
})();

/* ============================================================
   SENTENCE CHECKER — PARTICLE CHECKING (§3.0/§3.3)
   Walks an already-tokenized stream and checks each particle in the
   COARSE-enforced set against its before/after category requirement.
   Only the 11 particles §3.0 lists get structurally checked — か, ね,
   よ, へ, だけ, しか, より, ぐらい/くらい are tokenized (recognized,
   never flagged as unknown) but have no coarse rule and are never
   flagged as violations either, per the pinned granularity decision.

   `predicate` collapses verb | adjective | copula, matching the
   rulebook's own definition. Noun/pronoun collapses to just "noun" —
   the dictionary schema has no separate pronoun POS.

   Found while wiring this in: WA-1 and MO-1's own rule text says は/も
   legitimately STACK after another particle (Nには, Nでも, …). That
   needed handling on BOTH sides — the rulebook's own example sentence
   (学校には行きません) still failed after fixing only the obvious half:
     - は/も's own BEFORE-check: the token right before は/も is the
       particle it's stacking on (に here), not a noun — allowed as a
       named exception, not a general recursive stacking theory, scoped
       exactly to the five particles (に/で/と/から/まで) the rulebook
       itself lists.
     - The INNER particle's (に's) own AFTER-check: に's "what comes
       next" is now は itself (satisfies nothing), not the eventual
       predicate — nextSkippingStack() looks past a stacked は/も to
       find the real content on the other side of it.
   Both fixes are required together; testing the first alone still
   flagged 学校には行きません, which is what surfaced the second.

   A particle-violation never claims a single "correct" replacement
   unless exactly one other coarse particle would fit BOTH sides of
   this exact spot — が failing on a noun-noun pattern has THREE
   locally-valid replacements (の/と/や), and picking one confidently
   would be presenting a guess as an answer. Matches the rulebook's own
   is/が callout: that choice is a discourse decision, not a structural
   one, and this checker doesn't pretend otherwise.

   Second bug found in integration, more serious than the stacking one:
   checkParticles only ever returned violations in the flat array below
   — it never attached them onto the token itself. Every downstream
   consumer that checks tok.violations (sentence-checker highlighting,
   the tap-for-detail panel, and the mistake logger) was silently
   checking undefined the whole time. My own earlier tests never caught
   it because they only printed the flat return value, never went
   through a token the way the real UI and the mistake logger do —
   worth remembering as a testing-methodology gap, not just a code one.
   ============================================================ */
const ParticleChecker = (() => {

  const PARTICLE_RULES = {
    'の':   { before: ['noun'],             after: ['noun'] },
    'は':   { before: ['noun'],             after: ['predicate'] },
    'が':   { before: ['noun'],             after: ['predicate'] },
    'を':   { before: ['noun'],             after: ['verb'] },
    'に':   { before: ['noun'],             after: ['predicate'] },
    'で':   { before: ['noun'],             after: ['verb'] },
    'と':   { before: ['noun'],             after: ['noun', 'verb'] },
    'も':   { before: ['noun'],             after: ['predicate'] },
    'から': { before: ['noun', 'predicate'], after: null },   // after is predicate/CL — CL isn't
                                                                // locally checkable, so this side
                                                                // is never flagged (§3.0's own
                                                                // stated ceiling on this checker)
    'まで': { before: ['noun'],             after: ['predicate'] },
    'や':   { before: ['noun'],             after: ['noun'] }
  };

  // は/も stack after these five without needing a noun immediately to
  // their own left — the inner particle is still checked on its own
  // pass through the same token stream, so this doesn't skip verifying
  // it, only avoids double-penalizing は/も for the inner particle's job.
  const STACKS_UNDER = ['に', 'で', 'と', 'から', 'まで'];

  function tokenCatSet(tok) {
    if (!tok || tok.type === 'unknown' || tok.type === 'skip') return null;   // inconclusive — never flag from this side
    const cats = new Set();
    if (tok.type === 'copula')   { cats.add('predicate'); return cats; }
    if (tok.type === 'particle') return cats;   // a particle satisfies neither noun nor predicate
    // 'known' or 'conjugation-error' — both carry posCat (a conjugation
    // error still identified a real headword, so its category is known
    // even though the surface form was wrong)
    if (tok.posCat === 'noun')      cats.add('noun');
    if (tok.posCat === 'verb')    { cats.add('verb'); cats.add('predicate'); }
    if (tok.posCat === 'adjective') cats.add('predicate');
    return cats;   // posCat 'other' (adverb/counter/expression) contributes nothing, on purpose
  }

  function requirementMet(catSet, requirement) {
    if (!requirement) return true;     // this direction isn't checked at all (から's after)
    if (catSet === null) return null;  // absent/unknown adjacent token — inconclusive, never flagged
    return requirement.some(r => catSet.has(r)) ? true : false;
  }

  // Stricter than requirementMet, used ONLY for suggesting replacements: an
  // unchecked side (null requirement) or an unknown adjacent token is NOT
  // positive evidence that some other particle would fit here — it's the
  // same "we don't know" status either way. Without this, から (after:
  // null) got proposed as a fix for completely unrelated mistakes simply
  // because its after-side is never verified, not because it actually fits.
  function requirementConfirmed(catSet, requirement) {
    if (!requirement || catSet === null) return false;
    return requirement.some(r => catSet.has(r));
  }

  function adjacentToken(tokens, i, dir) {
    for (let j = i + dir; j >= 0 && j < tokens.length; j += dir) {
      if (tokens[j].type === 'skip') continue;   // punctuation/whitespace is transparent
      return tokens[j];
    }
    return null;
  }

  // For に/で/と/から/まで specifically: if は or も immediately follows
  // (legitimately stacking on top, per WA-1/MO-1's own text), the real
  // "after" content is beyond that stack, not the stacking particle
  // itself — a bare は/も token satisfies neither noun nor predicate, so
  // without this, EVERY stacked sentence (学校には行きません, the
  // rulebook's own example) would wrongly flag the inner particle.
  function nextSkippingStack(tokens, i) {
    let j = i + 1;
    while (j < tokens.length && tokens[j].type === 'skip') j++;
    if (j < tokens.length && tokens[j].type === 'particle'
        && (tokens[j].particle === 'は' || tokens[j].particle === 'も')) {
      j++;
      while (j < tokens.length && tokens[j].type === 'skip') j++;
    }
    return j < tokens.length ? tokens[j] : null;
  }

  function suggestReplacements(particleUsed, prevCats, nextCats) {
    const out = [];
    Object.entries(PARTICLE_RULES).forEach(([p, r]) => {
      if (p === particleUsed) return;
      if (requirementConfirmed(prevCats, r.before) && requirementConfirmed(nextCats, r.after)) out.push(p);
    });
    return out;
  }

  function makeViolation(tok, side, adjacent, requirement, prevCats, nextCats) {
    const candidates = suggestReplacements(tok.particle, prevCats, nextCats);
    return {
      type: 'particle-violation',
      particle: tok.particle,
      side,                          // 'before' | 'after'
      required: requirement,         // e.g. ['predicate']
      adjacent: adjacent ? { text: adjacent.text, type: adjacent.type, posCat: adjacent.posCat } : null,
      candidates,                    // other coarse particles that WOULD fit both sides here
      correctToken: candidates.length === 1 ? candidates[0] : null   // only claimed when unambiguous
    };
  }

  function checkParticles(tokens) {
    const violations = [];
    tokens.forEach((tok, i) => {
      if (tok.type !== 'particle') return;
      const rule = PARTICLE_RULES[tok.particle];
      if (!rule) return;   // outside the coarse-enforced set — recognized, never checked

      const prev = adjacentToken(tokens, i, -1);
      const next = STACKS_UNDER.includes(tok.particle) ? nextSkippingStack(tokens, i) : adjacentToken(tokens, i, 1);
      let prevCats = tokenCatSet(prev);
      const nextCats = tokenCatSet(next);

      if ((tok.particle === 'は' || tok.particle === 'も')
          && prev && prev.type === 'particle' && STACKS_UNDER.includes(prev.particle)) {
        prevCats = new Set(['noun']);   // legitimate stack — see file header
      }

      const beforeOK = requirementMet(prevCats, rule.before);
      const afterOK  = requirementMet(nextCats, rule.after);

      if (beforeOK === false) {
        const v = makeViolation(tok, 'before', prev, rule.before, prevCats, nextCats);
        violations.push(v);
        (tok.violations || (tok.violations = [])).push(v);
      }
      if (afterOK === false) {
        const v = makeViolation(tok, 'after', next, rule.after, prevCats, nextCats);
        violations.push(v);
        (tok.violations || (tok.violations = [])).push(v);
      }
    });
    return violations;
  }

  function analyze(sentence) {
    const tokens = Checker.tokenize(sentence);
    return { tokens, violations: checkParticles(tokens) };
  }

  return { checkParticles, analyze };
})();

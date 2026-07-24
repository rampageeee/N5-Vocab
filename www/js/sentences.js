/* ============================================================
   SENTENCES (sentence checker view)
   Wires Checker.tokenize()/ParticleChecker on top of a real UI:
   colour-coded sentence, tap-for-detail (not hover — this app is
   touch-first, tooltips don't work on mobile), unknown tokens get
   a one-tap "add to dictionary" that reuses Vocab's existing word
   modal rather than a second add-word UI. Best-effort corrected
   sentence shown below when at least one fix is unambiguous.

   NOT wired to any persistent mistake log yet — §3.7 (logging
   violations, the review tab) is a separate, later step. This is
   §3.4/§3.6 only: unknown handling + output.
   ============================================================ */
const Sentences = (() => {

  const esc = s => (s || '').replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const t = (k, ...a) => I18N.t(k, ...a);
  const el = id => document.getElementById(id);

  let lastTokens = [];

  // ---- category labels for detail text ----------------------
  function catLabel(c) {
    if (c === 'noun')      return t('checker.cat.noun');
    if (c === 'verb')      return t('checker.cat.verb');
    if (c === 'predicate') return t('checker.cat.predicate');
    return c;
  }

  function particleViolationMsg(tok, v) {
    const reqLabel = v.required.map(catLabel).join(t('checker.or'));
    let msg = t(v.side === 'before' ? 'checker.needsBefore' : 'checker.needsAfter', tok.particle, reqLabel);
    msg += ' ' + (v.candidates.length ? t('checker.tryInstead', v.candidates.join('・')) : t('checker.noSuggestion'));
    return msg;
  }

  function detailForParticle(tok) {
    return tok.violations.map(v => particleViolationMsg(tok, v)).join(' ');
  }

  function detailForConj(tok) {
    return tok.suggestions && tok.suggestions.length
      ? t('checker.detailConj', tok.suggestions.join(' / '))
      : t('checker.detailConjNone');
  }

  function detailFor(tok) {
    if (tok.type === 'unknown') return t('checker.detailUnknown');
    if (tok.type === 'conjugation-error') return detailForConj(tok);
    if (tok.type === 'particle' && tok.violations && tok.violations.length) return detailForParticle(tok);
    if ((tok.type === 'known' || tok.type === 'copula') && tok.wordId) {
      const w = DB.getWord(tok.wordId);
      if (w) return `${esc(w.reading)} — ${esc(w.translation)}`;
    }
    return null;
  }

  // ---- rendering ---------------------------------------------
  function tokenClass(tok) {
    if (tok.type === 'unknown') return 'chk-tok chk-tok--unknown';
    if (tok.type === 'conjugation-error') return 'chk-tok chk-tok--conj';
    if (tok.type === 'particle' && tok.violations && tok.violations.length) return 'chk-tok chk-tok--particle-err';
    return 'chk-tok';
  }

  function renderSentence(tokens) {
    el('chkSentence').innerHTML = tokens.map((tok, i) => {
      if (tok.type === 'skip') return esc(tok.text);
      const addBtn = tok.type === 'unknown'
        ? `<button class="chk-add" data-add="${i}" aria-label="${esc(t('checker.addToDict'))}">+</button>` : '';
      return `<span class="${tokenClass(tok)}" data-tok="${i}">${esc(tok.text)}</span>${addBtn}`;
    }).join('');
  }

  function showDetail(i) {
    const tok = lastTokens[i];
    const box = el('chkDetail');
    const msg = tok ? detailFor(tok) : null;
    if (!msg) { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = esc(msg) + (tok.type === 'unknown'
      ? `<div><button class="tool-btn" data-add="${i}">${esc(t('checker.addToDict'))}</button></div>` : '');
  }

  // Best-effort correction: only substitutes where exactly one fix is
  // unambiguous (single particle candidate, or a single conjugation
  // suggestion) — never picks one guess out of several just to show
  // *a* correction, matching the coarse checker's own honesty about
  // what it can and can't resolve.
  function buildCorrected(tokens) {
    let text = '', anyChange = false, anyAmbiguous = false;
    tokens.forEach(tok => {
      if (tok.type === 'particle' && tok.violations && tok.violations.length) {
        const v = tok.violations[0];
        if (v.correctToken) { text += v.correctToken; anyChange = true; }
        else { text += tok.text; anyAmbiguous = true; }
      } else if (tok.type === 'conjugation-error') {
        if (tok.suggestions && tok.suggestions.length === 1) { text += tok.suggestions[0]; anyChange = true; }
        else { text += tok.text; if (tok.suggestions && tok.suggestions.length > 1) anyAmbiguous = true; }
      } else {
        text += tok.text;
      }
    });
    return { text, anyChange, anyAmbiguous };
  }

  // Logs every violation/error the checker could explain at all — i.e. has
  // AT LEAST ONE known candidate/suggestion, even if there are several and
  // no single one is confidently "the" answer. This is deliberately a
  // LOOSER bar than buildCorrected()'s inline "suggested correction" box
  // (which only shows when exactly one fits): testing showed requiring
  // exactly one meant particle mistakes almost never got logged at all,
  // since so many coarse particles share an identical shape. Review then
  // accepts ANY of the logged candidates as correct — same principle,
  // applied to what's persisted rather than only what's shown once inline.
  function logConfidentMistakes(sentence, tokens) {
    tokens.forEach(tok => {
      if (tok.type === 'particle' && tok.violations && tok.violations.length) {
        tok.violations.forEach(v => {
          if (!v.candidates.length) return;   // truly nothing fits — no answer to quiz on
          DB.logMistake({
            kind: 'particle',
            original_sentence: sentence,
            wrong_token: tok.particle,
            correct_tokens: v.candidates,
            rule_violated: particleViolationMsg(tok, v)
          });
        });
      } else if (tok.type === 'conjugation-error' && tok.suggestions && tok.suggestions.length) {
        DB.logMistake({
          kind: 'conjugation',
          original_sentence: sentence,
          wrong_token: tok.text,
          correct_tokens: tok.suggestions,
          rule_violated: detailForConj(tok)
        });
      }
    });
  }

  /* Gold for words that don't conjugate (雨, とても, コーヒー). They have no
     forms to drill, so their route to the third star is using them in a
     sentence that survives the checker.

     The bar is deliberately more than "no errors": an empty result is not a
     pass. 雨です。 has no violations and no unknown tokens, and would hand
     over a gold point for four characters. Requiring at least one
     structurally-checked particle means the sentence has to actually place
     the word in a grammatical role.

     Conjugating words are excluded here — they earn gold in the drill, and
     letting one sentence award five words at once would make the five-day
     cadence meaningless. */
  function awardSentenceGold(tokens) {
    const clean = tokens.every(tk =>
      tk.type !== 'unknown' &&
      tk.type !== 'conjugation-error' &&
      !(tk.violations && tk.violations.length));
    if (!clean) return [];
    if (!tokens.some(tk => tk.type === 'particle')) return [];

    const ids = [...new Set(tokens.filter(tk => tk.type === 'known' && tk.wordId).map(tk => tk.wordId))];
    const awarded = [];
    ids.forEach(id => {
      const w = DB.getWord(id);
      if (!w || DB.drillable(w)) return;          // conjugating → the drill's job
      const cat = w.category;
      const hadCat = DB.categoryStar(cat);
      const hadGold = DB.stars(w).gold;
      const res = DB.scoreGold(id);
      if (!res.awarded) return;
      awarded.push(w);
      if (!hadGold && DB.stars(DB.getWord(id)).gold && window.Celebrate) Celebrate.fire('gold');
      if (!hadCat && DB.categoryStar(cat) && window.Celebrate) {
        setTimeout(() => Celebrate.fire('platinum'), 420);
      }
    });
    return awarded;
  }

  // ---- actions -------------------------------------------------
  function check(e) {
    e.preventDefault();
    const sentence = el('chkInput').value.trim();
    if (!sentence) return;

    const { tokens } = ParticleChecker.analyze(sentence);
    lastTokens = tokens;

    el('chkOutput').hidden = false;
    el('chkDetail').hidden = true;
    renderSentence(tokens);
    logConfidentMistakes(sentence, tokens);

    const gained = awardSentenceGold(tokens);
    const note = el('chkGold');
    note.hidden = !gained.length;
    if (gained.length) {
      note.textContent = t('checker.goldAwarded', gained.map(w => w.kanji || w.reading).join('、'));
    }

    const corrected = buildCorrected(tokens);
    el('chkCorrected').hidden = !corrected.anyChange;
    if (corrected.anyChange) {
      el('chkCorrectedText').textContent = corrected.text;
      el('chkCorrectedNote').hidden = !corrected.anyAmbiguous;
      if (corrected.anyAmbiguous) el('chkCorrectedNote').textContent = t('checker.ambiguousNote');
    }
  }

  function openAddFor(i) {
    const tok = lastTokens[i];
    if (tok && tok.type === 'unknown') Vocab.openAddWithText(tok.text);
  }

  function render() { /* stateless entry — leaves any prior check result visible */ }

  function bind() {
    el('chkForm').addEventListener('submit', check);
    el('chkSentence').addEventListener('click', e => {
      const addBtn = e.target.closest('[data-add]');
      if (addBtn) { openAddFor(+addBtn.dataset.add); return; }
      const tokEl = e.target.closest('[data-tok]');
      if (tokEl) showDetail(+tokEl.dataset.tok);
    });
    el('chkDetail').addEventListener('click', e => {
      const b = e.target.closest('[data-add]');
      if (b) openAddFor(+b.dataset.add);
    });
  }

  return { render, bind };
})();

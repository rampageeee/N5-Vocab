/* ============================================================
   REVIEW (§3.7 — mistake review loop)
   Separate tab from Flashcards, per spec: "sentences you got wrong,"
   not "words you're learning." One active mistake at a time, session
   shape modeled on flashcards.js (shuffle, one card, cycle-complete
   state) for a familiar interaction — but its own module, since the
   scoring itself is different (blank-fill against a logged
   correct_token, not a full reading match).

   Resolution: DB.scoreMistake tracks streak; N correct in a row
   (DB.MISTAKE_RESOLVE_TARGET) resolves it and it drops out of the
   active pool for good. A wrong answer resets the streak to 0 —
   this is a "get it right several times running" loop, not a
   one-shot correction.
   ============================================================ */
const Review = (() => {

  const t = (k, ...a) => I18N.t(k, ...a);
  const el = id => document.getElementById(id);

  let deck = [], pos = 0, answered = false;

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Blanks the FIRST occurrence of wrong_token in the original sentence.
  // If the same wrong token appeared twice, only one gets blanked — a
  // known, minor simplification, not worth extra machinery for.
  function blanked(sentence, wrongToken) {
    const i = sentence.indexOf(wrongToken);
    if (i < 0) return sentence;
    return sentence.slice(0, i) + '＿＿＿' + sentence.slice(i + wrongToken.length);
  }

  function render() { startSession(); }

  function startSession() {
    deck = shuffle(DB.activeMistakes().map(m => m.id));
    pos = 0;
    el('revComplete').hidden = true;
    if (deck.length === 0) {
      el('revEmpty').hidden = false;
      el('revStage').hidden = true;
    } else {
      el('revEmpty').hidden = true;
      el('revStage').hidden = false;
      showCurrent();
    }
  }

  function setAction(mode) {
    // Reuses the flashcards check/next labels — same action, same words.
    const b = el('revAction');
    b.textContent = mode === 'check' ? t('flash.check') : t('flash.next');
    b.dataset.mode = mode;
  }

  function showCurrent() {
    answered = false;
    const m = DB.getMistake(deck[pos]);
    if (!m) { next(); return; }
    el('revCounter').textContent = `${pos + 1} / ${deck.length}`;
    el('revSentence').textContent = blanked(m.original_sentence, m.wrong_token);
    el('revRule').textContent = m.rule_violated;
    el('revStreak').textContent = t('review.streak', m.streak || 0, DB.MISTAKE_RESOLVE_TARGET);
    el('revInput').value = '';
    el('revFeedback').textContent = '';
    el('revFeedback').className = 'rev-feedback';
    setAction('check');
    el('revInput').focus();
  }

  function action() {
    if (el('revAction').dataset.mode === 'next') return next();
    submit();
  }

  function submit() {
    if (answered) return;
    const m = DB.getMistake(deck[pos]);
    const res = DB.scoreMistake(m.id, el('revInput').value);
    const fb = el('revFeedback');
    if (res.correct) {
      fb.textContent = res.resolved ? t('review.resolved') : t('review.correct');
      fb.className = 'rev-feedback ' + (res.resolved ? 'rev-feedback--resolved' : 'rev-feedback--ok');
    } else {
      fb.textContent = t('review.wrong', m.correct_tokens.join('・'));
      fb.className = 'rev-feedback rev-feedback--bad';
    }
    answered = true;
    setAction('next');
  }

  function next() {
    pos++;
    if (pos >= deck.length) { showComplete(); return; }
    showCurrent();
  }

  function showComplete() {
    el('revStage').hidden = true;
    el('revComplete').hidden = false;
    const remaining = DB.activeMistakes().length;
    el('revCompleteMsg').textContent = remaining ? t('review.moreRemain', remaining) : t('review.allDone');
  }

  function bind() {
    el('revAction').addEventListener('click', action);
    // Same keyboard-thrash fix as flashcards: never disable the input
    // (only the `answered` flag blocks re-scoring), and block the button
    // from stealing focus so the keyboard doesn't close/reopen per card.
    el('revAction').addEventListener('pointerdown', e => e.preventDefault());
    el('revInput').addEventListener('keydown', e => { if (e.key === 'Enter') action(); });
    el('revAgain').addEventListener('click', startSession);
  }

  return { render, bind };
})();

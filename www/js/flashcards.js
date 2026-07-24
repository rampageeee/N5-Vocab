/* ============================================================
   FLASHCARDS
   Choosing a category START the session (no Start button). One
   button does check→next: it reads "Check", scores, then becomes
   "Next →" in place — so the finger never travels between the card
   and a far button. Tap-to-flip is the unscored self-check.
   End-of-cycle restart is an inline prompt under the card, not a
   native confirm(). No "End session" button — the top bar Home
   (or declining the restart) leaves.
   ============================================================ */
const Flash = (() => {

  const esc = s => (s || '').replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const t = (k, ...a) => I18N.t(k, ...a);
  const el = id => document.getElementById(id);

  let deck = [];
  let pos  = 0;
  let answered = false;

  /* ---- keyboard stability ----------------------------------
     The soft keyboard was opening and closing on every card because the
     answer input lost focus twice per word: `input.disabled = true` on
     check (a disabled element cannot hold focus, so the browser blurs it
     and dismisses the keyboard), then `.focus()` on the next card brought
     it back. Tapping the Check/Next button contributed a third blur —
     a tap moves focus to the button by default.

     So: never disable the input. `answered` already gates scoring, and
     lockInput() is now cosmetic only (a class), leaving focus exactly
     where it is. Card-to-card the keyboard never moves. */
  function lockInput(on) {
    const i = el('fcInput');
    i.classList.toggle('is-locked', !!on);
    i.setAttribute('aria-readonly', on ? 'true' : 'false');
  }

  // Refocus without scrolling the view; no-op when focus never left.
  function keepFocus() {
    const i = el('fcInput');
    if (document.activeElement !== i) {
      try { i.focus({ preventScroll: true }); } catch { i.focus(); }
    }
  }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---- render on entering the view -------------------------
  function render() {
    const sel = el('fcCategory');
    const cats = DB.categories();
    sel.innerHTML = `<option value="" disabled selected>${esc(t('flash.choose'))}</option>`
      + cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
    const f = DB.getFlashFilters();
    el('fcFilterToday').checked  = f.hideScoredToday;
    el('fcFilterStarred').checked = f.hideStarred;
    el('fcSetup').hidden = false;
    el('fcStage').hidden = true;
    el('fcRestart').hidden = true;
    renderList();
  }

  // Deck filters, read once at session start (§ see DB.getFlashFilters).
  // Order matters only for readability — both are pure exclusions.
  function buildDeck(cat) {
    const f = DB.getFlashFilters();
    let words = DB.wordsIn(cat);
    const total = words.length;
    if (f.hideScoredToday) words = words.filter(w => !DB.scoredToday(w));
    if (f.hideStarred)     words = words.filter(w => !DB.stars(w).bronze);
    return { words, total, filtered: total > 0 && words.length === 0 };
  }

  // ---- session start (fired by category change) ------------
  function start() {
    const cat = el('fcCategory').value;
    if (!cat) return;
    const { words, total, filtered } = buildDeck(cat);
    if (total === 0)  { alert(t('flash.emptyCat')); el('fcCategory').value = ''; return; }
    if (filtered)     { alert(t('flash.filteredEmpty')); el('fcCategory').value = ''; return; }
    deck = shuffle(words.map(w => w.id));
    pos = 0;
    el('fcSetup').hidden = true;
    el('fcStage').hidden = false;
    el('fcRestart').hidden = true;
    showCard();
  }

  function setAction(mode) {
    // mode: 'check' | 'next'
    const b = el('fcAction');
    b.textContent = mode === 'check' ? t('flash.check') : t('flash.next');
    b.dataset.mode = mode;
  }

  function showCard() {
    answered = false;
    el('fcRestart').hidden = true;
    const w = DB.getWord(deck[pos]);
    if (!w) { next(); return; }
    el('fcCounter').textContent = `${pos + 1} / ${deck.length}`;
    el('fcTrans').textContent = w.translation || '—';
    el('fcKanji').textContent = w.kanji || '—';
    el('fcReading').textContent = w.reading || '';
    el('flashcard').classList.remove('is-flipped');
    el('fcInput').value = '';
    el('fcInput').placeholder = t('flash.input.ph');
    lockInput(false);
    el('fcFeedback').textContent = '';
    el('fcFeedback').className = 'fc-feedback';
    setAction('check');
    keepFocus();
  }

  // Tap-to-flip = unscored self-check. Revealing commits the card:
  // input locks, no point, advance via the (now "Next") button.
  function flip() {
    const card = el('flashcard');
    const revealing = !card.classList.contains('is-flipped');
    card.classList.toggle('is-flipped');
    if (revealing && !answered) {
      answered = true;
      lockInput(true);
      el('fcInput').placeholder = t('flash.revealed.ph');
      el('fcFeedback').textContent = t('flash.selfcheck');
      el('fcFeedback').className = 'fc-feedback fc-feedback--dim';
      setAction('next');
    }
  }

  // ---- the single check/next button ------------------------
  function action() {
    if (el('fcAction').dataset.mode === 'next') next();
    else submit();
    keepFocus();   // belt-and-braces if a platform ignores the pointerdown guard
  }

  function submit() {
    if (answered) return;
    const w = DB.getWord(deck[pos]);
    const hadBronze = DB.stars(w).bronze;          // sampled BEFORE scoring
    const res = DB.scoreFlash(w.id, el('fcInput').value);
    const fb = el('fcFeedback');
    // Only on the point that actually crosses the threshold — not on every
    // correct answer, and never on a re-run of an already-starred word.
    if (res.awarded && !hadBronze && DB.stars(DB.getWord(w.id)).bronze) {
      if (window.Celebrate) Celebrate.fire('bronze');
    }

    if (res.correct) {
      if (res.awarded)          { fb.textContent = t('flash.correct');     fb.className = 'fc-feedback fc-feedback--ok'; }
      else if (res.cappedToday) { fb.textContent = t('flash.cappedToday'); fb.className = 'fc-feedback fc-feedback--dim'; }
    } else {
      fb.textContent = t('flash.wrong');
      fb.className = 'fc-feedback fc-feedback--bad';
      el('flashcard').classList.add('is-flipped');
    }

    answered = true;
    lockInput(true);
    setAction('next');
    renderList();
  }

  // ---- advance ---------------------------------------------
  function next() {
    pos++;
    if (pos >= deck.length) { showRestart(); return; }
    showCard();
  }

  // Inline restart prompt (styled like the dobrze/źle feedback).
  function showRestart() {
    el('fcRestart').hidden = false;
    el('fcRestartMsg').textContent = t('flash.cycleAgain');
    el('fcAgain').textContent = t('flash.again');
    el('fcBack').textContent = t('flash.back');
    lockInput(true);
    setAction('next');
  }

  function endSession() {
    el('fcStage').hidden = true;
    el('fcSetup').hidden = false;
    el('fcRestart').hidden = true;
    el('fcCategory').value = '';   // reset so re-picking fires change again
    renderList();
  }

  // ---- progress list (accordion, collapsed by default) -----
  let listFilter = '__all__';
  let listOpen = false;

  function renderList() {
    const wrap = el('fcList');
    const cats = DB.categories();
    const words = listFilter === '__all__' ? DB.allWords() : DB.wordsIn(listFilter);

    const filterOpts = [`<option value="__all__">${esc(t('flash.allCats'))}</option>`]
      .concat(cats.map(c => `<option value="${esc(c)}" ${c === listFilter ? 'selected' : ''}>${esc(c)}</option>`))
      .join('');

    const rows = words.map(w => {
      const st = DB.stars(w);
      const bronze = st.bronze ? `<span class="star b star--on">★</span>` : '';
      return `<tr>
        <td class="cell-kanji">${esc(w.kanji) || '—'}</td>
        <td class="cell-reading">${esc(w.reading)}</td>
        <td class="cell-trans">${esc(w.translation)}</td>
        <td class="fc-pts">${w.flashPoints || 0} / ${DB.BRONZE_TARGET} ${bronze}</td>
      </tr>`;
    }).join('');

    const body = listOpen ? `
      <div class="fc-list__filter"><select id="fcListFilter">${filterOpts}</select></div>
      <table>
        <thead><tr>
          <th>${esc(t('th.kanji'))}</th><th>${esc(t('th.hiragana'))}</th>
          <th>${esc(t('th.trans'))}</th><th class="fc-pts">${esc(t('flash.pts'))}</th>
        </tr></thead>
        <tbody>${rows || `<tr><td colspan="4" class="stub">${esc(t('flash.noWords'))}</td></tr>`}</tbody>
      </table>` : '';

    wrap.innerHTML = `
      <button class="fc-list__toggle" id="fcListToggle" aria-expanded="${listOpen}">
        <span>${esc(t('flash.progress'))} (${words.length})</span>
        <span class="fc-list__chev">${listOpen ? '▾' : '▸'}</span>
      </button>
      <div class="fc-list__body" ${listOpen ? '' : 'hidden'}>${body}</div>`;

    el('fcListToggle').addEventListener('click', () => { listOpen = !listOpen; renderList(); });
    if (listOpen) el('fcListFilter').addEventListener('change', e => { listFilter = e.target.value; renderList(); });
  }

  // ---- bind ------------------------------------------------
  function bind() {
    el('fcCategory').addEventListener('change', start);
    el('fcFilterToday').addEventListener('change',
      e => DB.setFlashFilter('hideScoredToday', e.target.checked));
    el('fcFilterStarred').addEventListener('change',
      e => DB.setFlashFilter('hideStarred', e.target.checked));
    el('flashcard').addEventListener('click', flip);
    // Suppressing the default pointerdown action stops the button taking
    // focus, so the input never blurs and the soft keyboard never animates.
    // click still fires normally.
    el('fcAction').addEventListener('pointerdown', e => e.preventDefault());
    el('fcAction').addEventListener('click', action);
    el('fcInput').addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();   // some soft keyboards dismiss themselves on an unhandled Enter
      action();
    });
    el('fcAgain').addEventListener('click', () => { deck = shuffle(deck); pos = 0; el('fcRestart').hidden = true; showCard(); });
    el('fcBack').addEventListener('click', endSession);
  }

  return { render, bind };
})();

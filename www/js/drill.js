/* ============================================================
   DRILL — extra practice for conjugating words

   Given a dictionary form and a target form, produce the conjugation.
   It uses the forms already computed in data.js.

   Gold is earned through the three exercises in Sentences. This standalone
   drill remains available for extra repetition of verb/adjective forms.

   A verb whose class hasn't been settled is excluded by DB.drillFormsFor.
   Drilling an unaudited verb could teach the wrong class.

   Keyboard handling mirrors flashcards.js deliberately: the input is
   never disabled and the action button suppresses its own pointerdown,
   so the soft keyboard doesn't slam shut and reopen on every question.
   ============================================================ */
const Drill = (() => {

  const esc = s => (s || '').replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const t = (k, ...a) => I18N.t(k, ...a);
  const el = id => document.getElementById(id);

  let deck = [];          // [{ id, formKey }]
  let pos = 0;
  let answered = false;

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function lockInput(on) {
    const i = el('drInput');
    i.classList.toggle('is-locked', !!on);
    i.setAttribute('aria-readonly', on ? 'true' : 'false');
  }
  function keepFocus() {
    const i = el('drInput');
    if (document.activeElement !== i) {
      try { i.focus({ preventScroll: true }); } catch { i.focus(); }
    }
  }

  // ---- setup -----------------------------------------------
  function render() {
    const sel = el('drCategory');
    const cats = DB.categories();
    sel.innerHTML = `<option value="" disabled selected>${esc(t('flash.choose'))}</option>`
      + `<option value="__all__">${esc(t('flash.allCats'))}</option>`
      + cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
    el('drSetup').hidden = false;
    el('drStage').hidden = true;
    el('drRestart').hidden = true;
    renderPool();
  }

  // One entry per (word, form) pair rather than per word — otherwise a verb
  // with five drillable forms gets the same single question every cycle and
  // the learner memorises one answer instead of the rule.
  function buildDeck(cat) {
    const words = cat === '__all__' ? DB.allWords() : DB.wordsIn(cat);
    const out = [];
    words.forEach(w => DB.drillFormsFor(w).forEach(fk => out.push({ id: w.id, formKey: fk })));
    return out;
  }

  function start() {
    const cat = el('drCategory').value;
    if (!cat) return;
    const pool = buildDeck(cat);
    if (!pool.length) { alert(t('drill.noneDrillable')); el('drCategory').value = ''; return; }
    deck = shuffle(pool);
    pos = 0;
    el('drSetup').hidden = true;
    el('drStage').hidden = false;
    el('drRestart').hidden = true;
    showCard();
  }

  function setAction(mode) {
    const b = el('drAction');
    b.textContent = mode === 'check' ? t('flash.check') : t('flash.next');
    b.dataset.mode = mode;
  }

  function showCard() {
    answered = false;
    el('drRestart').hidden = true;
    const q = deck[pos];
    const w = q && DB.getWord(q.id);
    if (!w) { next(); return; }
    el('drCounter').textContent = `${pos + 1} / ${deck.length}`;
    el('drWord').textContent = w.kanji || w.reading;
    el('drReading').textContent = w.kanji ? w.reading : '';
    el('drTrans').textContent = w.translation || '';
    el('drTarget').textContent = t('drill.form.' + q.formKey);
    el('drInput').value = '';
    lockInput(false);
    el('drFeedback').textContent = '';
    el('drFeedback').className = 'fc-feedback';
    setAction('check');
    keepFocus();
  }

  function action() {
    if (el('drAction').dataset.mode === 'next') next();
    else submit();
    keepFocus();
  }

  function submit() {
    if (answered) return;
    const q = deck[pos];
    const w = DB.getWord(q.id);
    const accepted = DB.acceptedForms(w, q.formKey);
    const typed = DB.normKana(el('drInput').value).replace(/\s+/g, '');
    const correct = typed !== '' && accepted.some(a => DB.normKana(a) === typed);
    const fb = el('drFeedback');

    if (correct) {
      fb.textContent = t('review.correct');
      fb.className = 'fc-feedback fc-feedback--ok';
    } else {
      fb.innerHTML = `${esc(t('drill.wrong'))} <span class="jp">${esc(accepted[0] || '')}</span>`;
      fb.className = 'fc-feedback fc-feedback--bad';
    }

    answered = true;
    lockInput(true);
    setAction('next');
    renderPool();
  }

  function next() {
    pos++;
    if (pos >= deck.length) { showRestart(); return; }
    showCard();
  }

  function showRestart() {
    el('drRestart').hidden = false;
    el('drRestartMsg').textContent = t('flash.cycleAgain');
    el('drAgain').textContent = t('flash.again');
    el('drBack').textContent = t('flash.back');
    lockInput(true);
    setAction('next');
  }

  function endSession() {
    el('drStage').hidden = true;
    el('drSetup').hidden = false;
    el('drRestart').hidden = true;
    el('drCategory').value = '';
    renderPool();
  }

  // ---- progress list ---------------------------------------
  let poolOpen = false;

  function renderPool() {
    const wrap = el('drList');
    const words = DB.allWords().filter(DB.drillable);
    const rows = words.map(w => {
      return `<tr>
        <td class="cell-kanji">${esc(w.kanji) || '—'}</td>
        <td class="cell-reading">${esc(w.reading)}</td>
        <td class="cell-trans">${esc(w.translation)}</td>
        <td class="fc-pts">${DB.drillFormsFor(w).length}</td>
      </tr>`;
    }).join('');

    const body = poolOpen ? `
      <table>
        <thead><tr>
          <th>${esc(t('th.kanji'))}</th><th>${esc(t('th.hiragana'))}</th>
          <th>${esc(t('th.trans'))}</th><th class="fc-pts">${esc(t('drill.formsCount'))}</th>
        </tr></thead>
        <tbody>${rows || `<tr><td colspan="4" class="stub">${esc(t('drill.noneDrillable'))}</td></tr>`}</tbody>
      </table>` : '';

    wrap.innerHTML = `
      <button class="fc-list__toggle" id="drListToggle" aria-expanded="${poolOpen}">
        <span>${esc(t('drill.pool'))} (${words.length})</span>
        <span class="fc-list__chev">${poolOpen ? '▾' : '▸'}</span>
      </button>
      <div class="fc-list__body" ${poolOpen ? '' : 'hidden'}>${body}</div>`;
    el('drListToggle').addEventListener('click', () => { poolOpen = !poolOpen; renderPool(); });
  }

  // ---- bind ------------------------------------------------
  function bind() {
    el('drCategory').addEventListener('change', start);
    el('drAction').addEventListener('pointerdown', e => e.preventDefault());
    el('drAction').addEventListener('click', action);
    el('drInput').addEventListener('keydown', e => {
      if (InputSafety.composing(e)) return;
      if (e.key !== 'Enter') return;
      e.preventDefault();
      action();
    });
    el('drAgain').addEventListener('click', () => {
      deck = shuffle(deck); pos = 0; el('drRestart').hidden = true; showCard();
    });
    el('drBack').addEventListener('click', endSession);
  }

  return { render, bind };
})();

window.Drill = Drill;

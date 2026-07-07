/* ============================================================
   FLASHCARDS
   Pick category → random no-repeat cycle. Tap flips (unscored).
   Typed kana answer scores: +1 toward bronze, capped 1/word/day.
   Progress list below reflects live point totals + bronze star.
   ============================================================ */
const Flash = (() => {

  const esc = s => (s || '').replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  let deck = [];      // shuffled word ids for this session
  let pos  = 0;       // index into deck
  let answered = false;

  const el = id => document.getElementById(id);

  // Fisher–Yates
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
    sel.innerHTML = cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
    el('fcSetup').hidden = false;
    el('fcStage').hidden = true;
    renderList();
  }

  // ---- session start ---------------------------------------
  function start() {
    const cat = el('fcCategory').value;
    const words = DB.wordsIn(cat);
    if (words.length === 0) { alert('Ta kategoria jest pusta.'); return; }
    deck = shuffle(words.map(w => w.id));
    pos = 0;
    el('fcSetup').hidden = true;
    el('fcStage').hidden = false;
    showCard();
  }

  function showCard() {
    answered = false;
    const w = DB.getWord(deck[pos]);
    if (!w) { next(); return; }
    el('fcCounter').textContent = `${pos + 1} / ${deck.length}`;
    el('fcTrans').textContent = w.translation || '—';
    el('fcKanji').textContent = w.kanji || '—';
    el('fcReading').textContent = w.reading || '';
    el('flashcard').classList.remove('is-flipped');
    el('fcInput').value = '';
    el('fcInput').placeholder = 'wpisz czytanie (kana)…';
    el('fcInput').disabled = false;
    el('fcSubmit').disabled = false;
    el('fcFeedback').textContent = '';
    el('fcFeedback').className = 'fc-feedback';
    el('fcNextWrap').hidden = true;
    el('fcInput').focus();
  }

  // Tap-to-flip is the UNSCORED self-check path. Revealing the answer
  // commits the card: input locks, no point, advance via "next". Flipping
  // back does not re-enable typing (closes the peek-then-type cheat).
  function flip() {
    const card = el('flashcard');
    const revealing = !card.classList.contains('is-flipped');
    card.classList.toggle('is-flipped');
    if (revealing && !answered) {
      answered = true;
      el('fcInput').disabled = true;
      el('fcSubmit').disabled = true;
      el('fcInput').placeholder = 'odkryto — bez punktu';
      el('fcFeedback').textContent = 'Samo-sprawdzenie (bez punktu).';
      el('fcFeedback').className = 'fc-feedback fc-feedback--dim';
      el('fcNextWrap').hidden = false;
    }
  }

  // ---- answer ----------------------------------------------
  function submit() {
    if (answered) return;
    const w = DB.getWord(deck[pos]);
    const res = DB.scoreFlash(w.id, el('fcInput').value);
    const fb = el('fcFeedback');

    if (res.correct) {
      if (res.awarded)      { fb.textContent = 'Dobrze! +1'; fb.className = 'fc-feedback fc-feedback--ok'; }
      else if (res.cappedToday) { fb.textContent = 'Dobrze! (punkt już zaliczony dziś)'; fb.className = 'fc-feedback fc-feedback--dim'; }
    } else {
      fb.textContent = 'Źle. Poprawna odpowiedź poniżej.';
      fb.className = 'fc-feedback fc-feedback--bad';
      el('flashcard').classList.add('is-flipped');   // reveal on wrong
    }

    answered = true;
    el('fcInput').disabled = true;
    el('fcSubmit').disabled = true;
    el('fcNextWrap').hidden = false;
    renderList();               // live-update the progress list + star
  }

  // ---- advance ---------------------------------------------
  function next() {
    pos++;
    if (pos >= deck.length) {
      // whole category cycled — explicit stopping point
      if (confirm('Przeszłaś przez całą kategorię. Jeszcze raz?')) {
        deck = shuffle(deck); pos = 0; showCard();
      } else {
        endSession();
      }
      return;
    }
    showCard();
  }

  function endSession() {
    el('fcStage').hidden = true;
    el('fcSetup').hidden = false;
    renderList();
  }

  // ---- progress list (accordion, collapsed by default) -----
  // Collapsed during play so answers don't sit visible below the card.
  let listFilter = '__all__';
  let listOpen = false;

  function renderList() {
    const wrap = el('fcList');
    const cats = DB.categories();
    const words = listFilter === '__all__'
      ? DB.allWords()
      : DB.wordsIn(listFilter);

    const filterOpts = [`<option value="__all__">Wszystkie kategorie</option>`]
      .concat(cats.map(c => `<option value="${esc(c)}" ${c === listFilter ? 'selected' : ''}>${esc(c)}</option>`))
      .join('');

    const rows = words.map(w => {
      const st = DB.stars(w);
      const bronze = st.bronze ? `<span class="star b star--on">★</span>` : '';
      return `<tr>
        <td class="cell-kanji" style="cursor:default">${esc(w.kanji) || '—'}</td>
        <td class="cell-reading">${esc(w.reading)}</td>
        <td class="cell-trans">${esc(w.translation)}</td>
        <td class="fc-pts">${w.flashPoints || 0} / ${DB.BRONZE_TARGET} ${bronze}</td>
      </tr>`;
    }).join('');

    const body = listOpen ? `
      <div class="fc-list__filter">
        <select id="fcListFilter">${filterOpts}</select>
      </div>
      <table>
        <thead><tr><th>Kanji</th><th>Hiragana</th><th>Tłumaczenie</th><th class="fc-pts">Punkty</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="4" class="stub">Brak słów.</td></tr>'}</tbody>
      </table>` : '';

    wrap.innerHTML = `
      <button class="fc-list__toggle" id="fcListToggle" aria-expanded="${listOpen}">
        <span>Postęp (${words.length})</span>
        <span class="fc-list__chev">${listOpen ? '▾' : '▸'}</span>
      </button>
      <div class="fc-list__body" ${listOpen ? '' : 'hidden'}>${body}</div>`;

    el('fcListToggle').addEventListener('click', () => { listOpen = !listOpen; renderList(); });
    if (listOpen) {
      el('fcListFilter').addEventListener('change', e => {
        listFilter = e.target.value; renderList();
      });
    }
  }

  // ---- bind ------------------------------------------------
  function bind() {
    el('fcStart').addEventListener('click', start);
    el('flashcard').addEventListener('click', flip);
    el('fcSubmit').addEventListener('click', submit);
    el('fcInput').addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    el('fcNext').addEventListener('click', next);
    el('fcEnd').addEventListener('click', endSession);
  }

  return { render, bind };
})();

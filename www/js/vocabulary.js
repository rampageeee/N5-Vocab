/* ============================================================
   VOCABULARY SECTION
   Renders categories in creation order, each with its own
   column headers, star slots, add/edit controls, TOC links,
   and the enlarged detail view.
   ============================================================ */
const Vocab = (() => {

  const esc = s => (s || '').replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---- star markup -----------------------------------------
  // Uses ★ filled glyph; colour + on/off handled by CSS classes.
  function starHTML(st) {
    return `<span class="stars">
      <span class="star b ${st.bronze ? 'star--on' : ''}" title="Brąz – fiszki">★</span>
      <span class="star s ${st.silver ? 'star--on' : ''}" title="Srebro – pisanie">★</span>
      <span class="star g ${st.gold ? 'star--on' : ''}" title="Złoto – zdania">★</span>
    </span>`;
  }

  // ---- render whole section --------------------------------
  function render() {
    renderTOC();
    renderBody();
  }

  function renderTOC() {
    const toc = document.getElementById('toc');
    const cats = DB.categories();
    toc.innerHTML = cats.map((c, i) =>
      `<a href="#cat-${i}">${esc(c)}</a>`).join('');
  }

  function renderBody() {
    const body = document.getElementById('vocabBody');
    const cats = DB.categories();

    if (cats.length === 0) {
      body.innerHTML = `<p class="stub">Brak kategorii. Dodaj pierwszą powyżej.</p>`;
      return;
    }

    body.innerHTML = cats.map((cat, i) => {
      const words = DB.wordsIn(cat);
      const rows = words.map(w => {
        const st = DB.stars(w);
        return `<tr data-id="${w.id}">
          <td class="col-stars">${starHTML(st)}</td>
          <td class="cell-kanji" data-detail="${w.id}">${esc(w.kanji) || '—'}</td>
          <td class="cell-reading">${esc(w.reading)}</td>
          <td class="cell-trans">${esc(w.translation)}</td>
          <td class="col-edit"><button class="edit-btn" data-edit="${w.id}" aria-label="Edytuj">✎</button></td>
        </tr>`;
      }).join('');

      const emptyNote = words.length === 0
        ? `<tr><td colspan="5" class="cat__empty">Pusta kategoria.</td></tr>` : '';

      return `<section class="cat" id="cat-${i}">
        <div class="cat__head">
          <span class="cat__name">${esc(cat)}</span>
        </div>
        <table class="vtable">
          <thead>
            <tr>
              <th></th><th>Kanji</th><th>Hiragana</th><th>Tłumaczenie</th><th></th>
            </tr>
          </thead>
          <tbody>
            ${rows}${emptyNote}
            <tr class="addword-row">
              <td colspan="5">
                <button class="addword-btn" data-add="${esc(cat)}">+ Dodaj słowo</button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>`;
    }).join('');
  }

  // ---- word modal ------------------------------------------
  const modal = () => document.getElementById('modalWord');

  function openAdd(cat) {
    document.getElementById('modalWordTitle').textContent = 'Nowe słowo';
    document.getElementById('wId').value = '';
    document.getElementById('wKanji').value = '';
    document.getElementById('wReading').value = '';
    document.getElementById('wTrans').value = '';
    document.getElementById('wPos').value = '';
    document.getElementById('wCategory').value = cat;
    document.getElementById('btnDeleteWord').hidden = true;
    modal().hidden = false;
    document.getElementById('wKanji').focus();
  }

  function openEdit(id) {
    const w = DB.getWord(id);
    if (!w) return;
    document.getElementById('modalWordTitle').textContent = 'Edytuj słowo';
    document.getElementById('wId').value = w.id;
    document.getElementById('wKanji').value = w.kanji;
    document.getElementById('wReading').value = w.reading;
    document.getElementById('wTrans').value = w.translation;
    document.getElementById('wPos').value = w.pos || '';
    document.getElementById('wCategory').value = w.category;
    document.getElementById('btnDeleteWord').hidden = false;
    modal().hidden = false;
  }

  function closeModal() { modal().hidden = true; }

  function submitWord(e) {
    e.preventDefault();
    const id  = document.getElementById('wId').value;
    const data = {
      kanji:       document.getElementById('wKanji').value,
      reading:     document.getElementById('wReading').value,
      translation: document.getElementById('wTrans').value,
      pos:         document.getElementById('wPos').value,
      category:    document.getElementById('wCategory').value
    };
    if (!data.kanji && !data.reading && !data.translation) return; // ignore empty
    if (id) DB.updateWord(id, data);
    else    DB.addWord(data);
    closeModal();
    render();
  }

  function removeWord() {
    const id = document.getElementById('wId').value;
    if (!id) return;
    if (!confirm('Usunąć to słowo?')) return;
    DB.deleteWord(id);
    closeModal();
    render();
  }

  // ---- detail view -----------------------------------------
  function openDetail(id) {
    const w = DB.getWord(id);
    if (!w) return;
    const chars = DB.kanjiOf(w.kanji);

    const charTiles = chars.length
      ? `<div class="detail__chars">${chars.map(c =>
          `<div class="detail__char">${esc(c)}</div>`).join('')}</div>`
      : '';

    // Stroke-order integration point. KanjiVG is not yet bundled
    // (that ships with the Kanji Drawing pass). Honest placeholder
    // rather than a fake render.
    const strokeNote = `<div class="detail__stroke-note">
      Kolejność kresek pojawi się tutaj po dołączeniu danych KanjiVG
      (krok „Pisanie kanji"). Każde kanji powyżej będzie miało numerowane kreski.
    </div>`;

    document.getElementById('detailBody').innerHTML = `
      <div class="detail__kanji">${esc(w.kanji) || '—'}</div>
      <div class="detail__reading">${esc(w.reading)}</div>
      <div class="detail__trans">${esc(w.translation)}</div>
      ${charTiles}
      ${strokeNote}
      <button class="tool-btn detail__draw-link" data-draw="${esc(w.kanji)}">
        Ćwicz pisanie →
      </button>`;
    document.getElementById('modalDetail').hidden = false;
  }

  function closeDetail() { document.getElementById('modalDetail').hidden = true; }

  // ---- event delegation ------------------------------------
  function bind() {
    // add category
    document.getElementById('formAddCat').addEventListener('submit', e => {
      e.preventDefault();
      const inp = document.getElementById('inpNewCat');
      if (DB.addCategory(inp.value)) { inp.value = ''; render(); }
    });

    // body clicks: add word / edit / open detail
    document.getElementById('vocabBody').addEventListener('click', e => {
      const add    = e.target.closest('[data-add]');
      const edit   = e.target.closest('[data-edit]');
      const detail = e.target.closest('[data-detail]');
      if (add)    return openAdd(add.dataset.add);
      if (edit)   return openEdit(edit.dataset.edit);
      if (detail) return openDetail(detail.dataset.detail);
    });

    // word modal
    document.getElementById('formWord').addEventListener('submit', submitWord);
    document.getElementById('btnCancelWord').addEventListener('click', closeModal);
    document.getElementById('btnDeleteWord').addEventListener('click', removeWord);

    // detail modal
    document.getElementById('btnCloseDetail').addEventListener('click', closeDetail);
    document.getElementById('detailBody').addEventListener('click', e => {
      if (e.target.closest('[data-draw]')) { closeDetail(); Router.go('kanji'); }
    });

    // close modals on backdrop tap
    [document.getElementById('modalWord'), document.getElementById('modalDetail')]
      .forEach(m => m.addEventListener('click', e => { if (e.target === m) m.hidden = true; }));
  }

  return { render, bind };
})();

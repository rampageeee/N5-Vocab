/* ============================================================
   VOCABULARY (Dictionary)
   Grid-based rows (not a <table>) so long kanji / readings /
   translations WRAP vertically instead of stretching the page
   sideways, and so rows and category blocks can be drag-reordered
   on touch. Category names are editable inline; a word's category
   can be changed from the edit modal (move between categories).

   Word modal now carries an optional verb_class field (godan/
   ichidan/irregular), shown only when POS = verb — feeds the
   conjugation cache in data.js. Toggled live if POS changes while
   the modal is open.
   ============================================================ */
const Vocab = (() => {

  const esc = s => (s || '').replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const t = (k, ...a) => I18N.t(k, ...a);

  const GRIP = '<span class="grip" aria-hidden="true">⠿</span>';

  /* ---- reusable pointer sortable ---------------------------
     Drag by a handle; siblings are re-slotted live as the pointer
     crosses their midpoints; commit reads the resulting id order.
     Works for both category blocks and word rows. Container must
     hold ONLY sortable items matching itemSel (the add-word button
     lives outside the word list for this reason). */
  function makeSortable(container, itemSel, handleSel, onCommit) {
    if (!container) return;
    let drag = null, lastY = 0, raf = 0;
    const EDGE = 72, SPEED = 12;   // px-from-viewport-edge hot zone / max px per frame

    const items = () => [...container.querySelectorAll(':scope > ' + itemSel)];

    // Re-slot the dragged item against siblings at the current pointer Y.
    // Shared by pointermove and the autoscroll loop so the item keeps moving
    // as the viewport scrolls under it.
    function reslot() {
      for (const s of items()) {
        if (s === drag) continue;
        const r = s.getBoundingClientRect();
        if (lastY < r.top + r.height / 2) { container.insertBefore(drag, s); return; }
      }
      container.appendChild(drag);
    }

    // Auto-scroll while the pointer sits near the top/bottom edge — without this
    // a drop target off-screen on a small viewport is simply unreachable.
    function autoscroll() {
      if (!drag) return;
      const h = window.innerHeight;
      let dy = 0;
      if (lastY < EDGE)          dy = -Math.ceil((EDGE - lastY) / EDGE * SPEED);
      else if (lastY > h - EDGE) dy =  Math.ceil((lastY - (h - EDGE)) / EDGE * SPEED);
      if (dy) { window.scrollBy(0, dy); reslot(); }
      raf = requestAnimationFrame(autoscroll);
    }

    container.addEventListener('pointerdown', e => {
      const handle = e.target.closest(handleSel);
      if (!handle || !container.contains(handle)) return;
      const item = handle.closest(itemSel);
      if (!item) return;
      e.preventDefault();
      drag = item; lastY = e.clientY;
      item.classList.add('sorting');
      try { handle.setPointerCapture(e.pointerId); } catch {}
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      raf = requestAnimationFrame(autoscroll);
    });

    function move(e) { if (!drag) return; lastY = e.clientY; reslot(); }

    function up() {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      if (!drag) return;
      drag.classList.remove('sorting');
      const order = items().map(el => el.dataset.id || el.dataset.cat);
      drag = null;
      onCommit(order);
    }
  }

  // ---- star markup -----------------------------------------
  function starHTML(st) {
    return `<span class="stars">
      <span class="star b ${st.bronze ? 'star--on' : ''}" title="${esc(t('hub.flash'))}">★</span>
      <span class="star s ${st.silver ? 'star--on' : ''}" title="${esc(t('hub.kanji'))}">★</span>
      <span class="star g ${st.gold ? 'star--on' : ''}" title="${esc(t('hub.sentences'))}">★</span>
    </span>`;
  }

  // ---- render whole section --------------------------------
  function render() {
    renderTOC();
    renderBody();
    wireWordLists();
  }

  function renderTOC() {
    const toc = document.getElementById('toc');
    const cats = DB.categories();
    // Buttons, not <a href="#cat-N">: fragment anchors push a null-state history
    // entry (Back then falls through to hub) and the WebView can intercept the
    // href as a navigation. We scroll programmatically in bind() instead.
    toc.innerHTML = cats.map((c, i) =>
      `<button type="button" data-jump="cat-${i}">${esc(c)}</button>`).join('');
  }

  function wordRow(w) {
    const st = DB.stars(w);
    return `<div class="wrow" data-id="${w.id}">
      <button class="wrow__grip" data-i18n-aria="cat.drag" aria-label="${esc(t('cat.drag'))}">${GRIP}</button>
      <div class="wrow__main" data-detail="${w.id}">
        <div class="wrow__top">
          <span class="wrow__kanji">${esc(w.kanji) || '—'}</span>
          ${starHTML(st)}
        </div>
        <div class="wrow__reading">${esc(w.reading)}</div>
        <div class="wrow__trans">${esc(w.translation)}</div>
      </div>
      <button class="wrow__edit" data-edit="${w.id}" aria-label="✎">✎</button>
    </div>`;
  }

  function renderBody() {
    const body = document.getElementById('vocabBody');
    const cats = DB.categories();

    if (cats.length === 0) {
      body.innerHTML = `<p class="stub">${esc(t('vocab.empty'))}</p>`;
      return;
    }

    body.innerHTML = cats.map((cat, i) => {
      const words = DB.wordsIn(cat);
      const rows = words.map(wordRow).join('');
      const empty = words.length === 0
        ? `<div class="cat__empty">${esc(t('vocab.emptyCat'))}</div>` : '';

      return `<section class="cat" id="cat-${i}" data-cat="${esc(cat)}">
        <div class="cat__head">
          <button class="cat__grip" data-i18n-aria="cat.drag" aria-label="${esc(t('cat.drag'))}">${GRIP}</button>
          <span class="cat__name">${esc(cat)}</span>
          <button class="cat__edit" data-rename="${esc(cat)}" data-i18n-aria="cat.rename" aria-label="${esc(t('cat.rename'))}">✎</button>
        </div>
        <div class="wlist" data-cat="${esc(cat)}">${rows}${empty}</div>
        <button class="addword-btn" data-add="${esc(cat)}">${esc(t('vocab.addWord'))}</button>
      </section>`;
    }).join('');
  }

  // Word lists are rebuilt every render (fresh nodes → old listeners GC'd),
  // so they're wired per render. The category container (#vocabBody) is a
  // STABLE element, so its sortable is bound ONCE in bind() — re-binding it
  // here would stack a new pointerdown handler on every render.
  function wireWordLists() {
    document.querySelectorAll('.wlist').forEach(list => {
      makeSortable(list, '.wrow', '.wrow__grip', order => {
        DB.reorderWords(list.dataset.cat, order); render();
      });
    });
  }

  // ---- inline category rename ------------------------------
  function startRename(catName, headEl) {
    const nameEl = headEl.querySelector('.cat__name');
    if (!nameEl) return;
    const input = document.createElement('input');
    input.className = 'cat__name-input';
    input.value = catName;
    nameEl.replaceWith(input);
    input.focus(); input.select();
    let done = false;
    const commit = () => {
      if (done) return; done = true;
      const nn = input.value.trim();
      if (nn && nn !== catName && !DB.renameCategory(catName, nn)) alert(t('cat.dupName'));
      else if (nn && nn !== catName) DB.renameCategory(catName, nn);
      render();
    };
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      if (e.key === 'Escape') { done = true; render(); }
    });
    input.addEventListener('blur', commit);
  }

  // ---- word modal ------------------------------------------
  const modal = () => document.getElementById('modalWord');
  const $ = id => document.getElementById(id);

  function fillCategorySelect(selected) {
    const sel = $('wCategory');
    sel.innerHTML = DB.categories()
      .map(c => `<option value="${esc(c)}" ${c === selected ? 'selected' : ''}>${esc(c)}</option>`)
      .join('');
  }

  // Verb-class field only makes sense for pos==='verb' — toggled live so
  // switching POS while the modal is open doesn't leave a stale field
  // showing (or a verb hiding its class picker).
  //
  // Driven via inline style, not the `hidden` attribute: .fld has its own
  // `display: block` rule in styles.css, which — same origin, same
  // specificity as the UA's `[hidden]{display:none}` — is not guaranteed
  // to lose that fight (author-stylesheet rules take precedence over the
  // UA stylesheet regardless of specificity). Inline style always wins
  // over both, so this sidesteps the ambiguity instead of relying on it.
  function syncVerbClassVisibility() {
    $('fldVerbClass').style.display = $('wPos').value === 'verb' ? '' : 'none';
  }

  function openAdd(cat) {
    $('modalWordTitle').textContent = t('word.newTitle');
    $('wId').value = '';
    $('wKanji').value = '';
    $('wReading').value = '';
    $('wTrans').value = '';
    $('wPos').value = DB.getLastPos();     // remember last-used part of speech
    $('wVerbClass').value = 'godan';
    syncVerbClassVisibility();
    fillCategorySelect(cat);
    $('btnDeleteWord').hidden = true;
    modal().hidden = false;
    $('wKanji').focus();
  }

  // Entry point for other views (the sentence checker's unknown-token "add
  // to dictionary" button) — reuses this exact modal/flow rather than a
  // second add-word UI. Pre-fills kanji or reading depending on whether the
  // unrecognized text contains kanji; defaults to the first existing
  // category (same constraint the rest of the app already has: a category
  // must exist before a word can be added).
  function openAddWithText(text) {
    openAdd(DB.categories()[0]);
    if (DB.kanjiOf(text).length > 0) $('wKanji').value = text;
    else $('wReading').value = text;
  }

  function openEdit(id) {
    const w = DB.getWord(id);
    if (!w) return;
    $('modalWordTitle').textContent = t('word.editTitle');
    $('wId').value = w.id;
    $('wKanji').value = w.kanji;
    $('wReading').value = w.reading;
    $('wTrans').value = w.translation;
    $('wPos').value = w.pos || '';
    $('wVerbClass').value = w.verb_class || 'godan';
    syncVerbClassVisibility();
    fillCategorySelect(w.category);
    $('btnDeleteWord').hidden = false;
    modal().hidden = false;
  }

  function closeModal() { modal().hidden = true; }

  function submitWord(e) {
    e.preventDefault();
    const id = $('wId').value;
    const pos = $('wPos').value;
    const data = {
      kanji:       $('wKanji').value,
      reading:     $('wReading').value,
      translation: $('wTrans').value,
      pos,
      category:    $('wCategory').value,
      verb_class:  pos === 'verb' ? $('wVerbClass').value : undefined
    };
    if (!data.kanji && !data.reading && !data.translation) return;
    DB.setLastPos(data.pos);
    if (id) DB.updateWord(id, data);
    else    DB.addWord(data);
    closeModal();
    render();
  }

  function removeWord() {
    const id = $('wId').value;
    if (!id) return;
    if (!confirm(t('word.deleteConfirm'))) return;
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
      ? `<div class="detail__chars">${chars.map(c => `<div class="detail__char">${esc(c)}</div>`).join('')}</div>`
      : '';

    document.getElementById('detailBody').innerHTML = `
      <div class="detail__kanji">${esc(w.kanji) || '—'}</div>
      <div class="detail__reading">${esc(w.reading)}</div>
      <div class="detail__trans">${esc(w.translation)}</div>
      ${charTiles}
      <button class="tool-btn detail__draw-link" data-draw="${esc(w.kanji)}">${esc(t('detail.draw'))}</button>`;
    document.getElementById('modalDetail').hidden = false;
  }

  function closeDetail() { document.getElementById('modalDetail').hidden = true; }

  // ---- event delegation ------------------------------------
  function bind() {
    // Category reorder: bound once on the stable #vocabBody. items() reads
    // the current .cat children live at drag time, so it survives re-renders.
    makeSortable(document.getElementById('vocabBody'), '.cat', '.cat__grip', order => {
      DB.reorderCategories(order); render();
    });

    // TOC jump — programmatic scroll (see renderTOC). #toc is stable, bind once.
    document.getElementById('toc').addEventListener('click', e => {
      const b = e.target.closest('[data-jump]');
      if (!b) return;
      const sec = document.getElementById(b.dataset.jump);
      if (sec) sec.scrollIntoView({ block: 'start' });   // .cat scroll-margin-top clears the topbar
    });

    document.getElementById('formAddCat').addEventListener('submit', e => {
      e.preventDefault();
      const inp = document.getElementById('inpNewCat');
      if (DB.addCategory(inp.value)) { inp.value = ''; render(); }
    });

    document.getElementById('vocabBody').addEventListener('click', e => {
      const add    = e.target.closest('[data-add]');
      const edit   = e.target.closest('[data-edit]');
      const rename = e.target.closest('[data-rename]');
      const detail = e.target.closest('[data-detail]');
      if (add)    return openAdd(add.dataset.add);
      if (edit)   return openEdit(edit.dataset.edit);
      if (rename) return startRename(rename.dataset.rename, rename.closest('.cat__head'));
      if (detail) return openDetail(detail.dataset.detail);
    });

    document.getElementById('formWord').addEventListener('submit', submitWord);
    document.getElementById('btnCancelWord').addEventListener('click', closeModal);
    document.getElementById('btnDeleteWord').addEventListener('click', removeWord);
    document.getElementById('wPos').addEventListener('change', syncVerbClassVisibility);

    document.getElementById('btnCloseDetail').addEventListener('click', closeDetail);
    document.getElementById('detailBody').addEventListener('click', e => {
      if (e.target.closest('[data-draw]')) { closeDetail(); Router.go('kanji'); }
    });

    [document.getElementById('modalWord'), document.getElementById('modalDetail')]
      .forEach(m => m.addEventListener('click', e => { if (e.target === m) m.hidden = true; }));
  }

  return { render, bind, openAddWithText };
})();

/* ============================================================
   GRAMMAR TAB
   Two panes: Reference (the built-in 35-rule rulebook from
   js/grammar-rules.js, browsable/study content — never edited by
   the user) and My notes (free-text entries the user adds, stored
   via DB.addGrammarEntry etc.). Same shape as Vocab's TOC + card
   list, reused deliberately for a familiar browsing pattern.

   NOT wired to the sentence checker (step 5) — this is display and
   CRUD only. Per build-spec-coarse.md §2/§3.0, the checker enforces
   a coarser structural subset than this reference shows; the two
   are intentionally different granularities.
   ============================================================ */
const Grammar = (() => {

  const esc = s => (s || '').replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const t = (k, ...a) => I18N.t(k, ...a);
  const el = id => document.getElementById(id);

  let tab = 'learn';   // 'learn' | 'reference' | 'mine'

  /* ---- Learn pane (js/grammar-lessons.js) --------------------
     The default. The Rules pane below it is unchanged and still canonical —
     it is simply no longer the first thing a beginner meets, because it
     opens with a rule ID and a bracket notation and expects a legend to
     have been read first. */
  function exampleHTML(ex) {
    const parts = (ex.parts || []).map(([chunk, gloss]) =>
      `<span class="glossbox">
         <span class="glossbox__jp jp">${esc(chunk)}</span>
         <span class="glossbox__en">${esc(gloss)}</span>
       </span>`).join('');
    return `<div class="lesson-ex">
      <div class="lesson-ex__jp jp">${esc(ex.jp)}</div>
      ${ex.reading ? `<div class="lesson-ex__reading jp">${esc(ex.reading)}</div>` : ''}
      <div class="lesson-ex__gloss">${parts}</div>
      <div class="lesson-ex__en">${esc(ex.en)}</div>
    </div>`;
  }

  function lessonHTML(it) {
    return `<article class="lesson">
      <header class="lesson__head">
        <span class="lesson__particle jp">${esc(it.particle)}</span>
        <span class="lesson__job">${esc(it.job)}${it.say ? ` <em>(${esc(it.say)})</em>` : ''}</span>
      </header>
      <p class="lesson__plain">${esc(it.plain)}</p>
      ${(it.examples || []).map(exampleHTML).join('')}
      ${it.watch ? `<div class="lesson__watch"><strong>${esc(t('grammar.watch'))}</strong> ${esc(it.watch)}</div>` : ''}
    </article>`;
  }

  function renderLearn() {
    const data = window.GRAMMAR_LESSONS || [];
    el('gramLearnToc').innerHTML = data.map((g, i) =>
      `<button type="button" data-jump="lesson-${i}">${esc(g.items.map(x => x.particle).join(' '))}</button>`).join('');
    el('gramLearnBody').innerHTML = data.map((g, i) => `
      <section class="lesson-stage" id="lesson-${i}">
        <h2 class="lesson-stage__title">${esc(g.stage)}</h2>
        <p class="lesson-stage__blurb">${esc(g.blurb)}</p>
        ${g.items.map(lessonHTML).join('')}
      </section>`).join('');
  }

  // ---- Reference pane ---------------------------------------
  function renderLegend() {
    el('gramLegendBody').innerHTML = GRAMMAR_LEGEND.map(([sym, mean]) =>
      `<div class="gram-legend__row"><code>${esc(sym)}</code><span>${esc(mean)}</span></div>`
    ).join('');
  }

  function ruleHTML(r) {
    const finalTag = r.kind === 'final'
      ? `<span class="gram-rule__final">${esc(t('grammar.final'))}</span>` : '';
    const examples = (r.examples || []).filter(e => e.jp).map(e => `
      <div class="gram-example">
        <div class="gram-example__jp jp">${esc(e.jp)}</div>
        ${e.breakdown ? `<div class="gram-example__breakdown jp">${esc(e.breakdown)}</div>` : ''}
      </div>`).join('');
    return `<div class="gram-rule">
      <div class="gram-rule__head">
        <span class="gram-rule__id">${esc(r.id)}</span>${finalTag}
      </div>
      <div class="gram-rule__pattern jp">${esc(r.pattern)}</div>
      ${r.gloss ? `<div class="gram-rule__gloss">${esc(r.gloss)}</div>` : ''}
      ${examples}
    </div>`;
  }

  function showTab(which) {
    tab = which;
    el('gramLearn').classList.toggle('seg--on', which === 'learn');
    el('gramRef').classList.toggle('seg--on', which === 'reference');
    el('gramMine').classList.toggle('seg--on', which === 'mine');
    el('gramLearnView').hidden = which !== 'learn';
    el('gramRefView').hidden   = which !== 'reference';
    el('gramMineView').hidden  = which !== 'mine';
    if (which === 'learn') renderLearn();
    else if (which === 'reference') { renderLegend(); renderReference(); }
    else renderMine();
  }

  function renderReference() {
    // Buttons, not <a href="#gram-N"> — fragment anchors push a null-state
    // history entry (Back drops to hub) and the WebView intercepts the href as
    // a navigation to the site root. Programmatic scroll wired in bind().
    el('gramToc').innerHTML = GRAMMAR_RULES.map((g, i) =>
      `<button type="button" data-jump="gram-${i}">${esc(g.particle)}</button>`).join('');
    el('gramRefBody').innerHTML = GRAMMAR_RULES.map((g, i) => {
      const callout = g.callout ? `<div class="gram-callout">${esc(g.callout)}</div>` : '';
      const rules = g.rules.map(ruleHTML).join('');
      const notes = (g.groupNotes && g.groupNotes.length)
        ? `<ul class="gram-notes">${g.groupNotes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : '';
      return `<section class="gram-group" id="gram-${i}">
        <h2 class="gram-group__title jp">${esc(g.title)}</h2>
        ${callout}${rules}${notes}
      </section>`;
    }).join('');
  }

  // ---- My notes pane -----------------------------------------
  function renderMine() {
    const entries = DB.grammarEntries();
    el('gramMineList').innerHTML = entries.length ? entries.map(g => `
      <div class="gram-mine-card">
        <div class="gram-mine-card__name">${esc(g.pattern_name)}</div>
        ${g.structure ? `<div class="gram-mine-card__structure jp">${esc(g.structure)}</div>` : ''}
        ${g.example ? `<div class="gram-mine-card__example jp">${esc(g.example)}</div>` : ''}
        ${g.note ? `<div class="gram-mine-card__note">${esc(g.note)}</div>` : ''}
        <div class="gram-mine-card__actions">
          <button class="tool-btn tool-btn--ghost" data-edit="${g.id}">${esc(t('grammar.edit'))}</button>
        </div>
      </div>`).join('') : `<p class="stub">${esc(t('grammar.mineEmpty'))}</p>`;
  }

  // ---- pane switch --------------------------------------------
  function render() { showTab(tab); }

  // ---- add/edit modal ------------------------------------------
  const $ = id => document.getElementById(id);

  function openAdd() {
    $('modalGrammarTitle').textContent = t('grammar.newTitle');
    $('gId').value = ''; $('gName').value = ''; $('gStructure').value = '';
    $('gExample').value = ''; $('gNote').value = '';
    $('btnDeleteGrammar').hidden = true;
    $('modalGrammar').hidden = false;
    $('gName').focus();
  }

  function openEdit(id) {
    const g = DB.getGrammarEntry(id);
    if (!g) return;
    $('modalGrammarTitle').textContent = t('grammar.editTitle');
    $('gId').value = g.id;
    $('gName').value = g.pattern_name;
    $('gStructure').value = g.structure;
    $('gExample').value = g.example;
    $('gNote').value = g.note;
    $('btnDeleteGrammar').hidden = false;
    $('modalGrammar').hidden = false;
  }

  function closeModal() { $('modalGrammar').hidden = true; }

  function submit(e) {
    e.preventDefault();
    const id = $('gId').value;
    const data = {
      pattern_name: $('gName').value,
      structure: $('gStructure').value,
      example: $('gExample').value,
      note: $('gNote').value
    };
    if (!data.pattern_name) return;
    if (id) DB.updateGrammarEntry(id, data);
    else    DB.addGrammarEntry(data);
    closeModal();
    renderMine();
  }

  function remove() {
    const id = $('gId').value;
    if (!id) return;
    if (!confirm(t('grammar.deleteConfirm'))) return;
    DB.deleteGrammarEntry(id);
    closeModal();
    renderMine();
  }

  /* ---------- bind ---------- */
  function bind() {
    // Reference TOC jump — programmatic scroll (see renderReference). #gramToc
    // is stable, bind once.
    el('gramToc').addEventListener('click', e => {
      const b = e.target.closest('[data-jump]');
      if (!b) return;
      const sec = document.getElementById(b.dataset.jump);
      if (sec) sec.scrollIntoView({ block: 'start' });
    });
    el('gramLearn').addEventListener('click', () => showTab('learn'));
    el('gramRef').addEventListener('click', () => showTab('reference'));
    el('gramMine').addEventListener('click', () => showTab('mine'));
    // Same delegated data-jump scroll the Rules TOC uses — never href="#id",
    // which pushes a null-state history entry and drops Back to the hub.
    el('gramLearnToc').addEventListener('click', e => {
      const b = e.target.closest('[data-jump]');
      if (!b) return;
      const target = document.getElementById(b.dataset.jump);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    el('gramLegendToggle').addEventListener('click', () => {
      el('gramLegendBody').hidden = !el('gramLegendBody').hidden;
    });
    el('btnAddGrammar').addEventListener('click', openAdd);
    el('gramMineList').addEventListener('click', e => {
      const b = e.target.closest('[data-edit]');
      if (b) openEdit(b.dataset.edit);
    });
    el('formGrammar').addEventListener('submit', submit);
    el('btnCancelGrammar').addEventListener('click', closeModal);
    el('btnDeleteGrammar').addEventListener('click', remove);
    el('modalGrammar').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
  }

  return { render, bind };
})();

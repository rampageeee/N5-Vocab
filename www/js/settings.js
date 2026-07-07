/* ============================================================
   SETTINGS
   Theme (dark switch), colour palette, category deletion
   (cascade + confirm), export/import backup.
   applyAppearance() is the single place theme+palette hit the DOM.
   ============================================================ */
const Settings = (() => {

  const esc = s => (s || '').replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const el = id => document.getElementById(id);

  // Swatch preview hexes (light variants) for the palette cards.
  const PALETTES = [
    { id: 'summer', name: 'Lato',    hex: ['#601118', '#304034', '#5f1132'] },
    { id: 'winter', name: 'Zima',    hex: ['#1a3956', '#313a3f', '#5c4114'] },
    { id: 'fall',   name: 'Jesień',  hex: ['#2e2749', '#494627', '#494627'] },
    { id: 'spring', name: 'Wiosna',  hex: ['#403035', '#313f33', '#30403c'] },
    { id: 'geisha', name: 'Gejsza',  hex: ['#601010', '#303040', '#4a2e27'] }
  ];

  // ---- appearance to DOM -----------------------------------
  function applyAppearance() {
    const t = DB.getTheme();
    document.body.setAttribute('data-theme', t);
    document.body.setAttribute('data-palette', DB.getPalette());
    document.querySelector('meta[name="theme-color"]')
      .setAttribute('content', t === 'dark' ? '#17161a' : '#f7f5f2');
  }

  // ---- render ----------------------------------------------
  function render() {
    el('setDark').checked = DB.getTheme() === 'dark';
    el('setTolerance').value = DB.getTolerance();
    renderPalettes();
    renderCategories();
  }

  function renderPalettes() {
    const active = DB.getPalette();
    el('paletteGrid').innerHTML = PALETTES.map(p => `
      <button class="palette-card ${p.id === active ? 'is-active' : ''}" data-palette="${p.id}">
        <div class="palette-card__name">${p.name}</div>
        <div class="palette-swatches">
          ${p.hex.map(h => `<span style="background:${h}"></span>`).join('')}
        </div>
      </button>`).join('');
  }

  function renderCategories() {
    const cats = DB.categories();
    el('catManage').innerHTML = cats.length
      ? cats.map(c => {
          const n = DB.countInCategory(c);
          return `<div class="cat-manage__row">
            <span class="cat-manage__name">${esc(c)} <small style="color:var(--text-dim)">(${n})</small></span>
            <button class="cat-manage__del" data-delcat="${esc(c)}" aria-label="Usuń">🗑</button>
          </div>`;
        }).join('')
      : '<p class="stub">Brak kategorii.</p>';
  }

  // ---- actions ---------------------------------------------
  function toggleDark(e) {
    DB.setTheme(e.target.checked ? 'dark' : 'light');
    applyAppearance();
  }

  function pickPalette(id) {
    DB.setPalette(id);
    applyAppearance();
    renderPalettes();
  }

  function deleteCat(name) {
    const n = DB.countInCategory(name);
    const msg = n > 0
      ? `Usunąć kategorię „${name}" wraz z ${n} słowami? Tego nie można cofnąć.`
      : `Usunąć pustą kategorię „${name}"?`;
    if (!confirm(msg)) return;
    DB.deleteCategory(name);
    renderCategories();
  }

  // ---- export / import -------------------------------------
  function exportData() {
    const blob = new Blob([DB.exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `n5-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    DB.markExport();
    if (window.App) App.refreshExportStatus();
  }

  function importData(file) {
    if (!file) return;
    if (!confirm('Import nadpisze wszystkie obecne dane. Kontynuować?')) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        DB.importJSON(r.result);
        applyAppearance();
        render();
        if (window.App) App.refreshExportStatus();
        alert('Zaimportowano.');
      } catch (err) { alert('Błąd importu: ' + err.message); }
    };
    r.readAsText(file);
  }

  // ---- bind ------------------------------------------------
  function bind() {
    el('setDark').addEventListener('change', toggleDark);
    el('setTolerance').addEventListener('change', e => DB.setTolerance(e.target.value));
    el('paletteGrid').addEventListener('click', e => {
      const b = e.target.closest('[data-palette]');
      if (b) pickPalette(b.dataset.palette);
    });
    el('catManage').addEventListener('click', e => {
      const b = e.target.closest('[data-delcat]');
      if (b) deleteCat(b.dataset.delcat);
    });
    el('btnExport').addEventListener('click', exportData);
    el('btnImport').addEventListener('click', () => el('fileImport').click());
    el('fileImport').addEventListener('change', e => {
      importData(e.target.files[0]); e.target.value = '';
    });
  }

  return { render, bind, applyAppearance };
})();

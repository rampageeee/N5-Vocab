/* ============================================================
   SETTINGS
   Theme, language, colour palette, statistics, category
   deletion, backup. PALETTES here is now the SINGLE source of
   truth for colour — applyAppearance() injects the active triad
   as CSS custom properties at runtime, and the swatch previews
   read the same map, so preview and applied colour can no longer
   drift (the old CSS [data-palette] blocks are gone).
   ============================================================ */
const Settings = (() => {

  const esc = s => (s || '').replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const t = (k, ...a) => I18N.t(k, ...a);
  const el = id => document.getElementById(id);

  // Each palette: a light + a dark triad {kanji, reading, trans}. Light
  // triads re-derived for real contrast AND three-way hue separation on
  // the #f7f5f2 ground (the old ones all collapsed to near-black). Dark
  // triads carried over — they read well already.
  const PALETTES = {
    summer: { key: 'pal.summer',
      light: { kanji: '#a8243a', reading: '#4d7057', trans: '#b0316f' },
      dark:  { kanji: '#e1515e', reading: '#8ba792', trans: '#e05293' } },
    winter: { key: 'pal.winter',
      light: { kanji: '#1c5a92', reading: '#4a5a63', trans: '#9a6a12' },
      dark:  { kanji: '#639bcf', reading: '#8d9da5', trans: '#dba957' } },
    fall:   { key: 'pal.fall',
      light: { kanji: '#5a3a8a', reading: '#6a6033', trans: '#8a5a2a' },
      dark:  { kanji: '#867ab8', reading: '#b8b17a', trans: '#b8b17a' } },
    spring: { key: 'pal.spring',
      light: { kanji: '#8a3a5a', reading: '#3f6a4a', trans: '#2a6a6a' },
      dark:  { kanji: '#a88a94', reading: '#8da58f', trans: '#8aa8a1' } },
    geisha: { key: 'pal.geisha',
      light: { kanji: '#a81f2a', reading: '#4a4a6a', trans: '#8a4a3a' },
      dark:  { kanji: '#e25050', reading: '#8a8aa8', trans: '#b98779' } }
  };
  const ORDER = ['summer', 'winter', 'fall', 'spring', 'geisha'];

  // ---- appearance to DOM -----------------------------------
  function applyAppearance() {
    const theme = DB.getTheme();
    document.body.setAttribute('data-theme', theme);
    const pal = PALETTES[DB.getPalette()] || PALETTES.summer;
    const triad = pal[theme] || pal.light;
    // Inject onto the SAME element that carries data-theme (body). Injecting on
    // <html> lets the [data-theme] rule that lands on <body> re-declare these
    // three vars and shadow the injection for body's whole subtree.
    const root = document.body;
    root.style.setProperty('--kanji', triad.kanji);
    root.style.setProperty('--reading', triad.reading);
    root.style.setProperty('--trans', triad.trans);
    document.querySelector('meta[name="theme-color"]')
      .setAttribute('content', theme === 'dark' ? '#17161a' : '#f7f5f2');
  }

  // ---- render ----------------------------------------------
  function render() {
    el('setDark').checked = DB.getTheme() === 'dark';
    el('setLang').value = DB.getLocale();
    el('setTolerance').value = DB.getTolerance();
    renderPalettes();
    renderStats();
    renderCategories();
    renderBackup();
  }

  function renderPalettes() {
    const active = DB.getPalette();
    el('paletteGrid').innerHTML = ORDER.map(id => {
      const p = PALETTES[id];
      const sw = [p.light.kanji, p.light.reading, p.light.trans];
      return `<button class="palette-card ${id === active ? 'is-active' : ''}" data-palette="${id}">
        <div class="palette-card__name">${esc(t(p.key))}</div>
        <div class="palette-swatches">${sw.map(h => `<span style="background:${h}"></span>`).join('')}</div>
      </button>`;
    }).join('');
  }

  function renderStats() {
    const s = DB.stats();
    el('statCats').textContent = s.categories;
    el('statWords').textContent = s.words;
    el('statMastered').textContent = s.mastered;
  }

  function renderCategories() {
    const cats = DB.categories();
    el('catManage').innerHTML = cats.length
      ? cats.map(c => {
          const n = DB.countInCategory(c);
          return `<div class="cat-manage__row">
            <span class="cat-manage__name">${esc(c)} <small style="color:var(--text-dim)">(${n})</small></span>
            <button class="cat-manage__del" data-delcat="${esc(c)}" aria-label="🗑">🗑</button>
          </div>`;
        }).join('')
      : `<p class="stub">${esc(t('settings.emptyCats'))}</p>`;
  }

  function renderBackup() {
    const iso = DB.lastExport();
    const node = el('setBackupStatus');
    if (!node) return;
    if (!iso) { node.textContent = t('backup.none'); return; }
    const days = Math.floor((Date.now() - new Date(iso)) / 86400000);
    node.textContent = days === 0 ? t('backup.today') : t('backup.daysAgo', days);
  }

  // ---- actions ---------------------------------------------
  function toggleDark(e) {
    DB.setTheme(e.target.checked ? 'dark' : 'light');
    applyAppearance();
  }

  function changeLang(e) {
    DB.setLocale(e.target.value);
    I18N.applyStatic(document);   // relabel all static chrome + hub tiles
    render();                     // re-render settings (dynamic strings)
    // Other views regenerate their dynamic strings on next entry.
  }

  function pickPalette(id) {
    DB.setPalette(id);
    applyAppearance();
    renderPalettes();
  }

  function deleteCat(name) {
    const n = DB.countInCategory(name);
    const msg = n > 0 ? t('cat.deleteWithWords', name, n) : t('cat.deleteEmpty', name);
    if (!confirm(msg)) return;
    DB.deleteCategory(name);
    renderStats();
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
    renderBackup();
  }

  function importData(file) {
    if (!file) return;
    if (!confirm(t('import.confirm'))) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        DB.importJSON(r.result);
        applyAppearance();
        I18N.applyStatic(document);
        render();
        alert(t('import.done'));
      } catch (err) { alert(t('import.error', err.message)); }
    };
    r.readAsText(file);
  }

  // ---- bind ------------------------------------------------
  function bind() {
    el('setDark').addEventListener('change', toggleDark);
    el('setLang').addEventListener('change', changeLang);
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
    el('fileImport').addEventListener('change', e => { importData(e.target.files[0]); e.target.value = ''; });
  }

  return { render, bind, applyAppearance };
})();

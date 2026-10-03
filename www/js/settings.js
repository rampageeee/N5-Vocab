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

  /* ---- verb-class audit -------------------------------------
     Shown ONLY when there's something to decide. Deliberately jargon-free:
     the two options are labelled with the forms they would actually produce,
     not with "godan" / "ichidan". Whoever answers has to recognise correct
     Japanese, not know a grammar term or trust that the app applied it right.
     The class name rides along dimmed, for reference, never as the question. */
  const AUDIT_FORMS = ['masu', 'ta', 'te'];   // ます / past / て — enough to tell the classes apart

  function formStrip(w, cls) {
    const f = DB.previewForms(w, cls);
    return AUDIT_FORMS.map(k => f[k]).filter(Boolean);
  }

  function auditCard(w) {
    const key = DB.inflectionKey(w);
    const head = `<div class="audit__word">
        <span class="audit__kanji">${esc(w.kanji || w.reading)}</span>
        <span class="audit__reading">${esc(w.kanji ? w.reading : '')}</span>
        <span class="audit__trans">${esc(w.translation)}</span>
      </div>`;

    // No inflectable ending in either field — nothing to offer a choice
    // between. Needs the okurigana typed in, not a decision.
    if (DB.verbAudit(w).state === 'unusable') {
      return `<div class="audit__card audit__card--broken">${head}
        <div class="audit__broken">${esc(t('audit.unusable'))}</div></div>`;
    }

    const opt = cls => {
      const forms = formStrip(w, cls);
      if (!forms.length) return '';
      return `<button class="audit__opt" data-audit="${w.id}" data-cls="${cls}">
          <span class="audit__forms">${forms.map(f => `<span>${esc(f)}</span>`).join('')}</span>
          <span class="audit__cls">${esc(t('vclass.' + (cls === 'godan' ? 'godan' : 'ichidan')))}</span>
        </button>`;
    };
    return `<div class="audit__card">${head}
      <div class="audit__q">${esc(t('audit.which'))}</div>
      <div class="audit__opts">${opt('ichidan')}${opt('godan')}</div></div>`;
  }

  function renderAudit() {
    const group = el('verbAuditGroup');
    if (!group) return;
    const pending = DB.verbsNeedingAudit();
    group.hidden = pending.length === 0;
    if (!pending.length) return;
    group.querySelector('.audit__intro').textContent = t('audit.intro', pending.length);
    el('verbAuditList').innerHTML = pending.map(auditCard).join('');
  }

  // ---- render ----------------------------------------------
  function render() {
    renderStorage();
    renderAudit();
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
            <span class="cat-manage__name">${esc(c)} <small style="color:var(--text-dim)">(${n})</small>
              <span class="star p ${DB.categoryStar(c) ? 'star--on' : ''}">★</span></span>
            <button class="cat-manage__del" data-delcat="${esc(c)}" aria-label="🗑">🗑</button>
          </div>`;
        }).join('')
      : `<p class="stub">${esc(t('settings.emptyCats'))}</p>`;
  }

  function renderStorage() {
    const status = DB.storageStatus(), node = el('storageStatus');
    if (node) {
      node.hidden = !status.error;
      node.textContent = status.error ? t(status.locked ? 'storage.loadFailed' : 'storage.saveFailed', status.error) : '';
    }
    if (el('btnRecovery')) { el('btnRecovery').hidden = !status.recoverable; el('btnRecovery').textContent = t('storage.recovery'); }
    if (el('btnRetrySave')) { el('btnRetrySave').hidden = !status.error || status.locked; el('btnRetrySave').textContent = t('storage.retry'); }
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

  /* ---- export ------------------------------------------------
     `a.download` + a blob: URL is a BROWSER mechanism. An Android
     WebView has no download manager wired to it, so inside the APK
     a.click() did nothing at all — silently. Worse, markExport() ran
     regardless, so the "last backup" line in Settings updated and
     reported a backup that did not exist.

     Native export now does TWO things, in this order:

       1. Writes a permanent local copy to the public Documents
          folder. This is the actual backup — it survives uninstall,
          it is visible in any file manager, and it needs no cloud
          account. On Android 11+ an app may write to Documents for
          files it created itself, so no runtime permission is asked.
          Android 10 needs android:requestLegacyExternalStorage="true"
          on the <application> tag in AndroidManifest.xml; without it
          this write fails and the share sheet carries the export on
          its own.

       2. Writes a second copy to cache and opens the share sheet.
          The cache copy exists because Share hands the file to
          another app through the FileProvider, whose configured
          paths cover app storage — a public Documents URI is
          outside them and would throw.

     No clipboard fallback. navigator.clipboard.writeText on a
     multi-megabyte string in an Android WebView can hang without
     ever rejecting, which froze the app on a button whose entire
     job is to be trustworthy. A backup that reports failure is
     strictly better than one that hangs.

     Requires:  npm i @capacitor/filesystem @capacitor/share
                npx cap sync

     Honesty note: Android does not reliably report share-sheet
     cancellation — Share.share() can resolve normally when the user
     backs out. So markExport() is driven by the LOCAL write, which
     is verifiable, and only falls back to the share result when the
     local write failed. */
  function backupName() {
    return `n5-backup-${new Date().toISOString().slice(0, 10)}.json`;
  }

  async function exportedOK() {
    DB.markExport();
    await DB.flush();
    renderBackup();
    App.refreshExportStatus();
  }

  async function exportNative(json, name, FS, Share) {
    let localUri = null, localErr = null;
    try {
      const r = await FS.writeFile({
        path: name, data: json, directory: 'DOCUMENTS', encoding: 'utf8'
      });
      localUri = r.uri;
    } catch (e) {
      localErr = e && e.message ? e.message : String(e);
    }

    let shareUri = null;
    try {
      const c = await FS.writeFile({
        path: name, data: json, directory: 'CACHE', encoding: 'utf8'
      });
      shareUri = c.uri;
    } catch { /* share is the optional half — a local copy alone is a backup */ }

    if (localUri) await exportedOK();

    if (shareUri && Share && typeof Share.share === 'function') {
      try {
        await Share.share({ title: name, files: [shareUri], dialogTitle: t('export.share') });
        // A resolved share sheet does not prove that the recipient saved it.
      } catch { /* user dismissed, or no target app — the local copy still stands */ }
    }

    if (localUri) alert(t('export.savedLocal', 'Documents/' + name));
    else if (shareUri) alert(t('export.localFailed', localErr || ''));
    else throw new Error(localErr || 'write failed');
  }

  function exportWeb(json, name) {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    // Browser download completion is not observable; do not stamp a saved backup.
    alert(t('export.downloadStarted'));
  }

  async function exportData() {
    const json = DB.exportJSON();
    const name = backupName();
    const P = (window.Capacitor && window.Capacitor.Plugins) || {};
    const native = !!(window.Capacitor && window.Capacitor.isNativePlatform
      && window.Capacitor.isNativePlatform());

    try {
      if (native && P.Filesystem) await exportNative(json, name, P.Filesystem, P.Share);
      else if (!native) exportWeb(json, name);
      else throw new Error('Filesystem plugin not installed');
    } catch (err) {
      alert(t('export.error', err && err.message ? err.message : String(err)));
    }
  }

  function importData(file) {
    if (!file) return;
    if (!confirm(t('import.confirm'))) return;
    const r = new FileReader();
    r.onload = async () => {
      try {
        await DB.importJSON(r.result);
        applyAppearance();
        I18N.applyStatic(document);
        render();
        alert(t('import.done'));
      } catch (err) { alert(t('import.error', err.message)); }
    };
    r.onerror = () => alert(t('import.error', r.error?.message || 'File could not be read'));
    r.readAsText(file);
  }

  // ---- bind ------------------------------------------------
  function bind() {
    el('setDark').addEventListener('change', toggleDark);
    el('setLang').addEventListener('change', changeLang);
    el('setPreviewMotion').addEventListener('click', () => {
      const off = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el('setMotionStatus').hidden = !off;
      if (off) el('setMotionStatus').textContent = t('settings.motionOff');
      else if (window.Celebrate) Celebrate.fire('gold');
    });
    el('setTolerance').addEventListener('change', e => DB.setTolerance(e.target.value));
    el('paletteGrid').addEventListener('click', e => {
      const b = e.target.closest('[data-palette]');
      if (b) pickPalette(b.dataset.palette);
    });
    el('verbAuditList').addEventListener('click', e => {
      const b = e.target.closest('[data-audit]');
      if (!b) return;
      DB.setVerbClass(b.dataset.audit, b.dataset.cls);
      renderAudit();     // decided words drop out of the list immediately
      renderStats();
    });
    el('catManage').addEventListener('click', e => {
      const b = e.target.closest('[data-delcat]');
      if (b) deleteCat(b.dataset.delcat);
    });
    window.addEventListener('n5-storage', renderStorage);
    renderStorage();
    el('btnRetrySave').addEventListener('click', async () => {
      try { await DB.retrySave(); renderStorage(); } catch (error) { alert(error.message); }
    });
    el('btnRecovery').addEventListener('click', async () => {
      const raw = DB.recoveryData();
      if (raw == null) return;
      const P = window.Capacitor?.Plugins || {};
      try {
        if (window.Capacitor?.isNativePlatform?.()) {
          const result = await P.Filesystem.writeFile({ path: 'n5-recovery.json', data: raw, directory: 'DOCUMENTS', encoding: 'utf8' });
          if (!result.uri) throw new Error('No saved file URI');
          alert(t('export.savedLocal', 'Documents/n5-recovery.json'));
        } else exportWeb(raw, 'n5-recovery.json');
      } catch (error) { alert(t('export.error', error.message)); }
    });
    el('btnExport').addEventListener('click', exportData);
    el('btnImport').addEventListener('click', () => el('fileImport').click());
    el('fileImport').addEventListener('change', e => { importData(e.target.files[0]); e.target.value = ''; });
  }

  return { render, bind, applyAppearance };
})();

/* Same const-vs-window issue as DB (see end of data.js): main.js probes
   `window.Settings` before nudging the backup status line. */
window.Settings = Settings;

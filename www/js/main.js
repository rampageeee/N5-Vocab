/* ============================================================
   MAIN
   Boot: appearance, routing, hub wiring, export reminder.
   Theme + palette + export/import now live in Settings module.
   ============================================================ */
const App = (() => {

  // ---- export reminder (topbar) ----------------------------
  function refreshExportStatus() {
    const el = document.getElementById('exportStatus');
    const iso = DB.lastExport();
    if (!iso) { el.textContent = 'Brak kopii'; el.classList.add('export-status--warn'); return; }
    const days = Math.floor((Date.now() - new Date(iso)) / 86400000);
    el.textContent = days === 0 ? 'Kopia: dziś' : `Kopia: ${days} dni temu`;
    el.classList.toggle('export-status--warn', days >= 3);
  }

  function init() {
    try {
      Settings.applyAppearance();

      document.querySelectorAll('[data-goto]').forEach(function (btn) {
        btn.addEventListener('click', function () { Router.go(btn.dataset.goto); });
      });
      document.getElementById('btnHome').addEventListener('click', function () { Router.go('hub'); });
      document.getElementById('btnSettings').addEventListener('click', function () { Router.go('settings'); });

      Vocab.bind();
      Flash.bind();
      Kanji.bind();
      Settings.bind();

      Router.register('hub',        refreshExportStatus);
      Router.register('vocabulary', function () { Vocab.render(); });
      Router.register('flashcards', function () { Flash.render(); });
      Router.register('kanji',      function () { Kanji.render(); });
      Router.register('settings',   function () { Settings.render(); });

      refreshExportStatus();
      Router.go('hub');
    } catch (err) {
      // Surface it on-screen (phone-friendly) instead of a mute failure.
      throw new Error('init failed: ' + err.message + ' — check that all js/ files loaded');
    }
  }

  return { init, refreshExportStatus };
})();

App.init();

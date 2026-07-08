/* ============================================================
   MAIN
   Boot: appearance, i18n static pass, hub wiring, routing with
   history. The backup reminder moved OUT of the top bar into the
   Settings backup group; refreshExportStatus just nudges that
   element when it exists.
   ============================================================ */
const App = (() => {

  function refreshExportStatus() {
    // The status line now lives in Settings; update it if Settings has rendered.
    if (window.Settings && typeof Settings.render === 'function') {
      const node = document.getElementById('setBackupStatus');
      if (node && !document.getElementById('view-settings').classList.contains('view--active')) return;
      Settings.render();
    }
  }

  async function init() {
    try {
      await DB.hydrate();           // pull persisted state (native Preferences / localStorage) BEFORE any read
      Settings.applyAppearance();
      I18N.applyStatic(document);   // localise all static chrome before first paint of dynamic views

      document.querySelectorAll('[data-goto]').forEach(function (btn) {
        btn.addEventListener('click', function () { Router.go(btn.dataset.goto); });
      });
      document.getElementById('btnHome').addEventListener('click', function () { Router.go('hub'); });
      document.getElementById('btnSettings').addEventListener('click', function () { Router.go('settings'); });

      Vocab.bind();
      Flash.bind();
      Kanji.bind();
      Kana.bind();
      Grammar.bind();
      Sentences.bind();
      Review.bind();
      Settings.bind();

      Router.register('hub',        function () {});
      Router.register('vocabulary', function () { Vocab.render(); });
      Router.register('flashcards', function () { Flash.render(); });
      Router.register('kanji',      function () { Kanji.render(); });
      Router.register('kana',       function () { Kana.render(); });
      Router.register('grammar',    function () { Grammar.render(); });
      Router.register('sentences',  function () { Sentences.render(); });
      Router.register('review',     function () { Review.render(); });
      Router.register('settings',   function () { Settings.render(); });

      Router.init();   // establishes hub base entry + renders hub
    } catch (err) {
      throw new Error('init failed: ' + err.message + ' — check that all js/ files loaded');
    }
  }

  return { init, refreshExportStatus };
})();

App.init();

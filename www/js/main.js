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

  /* ---- Android hardware Back ---------------------------------
     Without an explicit 'backButton' listener Capacitor falls through to its
     own default, which on a single-page app that never changes URL reads as
     "nothing to go back to" and finishes the Activity — i.e. Back drops
     straight out of the app instead of stepping up the view stack.
     Registering a listener takes ownership of the key; we then unwind in the
     same order the UI stacked things up:
       open modal → drawing canvas → non-hub view → exit.
     history.back() (not Router.go) so the pushState stack stays consistent —
     Router's own popstate handler does the actual view swap. Requires
     @capacitor/app: `npm i @capacitor/app && npx cap sync`. No-op on web,
     where the browser's own Back already drives popstate. */
  function closeTopModal() {
    const open = [...document.querySelectorAll('.modal')].filter(m => !m.hidden);
    if (!open.length) return false;
    open[open.length - 1].hidden = true;
    return true;
  }

  function closeDrawing() {
    const kanji = document.getElementById('kanjiDraw');
    if (kanji && !kanji.hidden) { document.getElementById('kdBack').click(); return true; }
    const kana = document.getElementById('kanaDraw');
    if (kana && !kana.hidden) { document.getElementById('knBack').click(); return true; }
    return false;
  }

  function wireHardwareBack() {
    const CapApp = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
    if (!CapApp || typeof CapApp.addListener !== 'function') return;
    CapApp.addListener('backButton', () => {
      if (closeTopModal()) return;
      if (closeDrawing()) return;
      if (Router.current() !== 'hub') { history.back(); return; }
      if (typeof CapApp.exitApp === 'function') CapApp.exitApp();
    });
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
      Drill.bind();
      Review.bind();
      Settings.bind();

      Router.register('hub',        function () {});
      Router.register('vocabulary', function () { Vocab.render(); });
      Router.register('flashcards', function () { Flash.render(); });
      Router.register('kanji',      function () { Kanji.render(); });
      Router.register('kana',       function () { Kana.render(); });
      Router.register('grammar',    function () { Grammar.render(); });
      Router.register('sentences',  function () { Sentences.render(); });
      Router.register('drill',      function () { Drill.render(); });
      Router.register('review',     function () { Review.render(); });
      Router.register('settings',   function () { Settings.render(); });

      Router.init();   // establishes hub base entry + renders hub
      wireHardwareBack();
    } catch (err) {
      throw new Error('init failed: ' + err.message + ' — check that all js/ files loaded');
    }
  }

  return { init, refreshExportStatus };
})();

App.init();

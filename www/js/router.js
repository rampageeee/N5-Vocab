/* ============================================================
   ROUTER
   Instant in-memory navigation, backed by the History API so the
   Android hardware Back button steps back through views instead of
   dropping out of the app. hub is the base entry (replaceState);
   every navigation pushes one entry, so Back walks the view stack
   and finally exits from the hub — standard app behaviour.
   ============================================================ */
const Router = (() => {
  const hooks = {};
  let current = null;

  function register(name, onEnter) { hooks[name] = onEnter; }

  function show(name) {
    if (typeof window.dispatchEvent === 'function') window.dispatchEvent(new CustomEvent('n5-navigation'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('view--active'));
    let el = document.getElementById('view-' + name);
    if (!el) { name = 'hub'; el = document.getElementById('view-hub'); if (!el) return null; }
    el.classList.add('view--active');
    if (window.scrollTo) window.scrollTo(0, 0);
    current = name;
    if (hooks[name]) hooks[name]();
    const heading = el.querySelector('h1');
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    return name;
  }

  function go(name, fromPop) {
    const shown = show(name);
    if (shown == null) return;
    if (!fromPop) history.pushState({ view: shown }, '');
  }

  // Establish hub as the base entry and render it. Called once at boot;
  // main.js must NOT also go('hub') or the base doubles up.
  function init() {
    history.replaceState({ view: 'hub' }, '');
    window.addEventListener('popstate', e => show((e.state && e.state.view) || 'hub'));
    show('hub');
  }

  return { register, go, init, current: () => current };
})();

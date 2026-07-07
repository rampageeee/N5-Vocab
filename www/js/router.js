/* ============================================================
   ROUTER
   Instant navigation: toggles .view--active on section divs.
   No page reload, state stays live in memory (spec: instant nav).
   Views register an optional onEnter hook to (re)render.
   ============================================================ */
const Router = (() => {
  const hooks = {};   // name -> fn run when the view is shown

  function register(name, onEnter) { hooks[name] = onEnter; }

  function go(name) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('view--active'));
    let el = document.getElementById('view-' + name);
    if (!el) {                     // unknown route → hub, but never recurse
      el = document.getElementById('view-hub');
      if (!el) return;             // hub itself missing: give up, don't loop
    }
    el.classList.add('view--active');
    if (window.scrollTo) window.scrollTo(0, 0);
    if (hooks[name]) hooks[name]();
  }

  return { register, go };
})();

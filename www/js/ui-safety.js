/* Shared browser interaction safeguards; no native dependencies. */
const InputSafety = (() => {
  const active = new WeakSet(), ended = new WeakMap();
  function composing(e) {
    return !!(e.isComposing || e.keyCode === 229 || (e.target && active.has(e.target))
      || (e.target && (e.key === 'Enter' || e.type === 'submit') && Date.now() - (ended.get(e.target) || 0) < 80));
  }
  function bind() {
    document.addEventListener('compositionstart', e => active.add(e.target), true);
    document.addEventListener('compositionend', e => { active.delete(e.target); ended.set(e.target, Date.now()); }, true);
    document.addEventListener('keydown', e => {
      // Let the keyboard commit its composition, but do not grade/advance.
      if (e.key === 'Enter' && composing(e)) e.stopImmediatePropagation();
    }, true);
    document.addEventListener('submit', e => {
      if (composing({ ...e, type: 'submit', target: document.activeElement })) {
        e.preventDefault(); e.stopImmediatePropagation();
      }
    }, true);
  }
  return { composing, bind };
})();

const ModalFocus = (() => {
  const sessions = new Map();
  const tabbables = node => [...node.querySelectorAll('button, input, select, textarea, a[href], [tabindex]')]
    .filter(el => !el.disabled && el.type !== 'hidden' && el.tabIndex >= 0 && !el.closest('[hidden]'));
  function open(node) {
    if (sessions.has(node)) return;
    const previous = document.activeElement, siblings = new Map();
    [...document.body.children].filter(el => el !== node && !['SCRIPT','STYLE'].includes(el.tagName)).forEach(el => {
      siblings.set(el, el.inert); el.inert = true;
    });
    sessions.set(node, {previous, siblings});
    node.inert = false; node.hidden = false; node.tabIndex = -1;
    (tabbables(node)[0] || node).focus();
  }
  function close(node) {
    const saved = sessions.get(node); node.hidden = true;
    if (!saved) return;
    saved.siblings.forEach((inert, el) => { el.inert = inert; });
    sessions.delete(node);
    if (saved.previous?.isConnected) saved.previous.focus();
  }
  function bind() {
    document.addEventListener('keydown', e => {
      if (InputSafety.composing(e)) return;
      const open = [...document.querySelectorAll('.modal')].filter(m => !m.hidden);
      const node = open[open.length - 1]; if (!node) return;
      if (e.key === 'Escape') { e.preventDefault(); close(node); }
      if (e.key !== 'Tab') return;
      const items = tabbables(node), at = items.indexOf(document.activeElement);
      if (!items.length) { e.preventDefault(); node.focus(); }
      else if (e.shiftKey && at <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
      else if (!e.shiftKey && (at === items.length - 1 || at < 0)) { e.preventDefault(); items[0].focus(); }
    });
  }
  return { open, close, bind };
})();

const DatasetLoader = (() => {
  const pending = new Map();
  function load(src, ready) {
    if (ready()) return Promise.resolve(true);
    if (pending.has(src)) return pending.get(src);
    const result = new Promise(resolve => {
      const script = document.createElement('script'); script.src = src;
      const finish = ok => { if (!ok) script.remove(); resolve(ok); };
      script.onload = () => finish(!!ready()); script.onerror = () => finish(false);
      document.head.appendChild(script);
    }).then(ok => { pending.delete(src); return ok; });
    pending.set(src, result); return result;
  }
  return { load };
})();

/* One saved example per dictionary word. The bundled Tatoeba bank is loaded
   only when this tab is opened; words outside it can use a custom example. */
const SentencePractice = (() => {
  const el = id => document.getElementById(id);
  const t = (key, ...args) => I18N.t(key, ...args);
  const esc = s => String(s || '').replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clean = s => String(s || '').normalize('NFKC').replace(/[\s。、！？!?.,「」『』]/g, '');
  const head = w => w.kanji || w.reading;
  const PARTICLES = new Set([
    'は', 'が', 'を', 'に', 'へ', 'で', 'と', 'も', 'の', 'や', 'か', 'ね', 'よ', 'から', 'まで',
    'です', 'ですか', 'でした', 'だ', 'だった', 'じゃない', 'ます', 'ません',
    ...(typeof GRAMMAR_RULES === 'undefined' ? [] : GRAMMAR_RULES.flatMap(g => g.particle.split('／')))
  ]);

  let selected = null, category = '__all__', search = '', step = 0;
  let picked = [], chosen = [];
  let bankLoading = null;

  function loadBank() {
    if (window.SENTENCE_BANK && window.SENTENCE_INDEX) return Promise.resolve(true);
    if (bankLoading) return bankLoading;
    bankLoading = new Promise(resolve => {
      const script = document.createElement('script');
      script.src = 'data/sentence-bank.js';
      script.onload = () => resolve(!!(window.SENTENCE_BANK && window.SENTENCE_INDEX));
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
    return bankLoading;
  }

  function candidates(w) {
    if (!window.SENTENCE_INDEX) return [];
    const keys = [...new Set([head(w), w.reading].filter(Boolean))];
    const seen = new Set(), out = [];
    const forms = new Set([head(w), w.reading]);
    if (w.pos !== 'verb' || w.class_confirmed) {
      Object.values(w.forms || {}).forEach(f => { if (f) forms.add(f); });
    }
    if (w.pos === 'na-adj') { forms.add(head(w) + 'な'); forms.add(head(w) + 'に'); }
    if (w.pos === 'i-adj' && head(w).endsWith('い')) forms.add(head(w).slice(0, -1) + 'く');
    keys.forEach(key => (window.SENTENCE_INDEX[key] || []).forEach(index => {
      if (seen.has(index)) return;
      seen.add(index);
      const x = window.SENTENCE_BANK[index];
      const at = x.w.findIndex((lemma, i) => keys.includes(lemma) && forms.has(x.s[i]));
      if (at < 0 || !x.en || x.s.length < 2 || x.s.length > 9 ||
          x.jp.replace(/[\s。、！？!?.,「」『』]/g, '') !== x.s.join('') ||
          !x.jp.includes(x.s[at])) return;
      const score = x.jp.length + x.s.length * 2
        + (DB.getLocale() === 'pl' && x.pl ? -2 : 0);
      out.push({ score, x, target: x.s[at] });
    }));
    return out.sort((a, b) => a.score - b.score || a.x.id - b.x.id);
  }

  function exampleFrom(candidate) {
    const { x, target } = candidate;
    return { id: x.id, jp: x.jp, en: x.en, pl: x.pl,
      surfaces: x.s, lemmas: x.w, target };
  }

  function renderWords() {
    const select = el('spCategory');
    select.innerHTML = `<option value="__all__">${esc(t('flash.allCats'))}</option>`
      + DB.categories().map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
    select.value = category;
    el('spSearch').value = search;
    const words = (category === '__all__' ? DB.allWords() : DB.wordsIn(category))
      .filter(w => !search || [w.kanji, w.reading, w.translation].some(s =>
        String(s || '').toLocaleLowerCase().includes(search.toLocaleLowerCase())));
    el('spWords').innerHTML = words.length ? words.map(w => {
      const done = DB.sentenceProgress(w.id).filter(Boolean).length;
      return `<button type="button" class="sp-word ${w.id === selected ? 'sp-word--selected' : ''}"
          data-sp-word="${esc(w.id)}">
        <span class="jp">${esc(head(w))}</span><span>${esc(w.translation)}</span>
        <span class="sp-word__count">${done}/3 ${done === 3 ? '<span class="star g star--on">★</span>' : ''}</span>
      </button>`;
    }).join('') : `<p class="stub">${esc(t('flash.noWords'))}</p>`;
  }

  function render() {
    renderWords();
    if (selected && DB.getWord(selected)) showSelected();
    else el('spWork').hidden = true;
  }

  async function selectWord(id) {
    selected = id;
    const w = DB.getWord(id);
    if (!w) return;
    el('spWork').hidden = false;
    el('spWork').innerHTML = `<p class="stub">${esc(t('sentence.loading'))}</p>`;
    if (!DB.sentencePractice(id)) {
      await loadBank();
      if (selected !== id || !DB.getWord(id)) return;
      const best = candidates(w)[0];
      if (best) DB.setSentencePractice(id, exampleFrom(best));
    }
    const steps = DB.sentenceProgress(id);
    step = Math.max(0, steps.findIndex(done => !done));
    if (steps.every(Boolean)) step = 2;
    resetAttempt();
    render();
  }

  function resetAttempt() {
    picked = []; chosen = [];
  }

  function translation(p) {
    return DB.getLocale() === 'pl' ? (p.pl || p.en) : (p.en || p.pl);
  }

  function showSelected() {
    const w = DB.getWord(selected), p = DB.sentencePractice(selected);
    if (!w) return;
    const area = el('spWork');
    area.hidden = false;
    if (!p) {
      area.innerHTML = `<h2 class="sp-title">${esc(head(w))} · ${esc(w.translation)}</h2>
        <p>${esc(t('sentence.noExample'))}</p>
        <button class="tool-btn" data-sp-edit>${esc(t('sentence.addExample'))}</button>
        <div id="spEditor"></div>`;
      return;
    }
    const tabs = [0, 1, 2].map(i => `<button type="button" data-sp-step="${i}"
      class="sp-step ${i === step ? 'sp-step--active' : ''}" ${i > 0 && !p.steps[i - 1] ? 'disabled' : ''}>
      ${i + 1}. ${esc(t('sentence.step' + (i + 1)))} ${p.steps[i] ? '✓' : ''}</button>`).join('');
    area.innerHTML = `<div class="sp-head"><h2 class="sp-title">${esc(head(w))} · ${esc(w.translation)}</h2>
      <button class="tool-btn tool-btn--ghost" data-sp-change>${esc(t('sentence.change'))}</button></div>
      <div class="sp-steps">${tabs}</div>
      <div class="sp-translation">${esc(translation(p))}</div>
      <div id="spQuestion"></div><div id="spFeedback" class="fc-feedback" aria-live="polite"></div>
      ${p.id ? `<p class="sp-credit">${esc(t('sentence.source'))} <a href="https://tatoeba.org/en/sentences/show/${encodeURIComponent(p.id)}" target="_blank" rel="noopener">Tatoeba #${esc(p.id)}</a> · CC BY 2.0 FR</p>` : ''}
      <div id="spAlternatives" hidden></div>`;
    drawQuestion(p, w);
  }

  function scrambled(surfaces) {
    const order = surfaces.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    if (order.every((n, i) => n === i) && order.length > 1) [order[0], order[1]] = [order[1], order[0]];
    return order;
  }

  function drawQuestion(p, w) {
    const q = el('spQuestion');
    if (step === 0) {
      q.innerHTML = `<p class="sp-instruction">${esc(t('sentence.formPrompt'))}</p>
        <div class="sp-line jp">${esc(p.jp.replace(p.target, '＿＿＿'))}</div>
        <div class="sp-base">${esc(t('sentence.base'))}: <span class="jp">${esc(head(w))}</span>${w.reading && w.kanji ? ` (${esc(w.reading)})` : ''}</div>
        <div class="fc-answer"><input id="spInput" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="go"
          placeholder="${esc(t('sentence.formPlaceholder'))}"><button class="tool-btn" data-sp-check>${esc(t('checker.check'))}</button></div>`;
    } else if (step === 1) {
      if (!picked.length) picked = scrambled(p.surfaces);
      q.innerHTML = `<p class="sp-instruction">${esc(t('sentence.orderPrompt'))}</p>
        <div class="sp-line jp" id="spBuilt"></div><div class="sp-tiles" id="spTiles"></div>
        <div class="sp-actions"><button class="tool-btn tool-btn--ghost" data-sp-undo>${esc(t('sentence.undo'))}</button>
        <button class="tool-btn" data-sp-check>${esc(t('checker.check'))}</button></div>`;
      drawTiles(p);
    } else {
      const bases = p.baseWords || p.lemmas.filter(x => !PARTICLES.has(x));
      q.innerHTML = `<p class="sp-instruction">${esc(t('sentence.writePrompt'))}</p>
        <div class="sp-base">${esc(t('sentence.baseWords'))}: <span class="jp">${esc(bases.join(' · ') || head(w))}</span></div>
        <textarea id="spInput" rows="2" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"
          placeholder="${esc(t('sentence.writePlaceholder'))}"></textarea>
        <button class="tool-btn" data-sp-check>${esc(t('checker.check'))}</button>`;
    }
  }

  function drawTiles(p) {
    el('spBuilt').innerHTML = chosen.map((index, position) =>
      `<button type="button" class="sp-tile sp-tile--chosen" data-sp-remove="${position}">${esc(p.surfaces[index])}</button>`).join('') || '＿＿＿';
    el('spTiles').innerHTML = picked.filter(index => !chosen.includes(index)).map(index =>
      `<button type="button" class="sp-tile jp" data-sp-pick="${index}">${esc(p.surfaces[index])}</button>`).join('');
  }

  function check() {
    const p = DB.sentencePractice(selected), w = DB.getWord(selected);
    if (!p || !w) return;
    const answer = step === 1 ? chosen.map(i => p.surfaces[i]).join('') : el('spInput').value;
    const expected = step === 0 ? p.target : p.jp;
    const accepted = [expected];
    if (step === 0) {
      if (expected === head(w)) accepted.push(w.reading);
      Object.keys(w.forms || {}).forEach(key => {
        if (w.forms[key] === expected) accepted.push(...DB.acceptedForms(w, key));
      });
    }
    const correct = clean(answer) !== '' && accepted.some(a => clean(answer) === clean(a));
    const fb = el('spFeedback');
    if (!correct) {
      fb.className = 'fc-feedback fc-feedback--bad';
      fb.innerHTML = `${esc(t('sentence.tryAgain'))} <span class="jp">${esc(expected)}</span>`;
      return;
    }
    const hadGold = DB.stars(w).gold, hadCat = DB.categoryStar(w.category);
    DB.completeSentenceStep(selected, step);
    fb.className = 'fc-feedback fc-feedback--ok';
    fb.innerHTML = `${esc(t(step === 2 ? 'sentence.complete' : 'review.correct'))}
      ${step < 2 ? `<button type="button" class="tool-btn" data-sp-next>${esc(t('flash.next'))}</button>` : ''}`;
    // Keep the feedback visible; only update the progress marks in the list.
    renderWords();
    el('spWork').querySelectorAll('[data-sp-step]').forEach((button, i) => {
      button.disabled = i > 0 && !DB.sentenceProgress(selected)[i - 1];
      button.innerHTML = `${i + 1}. ${esc(t('sentence.step' + (i + 1)))} ${DB.sentenceProgress(selected)[i] ? '✓' : ''}`;
    });
    if (!hadGold && DB.stars(DB.getWord(selected)).gold && window.Celebrate) Celebrate.fire('gold');
    if (!hadCat && DB.categoryStar(w.category) && window.Celebrate) {
      setTimeout(() => Celebrate.fire('platinum'), 500);
    }
  }

  async function showAlternatives() {
    const id = selected;
    await loadBank();
    if (id !== selected) return;
    const w = DB.getWord(selected), wrap = el('spAlternatives');
    if (!w || !wrap) return;
    const options = candidates(w).slice(0, 8);
    wrap.hidden = false;
    wrap.innerHTML = `<p>${esc(t('sentence.chooseExample'))}</p>`
      + options.map((c, i) => `<button class="sp-example" data-sp-example="${i}">
          <span class="jp">${esc(c.x.jp)}</span><span>${esc(DB.getLocale() === 'pl' && c.x.pl ? c.x.pl : c.x.en)}</span>
        </button>`).join('')
      + `<button class="tool-btn tool-btn--ghost" data-sp-edit>${esc(t('sentence.custom'))}</button>`;
  }

  function showEditor() {
    const w = DB.getWord(selected), p = DB.sentencePractice(selected);
    const wrap = el('spEditor') || el('spAlternatives');
    if (!w || !wrap) return;
    wrap.hidden = false;
    wrap.innerHTML = `<form id="spEditForm" class="sp-editor">
      <label>${esc(t('sentence.jp'))}<input name="jp" required value="${esc(p?.jp || '')}"></label>
      <label>${esc(t('sentence.en'))}<input name="en" value="${esc(p?.en || '')}"></label>
      <label>${esc(t('sentence.pl'))}<input name="pl" value="${esc(p?.pl || '')}"></label>
      <label>${esc(t('sentence.target'))}<input name="target" required value="${esc(p?.target || head(w))}"></label>
      <label>${esc(t('sentence.baseWordsInput'))}<input name="baseWords" value="${esc((p?.baseWords || p?.lemmas?.filter(x => !PARTICLES.has(x)) || []).join(' '))}"></label>
      <button type="submit" class="tool-btn">${esc(t('word.save'))}</button>
      <span id="spEditError" class="fc-feedback--bad"></span>
    </form>`;
  }

  function segment(text) {
    if (!text) return [];
    if (Intl.Segmenter) return [...new Intl.Segmenter('ja', { granularity: 'word' }).segment(text)]
      .map(s => s.segment).filter(Boolean);
    return [...text];
  }

  function saveCustom(form) {
    const w = DB.getWord(selected);
    if (!w) return;
    const fd = new FormData(form);
    const jp = String(fd.get('jp') || '').trim();
    const en = String(fd.get('en') || '').trim();
    const pl = String(fd.get('pl') || '').trim();
    const target = String(fd.get('target') || '').trim();
    const baseWords = String(fd.get('baseWords') || '').trim().split(/\s+/).filter(Boolean);
    const core = jp.replace(/[\s。、！？!?.,「」『』]/g, '');
    const at = core.indexOf(target);
    if (!target || at < 0 || !(en || pl)) {
      el('spEditError').textContent = t('sentence.invalidExample');
      return;
    }
    const surfaces = [...segment(core.slice(0, at)), target, ...segment(core.slice(at + target.length))];
    const lemmas = surfaces.map(s => s === target ? head(w) : s);
    if (!DB.setSentencePractice(selected, { jp, en, pl, surfaces, lemmas, target,
      baseWords: baseWords.length ? baseWords : null })) {
      el('spEditError').textContent = t('sentence.invalidExample');
      return;
    }
    step = 0; resetAttempt(); render();
  }

  function bind() {
    el('spCategory').addEventListener('change', e => { category = e.target.value; renderWords(); });
    el('spSearch').addEventListener('input', e => { search = e.target.value; renderWords(); });
    el('spWords').addEventListener('click', e => {
      const button = e.target.closest('[data-sp-word]');
      if (button) selectWord(button.dataset.spWord);
    });
    el('spWork').addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      const p = DB.sentencePractice(selected);
      if (b.hasAttribute('data-sp-step')) {
        step = +b.dataset.spStep; resetAttempt(); showSelected();
      } else if (b.hasAttribute('data-sp-next')) {
        step = Math.min(2, step + 1); resetAttempt(); showSelected();
      } else if (b.hasAttribute('data-sp-check')) {
        check();
      } else if (b.hasAttribute('data-sp-pick') && p) {
        chosen.push(+b.dataset.spPick); drawTiles(p);
      } else if (b.hasAttribute('data-sp-remove') && p) {
        chosen.splice(+b.dataset.spRemove, 1); drawTiles(p);
      } else if (b.hasAttribute('data-sp-undo') && p) {
        chosen.pop(); drawTiles(p);
      } else if (b.hasAttribute('data-sp-change')) {
        showAlternatives();
      } else if (b.hasAttribute('data-sp-example')) {
        const c = candidates(DB.getWord(selected))[+b.dataset.spExample];
        const current = DB.sentencePractice(selected);
        if (c && current?.id === c.x.id && current.target === c.target) {
          el('spAlternatives').hidden = true;
        } else if (c && DB.setSentencePractice(selected, exampleFrom(c))) {
          step = 0; resetAttempt(); render();
        }
      } else if (b.hasAttribute('data-sp-edit')) {
        showEditor();
      }
    });
    el('spWork').addEventListener('submit', e => {
      if (e.target.id !== 'spEditForm') return;
      e.preventDefault(); saveCustom(e.target);
    });
    el('spWork').addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target.id === 'spInput' && e.target.tagName === 'INPUT') {
        e.preventDefault(); check();
      }
    });
  }

  return { render, bind, candidates };
})();

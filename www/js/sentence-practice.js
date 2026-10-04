/* One saved example per dictionary word. The bundled Tatoeba bank is loaded
   only when this tab is opened; words outside it can use a custom example. */
const SentencePractice = (() => {
  const el = id => document.getElementById(id);
  const t = (key, ...args) => I18N.t(key, ...args);
  const esc = s => String(s || '').replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clean = SentenceExamples.clean;
  const head = w => w.kanji || w.reading;
  const PARTICLES = new Set([
    'は', 'が', 'を', 'に', 'へ', 'で', 'と', 'も', 'の', 'や', 'か', 'ね', 'よ', 'から', 'まで',
    'です', 'ですか', 'でした', 'だ', 'だった', 'じゃない', 'ます', 'ません',
    ...(typeof GRAMMAR_RULES === 'undefined' ? [] : GRAMMAR_RULES.flatMap(g => g.particle.split('／')))
  ]);

  let selected = null, category = '__all__', search = '', step = 0;
  let picked = [], chosen = [];
  let bankLoading = null, knownOnly = true, bankFailed = false;

  function loadBank() {
    if (window.SENTENCE_BANK && window.SENTENCE_INDEX) return Promise.resolve(true);
    if (bankLoading) return bankLoading;
    bankLoading = new Promise(resolve => {
      const script = document.createElement('script');
      script.src = 'data/sentence-bank.js';
      const finish = ok => { bankFailed = !ok; if (!ok) script.remove(); resolve(ok); };
      script.onload = () => finish(!!(window.SENTENCE_BANK && window.SENTENCE_INDEX));
      script.onerror = () => finish(false);
      document.head.appendChild(script);
    }).then(ok => { bankLoading = null; return ok; });
    return bankLoading;
  }

  function candidates(w, options = {}) {
    if (!w) return [];
    const onlyKnown = options.onlyKnown ?? knownOnly;
    const keys = SentenceExamples.keys(w), forms = new Set([head(w), w.reading, ...keys]);
    Object.keys(w.forms || {}).forEach(k => DB.acceptedForms(w, k).forEach(f => forms.add(f)));
    if (w.pos === 'na-adj') keys.forEach(k => { forms.add(k + 'な'); forms.add(k + 'に'); });
    const pool = [...(window.BEGINNER_SENTENCES || [])], seen = new Set();
    keys.forEach(key => (window.SENTENCE_INDEX?.[key] || []).forEach(index => {
      if (!seen.has(index)) { seen.add(index); pool.push(window.SENTENCE_BANK[index]); }
    }));
    const out = [];
    pool.forEach(x => {
      if (!SentenceExamples.aligned(x) || !x.en || x.s.length > 9) return;
      const at = x.w.findIndex((lemma, i) => SentenceExamples.variants(lemma).some(k => keys.includes(k)) && forms.has(x.s[i]));
      if (at < 0) return;
      const unknown = SentenceExamples.unknown(x, [...DB.allWords(), w], PARTICLES);
      if (onlyKnown && unknown.length) return;
      const reviewed = x.review === 'construction-reviewed';
      const score = unknown.length * 100 + (reviewed ? 0 : 30) + x.jp.length + x.s.length * 2
        + (DB.getLocale() === 'pl' && x.pl ? -2 : 0);
      out.push({ score, x, target: x.s[at], unknown, reviewed });
    });
    return out.sort((a, b) => a.score - b.score || String(a.x.id).localeCompare(String(b.x.id)));
  }

  function exampleFrom(candidate) {
    const { x, target } = candidate;
    return { id: x.id, jp: x.jp, en: x.en, pl: x.pl,
      surfaces: x.s, lemmas: x.w, target, source: x.source || '', review: x.review || '' };
  }

  function acceptedAnswers(p, w, exercise) {
    if (exercise === 1 || (exercise === 2 && p.review !== 'construction-reviewed')) return [p.jp];
    if (exercise === 2) {
      // Reviewed spelling alternative, preserving the same token order and grammar.
      const kana = p.surfaces.map((surface, i) => {
        const entry = DB.allWords().find(x => SentenceExamples.keys(x).includes(p.lemmas[i]));
        if (!entry) return surface;
        if (SentenceExamples.keys(entry).includes(surface)) return entry.reading || surface;
        for (const key of Object.keys(entry.forms || {})) {
          const spellings = DB.acceptedForms(entry, key);
          if (spellings.includes(surface)) return spellings.find(v => /^[\u3040-\u309fー]+$/.test(v)) || surface;
        }
        return surface;
      }).join('');
      return [p.jp, kana];
    }
    const accepted = [p.target];
    if (SentenceExamples.keys(w).includes(p.target)) accepted.push(w.reading, head(w));
    Object.keys(w.forms || {}).forEach(k => {
      const variants = DB.acceptedForms(w, k);
      if (variants.includes(p.target)) accepted.push(...variants);
    });
    return accepted.filter(Boolean);
  }

  function exampleNotes(p) {
    const unknown = SentenceExamples.unknown({ w: p.lemmas }, DB.allWords(), PARTICLES);
    return `<p class="sp-credit">${esc(t(p.review === 'construction-reviewed' ? 'sentence.reviewed' : 'sentence.unreviewed'))}</p>`
      + (DB.getLocale() === 'pl' && !p.pl ? `<p class="sp-credit">${esc(t('sentence.englishFallback'))}</p>` : '')
      + (unknown.length ? `<p class="sp-credit">${esc(t('sentence.unfamiliar'))}: <span class="jp">${esc(unknown.join(' · '))}</span></p>` : '');
  }

  function renderWords() {
    const select = el('spCategory');
    select.innerHTML = `<option value="__all__">${esc(t('flash.allCats'))}</option>`
      + DB.categories().map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
    select.value = category;
    if (el('spSearch').value !== search) el('spSearch').value = search;
    const words = (category === '__all__' ? DB.allWords() : DB.wordsIn(category))
      .filter(w => !search || [w.kanji, w.reading, w.translation].some(s =>
        String(s || '').toLocaleLowerCase().includes(search.toLocaleLowerCase())));
    if (selected && !words.some(w => w.id === selected)) {
      selected = null;
      el('spWork').hidden = true;
      resetAttempt();
    }
    el('spWords').innerHTML = words.length ? words.map(w => {
      const done = DB.sentenceProgress(w.id).filter(Boolean).length;
      const gold = DB.stars(w).gold;
      return `<button type="button" class="sp-word ${w.id === selected ? 'sp-word--selected' : ''}"
          data-sp-word="${esc(w.id)}">
        <span class="jp">${esc(head(w))}</span><span>${esc(w.translation)}</span>
        <span class="sp-word__count">${done}/3 ${gold ? `<span class="star g star--on" title="${esc(t('sentence.goldEarned'))}">★</span>` : ''}</span>
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
      if (!candidates(w).length) await loadBank();
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
        <p>${esc(t('sentence.noExample'))}</p>${bankFailed ? `<p role="alert">${esc(t('sentence.bankFailed'))}</p><button class="tool-btn" data-sp-retry>${esc(t('sentence.retryBank'))}</button>` : ''}
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
      ${exampleNotes(p)}
      <div id="spQuestion"></div><div id="spFeedback" class="fc-feedback" aria-live="polite"></div>
      ${typeof p.id === 'number' ? `<p class="sp-credit">${esc(t('sentence.source'))} <a href="https://tatoeba.org/en/sentences/show/${encodeURIComponent(p.id)}" target="_blank" rel="noopener">Tatoeba #${esc(p.id)}</a> · CC BY 2.0 FR</p>` : ''}
      ${p.review === 'construction-reviewed' && /^https:\/\//.test(p.source || '') ? `<p class="sp-credit"><a href="${esc(p.source)}" target="_blank" rel="noopener">${esc(t('sentence.constructionSource'))}</a></p>` : ''}
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
    const correct = SentenceExamples.matches(answer, expected, acceptedAnswers(p, w, step));
    const fb = el('spFeedback');
    if (!correct) {
      fb.className = 'fc-feedback fc-feedback--bad';
      fb.innerHTML = `${esc(t(step === 0 ? 'sentence.tryAgain' : 'sentence.differentExample'))} <span class="jp">${esc(expected)}</span>`;
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
      + (bankFailed ? `<p role="alert">${esc(t('sentence.bankFailed'))}</p><button class="tool-btn" data-sp-retry>${esc(t('sentence.retryBank'))}</button>` : '')
      + options.map((c, i) => `<button class="sp-example" data-sp-example="${i}">
          <span class="jp">${esc(c.x.jp)}</span><span>${esc(DB.getLocale() === 'pl' && c.x.pl ? c.x.pl : c.x.en)}</span>${exampleNotes(exampleFrom(c))}
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
    el('spKnownOnly').addEventListener('change', e => { knownOnly = e.target.checked; if (selected) showAlternatives(); });
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
      if (b.hasAttribute('data-sp-retry')) {
        if (DB.sentencePractice(selected)) showAlternatives(); else selectWord(selected);
      } else if (b.hasAttribute('data-sp-step')) {
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
      if (InputSafety.composing(e)) return;
      if (e.key === 'Enter' && e.target.id === 'spInput' && e.target.tagName === 'INPUT') {
        e.preventDefault(); check();
      }
    });
  }

  return { render, bind, candidates, acceptedAnswers, loadBank };
})();

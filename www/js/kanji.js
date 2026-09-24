/* ============================================================
   KANJI DRAWING SECTION
   Grid of the vocab's unique kanji, each a tile with silver
   progress. Practice traces + gates stroke-by-stroke; the cheat
   panel lists EVERY dictionary word that uses this kanji. Test
   mode is blind, scores once, feeds the silver-5 loop.

   Geometry/scoring (parsePath/resample/scoreStroke/grade/TOL) now
   live in StrokeEngine (js/stroke-engine.js), shared with kana.js —
   load stroke-engine.js BEFORE this file.
   ============================================================ */
const Kanji = (() => {

  const esc = s => (s || '').replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const t = (k, ...a) => I18N.t(k, ...a);
  const el = id => document.getElementById(id);

  const SE = StrokeEngine;
  const VBOX = SE.VBOX, N = SE.N, TOL = SE.TOL;

  /* ---------- lazy data load ---------- */
  let dataLoaded = false, dataLoading = false;
  function ensureData(cb) {
    if (dataLoaded) return cb(true);
    if (window.KANJI_DATA) { dataLoaded = true; return cb(true); }
    if (dataLoading) return;
    dataLoading = true;
    const s = document.createElement('script');
    s.src = 'data/kanji-data.js';
    s.onload = () => { dataLoaded = true; dataLoading = false; cb(true); };
    s.onerror = () => { dataLoading = false; cb(false); };
    document.head.appendChild(s);
  }
  const strokesFor = ch => {
    const raw = window.KANJI_DATA && window.KANJI_DATA[ch];
    return raw ? raw.map(d => SE.resample(SE.parsePath(d), N)) : null;
  };
  const rawFor = ch => {
    const raw = window.KANJI_DATA && window.KANJI_DATA[ch];
    return raw ? raw.map(SE.parsePath) : null;
  };

  /* ---------- N5 priority set ----------
     The JLPT publishes no official kanji list; every "N5 list" in
     circulation is a reconstruction from past papers, and they disagree
     with each other on membership (published counts vary between 79 and
     80, and the sets differ on characters like 飲/買/空/花). So this is a
     DEFAULT ordering hint, not a claim about what the exam contains — any
     character can be pushed into or out of the group by hand from its
     drawing screen, and that choice overrides the list. */
  const N5 = new Set([...'人大分一見出日行前時生本中今間年子長上入後気来話女国金高下学先外何男名月小聞食書山電二車水木母校父白語十万友川三天東半北火土南千西毎休八読五四百円午七左右雨六九']);

  const isPriority = ch => {
    const p = DB.kanjiPriority(ch);
    return p === 'high' || (p === 'auto' && N5.has(ch));
  };

  // Which "done" sections are folded. Session-lived, keyed by group id, and
  // folded by default — the whole point of the split is to keep finished
  // characters out of the way.
  const doneFolded = { pri: true, rest: true };

  /* ---------- grid ---------- */
  function tileHTML(ch) {
    const has = !!(window.KANJI_DATA && window.KANJI_DATA[ch]);
    const prog = DB.kanjiProgress(ch);
    const done = prog >= DB.SILVER_TARGET;
    const star = `<span class="star s ${done ? 'star--on' : ''}">★</span>`;
    return `<button class="ktile ${has ? '' : 'ktile--nodata'}" ${has ? `data-ch="${esc(ch)}"` : 'disabled'}>
      <span class="ktile__ch">${esc(ch)}</span>
      <span class="ktile__prog">${star}${has ? ` ${prog}/${DB.SILVER_TARGET}` : ' —'}</span>
    </button>`;
  }

  // One group = the unstarred characters, then a foldable block of the
  // starred ones. Both halves are rendered even when empty so the group
  // header still reports an honest count.
  function groupHTML(id, titleKey, chars) {
    if (!chars.length) return '';
    const todo = chars.filter(c => DB.kanjiProgress(c) < DB.SILVER_TARGET);
    const done = chars.filter(c => DB.kanjiProgress(c) >= DB.SILVER_TARGET);
    const folded = doneFolded[id];

    const todoBlock = todo.length
      ? `<div class="kgrid">${todo.map(tileHTML).join('')}</div>`
      : `<p class="stub">${esc(t('kanji.groupAllDone'))}</p>`;

    const doneBlock = done.length ? `
      <button class="kgroup__done-toggle" data-donefold="${id}" aria-expanded="${!folded}">
        <span>${esc(t('kanji.groupDone', done.length))}</span>
        <span class="fc-list__chev">${folded ? '▸' : '▾'}</span>
      </button>
      <div ${folded ? 'hidden' : ''}><div class="kgrid">${done.map(tileHTML).join('')}</div></div>` : '';

    return `<section class="kgroup">
      <h2 class="kgroup__title">${esc(t(titleKey))} <small>${todo.length}/${chars.length}</small></h2>
      ${todoBlock}${doneBlock}
    </section>`;
  }

  function render() {
    const wrap = el('kanjiGrid');
    wrap.innerHTML = `<p class="stub">${esc(t('kanji.grid.loading'))}</p>`;
    ensureData(ok => {
      if (!ok) { wrap.innerHTML = `<p class="stub">${esc(t('kanji.grid.loadFail'))}</p>`; return; }
      const chars = DB.uniqueKanji();
      if (chars.length === 0) { wrap.innerHTML = `<p class="stub">${esc(t('kanji.grid.empty'))}</p>`; return; }
      wrap.innerHTML =
          groupHTML('pri',  'kanji.groupN5',    chars.filter(isPriority))
        + groupHTML('rest', 'kanji.groupOther', chars.filter(c => !isPriority(c)));
    });
  }

  function syncPriorityBtn() {
    const b = el('kdPriority');
    if (!b || !curCh) return;
    b.textContent = t(isPriority(curCh) ? 'kanji.unprioritise' : 'kanji.prioritise');
  }

  function togglePriority() {
    if (!curCh) return;
    // Write the resulting state explicitly rather than flipping to 'auto' —
    // otherwise a character the bundled list already contains could never be
    // demoted, and one it omits could never be promoted twice in a row.
    DB.setKanjiPriority(curCh, isPriority(curCh) ? 'low' : 'high');
    syncPriorityBtn();
  }

  /* ---------- canvas session ---------- */
  let SIZE = 0, DPR = Math.max(1, window.devicePixelRatio || 1);
  let curCh = null, ref = null, refRaw = null;
  let mode = 'practice';
  let strokes = [], cur = null;
  let gg, rg, ig, box;

  const toGlyph  = p => ({ x: p.x * (VBOX / SIZE), y: p.y * (VBOX / SIZE) });
  const toCanvas = p => ({ x: p.x * (SIZE / VBOX), y: p.y * (SIZE / VBOX) });

  // For the blind Test cue: a single reading from any word using this
  // kanji (imperfect — a glyph reads differently across words — but the
  // Practice cheat below shows the full spread, so the crutch is honest).
  function testCue() {
    const w = DB.allWords().find(x => DB.kanjiOf(x.kanji).includes(curCh));
    if (!w) return t('kanji.testMemPrompt');
    return w.translation ? `${w.reading} · ${w.translation}` : w.reading;
  }

  function openChar(ch) {
    curCh = ch;
    ref = strokesFor(ch);
    refRaw = rawFor(ch);
    if (!ref) return;
    strokes = []; cur = null;
    el('kanjiGridView').hidden = true;
    el('kanjiDraw').hidden = false;
    setMode('practice');
    syncPriorityBtn();
    requestAnimationFrame(fit);
  }

  function backToGrid() {
    el('kanjiDraw').hidden = true;
    el('kanjiGridView').hidden = false;
    render();
  }

  function setMode(m) {
    mode = m;
    strokes = []; cur = null;
    el('kdPractice').classList.toggle('seg--on', m === 'practice');
    el('kdTest').classList.toggle('seg--on', m === 'test');
    el('kdCheat').hidden = (m !== 'practice');
    el('kdPractice').textContent = t('kanji.practice');
    el('kdTest').textContent = t('kanji.test');
    // Practice shows the full word list in the cheat, so the header stays
    // clean; Test needs a single cue to draw from.
    el('kdPrompt').textContent = (m === 'test') ? testCue() : '';
    el('kdResult').textContent = '';
    el('kdResult').className = 'kd-result';
    el('kdRetry').hidden = true;
    if (m === 'practice') renderCheat();
    drawRef(); redrawInk(); updateHint();
  }

  function fit() {
    box = el('kdCanvasBox');
    SIZE = box.clientWidth;
    ['kdGuide', 'kdRef', 'kdInk'].forEach(id => {
      const c = el(id); c.width = SIZE * DPR; c.height = SIZE * DPR;
      c.getContext('2d').setTransform(DPR, 0, 0, DPR, 0, 0);
    });
    gg = el('kdGuide').getContext('2d');
    rg = el('kdRef').getContext('2d');
    ig = el('kdInk').getContext('2d');
    drawGuide(); drawRef(); redrawInk();
  }

  function drawGuide() {
    gg.clearRect(0, 0, SIZE, SIZE);
    gg.strokeStyle = getComputedStyle(document.body).getPropertyValue('--border');
    gg.globalAlpha = .6; gg.lineWidth = 1; gg.setLineDash([5, 5]);
    gg.beginPath();
    gg.moveTo(SIZE/2, 0); gg.lineTo(SIZE/2, SIZE);
    gg.moveTo(0, SIZE/2); gg.lineTo(SIZE, SIZE/2);
    gg.moveTo(0, 0); gg.lineTo(SIZE, SIZE);
    gg.moveTo(SIZE, 0); gg.lineTo(0, SIZE);
    gg.stroke(); gg.setLineDash([]); gg.globalAlpha = 1;
  }

  function drawRef() {
    if (!rg) return;
    rg.clearRect(0, 0, SIZE, SIZE);
    if (mode !== 'practice' || !refRaw) return;
    const col = getComputedStyle(document.body).getPropertyValue('--kanji').trim();
    refRaw.forEach((raw, idx) => {
      rg.strokeStyle = col;
      rg.globalAlpha = idx < strokes.length ? 0.28 : 0.13;
      rg.lineWidth = 6; rg.lineCap = 'round'; rg.lineJoin = 'round';
      rg.beginPath();
      raw.forEach((p, k) => { const c = toCanvas(p); k ? rg.lineTo(c.x, c.y) : rg.moveTo(c.x, c.y); });
      rg.stroke();
    });
    rg.globalAlpha = 1;
    // The start/end markers used to be drawn here, on the reference layer —
    // where #kdInk (z-index 3) buried them under the user's own strokes.
    // They now ride the ink layer instead; see redrawInk().
  }

  function redrawInk() {
    if (!ig) return;
    ig.clearRect(0, 0, SIZE, SIZE);
    ig.strokeStyle = getComputedStyle(document.body).getPropertyValue('--text');
    ig.lineWidth = 5; ig.lineCap = 'round'; ig.lineJoin = 'round';
    (cur ? strokes.concat([cur]) : strokes).forEach(st => {
      ig.beginPath();
      st.forEach((p, k) => { k ? ig.lineTo(p.x, p.y) : ig.moveTo(p.x, p.y); });
      ig.stroke();
    });
    drawMarkers();
  }

  // Start dot + direction arrow for the stroke being asked for next. Topmost
  // layer, so previously-drawn ink can't hide them. Practice only — Test is
  // blind by definition, and a start marker would give the glyph away.
  function drawMarkers() {
    if (mode !== 'practice' || !refRaw) return;
    if (strokes.length >= refRaw.length) return;
    const col = getComputedStyle(document.body).getPropertyValue('--kanji').trim();
    SE.drawStrokeMarkers(ig, refRaw[strokes.length], toCanvas, col);
  }

  function pos(e) {
    const r = box.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function onDown(e) {
    if (mode === 'practice' && strokes.length >= ref.length) return;
    if (mode === 'test' && strokes.length >= ref.length + 3) return;
    el('kdInk').setPointerCapture(e.pointerId);
    cur = [pos(e)]; redrawInk();
  }
  function onMove(e) { if (cur) { cur.push(pos(e)); redrawInk(); } }
  function onUp(e) {
    if (!cur) return;
    const end = pos(e);
    if (Math.hypot(end.x - cur[cur.length - 1].x, end.y - cur[cur.length - 1].y) > 0.5) cur.push(end);
    if (cur.length >= 2) commitStroke(cur);
    cur = null; redrawInk();
  }

  function commitStroke(raw) {
    if (mode === 'practice') {
      const idx = strokes.length;
      const tl = TOL[DB.getTolerance()];
      const g = SE.grade(SE.scoreStroke(raw.map(toGlyph), ref[idx]), practiceTol(tl));
      if (g >= 0.5) {
        strokes.push(raw);
        drawRef(); updateHint();
        if (strokes.length === ref.length) {
          el('kdResult').textContent = t('kanji.allStrokes');
          el('kdResult').className = 'kd-result kd-result--ok';
        }
      } else {
        // Reject: message only. onUp's trailing redrawInk() drops the
        // rejected ink (it was never pushed to strokes).
        el('kdResult').textContent = t('kanji.retryStroke');
        el('kdResult').className = 'kd-result kd-result--bad';
      }
    } else {
      strokes.push(raw);
      updateHint();
      if (strokes.length >= ref.length) scoreTest();
    }
  }

  function practiceTol(t) { return { pos: t.pos * 1.5, shape: t.shape * 1.5, dir: Math.max(0, t.dir - 0.2), ramp: t.ramp }; }

  function updateHint() {
    const h = el('kdHint');
    if (mode === 'practice') {
      h.textContent = strokes.length < ref.length
        ? t('kanji.stroke', strokes.length + 1, ref.length) : t('kanji.done');
    } else {
      h.textContent = strokes.length < ref.length
        ? t('kanji.strokeMem', strokes.length + 1, ref.length) : '';
    }
  }

  /* ---------- Test scoring ---------- */
  function scoreTest() {
    const tl = TOL[DB.getTolerance()];
    let sum = 0;
    for (let i = 0; i < ref.length; i++) sum += SE.grade(SE.scoreStroke(strokes[i].map(toGlyph), ref[i]), tl);
    const coverage = sum / ref.length;
    const overshoot = Math.max(0, strokes.length - ref.length) / ref.length;
    const final = Math.max(0, Math.round((coverage - overshoot) * 100));
    const r = el('kdResult');
    if (final >= 80) {
      const before = DB.kanjiProgress(curCh);
      const n = DB.recordKanjiPass(curCh);
      if (before < DB.SILVER_TARGET && n >= DB.SILVER_TARGET) {
        if (window.Celebrate) Celebrate.fire('silver');
      }
      r.textContent = t('kanji.pass', final, n, DB.SILVER_TARGET) + (n >= DB.SILVER_TARGET ? t('kanji.silverStar') : '');
      r.className = 'kd-result kd-result--ok';
    } else {
      r.textContent = t('kanji.fail', final);
      r.className = 'kd-result kd-result--bad';
    }
    el('kdRetry').hidden = false;
  }

  function retry() {
    strokes = []; cur = null;
    el('kdRetry').hidden = true;
    el('kdResult').textContent = '';
    el('kdResult').className = 'kd-result';
    redrawInk(); updateHint();
  }

  function clear() {
    strokes = []; cur = null;
    el('kdResult').textContent = '';
    el('kdResult').className = 'kd-result';
    el('kdRetry').hidden = true;
    drawRef(); redrawInk(); if (mode === 'practice') renderCheat(); updateHint();
  }

  /* ---------- Practice cheat: every word using this kanji ---------- */
  function renderCheat() {
    if (mode !== 'practice') return;
    const words = DB.allWords().filter(x => DB.kanjiOf(x.kanji).includes(curCh));
    const prog = DB.kanjiProgress(curCh);
    const list = words.length
      ? words.map(w => `<div class="cheat__word">
          <span class="cheat__wk">${esc(w.kanji)}</span>
          <span class="cheat__wr">${esc(w.reading)}</span>
          <span class="cheat__wt">${esc(w.translation)}</span>
        </div>`).join('')
      : `<span class="stub">${esc(t('kanji.noWord'))}</span>`;
    el('kdCheat').innerHTML = `
      <div class="cheat__title">${esc(t('kanji.usedIn'))}</div>
      <div class="cheat__list">${list}</div>
      <div class="cheat__prog">${esc(t('kanji.silverProg', prog, DB.SILVER_TARGET))}</div>`;
  }

  /* ---------- bind ---------- */
  function bind() {
    el('kanjiGrid').addEventListener('click', e => {
      const b = e.target.closest('[data-ch]');
      if (b) openChar(b.dataset.ch);
    });
    el('kanjiGrid').addEventListener('click', e => {
      const f = e.target.closest('[data-donefold]');
      if (!f) return;
      doneFolded[f.dataset.donefold] = !doneFolded[f.dataset.donefold];
      render();
    });
    el('kdPriority').addEventListener('click', togglePriority);
    el('kdBack').addEventListener('click', backToGrid);
    el('kdPractice').addEventListener('click', () => setMode('practice'));
    el('kdTest').addEventListener('click', () => setMode('test'));
    el('kdClear').addEventListener('click', clear);
    el('kdRetry').addEventListener('click', retry);
    const ink = el('kdInk');
    ink.addEventListener('pointerdown', onDown);
    ink.addEventListener('pointermove', onMove);
    ink.addEventListener('pointerup', onUp);
    ink.addEventListener('pointercancel', () => { cur = null; redrawInk(); });
    window.addEventListener('resize', () => { if (!el('kanjiDraw').hidden) fit(); });
  }

  return { render, bind };
})();

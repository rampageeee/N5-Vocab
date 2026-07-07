/* ============================================================
   KANJI DRAWING SECTION
   Grid of the vocab's unique kanji, each a tile with silver
   progress. Practice traces + gates stroke-by-stroke; the cheat
   panel now lists EVERY dictionary word that uses this kanji
   (was: one big stroke-order diagram + a single word, which both
   mislabelled multi-kanji glyphs and hid the character's real
   spread across the dictionary). Test mode is blind, scores once,
   feeds the silver-5 loop.
   ============================================================ */
const Kanji = (() => {

  const esc = s => (s || '').replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const t = (k, ...a) => I18N.t(k, ...a);
  const el = id => document.getElementById(id);

  const VBOX = 109, N = 48;

  const TOL = {
    lenient: { pos: 26, shape: 24, dir: 0.0, ramp: 2.0 },
    normal:  { pos: 18, shape: 16, dir: 0.3, ramp: 1.6 },
    strict:  { pos: 10, shape:  9, dir: 0.6, ramp: 1.3 }
  };

  /* ---------- KanjiVG path parse ---------- */
  function parsePath(d) {
    const toks = d.match(/[MmLlCcZz]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
    let i = 0, cx = 0, cy = 0, start = null, pts = [], cmd = null;
    const num = () => parseFloat(toks[i++]);
    function cubic(x0, y0, x1, y1, x2, y2, x3, y3) {
      for (let s = 1; s <= 18; s++) {
        const t = s / 18, u = 1 - t;
        pts.push({
          x: u*u*u*x0 + 3*u*u*t*x1 + 3*u*t*t*x2 + t*t*t*x3,
          y: u*u*u*y0 + 3*u*u*t*y1 + 3*u*t*t*y2 + t*t*t*y3
        });
      }
    }
    while (i < toks.length) {
      const tk = toks[i];
      if (/[A-Za-z]/.test(tk)) { cmd = tk; i++; }
      if (cmd === 'M' || cmd === 'm') {
        let x = num(), y = num(); if (cmd === 'm') { x += cx; y += cy; }
        cx = x; cy = y; start = { x, y }; pts.push({ x, y });
        cmd = (cmd === 'M') ? 'L' : 'l';
      } else if (cmd === 'L' || cmd === 'l') {
        let x = num(), y = num(); if (cmd === 'l') { x += cx; y += cy; }
        pts.push({ x, y }); cx = x; cy = y;
      } else if (cmd === 'C' || cmd === 'c') {
        let x1 = num(), y1 = num(), x2 = num(), y2 = num(), x = num(), y = num();
        if (cmd === 'c') { x1 += cx; y1 += cy; x2 += cx; y2 += cy; x += cx; y += cy; }
        cubic(cx, cy, x1, y1, x2, y2, x, y); cx = x; cy = y;
      } else if (cmd === 'Z' || cmd === 'z') {
        if (start) pts.push({ x: start.x, y: start.y });
      } else { i++; }
    }
    return pts;
  }

  function resample(pts, n) {
    if (pts.length === 0) return [];
    if (pts.length === 1) return Array(n).fill(pts[0]);
    const d = [0]; let total = 0;
    for (let k = 1; k < pts.length; k++) {
      total += Math.hypot(pts[k].x - pts[k-1].x, pts[k].y - pts[k-1].y); d.push(total);
    }
    if (total === 0) return Array(n).fill(pts[0]);
    const out = []; let seg = 1;
    for (let s = 0; s < n; s++) {
      const target = (s / (n - 1)) * total;
      while (seg < pts.length - 1 && d[seg] < target) seg++;
      const t = (target - d[seg-1]) / ((d[seg] - d[seg-1]) || 1);
      out.push({
        x: pts[seg-1].x + t * (pts[seg].x - pts[seg-1].x),
        y: pts[seg-1].y + t * (pts[seg].y - pts[seg-1].y)
      });
    }
    return out;
  }
  const centroid = p => { let sx=0, sy=0; p.forEach(q => { sx+=q.x; sy+=q.y; }); return { x:sx/p.length, y:sy/p.length }; };

  /* ---------- scoring ---------- */
  function scoreStroke(userPts, ref) {
    const u = resample(userPts, N);
    if (u.length < 2) return null;
    const cu = centroid(u), cr = centroid(ref);
    const pos = Math.hypot(cu.x - cr.x, cu.y - cr.y);
    let shape = 0;
    for (let k = 0; k < N; k++)
      shape += Math.hypot((u[k].x - cu.x) - (ref[k].x - cr.x), (u[k].y - cu.y) - (ref[k].y - cr.y));
    shape /= N;
    const uv = { x: u[N-1].x - u[0].x, y: u[N-1].y - u[0].y };
    const rv = { x: ref[N-1].x - ref[0].x, y: ref[N-1].y - ref[0].y };
    const ul = Math.hypot(uv.x, uv.y), rl = Math.hypot(rv.x, rv.y);
    const dir = (ul > 0 && rl > 0) ? (uv.x*rv.x + uv.y*rv.y) / (ul*rl) : 0;
    return { pos, shape, dir };
  }
  function grade(s, tl) {
    const q = (err, tol) => Math.max(0, Math.min(1, 1 - err / (tl.ramp * tol)));
    const qPos = q(s.pos, tl.pos), qShape = q(s.shape, tl.shape);
    let qDir;
    if (s.dir >= tl.dir) qDir = 0.5 + 0.5 * (s.dir - tl.dir) / ((1 - tl.dir) || 1);
    else                 qDir = 0.5 * (s.dir + 1) / ((tl.dir + 1) || 1);
    qDir = Math.max(0, Math.min(1, qDir));
    return Math.cbrt(qPos * qShape * qDir);
  }

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
    return raw ? raw.map(d => resample(parsePath(d), N)) : null;
  };
  const rawFor = ch => {
    const raw = window.KANJI_DATA && window.KANJI_DATA[ch];
    return raw ? raw.map(parsePath) : null;
  };

  /* ---------- grid ---------- */
  function render() {
    const wrap = el('kanjiGrid');
    wrap.innerHTML = `<p class="stub">${esc(t('kanji.grid.loading'))}</p>`;
    ensureData(ok => {
      if (!ok) { wrap.innerHTML = `<p class="stub">${esc(t('kanji.grid.loadFail'))}</p>`; return; }
      const chars = DB.uniqueKanji();
      if (chars.length === 0) { wrap.innerHTML = `<p class="stub">${esc(t('kanji.grid.empty'))}</p>`; return; }
      wrap.innerHTML = chars.map(ch => {
        const has = !!(window.KANJI_DATA && window.KANJI_DATA[ch]);
        const prog = DB.kanjiProgress(ch);
        const done = prog >= DB.SILVER_TARGET;
        const star = `<span class="star s ${done ? 'star--on' : ''}">★</span>`;
        return `<button class="ktile ${has ? '' : 'ktile--nodata'}" ${has ? `data-ch="${esc(ch)}"` : 'disabled'}>
          <span class="ktile__ch">${esc(ch)}</span>
          <span class="ktile__prog">${star}${has ? ` ${prog}/${DB.SILVER_TARGET}` : ' —'}</span>
        </button>`;
      }).join('');
    });
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
    if (strokes.length < refRaw.length) {
      const s = toCanvas(refRaw[strokes.length][0]);
      rg.globalAlpha = 1; rg.fillStyle = col;
      rg.beginPath(); rg.arc(s.x, s.y, 4, 0, 7); rg.fill();
    }
    rg.globalAlpha = 1;
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
  function onUp() {
    if (!cur) return;
    if (cur.length > 2) commitStroke(cur);
    cur = null; redrawInk();
  }

  function commitStroke(raw) {
    if (mode === 'practice') {
      const idx = strokes.length;
      const tl = TOL[DB.getTolerance()];
      const g = grade(scoreStroke(raw.map(toGlyph), ref[idx]), practiceTol(tl));
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
    for (let i = 0; i < ref.length; i++) sum += grade(scoreStroke(strokes[i].map(toGlyph), ref[i]), tl);
    const coverage = sum / ref.length;
    const overshoot = Math.max(0, strokes.length - ref.length) / ref.length;
    const final = Math.max(0, Math.round((coverage - overshoot) * 100));
    const r = el('kdResult');
    if (final >= 80) {
      const n = DB.recordKanjiPass(curCh);
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

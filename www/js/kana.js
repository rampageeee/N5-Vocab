/* ============================================================
   KANA CHART
   Gojūon (46) + dakuten/handakuten (25) + yōon (33), hiragana/
   katakana toggle. Practice-only tracing — NOT the kanji flow:
   no Test mode, no silver-star loop, no cheat panel (those key
   on dictionary words + DB.recordKanjiPass, which don't apply
   to kana). Scoring reused from StrokeEngine (js/stroke-engine.js,
   load before this file) — kanji.js and kana.js share one scoring
   implementation, not two that could drift apart.

   Yōon entries are TWO characters traced in sequence (base + small
   ゃ/ゅ/ょ) — no new glyphs needed, both already exist in the
   gojūon/dakuten sets, so a "sequence" is just two single-char
   practice steps back to back.

   Grid tiles reuse the existing .kgrid/.ktile classes from the
   kanji view (same look: character + status), so this adds no
   parallel CSS to drift against those.

   DATA: window.KANA_DATA must be populated the same way
   window.KANJI_DATA is (KanjiVG stroke paths, keyed by character,
   array of path "d" strings per stroke) — see data/kana-data.js
   and tools/build-kana-data.js. Until populated, tiles render
   disabled with real "no data yet" state — never fabricated
   stroke paths standing in for real ones.
   ============================================================ */
const Kana = (() => {

  const esc = s => (s || '').replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const t = (k, ...a) => I18N.t(k, ...a);
  const el = id => document.getElementById(id);

  const SE = StrokeEngine;
  const VBOX = SE.VBOX, N = SE.N, TOL = SE.TOL;

  // ---- the 46 + 25 + 33 set --------------------------------
  function row(pairs) { return pairs.map(([romaji, hira, kata]) => ({ romaji, hira, kata })); }
  function yoonRow(hiraBase, kataBase, romajiTriple) {
    const small = [['ゃ', 'ャ', romajiTriple[0]], ['ゅ', 'ュ', romajiTriple[1]], ['ょ', 'ョ', romajiTriple[2]]];
    return small.map(([sh, sk, rj]) => ({ romaji: rj, hira: hiraBase + sh, kata: kataBase + sk }));
  }

  const GOJUON = row([
    ['a','あ','ア'], ['i','い','イ'], ['u','う','ウ'], ['e','え','エ'], ['o','お','オ'],
    ['ka','か','カ'], ['ki','き','キ'], ['ku','く','ク'], ['ke','け','ケ'], ['ko','こ','コ'],
    ['sa','さ','サ'], ['shi','し','シ'], ['su','す','ス'], ['se','せ','セ'], ['so','そ','ソ'],
    ['ta','た','タ'], ['chi','ち','チ'], ['tsu','つ','ツ'], ['te','て','テ'], ['to','と','ト'],
    ['na','な','ナ'], ['ni','に','ニ'], ['nu','ぬ','ヌ'], ['ne','ね','ネ'], ['no','の','ノ'],
    ['ha','は','ハ'], ['hi','ひ','ヒ'], ['fu','ふ','フ'], ['he','へ','ヘ'], ['ho','ほ','ホ'],
    ['ma','ま','マ'], ['mi','み','ミ'], ['mu','む','ム'], ['me','め','メ'], ['mo','も','モ'],
    ['ya','や','ヤ'], ['yu','ゆ','ユ'], ['yo','よ','ヨ'],
    ['ra','ら','ラ'], ['ri','り','リ'], ['ru','る','ル'], ['re','れ','レ'], ['ro','ろ','ロ'],
    ['wa','わ','ワ'], ['wo','を','ヲ'],
    ['n','ん','ン']
  ]);
  const DAKUTEN = row([
    ['ga','が','ガ'], ['gi','ぎ','ギ'], ['gu','ぐ','グ'], ['ge','げ','ゲ'], ['go','ご','ゴ'],
    ['za','ざ','ザ'], ['ji','じ','ジ'], ['zu','ず','ズ'], ['ze','ぜ','ゼ'], ['zo','ぞ','ゾ'],
    ['da','だ','ダ'], ['dji','ぢ','ヂ'], ['dzu','づ','ヅ'], ['de','で','デ'], ['do','ど','ド'],
    ['ba','ば','バ'], ['bi','び','ビ'], ['bu','ぶ','ブ'], ['be','べ','ベ'], ['bo','ぼ','ボ'],
    ['pa','ぱ','パ'], ['pi','ぴ','ピ'], ['pu','ぷ','プ'], ['pe','ぺ','ペ'], ['po','ぽ','ポ']
  ]);
  const YOON = [].concat(
    yoonRow('き','キ',['kya','kyu','kyo']), yoonRow('ぎ','ギ',['gya','gyu','gyo']),
    yoonRow('し','シ',['sha','shu','sho']), yoonRow('じ','ジ',['ja','ju','jo']),
    yoonRow('ち','チ',['cha','chu','cho']),
    yoonRow('に','ニ',['nya','nyu','nyo']),
    yoonRow('ひ','ヒ',['hya','hyu','hyo']), yoonRow('び','ビ',['bya','byu','byo']), yoonRow('ぴ','ピ',['pya','pyu','pyo']),
    yoonRow('み','ミ',['mya','myu','myo']),
    yoonRow('り','リ',['rya','ryu','ryo'])
  );

  let script = 'hira'; // 'hira' | 'kata'

  // ---- lazy data load (mirrors kanji.js exactly) -----------
  function ensureData(cb) {
    DatasetLoader.load('data/kana-data.js', () => window.KANA_DATA).then(cb);
  }
  const hasData = ch => !!(window.KANA_DATA && window.KANA_DATA[ch]);
  const strokesFor = ch => {
    const raw = window.KANA_DATA && window.KANA_DATA[ch];
    return raw ? raw.map(d => SE.resample(SE.parsePath(d), N)) : null;
  };
  const rawFor = ch => {
    const raw = window.KANA_DATA && window.KANA_DATA[ch];
    return raw ? raw.map(SE.parsePath) : null;
  };

  // ---- grid --------------------------------------------------
  function tile(entry) {
    const ch = script === 'hira' ? entry.hira : entry.kata;
    // a yōon entry is only "ready" once BOTH characters have data
    const chars = [...ch];
    const has = chars.every(hasData);
    // A yōon tile is only "done" when BOTH of its characters are — progress
    // is stored per character, never per tile, so ひ mastered via ひゃ also
    // counts toward ひ on its own tile and toward any word containing it.
    const prog = Math.min(...chars.map(DB.kanaProgress));
    const done = prog >= DB.SILVER_TARGET;
    const star = `<span class="star s ${done ? 'star--on' : ''}">★</span>`;
    return `<button class="ktile ${has ? '' : 'ktile--nodata'}" ${has ? `data-seq="${esc(ch)}"` : 'disabled'}>
      <span class="ktile__ch">${esc(ch)}</span>
      <span class="ktile__prog">${star} ${esc(entry.romaji)}${has ? ` ${prog}/${DB.SILVER_TARGET}` : ''}</span>
    </button>`;
  }

  function render() {
    el('knHira').classList.toggle('seg--on', script === 'hira');
    el('knKata').classList.toggle('seg--on', script === 'kata');
    ensureData(ok => {
      const note = ok ? '' : `<p class="stub">${esc(t('kana.loadFail'))}</p><button class="tool-btn" data-retry-dataset>${esc(t('sentence.retryBank'))}</button>`;
      el('knGridGojuon').innerHTML  = note || GOJUON.map(tile).join('');
      el('knGridDakuten').innerHTML = note || DAKUTEN.map(tile).join('');
      el('knGridYoon').innerHTML    = note || YOON.map(tile).join('');
    });
  }

  // ---- canvas session (practice and blind test) --------
  let SIZE = 0, DPR = Math.max(1, window.devicePixelRatio || 1);
  let seq = [], seqPos = 0;      // seq: array of single chars to trace in order
  let curCh = null, ref = null, refRaw = null;
  let strokes = [], cur = null, pointer = null;
  let mode = 'practice';        // 'practice' | 'test' — mirrors kanji.js
  let testDone = false;         // a scored attempt is on screen
  let gg, rg, ig, box;

  const toGlyph = p => p;
  const toCanvas = p => ({ x: p.x * (SIZE / VBOX), y: p.y * (SIZE / VBOX) });

  function openSeq(str) {
    seq = [...str];   // 1 char for gojuon/dakuten, 2 for yoon (base + small)
    seqPos = 0;
    el('kanaGridView').hidden = true;
    el('kanaDraw').hidden = false;
    setMode('practice');
    requestAnimationFrame(fit);
  }

  function setMode(m) {
    mode = m;
    el('knPractice').classList.toggle('seg--on', m === 'practice');
    el('knTest').classList.toggle('seg--on', m === 'test');
    loadCurrent();
  }

  function loadCurrent() {
    curCh = seq[seqPos];
    ref = strokesFor(curCh);
    refRaw = rawFor(curCh);
    strokes = []; cur = null; pointer = null; testDone = false;
    el('knPrompt').textContent = seq.length > 1 ? `${seq.join('')} (${seqPos + 1}/${seq.length})` : seq[0];
    el('knResult').textContent = '';
    el('knResult').className = 'kd-result';
    el('knRetry').hidden = true;
    drawRef(); redrawInk(); updateHint();
  }

  function backToGrid() {
    cur = null; pointer = null;
    el('kanaDraw').hidden = true;
    el('kanaGridView').hidden = false;
    render();
  }

  function fit() {
    box = el('knCanvasBox');
    if (!box.clientWidth) return;
    cur = null; pointer = null; // an interrupted stroke is discarded, completed ink survives
    SIZE = box.clientWidth;
    DPR = Math.max(1, window.devicePixelRatio || 1);
    ['knGuide', 'knRef', 'knInk'].forEach(id => {
      const c = el(id); c.width = SIZE * DPR; c.height = SIZE * DPR;
      c.getContext('2d').setTransform(DPR, 0, 0, DPR, 0, 0);
    });
    gg = el('knGuide').getContext('2d');
    rg = el('knRef').getContext('2d');
    ig = el('knInk').getContext('2d');
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
    // Markers moved to the ink layer (#knInk sits above #knRef) — see redrawInk().
  }

  function redrawInk() {
    if (!ig) return;
    ig.clearRect(0, 0, SIZE, SIZE);
    ig.strokeStyle = getComputedStyle(document.body).getPropertyValue('--text');
    ig.lineWidth = 5; ig.lineCap = 'round'; ig.lineJoin = 'round';
    (cur ? strokes.concat([cur]) : strokes).forEach(st => {
      ig.beginPath();
      st.forEach((p, k) => { const c = toCanvas(p); k ? ig.lineTo(c.x, c.y) : ig.moveTo(c.x, c.y); });
      ig.stroke();
    });
    drawMarkers();
  }

  // Start dot + direction arrow for the next stroke, on the topmost layer.
  // Blind tests never display stroke markers.
  function drawMarkers() {
    if (mode !== 'practice') return;   // a start dot would give the glyph away
    if (!refRaw || !refRaw.length || strokes.length >= refRaw.length) return;
    const col = getComputedStyle(document.body).getPropertyValue('--kanji').trim();
    SE.drawStrokeMarkers(ig, refRaw[strokes.length], toCanvas, col);
  }

  function pos(e) {
    const r = box.getBoundingClientRect();
    return { x: (e.clientX - r.left) * VBOX / r.width, y: (e.clientY - r.top) * VBOX / r.height };
  }

  function onDown(e) {
    if (!ref || !SIZE || testDone || pointer !== null || e.isPrimary === false || (e.button != null && e.button !== 0)) return;
    if (strokes.length >= ref.length) return;
    pointer = e.pointerId;
    el('knInk').setPointerCapture(pointer);
    cur = [pos(e)]; redrawInk();
  }
  function onMove(e) {
    if (cur && e.pointerId === pointer) { cur.push(pos(e)); redrawInk(); }
  }
  function onUp(e) {
    if (!cur || e.pointerId !== pointer) return;
    const raw = cur, end = pos(e);
    if (Math.hypot(end.x - raw[raw.length - 1].x, end.y - raw[raw.length - 1].y) > 0.5) raw.push(end);
    cur = null; pointer = null;
    if (raw.length >= 2) commitStroke(raw);
    redrawInk();
  }
  function onCancel(e) {
    if (e.pointerId !== pointer) return;
    cur = null; pointer = null; redrawInk();
  }

  // Practice-only: same lenient practice tolerance kanji.js uses, keyed
  // off the shared tolerance setting so kana and kanji feel consistent.
  function practiceTol(tl) { return { pos: tl.pos * 1.5, shape: tl.shape * 1.5, dir: Math.max(0, tl.dir - 0.2), ramp: tl.ramp }; }

  function commitStroke(raw) {
    if (!ref || testDone || strokes.length >= ref.length) return;
    if (mode === 'test') {
      strokes.push(raw);
      updateHint();
      if (strokes.length >= ref.length) scoreTest();
      return;
    }
    const idx = strokes.length;
    const tl = TOL[DB.getTolerance()];
    const g = SE.grade(SE.scoreStroke(raw.map(toGlyph), ref[idx]), practiceTol(tl));
    if (g >= 0.5) {
      strokes.push(raw);
      drawRef(); updateHint();
      if (strokes.length === ref.length) advance();
    } else {
      el('knResult').textContent = t('kanji.retryStroke');
      el('knResult').className = 'kd-result kd-result--bad';
    }
  }

  /* Blind test — the only path that awards progress. Same 80/100 bar and the
     same overshoot penalty kanji.js uses, so a kana pass and a kanji pass
     represent the same standard of work. */
  function scoreTest() {
    if (testDone || !ref || strokes.length !== ref.length) return;
    testDone = true; // lock before any persistence or UI side effects
    const tl = TOL[DB.getTolerance()];
    let sum = 0;
    for (let i = 0; i < ref.length; i++) sum += SE.grade(SE.scoreStroke(strokes[i].map(toGlyph), ref[i]), tl);
    const coverage = sum / ref.length;
    const overshoot = Math.max(0, strokes.length - ref.length) / ref.length;
    const final = Math.max(0, Math.round((coverage - overshoot) * 100));
    const r = el('knResult');

    if (final >= 80) {
      const before = DB.kanaProgress(curCh);
      const n = DB.recordKanaPass(curCh);
      r.textContent = t('kanji.pass', final, n, DB.SILVER_TARGET)
        + (n >= DB.SILVER_TARGET ? t('kanji.silverStar') : '');
      r.className = 'kd-result kd-result--ok';
      if (before < DB.SILVER_TARGET && n >= DB.SILVER_TARGET && window.Celebrate) Celebrate.fire('silver');
    } else {
      r.textContent = t('kanji.fail', final);
      r.className = 'kd-result kd-result--bad';
    }
    // One button, two jobs: move on through a yōon pair, or re-attempt.
    const more = final >= 80 && seqPos < seq.length - 1;
    el('knRetry').textContent = t(more ? 'flash.next' : 'kanji.retry');
    el('knRetry').dataset.mode = more ? 'next' : 'retry';
    el('knRetry').hidden = false;
  }

  function retryOrNext() {
    if (el('knRetry').dataset.mode === 'next') { seqPos++; loadCurrent(); return; }
    loadCurrent();
  }

  function advance() {
    if (seqPos < seq.length - 1) {
      seqPos++;
      loadCurrent();
    } else {
      el('knResult').textContent = t('kanji.allStrokes');
      el('knResult').className = 'kd-result kd-result--ok';
      el('knHint').textContent = t('kanji.done');
    }
  }

  function updateHint() {
    if (!ref) { el('knHint').textContent = ''; return; }
    if (strokes.length >= ref.length) { el('knHint').textContent = t('kanji.done'); return; }
    el('knHint').textContent = mode === 'test'
      ? t('kanji.strokeMem', strokes.length + 1, ref.length)
      : t('kanji.stroke', strokes.length + 1, ref.length);
  }

  function clear() {
    strokes = []; cur = null; pointer = null; testDone = false;
    el('knResult').textContent = '';
    el('knResult').className = 'kd-result';
    el('knRetry').hidden = true;
    drawRef(); redrawInk(); updateHint();
  }

  /* ---------- bind ---------- */
  function bind() {
    el('knHira').addEventListener('click', () => { script = 'hira'; render(); });
    el('knKata').addEventListener('click', () => { script = 'kata'; render(); });
    [el('knGridGojuon'), el('knGridDakuten'), el('knGridYoon')].forEach(g => {
      g.addEventListener('click', e => {
        if (e.target.closest('[data-retry-dataset]')) return render();
        const b = e.target.closest('[data-seq]');
        if (b) openSeq(b.dataset.seq);
      });
    });
    el('knPractice').addEventListener('click', () => setMode('practice'));
    el('knTest').addEventListener('click', () => setMode('test'));
    el('knRetry').addEventListener('click', retryOrNext);
    el('knBack').addEventListener('click', backToGrid);
    el('knClear').addEventListener('click', clear);
    const ink = el('knInk');
    ink.addEventListener('pointerdown', onDown);
    ink.addEventListener('pointermove', onMove);
    ink.addEventListener('pointerup', onUp);
    ink.addEventListener('pointercancel', onCancel);
    ink.addEventListener('lostpointercapture', onCancel);
    window.addEventListener('n5-navigation', () => { cur = null; pointer = null; });
    window.addEventListener('blur', () => { cur = null; pointer = null; redrawInk(); });
    window.addEventListener('resize', () => { if (!el('kanaDraw').hidden) fit(); });
  }

  return { render, bind };
})();

/* ============================================================
   STROKE ENGINE (shared)
   Pure geometry + scoring for handwritten stroke practice — used
   by both kanji.js (kanji drawing) and kana.js (kana drawing).
   No DOM, no state: parse KanjiVG path data, resample to N points,
   score a drawn stroke against a reference. Extracted out of
   kanji.js so kanji and kana can never end up with two scoring
   implementations that quietly disagree.
   ============================================================ */
const StrokeEngine = (() => {

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

  return { VBOX, N, TOL, parsePath, resample, centroid, scoreStroke, grade };
})();

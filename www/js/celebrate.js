/* ============================================================
   CELEBRATE
   Star-gain flourish: one star rising in the centre, and a shower
   of small rotating stars crossing the full width of the screen on
   a shallow downward diagonal, each pulling a short white speed
   line.

   Tiers differ by colour, count, centre size and duration only. The
   escalation is "more of them, a little bigger, a little longer",
   not a different animation.

   ---- Two bugs this file has had ----
   1. The canvas was styled `position:fixed;inset:0` with no explicit
      width/height. A <canvas> is a REPLACED element, so `inset:0`
      does NOT stretch it — `width:auto` resolves to its intrinsic
      size, i.e. canvas.width CSS pixels. With the backing store at
      innerWidth*DPR, a DPR-2 phone laid the canvas out at twice the
      viewport in each direction, anchored top-left, so the centre
      star landed off the bottom-right edge. DPR-1 desktop looked
      perfect; every phone showed a fragment near the bottom, or
      nothing. Do not remove the width/height from the cssText below.

   2. Stars were given a fixed speed range, so on a wide screen —
      or with a short life and a late start — they faded out a
      couple of hundred pixels in and never crossed anything. Speed
      is now DERIVED from the viewport and the star's own lifetime:
      every star covers the full width plus margin in exactly the
      time it has, whatever the screen size.

   prefers-reduced-motion is honoured by skipping entirely.
   ============================================================ */
const Celebrate = (() => {

  const TIERS = {
    bronze:   { core: '#e8b878', trail: '#ffffff', count: 10, ms: 1500, centre: 1.00 },
    silver:   { core: '#dfe6ee', trail: '#ffffff', count: 12, ms: 1550, centre: 1.00 },
    gold:     { core: '#f2d476', trail: '#ffffff', count: 15, ms: 1700, centre: 1.12 },
    platinum: { core: '#ffffff', trail: '#cfe6f5', count: 24, ms: 2100, centre: 1.40 }
  };

  // Travel direction: 30 degrees below horizontal, with a small per-star
  // jitter so the shower reads as drift rather than a ruled set of
  // parallel lines.
  const ANGLE_DEG = 30;
  const ANGLE_JITTER = 5;
  const CENTRE_FRACTION = 0.15;   // centre star radius as a fraction of min(W,H)

  const reduced = () => window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let canvas = null, ctx = null, raf = 0;

  function teardown() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    canvas = null; ctx = null;
  }

  function mount(W, H) {
    teardown();   // a second star landing mid-run restarts cleanly rather than stacking canvases
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    canvas = document.createElement('canvas');
    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    // The explicit CSS width/height are mandatory — see the file header.
    canvas.style.cssText =
      'position:fixed;top:0;left:0;width:' + W + 'px;height:' + H + 'px;' +
      'z-index:9998;pointer-events:none';
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);   // draw in CSS-pixel coordinates
  }

  /* Every star enters off the left edge (or above it) and is given exactly
     enough speed to clear the right edge before its life runs out. Solving
     for speed rather than picking one is what guarantees a full crossing on
     a 360px phone and a 1400px desktop alike. */
  function spawn(tier, W, H, dur) {
    const out = [];
    for (let i = 0; i < tier.count; i++) {
      const deg = ANGLE_DEG + (Math.random() * 2 - 1) * ANGLE_JITTER;
      const ang = deg * Math.PI / 180;
      const delay = Math.random() * 0.3;              // fraction of the run
      const life = Math.min(1 - delay, 0.55 + Math.random() * 0.35);
      const startX = -70 - Math.random() * 140;
      const span = (W - startX) + 90;                 // horizontal distance to clear
      const speed = span / Math.cos(ang) / (life * dur);
      out.push({
        x: startX,
        y: Math.random() * H * 0.75 - H * 0.12,       // banded across the height, some above it
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        r: 4.5 + Math.random() * 4,                   // star outer radius, px
        spin: (Math.random() < 0.5 ? -1 : 1) * (0.8 + Math.random() * 1.2),   // turns/sec
        phase: Math.random() * Math.PI * 2,
        trail: 0.035 + Math.random() * 0.02,          // trail length = this many seconds of travel
        delay,
        life
      });
    }
    return out;
  }

  function starPath(cx, cy, r, rot) {
    const inner = r * 0.46;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 === 0 ? r : inner;
      const a = rot + i * Math.PI / 5 - Math.PI / 2;
      const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function drawStar(p, x, y, rot, alpha, tier) {
    // Speed line first, so the star head sits on top of its own trail.
    const tx = x - p.vx * p.trail, ty = y - p.vy * p.trail;
    const g = ctx.createLinearGradient(x, y, tx, ty);
    g.addColorStop(0, tier.trail);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalAlpha = alpha * 0.55;
    ctx.strokeStyle = g;
    ctx.lineWidth = Math.max(1, p.r * 0.28);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(tx, ty);
    ctx.stroke();

    ctx.globalAlpha = alpha;
    ctx.fillStyle = tier.core;
    starPath(x, y, p.r, rot);
    ctx.fill();
  }

  /* Centre star: same vector shape as the shower, drawn large. Rises over
     the first third, holds, fades out over the last. Peak alpha 0.85 —
     solid enough to read as the reward, sheer enough that a mistimed tap
     still visibly lands on the button underneath (the canvas is
     pointer-events:none, so it does land). */
  function drawCentre(tier, t, W, H) {
    const inT = Math.min(1, t / 0.28);
    const ease = 1 - Math.pow(1 - inT, 3);
    const fade = t < 0.55 ? 1 : 1 - (t - 0.55) / 0.45;
    const r = Math.min(W, H) * CENTRE_FRACTION * tier.centre * (0.62 + 0.38 * ease);
    ctx.globalAlpha = Math.max(0, 0.85 * fade);
    ctx.fillStyle = tier.core;
    starPath(W / 2, H / 2, r, -0.25 + 0.35 * ease);
    ctx.fill();
    ctx.globalAlpha = Math.max(0, 0.45 * fade);
    ctx.strokeStyle = tier.trail;
    ctx.lineWidth = Math.max(1.5, r * 0.03);
    ctx.stroke();
  }

  function fire(name) {
    const tier = TIERS[name];
    if (!tier) return;
    if (reduced()) return;
    if (document.hidden) return;   // no point animating into a backgrounded app

    // visualViewport is the honest size while a soft keyboard is up; without
    // it the canvas is laid out against the pre-keyboard viewport and part of
    // the shower runs behind the keyboard.
    const vv = window.visualViewport;
    const W = Math.round(vv ? vv.width  : window.innerWidth);
    const H = Math.round(vv ? vv.height : window.innerHeight);

    mount(W, H);
    const dur = tier.ms / 1000;
    const parts = spawn(tier, W, H, dur);
    const start = performance.now();

    function frame(now) {
      const t = (now - start) / 1000 / dur;
      if (t >= 1 || !ctx) { teardown(); return; }

      ctx.clearRect(0, 0, W, H);
      parts.forEach(p => {
        const local = (t - p.delay) / p.life;
        if (local <= 0 || local > 1) return;
        const pt = (t - p.delay) * dur;          // seconds this star has been travelling
        const x = p.x + p.vx * pt, y = p.y + p.vy * pt;
        // fade in and out so nothing pops into or out of existence
        const alpha = Math.sin(local * Math.PI) * 0.95;
        drawStar(p, x, y, p.phase + p.spin * pt * Math.PI * 2, alpha, tier);
      });
      drawCentre(tier, t, W, H);
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
  }

  return { fire, tiers: () => Object.keys(TIERS) };
})();

window.Celebrate = Celebrate;

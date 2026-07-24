/* ============================================================
   CELEBRATE
   Star-gain flourish: a short comet shower across a throwaway
   full-screen canvas, plus one scaling star glyph at the centre.

   Tuned to be noticed and then gone. No full-screen colour wash,
   no flash frames, no layout shift — the canvas is pointer-events:
   none and removes itself when the run finishes, so it can never
   sit between the user and a button, and a mistimed tap during the
   animation still lands on whatever is underneath.

   Tiers differ by colour, particle count and duration only. The
   platinum (category) run is the same shower scaled up plus an
   expanding ring, so it reads as "more of the same thing" rather
   than a different effect — the reward escalates, the vocabulary
   of the animation doesn't.

   prefers-reduced-motion is honoured by skipping entirely.
   ============================================================ */
const Celebrate = (() => {

  const TIERS = {
    bronze:   { core: '#e0a45f', trail: '#c8823c', count: 14, ms: 900,  ring: false, glyph: 1.0 },
    silver:   { core: '#e2e8ef', trail: '#9fa9b5', count: 18, ms: 1000, ring: false, glyph: 1.0 },
    gold:     { core: '#f4d878', trail: '#d3a428', count: 24, ms: 1200, ring: false, glyph: 1.15 },
    platinum: { core: '#ffffff', trail: '#bcd8ea', count: 44, ms: 1900, ring: true,  glyph: 1.5 }
  };

  const reduced = () => window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let canvas = null, ctx = null, raf = 0, DPR = 1;

  function teardown() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    canvas = null; ctx = null;
  }

  function mount() {
    teardown();   // a second star landing mid-run restarts cleanly rather than stacking canvases
    DPR = Math.max(1, window.devicePixelRatio || 1);
    canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;inset:0;z-index:9998;pointer-events:none';
    canvas.width  = window.innerWidth  * DPR;
    canvas.height = window.innerHeight * DPR;
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  // Comets enter from the top and left edges travelling down-right, so the
  // shower reads as one directional sweep rather than random noise.
  function spawn(tier, W, H) {
    const out = [];
    for (let i = 0; i < tier.count; i++) {
      const ang = (18 + Math.random() * 34) * Math.PI / 180;
      const speed = 620 + Math.random() * 680;
      const fromTop = Math.random() < 0.62;
      out.push({
        x: fromTop ? Math.random() * W * 1.25 - W * 0.2 : -60 - Math.random() * 200,
        y: fromTop ? -60 - Math.random() * 220 : Math.random() * H * 0.85,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        len: 0.055 + Math.random() * 0.075,        // trail length as a fraction of a second of travel
        w: 1.2 + Math.random() * 2.2,
        delay: Math.random() * 0.42,               // staggered so they don't arrive as one wall
        life: 0.55 + Math.random() * 0.45
      });
    }
    return out;
  }

  function drawComet(p, alpha, tier) {
    const tx = p.x - p.vx * p.len, ty = p.y - p.vy * p.len;
    const g = ctx.createLinearGradient(p.x, p.y, tx, ty);
    g.addColorStop(0, tier.core);
    g.addColorStop(0.35, tier.trail);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = g;
    ctx.lineWidth = p.w;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.fillStyle = tier.core;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.w * 0.62, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawGlyph(tier, t, W, H) {
    // Rises to full size over the first third, holds, then fades. Peaks at
    // 0.82 alpha — solid enough to register, sheer enough not to block.
    const inT = Math.min(1, t / 0.3);
    const fade = t < 0.55 ? 1 : 1 - (t - 0.55) / 0.45;
    const scale = (0.55 + 0.62 * inT) * tier.glyph;
    const size = Math.min(W, H) * 0.26 * scale;
    ctx.globalAlpha = Math.max(0, 0.82 * fade);
    ctx.fillStyle = tier.core;
    ctx.strokeStyle = tier.trail;
    ctx.lineWidth = Math.max(1.5, size * 0.02);
    ctx.font = `${size}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', W / 2, H / 2);
    ctx.strokeText('★', W / 2, H / 2);

    if (tier.ring) {
      const r = Math.min(W, H) * (0.14 + 0.34 * t);
      ctx.globalAlpha = Math.max(0, 0.5 * (1 - t));
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function fire(name) {
    const tier = TIERS[name];
    if (!tier) return;
    if (reduced()) return;
    if (document.hidden) return;   // no point animating into a backgrounded app

    mount();
    const W = window.innerWidth, H = window.innerHeight;
    const parts = spawn(tier, W, H);
    const start = performance.now();

    function frame(now) {
      const elapsed = (now - start) / 1000;
      const t = elapsed / (tier.ms / 1000);
      if (t >= 1) { teardown(); return; }

      ctx.clearRect(0, 0, W, H);
      parts.forEach(p => {
        const pt = t - p.delay;
        if (pt <= 0) return;
        const local = pt / p.life;
        if (local > 1) return;
        const x = p.x + p.vx * pt, y = p.y + p.vy * pt;
        // ease out at both ends so nothing pops into or out of existence
        const alpha = Math.sin(Math.min(1, local) * Math.PI) * 0.95;
        drawComet({ x, y, vx: p.vx, vy: p.vy, len: p.len, w: p.w }, alpha, tier);
      });
      drawGlyph(tier, t, W, H);
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
  }

  return { fire, tiers: () => Object.keys(TIERS) };
})();

window.Celebrate = Celebrate;

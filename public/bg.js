/* ------------------------------------------------------------------ */
/*  INDEXA BG — animation canvas « flux de données » en arrière-plan   */
/*  Zéro dépendance. Perf-first : pause si onglet caché, 30 fps max,   */
/*  stop immédiat si prefers-reduced-motion.                           */
/* ------------------------------------------------------------------ */
(() => {
  const canvas = document.getElementById('bgfx');
  if (!canvas) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) { canvas.remove(); return; }

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) { canvas.remove(); return; }

  /* -------------------------- état global --------------------------- */
  let W = 0, H = 0, dpr = 1;
  let cols = [];          // colonnes de chute de glyphes
  let drift = [];         // gros glyphes flottants très lents
  let last = 0;
  const FRAME_MS = 1000 / 30;

  const WORDS = ['{{city}}', '{{service}}', 'LOME', 'KARA', 'SOKODE', 'ATAKPAME',
                 'CSV', 'SEO', '/fr/', '/en/', 'SELECT', 'PAGE', 'URL'];

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // colonnes de chute : toutes les ~90px
    const n = Math.max(6, Math.floor(W / 90));
    cols = Array.from({ length: n }, (_, i) => ({
      x: (i + 0.5) * (W / n),
      y: Math.random() * H,
      speed: 40 + Math.random() * 70,        // px/s
      glyph: WORDS[(Math.random() * WORDS.length) | 0],
      next: 0
    }));

    // gros glyphes flottants : ~4
    drift = Array.from({ length: 4 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8,
      glyph: WORDS[(Math.random() * WORDS.length) | 0],
      size: 90 + Math.random() * 110,
      rot: (Math.random() - 0.5) * 0.3
    }));
  }

  /* ---------------------------- dessin ------------------------------ */
  function frame(t) {
    if (!running) return;
    requestAnimationFrame(frame);
    if (t - last < FRAME_MS) return;
    const dt = Math.min(0.1, (t - last) / 1000);
    last = t;

    ctx.clearRect(0, 0, W, H);

    // chute de glyphes (fine, orangée/dim)
    ctx.font = '600 13px "Neue Haas Grotesk", Arial, sans-serif';
    ctx.textBaseline = 'top';
    for (const c of cols) {
      c.y += c.speed * dt;
      if (c.y > H + 40) { c.y = -30; c.glyph = WORDS[(Math.random() * WORDS.length) | 0]; }
      ctx.fillStyle = 'rgba(113, 113, 122, 0.18)';
      ctx.fillText(c.glyph, c.x, c.y);
    }

    // gros glyphes flottants (très faibles, tournés)
    for (const d of drift) {
      d.x += d.vx * dt; d.y += d.vy * dt;
      if (d.x < -200) d.x = W + 100; if (d.x > W + 200) d.x = -100;
      if (d.y < -200) d.y = H + 100; if (d.y > H + 200) d.y = -100;
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rot);
      ctx.font = `500 ${d.size}px "Neue Haas Grotesk", Arial, sans-serif`;
      ctx.fillStyle = 'rgba(24, 24, 27, 0.06)';
      ctx.fillText(d.glyph, 0, 0);
      ctx.restore();
    }
  }

  /* ------------------------- cycle de vie --------------------------- */
  let running = false;
  function start() {
    if (running || document.hidden) return;
    running = true; last = 0;
    requestAnimationFrame(frame);
  }
  function stop() { running = false; }

  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  addEventListener('resize', () => { resize(); }, { passive: true });

  resize();
  start();
})();

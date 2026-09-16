/* ------------------------------------------------------------------ */
/*  INDEXA CLIENT — reveals, parallax, generate workflow               */
/* ------------------------------------------------------------------ */
(() => {
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => [...(c || document).querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------ reveals ------------------------------ */
  const rvs = $$('.rv');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    rvs.forEach(el => io.observe(el));
  } else {
    rvs.forEach(el => el.classList.add('in'));
  }

  /* ---------------------------- hero parallax --------------------------- */
  const stage = $('.stage');
  const heroH1 = $('.hero h1');
  if (stage && !reduced) {
    let raf = null;
    addEventListener('scroll', () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const y = scrollY;
        if (y < innerHeight * 1.2) {
          stage.style.transform = `translateY(${y * 0.12}px)`;
          if (heroH1) heroH1.style.transform = `translateY(${y * -0.04}px)`;
        }
        raf = null;
      });
    }, { passive: true });
  }

  /* ------------------- 02: template → pages cycle ---------------------- */
  $$('.tplflow').forEach(flow => {
    const vars = $$('.var', flow);
    const res = $$('.results .r', flow);
    if (!vars.length || !res.length) return;

    const cycle = () => {
      res.forEach(r => { r.style.opacity = '0.3'; });
      vars.forEach(v => { v.style.borderColor = 'var(--line)'; });
      setTimeout(() => {
        vars.forEach(v => { v.style.borderColor = 'var(--accent)'; });
        res.forEach(r => { r.style.opacity = '1'; });
      }, 900);
    };

    let timer = null;
    const io2 = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting && !timer) {
          cycle();
          timer = setInterval(cycle, 4200);
          io2.unobserve(e.target);
        }
      });
    }, { threshold: 0.4 });
    io2.observe(flow);
  });

  /* ---------------------- generate: live URL preview ------------------- */
  const urlInput = $('#turl');
  const csvtext = $('#csvtext');
  const preview = $('#gpreview');

  function parseFirstRow(csv) {
    const lines = csv.split('\n').map(s => s.trim()).filter(Boolean);
    if (lines.length < 2) return {};
    const keys = lines[0].split(',').map(s => s.trim().toLowerCase().replace(/\s+/g, '-'));
    const row = {};
    lines[1].split(',').forEach((v, i) => { if (keys[i]) row[keys[i]] = v; });
    return row;
  }

  function updatePreview() {
    if (!preview || !urlInput) return;
    const row = parseFirstRow(csvtext ? csvtext.value : '');
    const out = urlInput.value.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, n) => {
      const k = n.toLowerCase();
      const base = k.replace(/-slug$/, '');
      let val = row[base] || `{{${base}}}`;
      if (k.endsWith('-slug')) val = String(val).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      return val;
    });
    preview.textContent = 'PREVIEW — ' + out;
  }

  if (urlInput) {
    urlInput.addEventListener('input', updatePreview);
    if (csvtext) csvtext.addEventListener('input', updatePreview);
    updatePreview();
  }

  /* -------------------------- generate workflow ------------------------ */
  const genbtn = $('#genbtn');
  const gcount = $('#gcount');
  const pfill = $('#pfill');
  const gdone = $('#gdone');
  const plist = $('#plist');

  const toast = msg => { if (gdone) gdone.textContent = msg; };

  if (genbtn) {
    genbtn.addEventListener('click', async () => {
      genbtn.disabled = true;
      if (gdone) gdone.textContent = '';
      if (plist) plist.innerHTML = '';

      try {
        /* 1 — import CSV into the database */
        const csv = csvtext ? csvtext.value : '';
        if (!csv.trim()) throw new Error('Paste or import a CSV first.');
        toast('IMPORTING DATASET…');

        const impRes = await fetch('/api/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ csv })
        });
        const imp = await impRes.json();
        if (!imp.ok) throw new Error(imp.error || 'Import failed');

        /* 2 — generate pages from template + dataset */
        toast('GENERATING…');
        const total = imp.rows;
        const step = Math.max(1, Math.round(total / 20));
        let shown = 0;
        const tick = setInterval(() => {
          shown = Math.min(total, shown + step);
          if (gcount) gcount.textContent = `${String(shown).padStart(3, '0')} / ${String(total).padStart(3, '0')} PAGES`;
          if (pfill) pfill.style.width = `${(shown / total) * 100}%`;
        }, 60);

        const genRes = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            datasetId: imp.datasetId,
            title: $('#ttitle').value,
            meta: $('#tmeta').value,
            h1: $('#th1').value,
            content: $('#tcontent').value,
            urlPattern: $('#turl').value,
            limit: imp.rows
          })
        });

        clearInterval(tick);
        const gen = await genRes.json();
        if (!gen.ok) throw new Error(gen.error || 'Generation failed');

        /* 3 — done state */
        if (gcount) gcount.textContent = `${String(gen.generated).padStart(3, '0')} / ${String(gen.generated).padStart(3, '0')} PAGES`;
        if (pfill) pfill.style.width = '100%';
        toast(`DONE — ${gen.generated} PAGES LIVE IN ${(gen.duration_ms / 1000).toFixed(1)}S — SITEMAP UPDATED`);

        if (plist && gen.pages) {
          gen.pages.slice(0, 12).forEach((p, i) => {
            const a = document.createElement('a');
            a.href = p.url;
            a.style.animationDelay = `${i * 0.05}s`;
            const s1 = document.createElement('span');
            s1.textContent = p.h1.replace(/\n/g, ' ');
            const s2 = document.createElement('span');
            s2.className = 'rurl';
            s2.textContent = p.url;
            a.append(s1, s2);
            plist.append(a);
          });
        }

        genbtn.disabled = false;
        genbtn.textContent = 'GENERATE AGAIN';
      } catch (err) {
        toast('ERROR — ' + err.message.toUpperCase());
        genbtn.disabled = false;
      }
    });
  }

  /* -------------------------- csv file import -------------------------- */
  const fileInput = $('#csv');
  if (fileInput) {
    fileInput.addEventListener('change', () => {
      const f = fileInput.files && fileInput.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (csvtext) {
          csvtext.value = String(reader.result || '');
          csvtext.dispatchEvent(new Event('input'));
        }
      };
      reader.readAsText(f);
    });
  }

  /* ---------------------- variable chips insert ------------------------ */
  $$('.varchip').forEach(chip => {
    chip.addEventListener('click', () => {
      const focused = [$('#ttitle'), $('#tmeta'), $('#th1'), $('#tcontent'), urlInput]
        .find(el => el && el === document.activeElement);
      const target = focused || $('#ttitle');
      const v = chip.dataset.var;
      const ins = `{{${v}}}`;
      const start = target.selectionStart ?? target.value.length;
      const end = target.selectionEnd ?? target.value.length;
      target.value = target.value.slice(0, start) + ins + target.value.slice(end);
      target.focus();
      target.selectionStart = target.selectionEnd = start + ins.length;
      target.dispatchEvent(new Event('input'));
    });
  });
})();

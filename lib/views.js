/* ------------------------------------------------------------------ */
/*  INDEXA VIEWS — server rendered html, zero framework                */
/* ------------------------------------------------------------------ */
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const HAS_HERO_VIDEO = (() => {
  try {
    return fs.existsSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'hero.mp4'));
  } catch { return false; }
})();

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function nav(active = '') {
  const links = [
    ['/pages', 'INDEX'],
    ['/#how', 'HOW IT WORKS'],
    ['/generate', 'GENERATE'],
    ['/#about', 'ABOUT']
  ];
  return `<header class="nav">
    <a class="nav-brand" href="/">INDEXA</a>
    <nav class="nav-links" aria-label="Primary">
      ${links.map(([h, t]) => `<a href="${h}"${active === t ? ' class="on"' : ''}><span class="num">0${links.findIndex(l => l[1] === t) + 1}</span>${t}</a>`).join('')}
    </nav>
    <button class="menu-btn" aria-label="Open menu" onclick="document.body.classList.toggle('mopen')">MENU</button>
  </header>
  <div class="mnav">
    ${links.map(([h, t]) => `<a href="${h}">${t}</a>`).join('')}
  </div>`;
}

function footer(baseUrl) {
  return `<footer class="footer">
    <div class="fline-full"></div>
    <div class="fbrand">
      <span>INDEXA</span>
      <span class="fmeta">PROGRAMMATIC SEO — BUILT IN ${new Date().getFullYear()}</span>
    </div>
    <div class="fcols">
      <a href="/generate">START GENERATING</a>
      <a href="/sitemap.xml">SITEMAP</a>
      <a href="${esc(baseUrl)}" rel="noopener">${esc(baseUrl.replace(/^https?:\/\//, ''))}</a>
    </div>
    <div class="fmeta">EVERY PAGE ON THIS SITE WAS GENERATED FROM DATA.</div>
  </footer>`;
}

function head({ title, description, canonical, ogType = 'website', jsonLd = [], ogImage }) {
  const ld = (Array.isArray(jsonLd) ? jsonLd : [jsonLd])
    .filter(Boolean).map(o => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n  ');
  return `<meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${esc(canonical)}">
  <meta name="theme-color" content="#ffffff">
  <meta property="og:type" content="${ogType}">
  <meta property="og:site_name" content="INDEXA">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(canonical)}">
  <meta property="og:image" content="${esc(ogImage || canonical.split('/').slice(0, 3).join('/') + '/og/home.png')}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${esc(ogImage || canonical.split('/').slice(0, 3).join('/') + '/og/home.png')}">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%23ffffff'/%3E%3Crect x='9' y='6' width='3' height='20' fill='%2318181b'/%3E%3Crect x='16' y='12' width='9' height='3' fill='%23fc5f2b'/%3E%3Crect x='16' y='18' width='9' height='2' fill='%23a1a1aa'/%3E%3C/svg%3E">
  <link rel="stylesheet" href="/styles.css">
  ${ld}`;
}

/* ================================================================== */
/*  LANDING                                                            */
/* ================================================================== */

export function landing({ baseUrl, stats }) {
  const canonical = `${baseUrl}/`;
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'INDEXA',
      url: canonical,
      description: 'Programmatic SEO page generator.',
      publisher: { '@type': 'Organization', name: 'INDEXA', url: canonical }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'INDEXA',
      url: canonical,
      description: 'INDEXA transforms structured data into scalable, searchable and carefully structured web pages.'
    }
  ];
  const rows = [
    ['CITY', 'SERVICE'],
    ['LOME', 'WEB DESIGN'],
    ['KARA', 'WEB DESIGN'],
    ['SOKODE', 'WEB DESIGN']
  ];

  return `<!doctype html>
<html lang="en">
<head>
${head({
    title: 'INDEXA — PROGRAMMATIC SEO PAGE GENERATOR',
    description: 'Generate scalable SEO pages from structured data with dynamic templates, clean URLs and automated internal linking.',
    canonical,
    jsonLd
  })}
</head>
${nav('INDEX')}

<main>
  <!-- ============================ HERO ============================ -->
  <section class="hero" id="index">
    ${HAS_HERO_VIDEO
      ? '<video class="bgvideo full" autoplay muted loop playsinline preload="metadata" aria-hidden="true"><source src="/hero.mp4" type="video/mp4"></video><div class="hero-scrim" aria-hidden="true"></div>'
      : '<canvas class="bgfx" id="bgfx" aria-hidden="true"></canvas>'}
    <div class="hero-inner dark">
      <p class="kicker rv">PROGRAMMATIC SEO ENGINE</p>
      <h1 class="rv" style="--d:.08s">TURN ONE DATASET<br>INTO THOUSANDS<br>OF USEFUL PAGES.</h1>
      <p class="sub rv" style="--d:.2s">INDEXA transforms structured data into scalable, searchable and carefully structured web pages.</p>
      <div class="btns rv" style="--d:.32s">
        <a class="btn" href="/generate">START GENERATING</a>
        <a class="btn ghost" href="#how">SEE HOW IT WORKS</a>
      </div>
    </div>
    <div class="herostrip rv" style="--d:.5s" aria-hidden="true">
      <div class="hstrack">
        ${[
          ['video', '/hero.mp4', '01', 'LE NOIR'],
          ['video', '/generate.mp4', '02', 'LE SIGNAL'],
          ['img', '/milkyway.jpg', '03', 'L’AMPLEUR'],
          ['video', '/publish.mp4', '04', 'LA LUMIÈRE'],
          ['img', '/stars.jpg', '05', 'LA CARTE'],
          ['video', '/night-sky.mp4', '06', 'LA DÉRIVE'],
          ['video', '/candle.mp4', '07', 'L’ÉTINCELLE'],
          ['video', '/hero.mp4', '01', 'LE NOIR'],
          ['video', '/generate.mp4', '02', 'LE SIGNAL'],
          ['img', '/milkyway.jpg', '03', 'L’AMPLEUR'],
          ['video', '/publish.mp4', '04', 'LA LUMIÈRE'],
          ['img', '/stars.jpg', '05', 'LA CARTE'],
          ['video', '/night-sky.mp4', '06', 'LA DÉRIVE'],
          ['video', '/candle.mp4', '07', 'L’ÉTINCELLE']
        ].map(([kind, src, n, t]) => `
        <figure class="hstrip">${kind === 'video'
          ? `<video src="${src}" muted loop playsinline preload="metadata"></video>`
          : `<img src="${src}" alt="" loading="lazy">`}
          <figcaption><span class="hn">${n}</span>${t}</figcaption>
        </figure>`).join('')}
      </div>
    </div>
    <div class="scrollhint" aria-hidden="true">SCROLL<span></span></div>
  </section>

  <!-- ========================= 01 — INPUT ========================= -->
  <section class="sec" id="how">
    <div class="sec-head">
      <p class="label rv">01 — INPUT</p>
      <h2 class="rv" style="--d:.08s">START<br>WITH DATA.</h2>
    </div>
    <p class="lead rv" style="--d:.16s">Import cities, products, services, categories or any structured dataset.</p>
    <div class="tablewrap rv" style="--d:.24s">
      <div class="dtable" role="table" aria-label="Example dataset">
        ${rows.map((r, i) => `<div class="r${i === 0 ? ' head' : ''}" role="row" style="--i:${i}">
          <span class="c" role="cell">${r[0]}</span><span class="c" role="cell">${r[1]}</span>
        </div>`).join('')}
      </div>
      <div class="tmeta"><span>DATASET — TOGO / CITIES × SERVICES</span><span>CSV IMPORTED</span></div>
    </div>
  </section>

  <!-- ======================== 02 — TEMPLATE ======================= -->
  <section class="sec">
    <div class="sec-head">
      <p class="label rv">02 — TEMPLATE</p>
      <h2 class="rv" style="--d:.08s">ONE STRUCTURE.<br>ENDLESS PAGES.</h2>
    </div>
    <div class="tplflow">
      <div class="tplcode rv" aria-label="Template with variables">
        <div class="var" data-v="city">{{city}}</div>
        <div class="var" data-v="service">{{service}}</div>
        <div class="var" data-v="description">{{description}}</div>
        <div class="tplline">SAMPLE — {{service}} IN {{city}}</div>
      </div>
      <div class="tplarrows rv" style="--d:.1s"><span></span><span></span><span></span></div>
      <div class="results rv" style="--d:.2s" aria-label="Rendered pages">
        <div class="r">WEB DESIGN IN LOME</div>
        <div class="r">WEB DESIGN IN KARA</div>
        <div class="r">WEB DESIGN IN SOKODE</div>
      </div>
    </div>
  </section>

  <!-- ======================== 03 — GENERATE ======================= -->
  <section class="sec">
    <div class="sec-head">
      <p class="label rv">03 — GENERATE</p>
      <h2 class="rv" style="--d:.08s">FROM<br>ONE ROW<br>TO ONE PAGE.</h2>
    </div>
    <div class="fcol" aria-hidden="true">
      <div class="fbox rv">DATA</div>
      <div class="farrow rv" style="--d:.06s"></div>
      <div class="fbox rv" style="--d:.12s">TEMPLATE</div>
      <div class="farrow rv" style="--d:.18s"></div>
      <div class="fbox rv" style="--d:.24s">PAGE</div>
    </div>
    <div class="steps">
      <p class="stepslabel rv">SCALE — ONE DATASET BECOMES</p>
      <div class="srow rv" style="--d:.08s"><span class="snum">1</span><span class="slabel">DATASET</span><span class="sscan"></span></div>
      <div class="srow rv" style="--d:.16s"><span class="snum">100</span><span class="slabel">PAGES</span><span class="sscan"></span></div>
      <div class="srow rv" style="--d:.24s"><span class="snum">1,000</span><span class="slabel">PAGES</span><span class="sscan"></span></div>
      <div class="srow rv" style="--d:.32s"><span class="snum">10,000</span><span class="slabel">PAGES</span><span class="sscan"></span></div>
    </div>
  </section>

  <!-- ========================== 04 — SEARCH ======================= -->
  <section class="sec">
    <div class="sec-head">
      <p class="label rv">04 — SEARCH</p>
      <h2 class="rv" style="--d:.08s">BUILT FOR<br>DISCOVERY.</h2>
    </div>
    <p class="lead rv" style="--d:.14s">Every generated page ships with the full anatomy of a page that deserves to be found.</p>
    <div class="fragwrap">
      ${['TITLE', 'META DESCRIPTION', 'H1', 'CANONICAL', 'BREADCRUMBS', 'INTERNAL LINKS', 'STRUCTURED DATA', 'SITEMAP']
      .map((t, i) => `<div class="frag rv" style="--d:${i * 0.05}s"><span class="fn">0${i + 1}</span><span>${t}</span><span class="fstat">${['112 CHAR MAX', '155 CHAR MAX', 'ONE ONLY', 'SELF-REFERENCING', 'HIERARCHY', 'MESH OF 4', 'JSON-LD', 'AUTO-UPDATED'][i]}</span></div>`).join('')}
    </div>
  </section>

  <!-- ========================== 05 — PUBLISH ====================== -->
  <section class="sec">
    <div class="sec-head">
      <p class="label rv">05 — PUBLISH</p>
      <h2 class="rv" style="--d:.08s">PAGES THAT<br>LIVE ON THE WEB.</h2>
    </div>
    <p class="lead rv" style="--d:.14s">Each row of data becomes a permanent public URL — crawlable, shareable, connected.</p>
    <div class="urllist">
      ${['/web-design/lome', '/web-design/kara', '/web-design/sokode'].map((u, i) => `
      <a class="urlitem rv" style="--d:${0.1 + i * 0.08}s" href="${u}">
        <span class="ufig">${esc(baseUrl.replace(/^https?:\/\//, ''))}</span>
        <span class="upath">${u}</span>
        <span class="urlbar"><i style="--w:${[86, 64, 92][i]}%"></i></span>
      </a>`).join('')}
    </div>
    <p class="ufoot rv">THESE URLS EXIST. CLICK ONE.</p>
  </section>

  <!-- ======================= VISUAL CYCLE ========================= -->
  <section class="cycle">
    <div class="sec-head">
      <p class="label rv">THE CYCLE — DATA NEVER SLEEPS</p>
      <h2 class="rv" style="--d:.08s">EVERY PAGE<br>BEGINS IN<br>THE DARK.</h2>
      <p class="lead rv" style="--d:.16s">Three movements, one machine: smoke becomes signal, signal becomes pages, pages find their readers. Same night sky, same engine.</p>
    </div>
    <div class="cycle-grid">
      <figure class="cyc rv" style="--d:.1s">
        <video muted loop playsinline autoplay preload="none" data-src="/generate.mp4" aria-hidden="true"></video>
        <figcaption><span class="cycnum">01</span><span class="cyct">INPUT</span><span class="cycd">Raw demand drifts in the dark — searches nobody answers yet.</span></figcaption>
      </figure>
      <figure class="cyc rv" style="--d:.18s">
        <video muted loop playsinline autoplay preload="none" data-src="/publish.mp4" aria-hidden="true"></video>
        <figcaption><span class="cycnum">02</span><span class="cyct">PUBLISH</span><span class="cycd">Rows become permanent URLs, each one a light on the map.</span></figcaption>
      </figure>
      <a class="cyc rv" style="--d:.26s" href="/generate">
        <span class="cyccta"><span class="cycnum">03</span><span class="cyct">YOUR TURN</span></span>
        <span class="cycd">Import a dataset, write a template, generate yours now.</span>
        <span class="cycgo">START GENERATING →</span>
      </a>
    </div>
  </section>

  <!-- ============================ ABOUT =========================== -->
  <section class="sec" id="about">
    <div class="sec-head">
      <p class="label rv">06 — ABOUT</p>
      <h2 class="rv" style="--d:.08s">A QUIET MACHINE<br>FOR BEING FOUND.</h2>
    </div>
    <div class="about-cols">
      <p class="rv" style="--d:.14s">INDEXA is a programmatic SEO engine. It takes the data you already have — a spreadsheet of cities, services, products — and turns every row into a page worth reading.</p>
      <p class="rv" style="--d:.22s">No dashboards. No noise. One dataset, one template, one workflow: import, generate, publish. The pages live on the web and keep working.</p>
    </div>
    <div class="statline rv" style="--d:.3s">
      <span><b>${stats.pages}</b> PAGES GENERATED</span>
      <span><b>${stats.datasets}</b> DATASET${stats.datasets === 1 ? '' : 'S'}</span>
      <span><b>${stats.generations}</b> RUNS</span>
    </div>
  </section>
</main>

${footer(baseUrl)}
<script src="/bg.js" defer></script>
<script src="/app.js" defer></script>
</body>
</html>`;
}

/* ================================================================== */
/*  GENERATE                                                           */
/* ================================================================== */

export function generateView({ baseUrl, datasets, templates, variables, urlPattern }) {
  const canonical = `${baseUrl}/generate`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'INDEXA — Generate pages',
    url: canonical,
    description: 'Import a dataset, define a template, generate SEO pages.'
  };
  const dsOptions = datasets.map(d => `<option value="${d.id}" data-rows="${d.rows}">${esc(d.name)} — ${d.rows} ROWS</option>`).join('');
  const tplOptions = '<option value="">— CREATE NEW — FROM FIELDS ABOVE —</option>' +
    templates.map(t => `<option value="${t.id}">${esc(t.name)} — ${esc(t.url_pattern)}</option>`).join('');

  return `<!doctype html>
<html lang="en">
<head>
${head({
    title: 'INDEXA — GENERATE PAGES',
    description: 'Import a CSV dataset, define your template with variables, generate and publish SEO pages at clean URLs.',
    canonical,
    jsonLd
  })}
</head>
<body class="pgen">
${nav('GENERATE')}
<main class="gwrap">
  <p class="glabel rv">GENERATOR — DATASET TO PUBLIC URL</p>

  <section class="gsection">
    <div class="ghead rv"><span class="gnum">01</span><h2>DATASET</h2><span class="ghint">CSV — FIRST ROW = COLUMN NAMES</span></div>
    <div class="csvwrap rv" style="--d:.08s">
      <label class="filebtn" for="csv">[ IMPORT CSV ]<input type="file" id="csv" accept=".csv,text/csv" hidden></label>
      <textarea id="csvtext" class="csvtext" rows="6" spellcheck="false" placeholder="city,service,description&#10;LOME,WEB DESIGN,Custom websites for Lome businesses&#10;KARA,WEB DESIGN,Conversion-focused sites for Kara teams"></textarea>
    </div>
  </section>

  <section class="gsection">
    <div class="ghead rv"><span class="gnum">02</span><h2>TEMPLATE</h2><span class="ghint">USE {{VARIABLES}} ANYWHERE</span></div>
    <div class="fields">
      <div class="frow rv" style="--d:.06s"><label for="ttitle">TITLE</label><input id="ttitle" class="inputline" value="{{service}} in {{city}} — INDEXA" maxlength="120"></div>
      <div class="frow rv" style="--d:.1s"><label for="tmeta">META DESCRIPTION</label><input id="tmeta" class="inputline" value="{{description}}" maxlength="160"></div>
      <div class="frow rv" style="--d:.14s"><label for="th1">H1</label><input id="th1" class="inputline" value="{{service}}&#10;{{city}}" maxlength="120"></div>
      <div class="frow rv" style="--d:.18s"><label for="tcontent">CONTENT</label><textarea id="tcontent" class="inputline area" rows="7" spellcheck="false">## What we do in {{city}}
INDEXA builds {{service}} engagements for teams operating in {{city}}. Every page you are reading was generated from a single structured row and published at a clean, permanent URL.

## Why it works
The same structure that produces this page can produce a thousand more. Data in, pages out: consistent titles, honest descriptions and internal links that connect every city and every service.</textarea></div>
    </div>
    <div class="varlist rv" style="--d:.22s">
      <span class="vlabel">AVAILABLE VARIABLES:</span>
      ${variables.map(v => `<button type="button" class="varchip" data-var="${v}">{{${v}}}</button>`).join('')}
    </div>
  </section>

  <section class="gsection">
    <div class="ghead rv"><span class="gnum">03</span><h2>OUTPUT</h2><span class="ghint">WHERE PAGES WILL LIVE</span></div>
    <div class="frow rv" style="--d:.06s">
      <label for="turl">URL PATTERN</label>
      <input id="turl" class="inputline mono" value="${esc(urlPattern)}" maxlength="160">
    </div>
    <div class="frow rv" style="--d:.1s">
      <label for="dsel">DATASET SOURCE</label>
      <select id="dsel" class="inputline sel">${dsOptions || '<option value="">— NO DATASET YET — IMPORT CSV ABOVE —</option>'}</select>
    </div>
    <div class="frow rv" style="--d:.14s">
      <label for="tsel">TEMPLATE PRESET</label>
      <select id="tsel" class="inputline sel">${tplOptions || '<option value="">— NONE —</option>'}</select>
    </div>
    <p class="gpreview rv" style="--d:.18s" id="gpreview">PREVIEW — {{service-slug}}/{{city-slug}}</p>
  </section>

  <section class="gaction">
    <button id="genbtn" class="genbtn rv" type="button">GENERATE PAGES</button>
    <p class="gcount rv" style="--d:.08s"><span id="gcount">000 / 100 PAGES</span></p>
    <div class="prog rv" style="--d:.12s" aria-hidden="true"><div class="pline"><i class="pfill" id="pfill"></i></div></div>
    <p class="gdone" id="gdone" role="status"></p>
    <div class="plist" id="plist"></div>
  </section>
</main>
${footer(baseUrl)}
<script src="/app.js" defer></script>
</body>
</html>`;
}

/* ================================================================== */
/*  PUBLIC GENERATED PAGE                                              */
/* ================================================================== */

export function publicPage({ baseUrl, page, faq, related, crumbs, total, views = 0, whatsapp }) {
  const waMsg = encodeURIComponent(
    `Bonjour INDEXA, je viens de la page "${String(page.h1 || '').replace(/\n/g, ' ')}" (${baseUrl}${page.url}) et je souhaite en savoir plus.`
  );
  const waBtn = whatsapp
    ? `<a class="wafab" href="https://wa.me/${esc(whatsapp)}?text=${waMsg}" target="_blank" rel="noopener" aria-label="Contact WhatsApp">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M12.04 2a9.9 9.9 0 0 0-8.4 15.2L2 22l4.95-1.6A9.9 9.9 0 1 0 12.04 2Zm5.8 14.1c-.25.7-1.45 1.35-2 1.4-.5.05-1.15.25-3.85-.8-3.25-1.3-5.3-4.6-5.45-4.8-.15-.2-1.3-1.75-1.3-3.35 0-1.6.85-2.4 1.15-2.7.3-.3.65-.4.85-.4h.6c.2 0 .45-.05.7.55.25.6.85 2.1.95 2.25.1.15.15.35.05.55-.1.2-.2.4-.4.6-.2.2-.4.5-.3.7.1.2.55.9 1.2 1.5.85.75 1.55 1 1.75 1.1.2.1.35.1.5-.05.15-.15.6-.7.75-.95.15-.25.3-.2.5-.15.2.05 1.65.8 1.95.95.3.15.5.25.55.35.05.1.05.6-.2 1.3Z"/></svg>
        <span>DISCUTER</span>
      </a>`
    : '';
  const canonical = `${baseUrl}${page.url}`;
  const jsonLd = [
    JSON.parse(page.structured_data || '{}'),
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((c, i) => ({
        '@type': 'ListItem', position: i + 1, name: c.name, ...(c.url ? { item: `${baseUrl}${c.url}` } : {})
      }))
    },
    ...(faq && faq.length ? [{
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map(f => ({
        '@type': 'Question', name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a }
      }))
    }] : [])
  ];
  const faqHtml = faq && faq.length ? `
    <section class="faqsec">
      <p class="publabel rv">FAQ</p>
      ${faq.map((f, i) => `<div class="faq rv" style="--d:${i * 0.05}s">
        <h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>
      </div>`).join('')}
    </section>` : '';

  return `<!doctype html>
<html lang="en">
<head>
${head({
    title: page.title,
    description: page.meta_description,
    canonical,
    ogType: 'article',
    jsonLd,
    ogImage: `${baseUrl}/og/${page.id}.png`
  })}
</head>
<body class="ppage">
${nav()}
<main>
  <nav class="crumbs rv" aria-label="Breadcrumb">
    ${crumbs.map((c, i) => `${i ? '<span class="csep">/</span>' : ''}${c.url ? `<a href="${c.url}">${esc(c.name)}</a>` : `<span aria-current="page">${esc(c.name)}</span>`}`).join('')}
  </nav>

  <header class="pub">
    <p class="publabel rv">INDEXA — GENERATED PAGE ${String(page.id).padStart(3, '0')} / ${total}${views > 0 ? ` — ${views.toLocaleString('en-US')} VIEW${views > 1 ? 'S' : ''}` : ''}</p>
    <h1 class="rv" style="--d:.08s">${esc(page.h1).replace(/\n/g, '<br>')}</h1>
    <p class="p1 rv" style="--d:.16s">${esc(page.meta_description)}</p>
  </header>

  <div class="prose rv" style="--d:.2s">${page.content_html}</div>
  ${faqHtml}
  <section class="related">
    <div class="rhead">
      <p class="publabel rv">RELATED PAGES</p>
      <p class="rmeta rv">LINKED AUTOMATICALLY FROM THE DATASET</p>
    </div>
    <div class="rlist">
      ${related.map((r, i) => `<a class="ra rv" style="--d:${i * 0.06}s" href="${r.url}">
        <span>${esc(r.h1).replace(/\n/g, ' ')}</span>
        <span class="rurl">${esc(r.url)}</span>
      </a>`).join('')}
    </div>
  </section>
${waBtn}
</main>
${footer(baseUrl)}
<script src="/app.js" defer></script>
</body>
</html>`;
}

/* ================================================================== */
/*  PAGES INDEX — directory of every generated page                    */
/* ================================================================== */

export function pagesIndex({ baseUrl, pages, q = '' }) {
  const canonical = `${baseUrl}/pages`;
  const term = String(q || '').trim();

  // group by first URL segment (fr, en, …) — root pages fall under 'SEED'
  const groups = new Map();
  for (const p of pages) {
    const seg = (p.url || '').split('/').filter(Boolean)[0];
    const key = seg ? seg.toUpperCase() : 'SEED';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  const keys = [...groups.keys()].sort();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'INDEXA — Page index',
    url: canonical,
    description: `Directory of every page generated from data on INDEXA.`,
    ...(pages.length ? { mainEntity: {
      '@type': 'ItemList',
      numberOfItems: pages.length,
      itemListElement: pages.slice(0, 100).map((p, i) => ({
        '@type': 'ListItem', position: i + 1, url: `${baseUrl}${p.url}`, name: String(p.h1 || '').replace(/\n/g, ' ')
      }))
    } } : {})
  };

  return `<!doctype html>
<html lang="en">
<head>
${head({
    title: 'INDEXA — EVERY PAGE, INDEXED',
    description: `Browse all ${pages.length} pages generated from structured data — grouped by language, searchable.`,
    canonical,
    jsonLd
  })}
</head>
<body class="pindex">
${nav('INDEX')}
<main class="ixwrap">
  <p class="publabel rv">${term ? `SEARCH — ${esc(term.toUpperCase())}` : 'INDEX — EVERY PAGE GENERATED FROM DATA'}</p>
  <h1 class="rv" style="--d:.08s">${term ? `${pages.length} RESULT${pages.length === 1 ? '' : 'S'}.` : 'EVERY PAGE,<br>LISTED.'}</h1>

  <form class="ixsearch rv" style="--d:.16s" method="get" action="/pages">
    <input type="search" name="q" value="${esc(term)}" placeholder="SEARCH — CITY, SERVICE, URL…" aria-label="Search pages">
    ${term ? '<a class="ixclear" href="/pages">[ CLEAR ]</a>' : ''}
  </form>

  ${pages.length ? keys.map(k => `
  <section class="ixgroup rv" style="--d:.2s">
    <p class="ixglabel"><span class="hn">${k}</span>${groups.get(k).length} PAGE${groups.get(k).length === 1 ? '' : 'S'}</p>
    <div class="plist">
      ${groups.get(k).map(p => `<a href="${esc(p.url)}"><span>${esc(p.h1).replace(/\n/g, ' ')}</span><span class="rurl">${esc(p.url)}</span></a>`).join('')}
    </div>
  </section>`).join('')
  : `<div class="ixempty rv" style="--d:.2s">
      <p class="p1">No page matches${term ? ` “${esc(term)}”` : ''}.</p>
      <div class="btns"><a class="btn" href="/generate">START GENERATING</a></div>
    </div>`}
</main>
${footer(baseUrl)}
<script src="/app.js" defer></script>
</body>
</html>`;
}

/* ================================================================== */
/*  404                                                                */
/* ================================================================== */

export function notFound({ baseUrl, samples }) {
  return `<!doctype html>
<html lang="en">
<head>
${head({
    title: 'INDEXA — PAGE NOT FOUND',
    description: 'This page was never generated. Generate it from your dataset.',
    canonical: `${baseUrl}/404`
  })}
</head>
<body class="ppage">
${nav()}
<main class="nf">
  <p class="publabel">404 — NOT GENERATED</p>
  <h1>THIS PAGE DOESN'T<br>EXIST — YET.</h1>
  <p class="p1">It may never have been generated. Import a dataset and make it real.</p>
  <div class="btns">
    <a class="btn" href="/generate">START GENERATING</a>
  </div>
  ${samples && samples.length ? `<div class="nf-samples"><p class="publabel">RECENTLY GENERATED</p>
    ${samples.map(s => `<a class="ra" href="${s.url}"><span>${esc(s.h1).replace(/\n/g, ' ')}</span><span class="rurl">${esc(s.url)}</span></a>`).join('')}
  </div>` : ''}
</main>
${footer(baseUrl)}
<script src="/app.js" defer></script>
</body>
</html>`;
}

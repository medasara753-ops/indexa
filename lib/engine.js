/* ------------------------------------------------------------------ */
/*  INDEXA ENGINE — csv → template → pages → seo → links              */
/* ------------------------------------------------------------------ */

/* ---- CSV parser: quoted fields, , or ; delimiter, CRLF safe ------- */
export function parseCsv(text) {
  const src = String(text || '').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQ) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else if (c === '"') {
      inQ = true;
    } else if (c === ',' || c === ';') {
      row.push(field); field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); if (row.length > 1 || row[0] !== '') rows.push(row); }

  if (!rows.length) return [];
  const header = rows[0].map(h => h.trim().toLowerCase().replace(/\s+/g, '-'));
  return rows.slice(1).map(r => {
    const o = {};
    header.forEach((h, i) => { if (h) o[h] = (r[i] || '').trim(); });
    return o;
  }).filter(o => Object.values(o).some(v => v !== ''));
}

/* ---- Slug --------------------------------------------------------- */
export function slugify(v) {
  return String(v || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/['']/g, '')
    .replace(/&/g, ' et ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'x';
}

/* ---- Variables & interpolation ------------------------------------ */
export function findVariables(rows) {
  const set = new Set();
  rows.forEach(r => Object.keys(r).forEach(k => { if (k) set.add(k); }));
  return [...set].sort();
}

function get(row, key) {
  const k = String(key).trim().toLowerCase().replace(/\s+/g, '-');
  if (row[k] != null && row[k] !== '') return row[k];
  const found = Object.keys(row).find(x => x.toLowerCase() === k);
  return found ? row[found] : '';
}

export function interpolate(str, row) {
  return String(str || '').replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, name) => {
    const n = name.trim().toLowerCase();
    if (n.endsWith('-slug')) return slugify(get(row, n.slice(0, -5)));
    const v = get(row, n);
    if (n === 'description' || n === 'content' || n === 'text') return v;
    return String(v).toUpperCase();
  });
}

function interpRaw(str, row) {
  return String(str || '').replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, name) => get(row, name));
}

/* ---- Minimal markdown → HTML (h2/h3, p, li, a, strong, em) -------- */
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inline(s) {
  return esc(s)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

export function mdToHtml(md) {
  const lines = String(md || '').split(/\r?\n/);
  const out = [];
  let list = null;
  const closeList = () => { if (list) { out.push(`<${list}>` + items.join('') + `</${list}>`); list = null; items = []; } };
  let items = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { closeList(); continue; }
    const h = line.match(/^(#{2,4})\s+(.*)$/);
    if (h) {
      closeList();
      const lvl = Math.min(h[1].length + 1, 4); // ## → h3, ### → h4
      out.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`);
    } else if (/^[-*•]\s+/.test(line)) {
      if (!list) { closeList(); list = 'ul'; }
      items.push(`<li>${inline(line.replace(/^[-*•]\s+/, ''))}</li>`);
    } else {
      closeList();
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  closeList();
  return out.join('\n');
}

/* ---- FAQ generation (only if data supports it) -------------------- */
function buildFaq(row) {
  const service = get(row, 'service');
  const city = get(row, 'city');
  if (!service || !city) return [];
  const s = interpRaw('{{service}}', row);
  const c = interpRaw('{{city}}', row);
  return [
    { q: `What does ${s} in ${c} include?`, a: `A complete ${s.toLowerCase()} engagement for ${c}: definition, production and delivery — the same structured quality you see on this page.` },
    { q: `How do we start with ${s} in ${c}?`, a: `Send your context and constraints. The engagement is framed like the pages INDEXA produces: one clear structure, no unnecessary steps.` },
    { q: `Do you also work outside ${c}?`, a: `Yes. Related cities and services are linked at the bottom of this page — every page generated from the dataset is connected.` }
  ];
}

/* ---- Generation ---------------------------------------------------- */
export function generatePages(db, { datasetId, templateId, limit = 100, baseUrl }) {
  const t0 = Date.now();
  const dataset = db.prepare('SELECT * FROM datasets WHERE id = ?').get(datasetId);
  const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(templateId);
  if (!dataset || !template) return { ok: false, error: 'dataset or template not found' };

  const rows = db.prepare('SELECT * FROM data_rows WHERE dataset_id = ? ORDER BY position, id').all(datasetId);
  const parsed = rows.map(r => { try { return JSON.parse(r.data); } catch { return {}; } });

  const selectPage = db.prepare('SELECT id FROM generated_pages WHERE url = ?');
  const insertPage = db.prepare(`
    INSERT INTO generated_pages (dataset_id, template_id, url, title, meta_description, h1, content_html, keywords, faq)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertMeta = db.prepare(`
    INSERT INTO seo_metadata (page_id, canonical, og_title, og_description, structured_data)
    VALUES (?, ?, ?, ?, ?)`);

  const made = [];
  let generated = 0;
  for (const row of parsed) {
    if (made.length >= limit) break;
    if (!Object.values(row).some(v => String(v || '').trim() !== '')) continue;

    const segs = template.url_pattern.split('/').filter(Boolean).map(seg => slugify(interpolate(seg, row)));
    const url = '/' + segs.join('/');
    if (!url || url === '/') continue;
    if (selectPage.get(url)) continue;

    const title = interpolate(template.title, row).replace(/\s+/g, ' ').trim();
    const meta = interpolate(template.meta_description, row).replace(/\s+/g, ' ').trim();
    const h1 = interpolate(template.h1, row).replace(/\s+/g, ' ').trim();
    const bodyMd = interpRaw(template.content, row);
    const faq = buildFaq(row);
    const keywords = Object.values(row).map(v => String(v).toLowerCase()).filter(Boolean);

    const res = insertPage.run(datasetId, templateId, url, title, meta, h1, mdToHtml(bodyMd), JSON.stringify(keywords), JSON.stringify(faq));
    const pageId = Number(res.lastInsertRowid);
    const canonical = `${baseUrl}${url}`;

    const sd = {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: title,
      description: meta,
      url: canonical,
      areaServed: (get(row, 'city') || '').toUpperCase() || undefined,
      serviceType: (get(row, 'service') || '').toUpperCase() || undefined,
      provider: { '@type': 'Organization', name: 'INDEXA', url: baseUrl }
    };
    insertMeta.run(pageId, canonical, title, meta, JSON.stringify(sd));

    made.push({ id: pageId, url, title, h1, meta, keywords, canonical });
    generated++;
  }

  const duration = Date.now() - t0;
  db.prepare('INSERT INTO generation_events (dataset_id, requested, generated, duration_ms) VALUES (?, ?, ?, ?)')
    .run(datasetId, limit, generated, duration);
  rebuildLinks(db, baseUrl);
  return { ok: true, generated, pages: made, duration_ms: duration };
}

/* ---- Internal linking mesh ----------------------------------------- */
export function rebuildLinks(db, baseUrl) {
  const pages = db.prepare('SELECT id, url, title, keywords, dataset_id FROM generated_pages ORDER BY id').all();
  const del = db.prepare('DELETE FROM internal_links');
  const ins = db.prepare('INSERT OR IGNORE INTO internal_links (source_page_id, target_page_id) VALUES (?, ?)');

  const kws = pages.map(p => { try { return JSON.parse(p.keywords || '[]'); } catch { return []; } });

  del.run();
  for (let i = 0; i < pages.length; i++) {
    const scores = [];
    for (let j = 0; j < pages.length; j++) {
      if (i === j) continue;
      const shared = kws[i].filter(k => k && kws[j].includes(k)).length;
      if (shared > 0) scores.push([j, shared]);
    }
    scores.sort((a, b) => b[1] - a[1] || a[0] - b[0]);
    scores.slice(0, 4).forEach(([j]) => ins.run(pages[i].id, pages[j].id));
  }
  return pages.length;
}

export function relatedFor(db, page, baseUrl, n = 3) {
  const rows = db.prepare(`
    SELECT p.id, p.url, p.h1, p.title FROM internal_links l
    JOIN generated_pages p ON p.id = l.target_page_id
    WHERE l.source_page_id = ? ORDER BY p.id LIMIT ?`).all(page.id, n);
  if (rows.length >= n) return rows.map(r => ({ ...r, canonical: `${baseUrl}${r.url}` }));
  const extra = db.prepare(`
    SELECT id, url, h1, title FROM generated_pages
    WHERE id != ? AND id NOT IN (${rows.map(() => '?').join(',') || '0'})
    ORDER BY id LIMIT ?`).all(page.id, ...rows.map(r => r.id), n - rows.length);
  return [...rows, ...extra].map(r => ({ ...r, canonical: `${baseUrl}${r.url}` }));
}

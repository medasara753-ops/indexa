/* ------------------------------------------------------------------ */
/*  INDEXA SERVER — http, api, sitemap, robots — zero dependencies     */
/* ------------------------------------------------------------------ */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb, ensureSeed, BASE_URL } from './lib/db.js';
import { parseCsv, slugify, findVariables, generatePages, rebuildLinks, relatedFor } from './lib/engine.js';
import { landing, generateView, publicPage, notFound } from './lib/views.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT || 3000);

const db = getDb();
ensureSeed(db);

/* First boot: generate the seed pages so public URLs exist immediately */
if (!db.prepare('SELECT COUNT(*) c FROM generated_pages').get().c) {
  const ds = db.prepare('SELECT id FROM datasets ORDER BY id LIMIT 1').get();
  const tpl = db.prepare('SELECT id FROM templates ORDER BY id LIMIT 1').get();
  if (ds && tpl) {
    const seeded = generatePages(db, { datasetId: ds.id, templateId: tpl.id, limit: 500, baseUrl: BASE_URL });
    console.log(`INDEXA — seeded ${seeded.generated} public pages from the default dataset.`);
  }
}
rebuildLinks(db, BASE_URL);

/* ---------------------------- helpers ------------------------------ */
const MIME = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

function send(res, code, body, headers = {}) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
  res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8', ...headers });
  res.end(buf);
}
const json = (res, code, obj) => send(res, code, JSON.stringify(obj), { 'Content-Type': 'application/json; charset=utf-8' });

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 2_000_000) { reject(new Error('body too large')); req.destroy(); } });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function collectStats() {
  const q = sql => db.prepare(sql).get().c;
  return {
    pages: q('SELECT COUNT(*) c FROM generated_pages'),
    datasets: q('SELECT COUNT(*) c FROM datasets'),
    generations: q('SELECT COUNT(*) c FROM generation_events')
  };
}

/* ------------------------------ server ----------------------------- */
const server = http.createServer(async (req, res) => {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath.length > 1 && urlPath.endsWith('/')) urlPath = urlPath.slice(0, -1);

  try {
    /* ---------------------------- static ---------------------------- */
    if (urlPath.startsWith('/public/')) {
      const rel = urlPath.slice('/public/'.length);
      const file = path.normalize(path.join(PUBLIC_DIR, rel));
      if (!file.startsWith(PUBLIC_DIR)) return send(res, 403, 'forbidden');
      if (fs.existsSync(file) && fs.statSync(file).isFile()) {
        return send(res, 200, fs.readFileSync(file), { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'public, max-age=3600' });
      }
      return send(res, 404, 'not found');
    }

    /* --------------------------- sitemap ---------------------------- */
    if (urlPath === '/sitemap.xml') {
      const pages = db.prepare('SELECT url FROM generated_pages ORDER BY id').all();
      const urls = ['/', '/generate', ...pages.map(p => p.url)];
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${BASE_URL}${u}</loc></url>`).join('\n')}
</urlset>`;
      return send(res, 200, xml, { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'no-cache' });
    }

    /* --------------------------- robots ----------------------------- */
    if (urlPath === '/robots.txt') {
      return send(res, 200, `User-agent: *\nAllow: /\nDisallow: /public/\nSitemap: ${BASE_URL}/sitemap.xml\n`, { 'Content-Type': 'text/plain; charset=utf-8' });
    }

    /* ------------------------------ API ----------------------------- */
    if (urlPath === '/api/generate' && req.method === 'POST') {
      const body = JSON.parse((await readBody(req)) || '{}');
      const datasetId = Number(body.datasetId);
      const templateId = Number(body.templateId || 0);
      const limit = Math.min(Math.max(Number(body.limit) || 100, 1), 500);

      const dataset = db.prepare('SELECT * FROM datasets WHERE id = ?').get(datasetId);
      if (!dataset) return json(res, 400, { ok: false, error: 'Import a dataset first.' });

      let tplId = templateId;
      if (!tplId) {
        // Create a template from the form fields
        const title = String(body.title || '').trim();
        const meta = String(body.meta || '').trim();
        const h1 = String(body.h1 || '').trim();
        const content = String(body.content || '').trim();
        const urlPattern = String(body.urlPattern || '').trim();
        if (!title || !h1 || !urlPattern) return json(res, 400, { ok: false, error: 'Title, H1 and URL pattern are required.' });
        const r = db.prepare('INSERT INTO templates (name, url_pattern, title, meta_description, h1, content) VALUES (?, ?, ?, ?, ?, ?)')
          .run(`FORM — ${new Date().toISOString().slice(0, 10)} ${String(body.h1 || 'template').slice(0, 24)}`, urlPattern, title, meta, h1, content);
        tplId = Number(r.lastInsertRowid);
        // Rename with the id so the list stays readable
        db.prepare('UPDATE templates SET name = ? WHERE id = ?').run(`FORM — TEMPLATE #${tplId}`, tplId);
      }

      const result = generatePages(db, { datasetId, templateId: tplId, limit, baseUrl: BASE_URL });
      if (!result.ok) return json(res, 400, result);
      return json(res, 200, { ok: true, generated: result.generated, duration_ms: result.duration_ms, pages: result.pages });
    }

    if (urlPath === '/api/import' && req.method === 'POST') {
      const body = JSON.parse((await readBody(req)) || '{}');
      const csv = String(body.csv || '');
      const parsed = parseCsv(csv);
      if (!parsed.length) return json(res, 400, { ok: false, error: 'No valid rows found in CSV.' });
      const name = String(body.name || `IMPORT — ${new Date().toISOString().slice(0, 10)}`).slice(0, 120);
      const r = db.prepare('INSERT INTO datasets (name, source) VALUES (?, ?)').run(name, 'csv');
      const datasetId = Number(r.lastInsertRowid);
      const ins = db.prepare('INSERT INTO data_rows (dataset_id, position, data) VALUES (?, ?, ?)');
      db.exec('BEGIN');
      try {
        parsed.forEach((row, i) => ins.run(datasetId, i, JSON.stringify(row)));
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
      return json(res, 200, { ok: true, datasetId, rows: parsed.length, variables: findVariables(parsed) });
    }

    /* ------------------------- generate page ------------------------ */
    if (urlPath === '/generate') {
      const datasets = db.prepare(`
        SELECT d.*, (SELECT COUNT(*) FROM data_rows r WHERE r.dataset_id = d.id) AS rows
        FROM datasets d ORDER BY d.id DESC`).all();
      const templates = db.prepare('SELECT id, name, url_pattern FROM templates ORDER BY id DESC').all();
      let variables = ['city', 'service', 'description'];
      const first = db.prepare(`
        SELECT data FROM data_rows WHERE dataset_id = (SELECT MAX(id) FROM datasets) LIMIT 1`).get();
      if (first) {
        try { const v = findVariables([JSON.parse(first.data)]); if (v.length) variables = v; } catch {}
      }
      return send(res, 200, generateView({ baseUrl: BASE_URL, datasets, templates, variables, urlPattern: '/{{service-slug}}/{{city-slug}}' }));
    }

    /* --------------------------- landing ---------------------------- */
    if (urlPath === '/' || urlPath === '') {
      return send(res, 200, landing({ baseUrl: BASE_URL, stats: collectStats() }));
    }

    /* ------------------------ public pages -------------------------- */
    const page = db.prepare('SELECT * FROM generated_pages WHERE url = ?').get(urlPath);
    if (page) {
      const faq = JSON.parse(page.faq || '[]');
      const related = relatedFor(db, page, BASE_URL, 3);
      const segs = urlPath.split('/').filter(Boolean);
      const crumbs = [{ name: 'INDEXA', url: '/' }];
      segs.forEach((s, i) => {
        const isLast = i === segs.length - 1;
        const upTo = '/' + segs.slice(0, i + 1).join('/');
        crumbs.push(isLast ? { name: s.replace(/-/g, ' ').toUpperCase() } : { name: s.replace(/-/g, ' ').toUpperCase(), url: upTo });
        if (!isLast && i === 0) {
          // nothing special — kept simple and predictable
        }
      });
      const total = db.prepare('SELECT COUNT(*) c FROM generated_pages').get().c;
      return send(res, 200, publicPage({ baseUrl: BASE_URL, page, faq, related, crumbs, total }));
    }

    /* ----------------------------- 404 ------------------------------ */
    const samples = db.prepare('SELECT url, h1 FROM generated_pages ORDER BY id DESC LIMIT 4').all();
    return send(res, 404, notFound({ baseUrl: BASE_URL, samples }));

  } catch (err) {
    console.error('[indexa]', err);
    return send(res, 500, '<pre>INDEXA — internal error</pre>');
  }
});

server.listen(PORT, () => {
  const stats = collectStats();
  console.log(`INDEXA — live at ${BASE_URL} (port ${PORT})`);
  console.log(`  pages: ${stats.pages} | datasets: ${stats.datasets} | runs: ${stats.generations}`);
});

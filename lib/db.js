/* ------------------------------------------------------------------ */
/*  INDEXA DB — @libsql/client : Turso (libsql://) ou SQLite local     */
/*  TURSO_DATABASE_URL + TURSO_AUTH_TOKEN → Turso                      */
/*  INDEXA_DB=file.db (ou défaut data/indexa.db) → SQLite local        */
/* ------------------------------------------------------------------ */
import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function localDbUrl() {
  if (process.env.INDEXA_DB) {
    const p = process.env.INDEXA_DB;
    return p.startsWith('file:') ? p : 'file:' + p;
  }
  const DATA_DIR = path.join(__dirname, '..', 'data');
  fs.mkdirSync(DATA_DIR, { recursive: true });
  return 'file:' + path.join(DATA_DIR, 'indexa.db');
}

export function getDb() {
  if (process.env.TURSO_DATABASE_URL) {
    return createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN || undefined
    });
  }
  return createClient({ url: localDbUrl() });
}

/* ---- compat node:sqlite → libsql ----------------------------------- */
/*  Wrapper async : db.prepare(sql).get()/all()/run() comme avant,      */
/*  mais en Promise. Les écritures massives passent par db.batch().     */

function toArgs(params) {
  if (params == null) return [];
  return Array.isArray(params) ? params : [params];
}

export function prepare(db, sql) {
  return {
    async get(...params) {
      const rs = await db.execute({ sql, args: toArgs(params) });
      return rs.rows[0] ?? undefined;
    },
    async all(...params) {
      const rs = await db.execute({ sql, args: toArgs(params) });
      return rs.rows;
    },
    async run(...params) {
      const rs = await db.execute({ sql, args: toArgs(params) });
      return { changes: rs.rowsAffected, lastInsertRowid: rs.lastInsertRowid };
    }
  };
}

/* id de la dernière insertion — fiable en local comme sur Turso */
export async function lastId(db) {
  const rs = await db.execute('SELECT last_insert_rowid() AS id');
  return Number(rs.rows[0].id);
}

/* découpe une liste de statements en batches (limite pratique Turso) */
export function chunkStmts(stmts, size = 100) {
  const out = [];
  for (let i = 0; i < stmts.length; i += size) out.push(stmts.slice(i, i + size));
  return out;
}

/* ------------------------------------------------------------------ */
export async function migrate(db) {
  await db.batch([
    `CREATE TABLE IF NOT EXISTS datasets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'csv',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    )`,
    `CREATE TABLE IF NOT EXISTS data_rows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dataset_id INTEGER NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
      position INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL,
      slug TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_rows_dataset ON data_rows(dataset_id)`,
    `CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url_pattern TEXT NOT NULL,
      title TEXT NOT NULL,
      meta_description TEXT NOT NULL,
      h1 TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    )`,
    `CREATE TABLE IF NOT EXISTS generated_pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dataset_id INTEGER NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
      template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
      url TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      meta_description TEXT NOT NULL,
      h1 TEXT NOT NULL,
      content_html TEXT NOT NULL DEFAULT '',
      keywords TEXT NOT NULL DEFAULT '[]',
      faq TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_pages_dataset ON generated_pages(dataset_id)`,
    `CREATE INDEX IF NOT EXISTS idx_pages_template ON generated_pages(template_id)`,
    `CREATE TABLE IF NOT EXISTS seo_metadata (
      page_id INTEGER PRIMARY KEY REFERENCES generated_pages(id) ON DELETE CASCADE,
      canonical TEXT NOT NULL,
      og_title TEXT NOT NULL,
      og_description TEXT NOT NULL,
      structured_data TEXT NOT NULL DEFAULT '{}'
    )`,
    `CREATE TABLE IF NOT EXISTS internal_links (
      source_page_id INTEGER NOT NULL REFERENCES generated_pages(id) ON DELETE CASCADE,
      target_page_id INTEGER NOT NULL REFERENCES generated_pages(id) ON DELETE CASCADE,
      PRIMARY KEY (source_page_id, target_page_id)
    )`,
    `CREATE TABLE IF NOT EXISTS page_views (
      page_id INTEGER PRIMARY KEY REFERENCES generated_pages(id) ON DELETE CASCADE,
      views INTEGER NOT NULL DEFAULT 0,
      last_viewed_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS generation_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dataset_id INTEGER,
      requested INTEGER NOT NULL,
      generated INTEGER NOT NULL,
      duration_ms INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    )`
  ], 'write');
}

/* ------------------------------------------------------------------ */
/* Default dataset: Togo cities + services, so public pages exist      */
/* as soon as the server boots. Uses the same engine as user imports.  */
/* ------------------------------------------------------------------ */

export async function ensureSeed(db) {
  const rs = await db.execute('SELECT COUNT(*) AS c FROM datasets');
  if (Number(rs.rows[0].c) > 0) return;

  const seedRows = [
    ['LOME', 'WEB DESIGN', 'Custom websites designed, built and shipped for Lome businesses that need a serious online presence.'],
    ['KARA', 'WEB DESIGN', 'Conversion-focused web design for teams and companies based in Kara.'],
    ['SOKODE', 'WEB DESIGN', 'Fast, accessible websites engineered for organizations in Sokode.'],
    ['ATAKPAME', 'WEB DESIGN', 'Editorial-grade web design for brands and institutions in Atakpame.'],
    ['BASSAR', 'WEB DESIGN', 'Clean, durable websites for businesses growing in Bassar.'],
    ['LOME', 'SEO AUDIT', 'A complete technical and editorial audit of your visibility in Lome search results.'],
    ['KARA', 'SEO AUDIT', 'Structured SEO audits for companies targeting customers in Kara.'],
    ['SOKODE', 'SEO AUDIT', 'Discover exactly what holds your Sokode pages back — and fix it.'],
    ['LOME', 'E-COMMERCE', 'Online stores built to sell for Lome merchants, from catalog to checkout.'],
    ['KARA', 'E-COMMERCE', 'E-commerce platforms tailored for commerce in and around Kara.'],
    ['ATAKPAME', 'E-COMMERCE', 'Sell online from Atakpame with a store designed to convert.'],
    ['LOME', 'BRANDING', 'Identity systems, wordmarks and guidelines for Lome-based brands.'],
    ['KARA', 'BRANDING', 'Brand foundations for organizations building their name in Kara.'],
    ['SOKODE', 'BRANDING', 'Visual identities crafted for Sokode businesses and institutions.'],
    ['DAPAONG', 'WEB DESIGN', 'Websites designed and delivered for organizations in Dapaong.'],
    ['TSVIE', 'WEB DESIGN', 'Web design services for companies and projects in Tsievi.'],
    ['LOME', 'CREATION SITE WEB', 'Création de sites web professionnels pour les entreprises de Lomé — vitrine, performance, SEO.'],
    ['KARA', 'CREATION SITE WEB', 'Création de sites web pour les entreprises et institutions de Kara.'],
    ['SOKODE', 'CREATION SITE WEB', 'Création de sites web rapides et accessibles pour Sokodé.'],
    ['ATAKPAME', 'CREATION SITE WEB', 'Création de sites web sur mesure pour Atakpamé et sa région.']
  ];

  const ds = await db.execute({
    sql: 'INSERT INTO datasets (name, source) VALUES (?, ?)',
    args: ['TOGO — CITIES × SERVICES', 'seed']
  });
  const datasetId = ds.lastInsertRowid != null ? Number(ds.lastInsertRowid) : await lastId(db);

  const insRow = 'INSERT INTO data_rows (dataset_id, position, data, slug) VALUES (?, ?, ?, ?)';
  const stmts = [
    ...seedRows.map((r, i) => ({
      sql: insRow,
      args: [datasetId, i, JSON.stringify({ city: r[0], service: r[1], description: r[2] }), null]
    })),
    {
      sql: 'INSERT INTO templates (name, url_pattern, title, meta_description, h1, content) VALUES (?, ?, ?, ?, ?, ?)',
      args: [
        'DEFAULT — SERVICE IN CITY',
        '/{{service-slug}}/{{city-slug}}',
        '{{service}} in {{city}} — INDEXA',
        '{{description}}',
        '{{service}}\n{{city}}',
        [
          '## What we do in {{city}}',
          'INDEXA builds {{service}} engagements for teams operating in {{city}}. Every page you are reading was generated from a single structured row — city, service, description — and published at a clean, permanent URL.',
          '## Why it works',
          'The same structure that produces this page can produce a thousand more. Data in, pages out: consistent titles, honest descriptions and internal links that connect every city and every service.',
          '## Local focus',
          'Businesses in {{city}} compete in a specific market. This page exists so that people searching for {{service}} in {{city}} find something useful — clear words, real links, no filler.'
        ].join('\n\n')
      ]
    }
  ];
  for (const chunk of chunkStmts(stmts)) await db.batch(chunk, 'write');
}

/* Public URL: explicit env var wins, then Render's auto-injected external URL, then local dev */
export const BASE_URL = (process.env.INDEXA_BASE_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000').replace(/\/+$/, '');

/* ------------------------------------------------------------------ */
/*  Import des datasets réels + génération des pages dans Turso        */
/*  Usage : node --env-file=.env scripts/seed-services.mjs             */
/*  Idempotent : relançable sans doublon — un dataset existant reçoit  */
/*  seulement ses lignes nouvelles, puis les pages manquantes sont     */
/*  générées (les URLs déjà prises sont ignorées par le moteur).       */
/* ------------------------------------------------------------------ */
import fs from 'node:fs';
import { getDb, migrate, ensureSeed, prepare, lastId, chunkStmts, BASE_URL } from '../lib/db.js';
import { parseCsv, generatePages } from '../lib/engine.js';

const db = getDb();
await migrate(db);
await ensureSeed(db); // la démo Togo reste si elle existe (pages publiques par défaut)

const datasets = [
  {
    file: 'datasets/services-fr.csv',
    name: 'SERVICES × VILLES — FR',
    urlPattern: '/fr/{{prestation-slug}}/{{ville-slug}}',
    template: {
      name: 'FR — PRESTATION × VILLE',
      title: '{{prestation}} à {{ville}} — INDEXA',
      meta: '{{resume}}',
      h1: '{{prestation}}\n{{ville}}',
      content: [
        '## À {{ville}}, {{prestation}} sans détour',
        '{{resume}}',
        'Chaque page de ce site est générée depuis une donnée structurée : une prestation, une ville, un résumé. Cette page existe parce que des clients cherchent **{{prestation}}** à {{ville}} — et qu\'elle répond clairement à cette recherche.',
        '## Ce que comprend la prestation',
        '- Cadrage : objectifs, contraintes, délais — posés au départ, sans jargon.',
        '- Production : design et développement soignés, testés avant livraison.',
        '- Suivi : après la mise en ligne, la page reste là, les corrections restent possibles.',
        '## Pourquoi passer par INDEXA',
        'Le site qui affiche cette page est lui-même une démonstration du produit : des pages cohérentes, des titres honnêtes, un maillage interne construit automatiquement entre villes et prestations. Ce que vous lisez est le résultat du même moteur que celui que vous pouvez utiliser sur [/generate](/generate).'
      ].join('\n')
    }
  },
  {
    file: 'datasets/services-en.csv',
    name: 'SERVICES × CITIES — EN',
    urlPattern: '/en/{{service-slug}}/{{city-slug}}',
    template: {
      name: 'EN — SERVICE × CITY',
      title: '{{service}} in {{city}} — INDEXA',
      meta: '{{description}}',
      h1: '{{service}}\n{{city}}',
      content: [
        '## {{service}} in {{city}}',
        '{{description}}',
        'Every page on this site is generated from structured data: one service, one city, one description. This page exists because people search for **{{service}}** in {{city}} — and it answers that search clearly.',
        '## What the engagement includes',
        '- Scoping: goals, constraints, timelines — set upfront, no jargon.',
        '- Production: careful design and development, tested before launch.',
        '- Follow-up: after launch the page stays live and improvements stay possible.',
        '## Why INDEXA',
        'The site you are reading is itself a demonstration of the product: consistent pages, honest titles, an internal linking mesh built automatically across cities and services. What you read here is produced by the same engine you can use on [/generate](/generate).'
      ].join('\n')
    }
  }
];

for (const ds of datasets) {
  const csv = fs.readFileSync(new URL('../' + ds.file, import.meta.url), 'utf8');
  const rows = parseCsv(csv);
  if (!rows.length) { console.error(`!! ${ds.file} : aucune ligne valide`); continue; }

  /* ---- dataset : créer ou compléter ------------------------------- */
  const existing = await prepare(db, 'SELECT id FROM datasets WHERE name = ?').get(ds.name);
  let datasetId;
  let addedRows = 0;

  if (existing) {
    datasetId = Number(existing.id);
    const have = new Set(
      (await db.execute({ sql: 'SELECT data FROM data_rows WHERE dataset_id = ?', args: [datasetId] })).rows.map(r => r.data)
    );
    const maxPos = Number((await db.execute({
      sql: 'SELECT COALESCE(MAX(position), -1) AS m FROM data_rows WHERE dataset_id = ?', args: [datasetId]
    })).rows[0].m);

    const fresh = [];
    rows.forEach((row, i) => {
      const key = JSON.stringify(row);
      if (!have.has(key)) { fresh.push({ pos: maxPos + 1 + fresh.length, data: key }); }
    });

    if (fresh.length) {
      const ins = 'INSERT INTO data_rows (dataset_id, position, data) VALUES (?, ?, ?)';
      for (const part of chunkStmts(fresh.map(f => ({ sql: ins, args: [datasetId, f.pos, f.data] })))) {
        await db.batch(part, 'write');
      }
    }
    addedRows = fresh.length;
    console.log(`— ${ds.name} : dataset #${datasetId} existant, ${addedRows} nouvelle(s) ligne(s) ajoutée(s)`);
  } else {
    const ins = await db.execute({ sql: 'INSERT INTO datasets (name, source) VALUES (?, ?)', args: [ds.name, 'csv'] });
    datasetId = ins.lastInsertRowid != null ? Number(ins.lastInsertRowid) : await lastId(db);
    const insRow = 'INSERT INTO data_rows (dataset_id, position, data) VALUES (?, ?, ?)';
    for (const part of chunkStmts(rows.map((row, i) => ({ sql: insRow, args: [datasetId, i, JSON.stringify(row)] })))) {
      await db.batch(part, 'write');
    }
    addedRows = rows.length;
    console.log(`— ${ds.name} : dataset #${datasetId} créé, ${addedRows} lignes`);
  }

  /* ---- template : créer seulement s'il n'existe pas ---------------- */
  const tpl = await prepare(db, 'SELECT id FROM templates WHERE name = ?').get(ds.template.name);
  let templateId;
  if (tpl) {
    templateId = Number(tpl.id);
  } else {
    const t = await db.execute({
      sql: 'INSERT INTO templates (name, url_pattern, title, meta_description, h1, content) VALUES (?, ?, ?, ?, ?, ?)',
      args: [ds.template.name, ds.urlPattern, ds.template.title, ds.template.meta, ds.template.h1, ds.template.content]
    });
    templateId = t.lastInsertRowid != null ? Number(t.lastInsertRowid) : await lastId(db);
  }

  /* ---- générer les pages manquantes -------------------------------- */
  const res = await generatePages(db, { datasetId, templateId, limit: 500, baseUrl: BASE_URL });
  console.log(`   → ${res.generated} page(s) générée(s) (${res.duration_ms} ms)`);
}

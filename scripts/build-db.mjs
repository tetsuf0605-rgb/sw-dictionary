// data/ を結合して public/data/db.json を生成する（docs/02_data_model.md §9）。
// 検証は data:validate が担当する（npm run data:build が validate → build の順に実行する）。
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildDb, loadRaw, mergeEntities } from './lib/data-core.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const raw = loadRaw(root)

if (raw.errors.length > 0) {
  for (const e of raw.errors) console.error(`[data:build] ${e.file}: ${e.message}`)
  console.error('[data:build] data/ を読めませんでした。npm run data:validate で詳細を確認してください。')
  process.exit(1)
}

const merged = mergeEntities(raw)
const db = buildDb(raw, merged)

const out = resolve(root, 'public/data/db.json')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify(db) + '\n', 'utf8')

const kb = (JSON.stringify(db).length / 1024).toFixed(0)
const withPack = db.works.filter((w) => w.hasPack).length
const facts = db.entities.reduce((n, e) => n + e.facts.length, 0)
console.log(
  `[data:build] public/data/db.json を生成しました（${kb} KB / 作品 ${db.works.length}件（パックあり ${withPack}件） / 項目 ${db.entities.length}件 / 記述 ${facts}件 / 時代区分 ${db.eras.length}件）`,
)

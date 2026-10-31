// data/ を結合して public/data/db.json を生成する（docs/02 §9）。
// Phase 1 で実装する。今は空の db.json だけ置き、アプリの読み込み経路を先に通しておく。
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const meta = JSON.parse(readFileSync(resolve(root, 'data/meta.json'), 'utf8'))

const db = {
  dataVersion: meta.dataVersion,
  updatedAt: meta.updatedAt,
  works: [],
  eras: [],
  entities: [],
  _placeholder: 'Phase 1 の build-db.mjs で中身を生成します',
}

const out = resolve(root, 'public/data/db.json')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify(db, null, 2) + '\n', 'utf8')
console.log(`[data:build] ${out} を生成しました（Phase 1 で中身を実装します）`)

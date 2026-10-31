// テスト用: data/ のサンプルパックを直接読み込み、build の関数を通して db を作る。
// 生成物の public/data/db.json には依存しない（build を通さずにテストできるようにするため）。
import { fileURLToPath } from 'node:url'
import { buildDb, loadRaw, mergeEntities } from '../../scripts/lib/data-core.mjs'
import type { Db } from '../types'
import { createIndex, resolveWatched, type Index, type Watched } from './visibility'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))

export function loadTestDb(): Db {
  const raw = loadRaw(ROOT)
  if (raw.errors.length > 0) {
    throw new Error(`data/ を読めません: ${raw.errors.map((e) => `${e.file}: ${e.message}`).join(' / ')}`)
  }
  return buildDb(raw, mergeEntities(raw))
}

export const db: Db = loadTestDb()
export const index: Index = createIndex(db)

/** 視聴済み作品を指定して watched を作る */
export const watch = (...ids: string[]): Watched => resolveWatched(db, ids)

/** 「すべて表示（ネタバレ全開放）」 */
export const watchAll = (): Watched => resolveWatched(db, [], true)

/** テスト内で項目を引く */
export const get = (id: string) => {
  const e = index.entities.get(id)
  if (!e) throw new Error(`テストデータに項目「${id}」がありません`)
  return e
}

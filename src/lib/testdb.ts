// テスト用のデータ。`src/lib/__fixtures__/data/` を build の関数に通して db を作る。
//
// **本物の data/ は使わない。**
// docs/01_requirements.md §8 の受け入れシナリオ（S1〜S9）は「ep4 と ep5 のサンプル」を
// 前提に件数まで決めてあるため、本物のデータを見に行くと、作品パックを足すたびに
// 判定ロジックと無関係にテストが落ちてしまう。
// 固定したサンプル（ep6 を作る前の ep4 / ep5）を同梱して、判定ロジックだけを見る。
//
// 本物のデータの正しさは `npm run data:validate`（E01〜E10 / W01〜W06）が受け持つ。
import { fileURLToPath } from 'node:url'
import { buildDb, loadRaw, mergeEntities } from '../../scripts/lib/data-core.mjs'
import type { Db } from '../types'
import { createIndex, resolveWatched, type Index, type Watched } from './visibility'

/** 固定したサンプルデータの置き場所（この下に data/ がある） */
const FIXTURE_ROOT = fileURLToPath(new URL('./__fixtures__', import.meta.url))

export function loadTestDb(): Db {
  const raw = loadRaw(FIXTURE_ROOT)
  if (raw.errors.length > 0) {
    throw new Error(
      `テスト用データを読めません: ${raw.errors.map((e) => `${e.file}: ${e.message}`).join(' / ')}`,
    )
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

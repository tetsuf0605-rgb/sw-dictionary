// 検索の正規化と絞り込み（docs/03_ui_design.md §3「検索結果」）。
//
// このファイルは watched を知らない。検索対象の作り方（解放済み項目の visibleNames だけを使う）は
// visibility.ts の buildSearchIndex が決める。
import type { EntityId, EntityType, Name } from '../types'

/**
 * 検索用の正規化。
 *   NFKC → カタカナをひらがなに → 「・」「＝」「 」「　」を除去 → 英字は小文字
 * これで「ダースベイダー」「ダース・ベイダー」「ﾀﾞｰｽﾍﾞｲﾀﾞｰ」が同じ文字列になる。
 */
export function normalize(s: string): string {
  return s
    .normalize('NFKC')
    // カタカナ → ひらがな（長音「ー」はそのまま残す）
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/[・=\s]/g, '')
    .toLowerCase()
}

/** 検索対象 1 件ぶん。buildSearchIndex（visibility.ts）が作る */
export interface SearchEntry {
  id: EntityId
  type: EntityType
  /** 主名称（画面に出す見出し） */
  display: string
  /** 五十音順に並べるための読み */
  sortKey: string
  /** 正規化済みの検索キー。どの名前から来たかを持つ */
  keys: { value: string; name: Name; isMain: boolean }[]
}

export interface SearchResult {
  id: EntityId
  type: EntityType
  display: string
  /** 別名でヒットしたときだけ入る（「別名：ベン・ケノービ」の表示に使う） */
  hitAlias: string | null
}

/**
 * 部分一致で絞り込む。前方一致を上位、部分一致を下位に並べ、
 * 同じ順位どうしは読みの五十音順にする。
 */
export function search(entries: readonly SearchEntry[], query: string): SearchResult[] {
  const q = normalize(query)
  if (q === '') return []

  const hits: { entry: SearchEntry; rank: number; name: Name; isMain: boolean }[] = []
  for (const entry of entries) {
    let best: { rank: number; name: Name; isMain: boolean } | null = null
    for (const key of entry.keys) {
      const rank = key.value.startsWith(q) ? 0 : key.value.includes(q) ? 1 : -1
      if (rank < 0) continue
      // 同じ項目の中では、順位が良いもの・主名称を優先する
      if (!best || rank < best.rank || (rank === best.rank && key.isMain && !best.isMain)) {
        best = { rank, name: key.name, isMain: key.isMain }
      }
    }
    if (best) hits.push({ entry, ...best })
  }

  hits.sort((a, b) => a.rank - b.rank || a.entry.sortKey.localeCompare(b.entry.sortKey, 'ja'))

  return hits.map((h) => ({
    id: h.entry.id,
    type: h.entry.type,
    display: h.entry.display,
    hitAlias: h.isMain ? null : h.name.text,
  }))
}

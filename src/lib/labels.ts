// 画面に出す日本語ラベル。表記は docs/05_content_guide.md §5 の用字用語に合わせる。
import type { DbWork, EntityType, WorkGroup } from '../types'

/** 種類の表示名と並び順（docs/01 F-02） */
export const TYPE_ORDER: EntityType[] = [
  'character',
  'place',
  'organization',
  'species',
  'vehicle',
  'item',
  'concept',
  'event',
]

export const TYPE_LABEL: Record<EntityType, string> = {
  character: '人物',
  place: '場所',
  organization: '組織',
  species: '種族',
  vehicle: '乗り物・兵器',
  item: '道具',
  concept: '用語',
  event: '出来事',
}

/** 設定画面の大分類と並び順（docs/03 §3「設定」） */
export const GROUP_ORDER: WorkGroup[] = [
  'film-skywalker',
  'film-other',
  'live-action',
  'animation',
  'kids',
  'non-canon',
]

export const GROUP_LABEL: Record<WorkGroup, string> = {
  'film-skywalker': '映画：スカイウォーカー・サーガ',
  'film-other': '映画：その他',
  'live-action': '実写ドラマ',
  animation: 'アニメ',
  kids: '子ども向け',
  'non-canon': '非正史',
}

/**
 * 出典ラベル用の略称（docs/05 §5）。
 * ep4 → 「EP4」、シーズンもの → 「マンダロリアン S2」、それ以外は作品タイトル。
 */
export function shortWorkLabel(work: DbWork): string {
  const m = /^ep(\d)$/.exec(work.id)
  if (m) return `EP${m[1]}`
  if (work.seriesTitle && work.seasonNo !== undefined) return `${work.seriesTitle} S${work.seasonNo}`
  return work.title
}

/** 公開年（releaseDate は "YYYY-MM-DD" か "YYYY"） */
export function releaseYear(work: DbWork): string {
  return work.releaseDate.slice(0, 4)
}

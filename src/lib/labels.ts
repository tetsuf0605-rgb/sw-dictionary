// 画面に出す日本語ラベル。表記は docs/05_content_guide.md §5 の用字用語に合わせる。
import type { DbWork, EntityType, EventDate, WorkGroup } from '../types'

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

/* ---------- 年代の表記（docs/02_data_model.md §12） ---------- */

/** 0 = ヤヴィンの戦いの年。負は BBY（それ以前）、正は ABY（それ以降） */
function yearLabel(y: number): string {
  if (y < 0) return `${-y} BBY`
  if (y > 0) return `${y} ABY`
  return '0 BBY/ABY'
}

/** 年表の目盛り用の短い表記。例: 「3 ABY」「約 32 BBY」 */
export function formatYearShort(date: EventDate): string {
  if (date.precision === 'unknown') return '年代不明'
  const head = date.precision === 'approx' ? '約 ' : ''
  if (date.yearEnd !== undefined) return `${head}${yearLabel(date.year)}〜`
  return head + yearLabel(date.year)
}

/** 項目詳細用の表記。例: 「0 BBY/ABY（ヤヴィンの戦いの年）」 */
export function formatEventYear(date: EventDate): string {
  if (date.precision === 'unknown') return '年代不明'
  const head = date.precision === 'approx' ? '約 ' : ''
  const body =
    date.yearEnd !== undefined
      ? `${yearLabel(date.year)}〜${yearLabel(date.yearEnd)}`
      : yearLabel(date.year)
  const note = date.year === 0 && date.yearEnd === undefined ? '（ヤヴィンの戦いの年）' : ''
  return head + body + note
}

/** 作品の作中年代。例: 「3 ABY」「13〜10 BBY ごろ」 */
export function formatWorkTimeline(work: DbWork): string {
  const t = work.timeline
  if (!t) return '—'
  const body = t.end !== undefined ? `${yearLabel(t.start)}〜${yearLabel(t.end)}` : yearLabel(t.start)
  return body + (t.approx ? ' ごろ' : '')
}

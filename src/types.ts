// docs/02_data_model.md §3〜§4・§12 の型定義。
// データの形を変えるときは 02 と scripts/lib/data-core.mjs の SCHEMA も同時に直すこと。

/* ---------- 作品（data/works.json。02 §3） ---------- */

/** 例: "ep4", "mando-s1", "tcw-s3"。英小文字・数字・ハイフンのみ */
export type WorkId = string

/** film=映画 / season=1シーズン / series=シーズン分けせず1単位 / special=特別編 */
export type WorkKind = 'film' | 'season' | 'series' | 'special'

/** 設定画面の大分類 */
export type WorkGroup =
  | 'film-skywalker'
  | 'film-other'
  | 'live-action'
  | 'animation'
  | 'kids'
  | 'non-canon'

/** 作中年代。BBY は負、ABY は正、0 = ヤヴィンの戦いの年 */
export interface WorkTimeline {
  start: number
  end?: number
  approx?: boolean
}

export interface Work {
  id: WorkId
  /** 日本語タイトル（「スター・ウォーズ」の冠は省く） */
  title: string
  titleEn?: string
  kind: WorkKind
  group: WorkGroup
  /** シーズンをまとめる親 ID（例: "mandalorian"）。設定画面の中分類 */
  series?: string
  /** 親の表示名（例: "マンダロリアン"） */
  seriesTitle?: string
  seasonNo?: number
  /** "YYYY-MM-DD"。未定なら "YYYY"。世界初公開日（米国）基準 */
  releaseDate: string
  /** 省略時 released */
  status?: 'released' | 'upcoming'
  /** 非正史は null */
  timeline: WorkTimeline | null
  /** false = 『ビジョンズ』など */
  canon: boolean
  animated?: boolean
  /** 設定画面に出す補足 */
  note?: string
}

/* ---------- 項目（data/packs/<work-id>/entities.json。02 §4） ---------- */

/** 例: "luke-skywalker", "battle-of-yavin"。英小文字・数字・ハイフン */
export type EntityId = string

export type EntityType =
  | 'character' // 人物（ドロイド含む）
  | 'place' // 惑星・都市・施設
  | 'organization' // 組織・勢力・国家
  | 'species' // 種族
  | 'vehicle' // 乗り物・艦船・兵器施設
  | 'item' // 道具・武器
  | 'concept' // 用語・概念・制度
  | 'event' // 出来事（年表に載る）

export interface Name {
  /** 表示名。例: "オビ＝ワン・ケノービ" */
  text: string
  /** ひらがな読み。五十音ソートと検索に使う。主名称は必須 */
  reading?: string
  /** 英語名（検索用） */
  en?: string
  /** この別名が明かされる作品（OR）。names[0] には書かない（常に表示） */
  revealedBy?: WorkId[]
  kind?: 'alias' | 'title' | 'nickname'
}

export interface Fact {
  /** 任意。後から差し替えたいときの手がかり（例: "ep5-father"） */
  id?: string
  /** 本文。1〜2 文。[[id]] / [[id|ラベル]] でリンク（02 §8） */
  text: string
  /** この記述が明かされる作品（OR）。必須、1 つ以上 */
  revealedBy: WorkId[]
  /** summary は詳細画面の冒頭に太字で出す（項目に 1 つまで） */
  kind?: 'summary' | 'detail' | 'trivia'
  /** 表示順。省略時は 0 として扱い、パック公開順 → ファイル順で並ぶ */
  order?: number
  /** 事実確認が必要な下書き。アプリは無視し、validate が件数を警告する */
  needsCheck?: boolean
}

export interface SameAs {
  /** 相手の項目 */
  id: EntityId
  /** 同一だと分かる作品（OR） */
  revealedBy: WorkId[]
  /** 表示用の短い補足。例: "正体" */
  note?: string
}

export interface EventDate {
  /** BBY は負、ABY は正、0 = ヤヴィンの戦いの年 */
  year: number
  /** 期間がある出来事 */
  yearEnd?: number
  /** unknown は order だけで並べる */
  precision: 'exact' | 'approx' | 'unknown'
  /** 同じ年の中での並び順 */
  order?: number
}

/** data/packs/<work-id>/entities.json に書く形。追記パックでは type / names を省ける */
export interface EntitySource {
  id: EntityId
  /** 定義パックでのみ必須 */
  type?: EntityType
  /** 定義パックでは必須（names[0] が主名称）。追記パックでは別名の追加のみ */
  names?: Name[]
  /** 明示的な登場作品（任意）。実際の登場作品集合は 02 §7 の式で求める */
  appearsIn?: WorkId[]
  facts?: Fact[]
  sameAs?: SameAs[]
  /** type === "event" のとき必須。それ以外は禁止 */
  date?: EventDate
  /** 検索補助。タグ自体がネタバレにならないものだけ */
  tags?: string[]
}

/* ---------- 時代区分（data/eras.json。02 §12） ---------- */

export interface Era {
  /** "era-empire" など */
  id: string
  /** "帝国の時代" */
  name: string
  /** 開始年（BBY 負） */
  start: number
  /** 終了年 */
  end: number
  approx?: boolean
  /** この区分名を出してよい作品（OR） */
  revealedBy: WorkId[]
  /** 1 文。[[id]] リンク可 */
  description?: string
}

/* ---------- 生成物（public/data/db.json。02 §9） ---------- */

export interface DbWork extends Work {
  /** 公開順の通し番号（1 始まり）。releaseDate から build が計算する */
  publishOrder: number
  /** データパックがあるか（設定画面の「データ準備中」表示に使う） */
  hasPack: boolean
}

/** db.json 内の項目。結合・計算済みで、アプリはこれだけを読む */
export interface DbEntity {
  id: EntityId
  type: EntityType
  /** names[0] が主名称 */
  names: Name[]
  /** 02 §7 の式で計算済み。公開順に並ぶ */
  appearsIn: WorkId[]
  /** order → パック公開順 → ファイル順で並べ替え済み */
  facts: Fact[]
  /** 対称化済み */
  sameAs?: SameAs[]
  date?: EventDate
  tags?: string[]
}

export interface Db {
  dataVersion: string
  updatedAt: string
  /** data/CHANGELOG.md の本文。about 画面にそのまま出す（docs/01 F-07） */
  changelog: string
  /** 公開順 */
  works: DbWork[]
  eras: Era[]
  /** id の昇順 */
  entities: DbEntity[]
}

/* ---------- 端末内保存（02 §14。Phase 3 で使う） ---------- */

export interface Prefs {
  fontSize: 's' | 'm' | 'l'
  /** ネタバレ全開放。内部的には全作品を watched にして同じ判定関数を通す */
  showAll: boolean
}

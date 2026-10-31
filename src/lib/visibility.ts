// ネタバレ制御の判定（docs/02_data_model.md §7）。
//
// **このファイルだけが watched を見て表示可否を決める。**
// UI・検索・年表・新着は、ここが返した結果を並べるだけにすること（CLAUDE.md の不変条件 8）。
// 「すべて表示（ネタバレ全開放）」も resolveWatched で全作品を watched にして同じ関数を通す（同 9）。
import type { Db, DbEntity, DbWork, EntityId, Era, Fact, Name, SameAs, WorkId } from '../types'
import { linkedIds } from './links.ts'
import { normalize, type SearchEntry } from './search.ts'

export type Watched = ReadonlySet<WorkId>

/** db.json を引きやすい形にしたもの。起動時に 1 回だけ作る */
export interface Index {
  db: Db
  entities: ReadonlyMap<EntityId, DbEntity>
  works: ReadonlyMap<WorkId, DbWork>
  /** リンク先 ID → そこへリンクしている（項目, 記述）の組。バックリンクの計算に使う */
  incoming: ReadonlyMap<EntityId, { from: DbEntity; fact: Fact }[]>
}

export function createIndex(db: Db): Index {
  const entities = new Map(db.entities.map((e) => [e.id, e]))
  const works = new Map(db.works.map((w) => [w.id, w]))
  const incoming = new Map<EntityId, { from: DbEntity; fact: Fact }[]>()
  for (const e of db.entities) {
    for (const fact of e.facts) {
      for (const id of linkedIds(fact.text)) {
        if (id === e.id) continue // 自分自身へのリンクは関連項目にしない
        const list = incoming.get(id)
        if (list) list.push({ from: e, fact })
        else incoming.set(id, [{ from: e, fact }])
      }
    }
  }
  return { db, entities, works, incoming }
}

/* ---------- 基本の判定（02 §7） ---------- */

const hit = (list: readonly WorkId[] | undefined, watched: Watched): boolean =>
  (list ?? []).some((w) => watched.has(w))

/**
 * 画面に渡す watched を作る。
 * showAll が true のときは「全作品を視聴済みにした watched」にして、同じ判定関数を通す。
 */
export function resolveWatched(db: Db, watchedIds: Iterable<WorkId>, showAll = false): Watched {
  if (showAll) return new Set(db.works.map((w) => w.id))
  const known = new Set(db.works.map((w) => w.id))
  // works.json から消えた作品 ID が localStorage に残っていても無視する
  return new Set([...watchedIds].filter((id) => known.has(id)))
}

/** 項目が存在するものとして扱えるか。appearsIn(E) ∩ watched ≠ ∅ */
export function isUnlocked(e: DbEntity, watched: Watched): boolean {
  return hit(e.appearsIn, watched)
}

/** 表示してよい記述。並び順は db.json の時点で order → パック公開順 → ファイル順になっている */
export function visibleFacts(e: DbEntity, watched: Watched): Fact[] {
  return e.facts.filter((f) => hit(f.revealedBy, watched))
}

/**
 * 記述の末尾に出す出典ラベルの作品。revealedBy のうち視聴済みのものだけを返す（docs/03 §3）。
 * 未視聴作品の略称が画面に出ると、それ自体がネタバレになるため。
 */
export function visibleSources(fact: Fact, watched: Watched): WorkId[] {
  return fact.revealedBy.filter((w) => watched.has(w))
}

/** 主名称＋解放済みの別名。names[0] は項目が解放されていれば常に表示する */
export function visibleNames(e: DbEntity, watched: Watched): Name[] {
  const [main, ...aliases] = e.names
  return [main, ...aliases.filter((n) => hit(n.revealedBy, watched))]
}

/** 項目の見出しに出す表示名 */
export function displayName(e: DbEntity, watched: Watched): string {
  return visibleNames(e, watched)[0].text
}

/** 同一人物リンク。自分側が解放され、かつ相手も解放されているものだけ */
export function visibleSameAs(e: DbEntity, watched: Watched, index: Index): SameAs[] {
  return (e.sameAs ?? []).filter((s) => {
    if (!hit(s.revealedBy, watched)) return false
    const other = index.entities.get(s.id)
    return other !== undefined && isUnlocked(other, watched)
  })
}

/** 「登場作品」欄。未視聴作品は絶対に出さない。appearsIn は公開順に並んでいる */
export function shownWorks(e: DbEntity, watched: Watched): WorkId[] {
  return e.appearsIn.filter((w) => watched.has(w))
}

/** 年表の時代区分。区分名そのものも解放制御する */
export function visibleEras(db: Db, watched: Watched): Era[] {
  return db.eras.filter((era) => hit(era.revealedBy, watched))
}

/* ---------- 一覧・年表・検索（02 §7） ---------- */

/** 解放済みの項目すべて */
export function unlockedEntities(index: Index, watched: Watched): DbEntity[] {
  return index.db.entities.filter((e) => isUnlocked(e, watched))
}

/**
 * 年表に載せる出来事。date の年 → 同年内の order → 読み の順に並べる。
 * precision が unknown のものは年を持たないものとして末尾に置き、order だけで並べる。
 */
export function buildTimeline(index: Index, watched: Watched): DbEntity[] {
  const events = unlockedEntities(index, watched).filter((e) => e.type === 'event' && e.date)
  return events.sort((a, b) => {
    const ya = a.date!.precision === 'unknown' ? Number.POSITIVE_INFINITY : a.date!.year
    const yb = b.date!.precision === 'unknown' ? Number.POSITIVE_INFINITY : b.date!.year
    return (
      ya - yb ||
      (a.date!.order ?? 0) - (b.date!.order ?? 0) ||
      sortKeyOf(a, watched).localeCompare(sortKeyOf(b, watched), 'ja')
    )
  })
}

/** 検索インデックス。解放済み項目の解放済みの名前だけから作る */
export function buildSearchIndex(index: Index, watched: Watched): SearchEntry[] {
  return unlockedEntities(index, watched).map((e) => {
    const names = visibleNames(e, watched)
    const keys: SearchEntry['keys'] = []
    names.forEach((name, i) => {
      const isMain = i === 0
      for (const value of [name.text, name.reading, name.en]) {
        if (!value) continue
        keys.push({ value: normalize(value), name, isMain })
      }
    })
    return { id: e.id, type: e.type, display: names[0].text, sortKey: sortKeyOf(e, watched), keys }
  })
}

/** 五十音順に並べるためのキー。読みがなければ表示名で代用する */
export function sortKeyOf(e: DbEntity, watched: Watched): string {
  const main = visibleNames(e, watched)[0]
  return main.reading ?? main.text
}

/** 解放済み項目を五十音順に並べる（一覧画面用） */
export function sortByReading(entities: readonly DbEntity[], watched: Watched): DbEntity[] {
  return [...entities].sort((a, b) => sortKeyOf(a, watched).localeCompare(sortKeyOf(b, watched), 'ja'))
}

/* ---------- 関連項目・バックリンク（02 §7） ---------- */

/** 表示中の記述の中でリンクしている、解放済みの項目 */
export function relatedEntities(e: DbEntity, watched: Watched, index: Index): DbEntity[] {
  const ids = new Set<EntityId>()
  for (const fact of visibleFacts(e, watched)) {
    for (const id of linkedIds(fact.text)) {
      if (id === e.id) continue
      const target = index.entities.get(id)
      if (target && isUnlocked(target, watched)) ids.add(id)
    }
  }
  return sortByReading([...ids].map((id) => index.entities.get(id)!), watched)
}

/** この項目へリンクしている、解放済み項目（リンク元の記述も表示されていること） */
export function backlinks(e: DbEntity, watched: Watched, index: Index): DbEntity[] {
  const found = new Map<EntityId, DbEntity>()
  for (const { from, fact } of index.incoming.get(e.id) ?? []) {
    if (found.has(from.id)) continue
    if (!isUnlocked(from, watched)) continue
    if (!hit(fact.revealedBy, watched)) continue
    found.set(from.id, from)
  }
  return sortByReading([...found.values()], watched)
}

/** 関連項目とバックリンクを重複なくまとめたもの（項目詳細の「関連項目」欄。docs/03 §3） */
export function relatedAndBacklinks(e: DbEntity, watched: Watched, index: Index): DbEntity[] {
  const merged = new Map<EntityId, DbEntity>()
  for (const x of [...relatedEntities(e, watched, index), ...backlinks(e, watched, index)]) {
    merged.set(x.id, x)
  }
  return sortByReading([...merged.values()], watched)
}

/* ---------- links.ts へ渡す補助（判定はここに集約する） ---------- */

/** 「この ID は解放済みか」を答える関数を作る */
export function unlockedChecker(index: Index, watched: Watched): (id: EntityId) => boolean {
  return (id) => {
    const e = index.entities.get(id)
    return e !== undefined && isUnlocked(e, watched)
  }
}

/** 「この ID の現在の表示名」を答える関数を作る */
export function displayNameResolver(index: Index, watched: Watched): (id: EntityId) => string | null {
  return (id) => {
    const e = index.entities.get(id)
    return e ? displayName(e, watched) : null
  }
}

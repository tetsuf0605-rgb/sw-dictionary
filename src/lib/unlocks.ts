// 新着の計算（docs/01_requirements.md F-06、docs/02_data_model.md §14）。
//
// 「前回確認したとき解放されていたもの」をスナップショットとして持ち、いまとの差を新着とする。
// 解放されているかどうかの判定は visibility.ts の関数に任せ、ここでは差をとるだけ。
import type { DbEntity, EntityId, Fact } from '../types'
import type { UnlockSnapshot } from './storage'
import { isUnlocked, unlockedEntities, visibleFacts, type Index, type Watched } from './visibility'

/**
 * 記述を見分けるキー（docs/02 §14）。
 * `fact.id` があればそれを使い、なければ「項目ID#何番目か」にする。
 * 記述を並べ替えると番号がずれるため、長く残したい記述には data 側で id を付ける。
 */
export function factKey(entityId: EntityId, fact: Fact, indexInEntity: number): string {
  return fact.id ?? `${entityId}#${indexInEntity}`
}

/** いま解放されているものを、そのままスナップショットの形にする */
export function currentUnlocks(index: Index, watched: Watched): UnlockSnapshot {
  const entities: EntityId[] = []
  const facts: string[] = []
  for (const e of unlockedEntities(index, watched)) {
    entities.push(e.id)
    visibleFacts(e, watched).forEach((f, i) => facts.push(factKey(e.id, f, i)))
  }
  return { entities, facts }
}

export interface WhatsNew {
  /** 新しく解放された項目 */
  newEntities: DbEntity[]
  /** もとから読めていたが、記述が増えた項目 */
  updatedEntities: { entity: DbEntity; count: number }[]
  /** 新着の合計件数（項目数＋記述が増えた項目数） */
  total: number
}

const EMPTY: WhatsNew = { newEntities: [], updatedEntities: [], total: 0 }

/**
 * スナップショットと現在を比べて新着を出す。
 * snapshot が null（初回起動）のときは新着なしとして扱う。
 * 全部を新着にすると、初めて設定した直後に全項目が NEW になって意味をなさないため。
 */
export function diffUnlocks(index: Index, watched: Watched, snapshot: UnlockSnapshot | null): WhatsNew {
  if (!snapshot) return EMPTY

  const seenEntities = new Set(snapshot.entities)
  const seenFacts = new Set(snapshot.facts)
  const newEntities: DbEntity[] = []
  const updatedEntities: { entity: DbEntity; count: number }[] = []

  for (const entity of unlockedEntities(index, watched)) {
    if (!seenEntities.has(entity.id)) {
      newEntities.push(entity)
      continue
    }
    const added = visibleFacts(entity, watched).filter(
      (f, i) => !seenFacts.has(factKey(entity.id, f, i)),
    ).length
    if (added > 0) updatedEntities.push({ entity, count: added })
  }

  return { newEntities, updatedEntities, total: newEntities.length + updatedEntities.length }
}

/** その項目に NEW バッジを付けるか */
export function isNew(entity: DbEntity, whatsNew: WhatsNew): boolean {
  return (
    whatsNew.newEntities.some((e) => e.id === entity.id) ||
    whatsNew.updatedEntities.some((u) => u.entity.id === entity.id)
  )
}

/**
 * 1 項目だけ既読にしたスナップショットを返す（開いたら NEW バッジが消える）。
 * 解放されていない項目は記録しない。
 */
export function markRead(
  index: Index,
  watched: Watched,
  snapshot: UnlockSnapshot | null,
  entityId: EntityId,
): UnlockSnapshot {
  const base = snapshot ?? currentUnlocks(index, watched)
  const entity = index.entities.get(entityId)
  if (!entity || !isUnlocked(entity, watched)) return base

  const entities = new Set(base.entities)
  const facts = new Set(base.facts)
  entities.add(entity.id)
  visibleFacts(entity, watched).forEach((f, i) => facts.add(factKey(entity.id, f, i)))
  return { entities: [...entities], facts: [...facts] }
}

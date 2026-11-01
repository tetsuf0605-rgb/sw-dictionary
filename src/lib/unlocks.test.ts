// 新着の計算（docs/01_requirements.md §8 の S5）。
import { describe, expect, it } from 'vitest'
import { get, index, watch } from './testdb'
import { currentUnlocks, diffUnlocks, isNew, markRead } from './unlocks'

const ids = (list: { id: string }[]) => list.map((e) => e.id).sort()

describe('S5: ep4 だけの状態から ep5 を追加したとき', () => {
  const before = watch('ep4')
  const snapshot = currentUnlocks(index, before)
  const after = watch('ep4', 'ep5')
  const news = diffUnlocks(index, after, snapshot)

  it('S5: 新しく解放された項目が 6 件（ヨーダ・ランド・ホス・ダゴバ・クラウド シティ・ホスの戦い）', () => {
    expect(ids(news.newEntities)).toEqual(
      ['yoda', 'lando-calrissian', 'hoth', 'dagobah', 'cloud-city', 'battle-of-hoth'].sort(),
    )
  })

  it('S5: 記述が追記された項目が 11 件', () => {
    expect(news.updatedEntities).toHaveLength(11)
  })

  it('S5: 追記された件数が項目ごとに数えられている', () => {
    const vader = news.updatedEntities.find((u) => u.entity.id === 'darth-vader')
    expect(vader?.count).toBe(4) // ep5 パックでベイダーに足した記述は 4 件
  })

  it('S5: 新着の合計は 17 件', () => {
    expect(news.total).toBe(17)
  })

  it('S5: 新規解放・追記の両方に NEW バッジが付く', () => {
    expect(isNew(get('yoda'), news)).toBe(true)
    expect(isNew(get('darth-vader'), news)).toBe(true)
  })

  it('S5: 変化のなかった項目には NEW バッジが付かない', () => {
    expect(isNew(get('alderaan'), news)).toBe(false)
  })
})

describe('既読にする', () => {
  const before = watch('ep4')
  const snapshot = currentUnlocks(index, before)
  const after = watch('ep4', 'ep5')

  it('開いた項目だけ NEW バッジが消える', () => {
    const read = markRead(index, after, snapshot, 'yoda')
    const news = diffUnlocks(index, after, read)
    expect(isNew(get('yoda'), news)).toBe(false)
    expect(isNew(get('hoth'), news)).toBe(true)
    expect(news.total).toBe(16)
  })

  it('記述が追記された項目も、開けば消える', () => {
    const read = markRead(index, after, snapshot, 'darth-vader')
    expect(isNew(get('darth-vader'), diffUnlocks(index, after, read))).toBe(false)
  })

  it('すべて既読にすると新着が 0 件になる', () => {
    expect(diffUnlocks(index, after, currentUnlocks(index, after)).total).toBe(0)
  })
})

describe('初回起動と視聴を減らしたとき', () => {
  it('スナップショットがなければ新着なし（全項目が NEW にならない）', () => {
    expect(diffUnlocks(index, watch('ep4', 'ep5'), null).total).toBe(0)
  })

  it('視聴済みを減らしても新着は増えない', () => {
    const snapshot = currentUnlocks(index, watch('ep4', 'ep5'))
    expect(diffUnlocks(index, watch('ep4'), snapshot).total).toBe(0)
  })

  it('新着に未解放の項目は混ざらない', () => {
    const snapshot = currentUnlocks(index, watch('ep4'))
    const news = diffUnlocks(index, watch('ep4', 'ep5'), snapshot)
    for (const e of [...news.newEntities, ...news.updatedEntities.map((u) => u.entity)]) {
      expect(e.appearsIn.some((w) => ['ep4', 'ep5'].includes(w)), e.id).toBe(true)
    }
  })
})

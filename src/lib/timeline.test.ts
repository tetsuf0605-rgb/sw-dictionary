// 年表と作品一覧（docs/03_ui_design.md §3「年表」、docs/01 F-03 / F-11）。
// S9 の年表版：未視聴作品の名前・帯・略称が一切出ないことを保証する。
import { describe, expect, it } from 'vitest'
import { db, index, watch, watchAll } from './testdb'
import { buildTimeline, isUnlocked, timelineBands, visibleEras, watchedWorks } from './visibility'

const ids = (list: { id: string }[]) => list.map((e) => e.id)

describe('年表の中身（docs/04 Phase 5 の完了条件）', () => {
  it('ep4 だけなら「ヤヴィンの戦い」だけが並び、帯は EP4 だけ', () => {
    const w = watch('ep4')
    expect(ids(buildTimeline(index, w))).toEqual(['battle-of-yavin'])
    expect(ids(timelineBands(db, w))).toEqual(['ep4'])
  })

  it('ep5 を足すと「ホスの戦い」と帯 EP5 が増える', () => {
    const w = watch('ep4', 'ep5')
    expect(ids(buildTimeline(index, w))).toEqual(['battle-of-yavin', 'battle-of-hoth'])
    expect(ids(timelineBands(db, w))).toEqual(['ep4', 'ep5'])
  })

  it('出来事は作中年代の順に並ぶ', () => {
    const years = buildTimeline(index, watchAll()).map((e) => e.date?.year ?? 0)
    expect([...years]).toEqual([...years].sort((a, b) => a - b))
  })

  it('視聴済みが空なら出来事も帯も 0 件', () => {
    const w = watch()
    expect(buildTimeline(index, w)).toHaveLength(0)
    expect(timelineBands(db, w)).toHaveLength(0)
  })
})

describe('作品チップでの絞り込み', () => {
  it('その作品で明かされた出来事だけになる', () => {
    const w = watch('ep4', 'ep5')
    expect(ids(buildTimeline(index, w, 'ep5'))).toEqual(['battle-of-hoth'])
    expect(ids(buildTimeline(index, w, 'ep4'))).toEqual(['battle-of-yavin'])
  })

  it('未視聴の作品 ID で絞っても、解放されていない出来事は出てこない', () => {
    expect(buildTimeline(index, watch('ep4'), 'ep5')).toHaveLength(0)
  })
})

describe('作品一覧（F-11）', () => {
  it('公開順と作中時系列順を選べる', () => {
    const w = watch('ep4', 'ep5', 'ep1')
    expect(ids(watchedWorks(db, w, 'publish'))).toEqual(['ep4', 'ep5', 'ep1'])
    expect(ids(watchedWorks(db, w, 'timeline'))).toEqual(['ep1', 'ep4', 'ep5'])
  })

  it('作中年代を持たない作品（非正史）は時系列順では末尾に来る', () => {
    const w = watchAll()
    const order = watchedWorks(db, w, 'timeline')
    const noTimeline = order.filter((x) => x.timeline === null)
    expect(noTimeline.length).toBeGreaterThan(0)
    expect(ids(order).slice(-noTimeline.length).sort()).toEqual(ids(noTimeline).sort())
  })
})

describe('S9（年表版）: 未視聴作品に由来するものが出ない', () => {
  for (const watchedIds of [['ep4'], ['ep5'], ['ep4', 'ep5']]) {
    const w = watch(...watchedIds)
    const label = watchedIds.join('+')

    it(`S9: ${label} — 帯に出るのは視聴済み作品だけ`, () => {
      for (const work of timelineBands(db, w)) {
        expect(w.has(work.id), work.id).toBe(true)
      }
    })

    it(`S9: ${label} — 作品一覧に出るのは視聴済み作品だけ`, () => {
      for (const order of ['publish', 'timeline'] as const) {
        for (const work of watchedWorks(db, w, order)) {
          expect(w.has(work.id), `${order}: ${work.id}`).toBe(true)
        }
      }
    })

    it(`S9: ${label} — 年表に出る出来事はすべて解放済み`, () => {
      for (const event of buildTimeline(index, w)) {
        expect(isUnlocked(event, w), event.id).toBe(true)
      }
    })

    it(`S9: ${label} — 時代区分も revealedBy を満たすものだけ`, () => {
      for (const era of visibleEras(db, w)) {
        expect(era.revealedBy.some((id) => w.has(id)), era.id).toBe(true)
      }
    })
  }
})

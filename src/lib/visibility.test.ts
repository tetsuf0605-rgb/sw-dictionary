// docs/01_requirements.md §8 の受け入れシナリオ S1〜S6 をそのままテストにしたもの。
// 検索にかかわる S2 の一部と S7 は search.test.ts にある。
import { describe, expect, it } from 'vitest'
import { db, get, index, watch, watchAll } from './testdb'
import {
  buildTimeline,
  displayName,
  isUnlocked,
  relatedAndBacklinks,
  shownWorks,
  unlockedEntities,
  visibleEras,
  visibleFacts,
  visibleNames,
  visibleSameAs,
  visibleSources,
  type Watched,
} from './visibility'

const ids = (list: { id: string }[]) => list.map((e) => e.id).sort()
const factTexts = (id: string, watched: Watched) => visibleFacts(get(id), watched).map((f) => f.text)
const joined = (id: string, watched: Watched) => factTexts(id, watched).join('\n')

describe('S1: 視聴済みが空のとき', () => {
  const w = watch()

  it('S1: 辞典に表示できる項目が 1 件もない', () => {
    expect(unlockedEntities(index, w)).toHaveLength(0)
  })

  it('S1: 年表が空', () => {
    expect(buildTimeline(index, w)).toHaveLength(0)
  })

  it('S1: 時代区分も 1 つも出ない', () => {
    expect(visibleEras(db, w)).toHaveLength(0)
  })
})

describe('S2: ep4 だけを視聴済みのとき', () => {
  const w = watch('ep4')

  it('S2: ダース・ベイダーの詳細に「ルークの父」の記述が出ない', () => {
    expect(joined('darth-vader', w)).not.toContain('実の父')
  })

  it('S2: アナキン・スカイウォーカーが別項目として出て、「ルークの父」と書かれている', () => {
    expect(isUnlocked(get('anakin-skywalker'), w)).toBe(true)
    expect(displayName(get('anakin-skywalker'), w)).toBe('アナキン・スカイウォーカー')
    expect(joined('anakin-skywalker', w)).toContain('の父')
  })

  it('S2: ベイダーとアナキンの両方に同一人物リンクが出ない', () => {
    expect(visibleSameAs(get('darth-vader'), w, index)).toHaveLength(0)
    expect(visibleSameAs(get('anakin-skywalker'), w, index)).toHaveLength(0)
  })

  it('S2: ヨーダ・ホス・ダゴバはまだ解放されていない', () => {
    for (const id of ['yoda', 'hoth', 'dagobah', 'cloud-city', 'lando-calrissian']) {
      expect(isUnlocked(get(id), w), id).toBe(false)
    }
  })

  it('S2: 年表には「ヤヴィンの戦い」だけが出る', () => {
    expect(ids(buildTimeline(index, w))).toEqual(['battle-of-yavin'])
  })

  it('S2: 時代区分は「帝国の時代」「銀河内戦」だけ', () => {
    expect(visibleEras(db, w).map((e) => e.name)).toEqual(['帝国の時代', '銀河内戦'])
  })

  it('S2: 人物が 7 件解放される', () => {
    expect(unlockedEntities(index, w).filter((e) => e.type === 'character')).toHaveLength(7)
  })

  it('S2: 「登場作品」欄に未視聴作品が出ない', () => {
    for (const e of unlockedEntities(index, w)) {
      expect(shownWorks(e, w), e.id).toEqual(['ep4'])
    }
  })

  it('S2: 別名は revealedBy を満たすものだけ出る（オビ＝ワンの「ベン・ケノービ」は出る）', () => {
    const names = visibleNames(get('obi-wan-kenobi'), w).map((n) => n.text)
    expect(names).toEqual(['オビ＝ワン・ケノービ', 'ベン・ケノービ'])
  })
})

describe('S3: ep4 と ep5 を視聴済みのとき', () => {
  const w = watch('ep4', 'ep5')

  it('S3: ベイダーの詳細に「ルークの父」が出る', () => {
    expect(joined('darth-vader', w)).toContain('実の父')
  })

  it('S3: ベイダーとアナキンの両方に同一人物リンクが出る', () => {
    expect(visibleSameAs(get('darth-vader'), w, index).map((s) => s.id)).toEqual(['anakin-skywalker'])
    expect(visibleSameAs(get('anakin-skywalker'), w, index).map((s) => s.id)).toEqual(['darth-vader'])
  })

  it('S3: ヨーダ・ホス・ダゴバが解放される', () => {
    for (const id of ['yoda', 'hoth', 'dagobah']) {
      expect(isUnlocked(get(id), w), id).toBe(true)
    }
  })

  it('S3: 年表に「ホスの戦い」が追加され、年代順に並ぶ', () => {
    expect(buildTimeline(index, w).map((e) => e.id)).toEqual(['battle-of-yavin', 'battle-of-hoth'])
  })
})

describe('S4: ep5 だけを視聴済みのとき', () => {
  const w = watch('ep5')

  it('S4: ベイダー・ルーク・ヨーダは出る', () => {
    for (const id of ['darth-vader', 'luke-skywalker', 'yoda']) {
      expect(isUnlocked(get(id), w), id).toBe(true)
    }
  })

  it('S4: オルデランとデス・スターは出ない（ep5 パックに記述がないため）', () => {
    expect(isUnlocked(get('alderaan'), w)).toBe(false)
    expect(isUnlocked(get('death-star'), w)).toBe(false)
  })

  it('S4: ベイダーの記述は ep5 のものだけで、ep4 の記述は出ない', () => {
    const texts = factTexts('darth-vader', w)
    expect(texts.join('\n')).not.toContain('弟子だった')
    for (const f of visibleFacts(get('darth-vader'), w)) {
      expect(f.revealedBy, f.text).toContain('ep5')
    }
  })

  it('S4: 出典ラベルに未視聴作品が出ない（記述が ep4 と ep5 の両方で明かされる場合も）', () => {
    for (const f of visibleFacts(get('darth-vader'), w)) {
      expect(visibleSources(f, w), f.text).toEqual(['ep5'])
    }
  })

  it('S4: 関連項目に未解放の項目が混ざらない', () => {
    for (const e of unlockedEntities(index, w)) {
      for (const r of relatedAndBacklinks(e, w, index)) {
        expect(isUnlocked(r, w), `${e.id} → ${r.id}`).toBe(true)
      }
    }
  })
})

describe('S5: ep4 だけの状態から ep5 を追加したとき', () => {
  const before = watch('ep4')
  const after = watch('ep4', 'ep5')

  const beforeIds = new Set(unlockedEntities(index, before).map((e) => e.id))
  const newlyUnlocked = unlockedEntities(index, after).filter((e) => !beforeIds.has(e.id))
  const gainedFacts = unlockedEntities(index, after).filter(
    (e) => beforeIds.has(e.id) && visibleFacts(e, after).length > visibleFacts(e, before).length,
  )

  it('S5: 新しく解放された項目が 6 件', () => {
    expect(ids(newlyUnlocked)).toEqual(
      ['battle-of-hoth', 'cloud-city', 'dagobah', 'hoth', 'lando-calrissian', 'yoda'].sort(),
    )
  })

  it('S5: 記述が追記された項目が 11 件', () => {
    expect(gainedFacts).toHaveLength(11)
  })
})

describe('S6: 「すべて表示（ネタバレ全開放）」のとき', () => {
  const w = watchAll()

  it('S6: 全項目が解放される', () => {
    expect(unlockedEntities(index, w)).toHaveLength(db.entities.length)
  })

  it('S6: 全記述が表示される', () => {
    for (const e of db.entities) {
      expect(visibleFacts(e, w), e.id).toHaveLength(e.facts.length)
    }
  })

  it('S6: 内部的には全作品を watched にしているだけ（専用の経路を作っていない）', () => {
    const everyWork = watch(...db.works.map((x) => x.id))
    expect(ids(unlockedEntities(index, w))).toEqual(ids(unlockedEntities(index, everyWork)))
  })
})

describe('解放判定の土台', () => {
  it('appearsIn は記述・別名・sameAs の revealedBy から計算されている（02 §7）', () => {
    expect(get('darth-vader').appearsIn).toEqual(['ep4', 'ep5'])
  })

  it('works.json にない作品 ID が watched に残っていても無視する', () => {
    expect(watch('ep4', 'not-a-work').has('not-a-work')).toBe(false)
  })
})

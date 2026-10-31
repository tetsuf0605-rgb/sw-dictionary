// 検索の受け入れシナリオ（docs/01_requirements.md §8 の S1・S2・S7）と、
// docs/03_ui_design.md §3「検索結果」の正規化規則。
import { describe, expect, it } from 'vitest'
import { normalize, search } from './search'
import { index, watch, watchAll } from './testdb'
import { buildSearchIndex } from './visibility'

const find = (query: string, ...works: string[]) =>
  search(buildSearchIndex(index, watch(...works)), query)
const hitIds = (query: string, ...works: string[]) => find(query, ...works).map((r) => r.id)

describe('S1: 視聴済みが空のとき', () => {
  it('S1: 検索結果が 0 件', () => {
    expect(search(buildSearchIndex(index, watch()), 'ルーク')).toHaveLength(0)
  })
})

describe('S2: ep4 だけを視聴済みのとき', () => {
  it('S2: 「ベン」で検索するとオビ＝ワンが出る（別名でヒットする）', () => {
    const results = find('ベン', 'ep4')
    expect(results.map((r) => r.id)).toContain('obi-wan-kenobi')
    expect(results.find((r) => r.id === 'obi-wan-kenobi')?.hitAlias).toBe('ベン・ケノービ')
  })

  it('S2: 「ヨーダ」は 0 件（未解放の項目は検索に出ない）', () => {
    expect(hitIds('ヨーダ', 'ep4')).toHaveLength(0)
  })

  it('S2: ep5 を足すとヨーダが出る', () => {
    expect(hitIds('ヨーダ', 'ep4', 'ep5')).toContain('yoda')
  })
})

describe('S7: 表記のゆれを吸収する（ep4 を視聴済み）', () => {
  it('S7: 「あなきん」（ひらがな読み）でアナキンが出る', () => {
    expect(hitIds('あなきん', 'ep4')).toContain('anakin-skywalker')
  })

  it('S7: 「Anakin」（英語名）でアナキンが出る', () => {
    expect(hitIds('Anakin', 'ep4')).toContain('anakin-skywalker')
  })

  it('S7: 「アナキン」（カタカナ）でアナキンが出る', () => {
    expect(hitIds('アナキン', 'ep4')).toContain('anakin-skywalker')
  })

  it('S7: 「ダースベイダー」（中黒なし）でベイダーが出る', () => {
    expect(hitIds('ダースベイダー', 'ep4')).toContain('darth-vader')
  })

  it('S7: 「オビワン」（＝なし）でオビ＝ワンが出る', () => {
    expect(hitIds('オビワン', 'ep4')).toContain('obi-wan-kenobi')
  })
})

describe('正規化（03 §3）', () => {
  it('カタカナ・ひらがな・半角カナ・中黒・大文字小文字の違いを吸収する', () => {
    expect(normalize('ダース・ベイダー')).toBe('だーすべいだー')
    expect(normalize('ﾀﾞｰｽ ﾍﾞｲﾀﾞｰ')).toBe('だーすべいだー')
    expect(normalize('オビ＝ワン・ケノービ')).toBe('おびわんけのーび')
    expect(normalize('Obi-Wan Kenobi')).toBe('obi-wankenobi')
  })

  it('空の検索語では何も返さない', () => {
    expect(search(buildSearchIndex(index, watchAll()), '   ')).toHaveLength(0)
  })
})

describe('並び順（03 §3）', () => {
  it('前方一致が部分一致より上に来る', () => {
    // 「すかい」は「スカイウォーカー」の前方一致にならないが、ルークの読みには含まれる
    const results = search(buildSearchIndex(index, watchAll()), 'る')
    const ranks = results.map((r) => r.display)
    expect(ranks[0]).toBe('ルーク・スカイウォーカー')
  })
})

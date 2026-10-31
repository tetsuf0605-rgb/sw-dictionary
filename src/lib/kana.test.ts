// 五十音インデックスの行分け（docs/03_ui_design.md §3「一覧」）。
import { describe, expect, it } from 'vitest'
import { kanaRow } from './kana'
import { sortKeyOf } from './visibility'
import { get, watch } from './testdb'

describe('五十音の行分け', () => {
  it('清音はその行になる', () => {
    expect(kanaRow('あなきん・すかいうぉーかー')).toBe('あ')
    expect(kanaRow('はん・そろ')).toBe('は')
    expect(kanaRow('るーく・すかいうぉーかー')).toBe('ら')
  })

  it('濁点・半濁点は清音の行にまとめる', () => {
    expect(kanaRow('だーす・べいだー')).toBe('た')
    expect(kanaRow('ぎんがていこく')).toBe('か')
    expect(kanaRow('ぱるぱてぃーん')).toBe('は')
  })

  it('小書き文字も清音の行にまとめる', () => {
    expect(kanaRow('っ')).toBe('た')
    expect(kanaRow('ゃ')).toBe('や')
  })

  it('カタカナで書かれていても同じ行になる', () => {
    expect(kanaRow('ダース・ベイダー')).toBe('た')
  })

  it('かな以外は「他」に入れる', () => {
    expect(kanaRow('R2-D2')).toBe('他')
    expect(kanaRow('')).toBe('他')
  })
})

describe('一覧での行分け（ep4 を視聴済み）', () => {
  const w = watch('ep4')

  it('読みをもとに行が決まる', () => {
    expect(kanaRow(sortKeyOf(get('obi-wan-kenobi'), w))).toBe('あ')
    expect(kanaRow(sortKeyOf(get('darth-vader'), w))).toBe('た')
    expect(kanaRow(sortKeyOf(get('leia-organa'), w))).toBe('ら')
  })
})

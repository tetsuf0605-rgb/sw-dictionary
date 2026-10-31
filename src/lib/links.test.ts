// 本文リンク記法の扱い（docs/02_data_model.md §8）と、S8 / S9 の土台になる動き。
import { describe, expect, it } from 'vitest'
import { UNKNOWN_LABEL, linkedIds, parseFactText, renderFactText } from './links'
import { get, index, watch } from './testdb'
import { displayNameResolver, unlockedChecker, visibleFacts } from './visibility'

const render = (text: string, ...works: string[]) => {
  const w = watch(...works)
  return renderFactText(text, {
    isUnlocked: unlockedChecker(index, w),
    displayName: displayNameResolver(index, w),
  })
}

describe('記法のパース', () => {
  it('[[id]] と [[id|ラベル]] を取り出し、それ以外は文字として扱う', () => {
    expect(parseFactText('彼は[[luke-skywalker]]と[[yoda|師]]に会った。')).toEqual([
      { kind: 'text', text: '彼は' },
      { kind: 'link', id: 'luke-skywalker', label: null },
      { kind: 'text', text: 'と' },
      { kind: 'link', id: 'yoda', label: '師' },
      { kind: 'text', text: 'に会った。' },
    ])
  })

  it('太字などの他の Markdown 記法は解釈しない', () => {
    expect(parseFactText('**太字**は使わない')).toEqual([{ kind: 'text', text: '**太字**は使わない' }])
  })

  it('リンク先 ID を重複なく取り出せる', () => {
    expect(linkedIds('[[yoda]]と[[yoda|師]]と[[hoth]]')).toEqual(['yoda', 'hoth'])
  })
})

describe('解放状況による描画の切り替え', () => {
  it('解放済みのリンク先は、その項目の現在の表示名でリンクになる', () => {
    expect(render('[[luke-skywalker]]の話', 'ep4')).toEqual([
      { kind: 'link', id: 'luke-skywalker', text: 'ルーク・スカイウォーカー' },
      { kind: 'text', text: 'の話' },
    ])
  })

  it('ラベル付きリンクの先が未解放なら、ラベルを文字として出す（リンクにしない）', () => {
    expect(render('[[yoda|ある老人]]の話', 'ep4')).toEqual([
      { kind: 'locked', text: 'ある老人' },
      { kind: 'text', text: 'の話' },
    ])
  })

  it('ラベルなしリンクの先が未解放なら「？？？」にする（本来は validate の E08 が防ぐ）', () => {
    expect(render('[[yoda]]の話', 'ep4')).toEqual([
      { kind: 'locked', text: UNKNOWN_LABEL },
      { kind: 'text', text: 'の話' },
    ])
  })

  it('ラベルがあっても、未視聴作品のタイトルや項目名は表示名として出ない', () => {
    const tokens = render('[[yoda|師]]', 'ep4')
    expect(tokens.map((t) => t.text).join('')).not.toContain('ヨーダ')
  })
})

describe('S9: ep4 のみの表示に未視聴作品由来の文字列が出ない', () => {
  it('S9: 表示される全記述を描画しても、未解放項目の表示名が現れない', () => {
    const w = watch('ep4')
    const isUnlockedId = unlockedChecker(index, w)
    const resolve = displayNameResolver(index, w)

    const lockedNames = index.db.entities
      .filter((e) => !isUnlockedId(e.id))
      .flatMap((e) => e.names.map((n) => n.text))

    const rendered = index.db.entities
      .filter((e) => isUnlockedId(e.id))
      .flatMap((e) => visibleFacts(e, w))
      .flatMap((f) => renderFactText(f.text, { isUnlocked: isUnlockedId, displayName: resolve }))
      .map((t) => t.text)
      .join('\n')

    for (const name of lockedNames) {
      expect(rendered, `未解放の項目名「${name}」が本文に出ている`).not.toContain(name)
    }
  })

  it('S9: 未解放の項目を開こうとしても名前を返さない（ディープリンク対策の土台）', () => {
    const w = watch('ep4')
    expect(unlockedChecker(index, w)('yoda')).toBe(false)
    // 名前を出すかどうかは画面側が isUnlocked を見て決める
    expect(get('yoda').names[0].text).toBe('ヨーダ')
  })
})

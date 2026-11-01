// 設定の書き出し・取り込み（docs/01_requirements.md F-09）。
// localStorage は触らない純粋な部分だけをテストする。
import { describe, expect, it } from 'vitest'
import { exportSettings, parseSettings } from './storage'

describe('設定の書き出しと取り込み', () => {
  it('書き出した文字列を取り込むと元に戻る（別端末への移行）', () => {
    const text = exportSettings(['ep4', 'ep5'], { fontSize: 'l', showAll: false })
    const result = parseSettings(text)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.watched).toEqual(['ep4', 'ep5'])
    expect(result.value.prefs).toEqual({ fontSize: 'l', showAll: false })
  })

  it('人が読める形で書き出す（改行つきの JSON）', () => {
    expect(exportSettings(['ep4'], { fontSize: 'm', showAll: false })).toContain('\n')
  })

  it('壊れた文字列は理由つきで断る', () => {
    const result = parseSettings('{ 壊れている')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('JSON として読めませんでした')
  })

  it('別のアプリの設定は取り込まない', () => {
    const result = parseSettings('{"app":"other","watched":[]}')
    expect(result.ok).toBe(false)
  })

  it('視聴済み作品が入っていなければ断る', () => {
    const result = parseSettings('{"app":"sw-dictionary","version":1}')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('視聴済み作品')
  })

  it('表示設定が壊れていても、視聴済み作品は取り込む（既定の表示設定で補う）', () => {
    const result = parseSettings('{"app":"sw-dictionary","version":1,"watched":["ep4"],"prefs":"壊れ"}')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.watched).toEqual(['ep4'])
    expect(result.value.prefs.fontSize).toBe('m')
  })
})

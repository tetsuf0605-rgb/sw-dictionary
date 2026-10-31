// スクロール位置の復元（docs/03_ui_design.md §2）。
// 項目詳細 → リンク先 → 戻る、で元の位置に戻す。
//
// react-router の <ScrollRestoration> は データルーター専用で HashRouter では使えないため、
// 履歴エントリごとの scrollY を自分で覚えておく。
//
// 位置の保存と移動は 1 つの useLayoutEffect にまとめてある。
// - クリーンアップ（＝離れる画面の保存）は、次の画面のレイアウト効果より先に走る。
//   保存を別の useEffect に分けると、スクロールした後に保存が走って 0 が記録されてしまう。
// - 移動に requestAnimationFrame は使わない。タブが非表示のあいだ発火しないため。
import { useEffect, useLayoutEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

const positions = new Map<string, number>()

export default function ScrollMemory() {
  const location = useLocation()
  const navigationType = useNavigationType()

  // ブラウザ自身のスクロール復元を切る。
  // 入れたままだと、新しい画面を開いたのに前の画面の位置が復元されて中途半端な所に出る。
  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    return () => {
      if ('scrollRestoration' in history) history.scrollRestoration = 'auto'
    }
  }, [])

  useLayoutEffect(() => {
    const key = location.key
    // 戻る／進む（POP）のときだけ元の位置へ。新しい画面を開いたときは先頭から
    window.scrollTo(0, navigationType === 'POP' ? (positions.get(key) ?? 0) : 0)
    return () => {
      positions.set(key, window.scrollY)
    }
  }, [location.key, navigationType])

  return null
}

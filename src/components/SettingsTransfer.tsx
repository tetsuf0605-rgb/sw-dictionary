// 設定の書き出し・取り込み（docs/01_requirements.md F-09）。
// 機種変更や家族への共有用に、視聴済み作品と表示設定を JSON テキストでやりとりする。
// サーバーは使わない。コピーして貼り付けるだけ。
import { useState } from 'react'
import { exportSettings, parseSettings } from '../lib/storage'
import { useApp } from '../store/app'

export default function SettingsTransfer() {
  const { watchedIds, prefs, replaceSettings } = useApp()
  const [input, setInput] = useState('')
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const exported = exportSettings(watchedIds, prefs)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(exported)
      setMessage({ kind: 'ok', text: 'コピーしました。' })
    } catch {
      setMessage({ kind: 'error', text: 'コピーできませんでした。下の枠を長押しして選択してください。' })
    }
  }

  const apply = () => {
    const result = parseSettings(input)
    if (!result.ok) {
      setMessage({ kind: 'error', text: result.error })
      return
    }
    replaceSettings(result.value.watched, result.value.prefs)
    setInput('')
    setMessage({ kind: 'ok', text: `取り込みました（${result.value.watched.length} 作品）。` })
  }

  return (
    <>
      <p className="page__note">
        この文字列を別の端末のアプリに貼り付けると、同じ視聴状況になります。
      </p>

      <textarea className="transfer" readOnly rows={4} value={exported} aria-label="書き出した設定" />
      <button type="button" className="button button--quiet" onClick={copy}>
        コピーする
      </button>

      <p className="page__note">別の端末から持ってきた文字列は、ここに貼り付けてください。</p>
      <textarea
        className="transfer"
        rows={4}
        value={input}
        placeholder="ここに貼り付け"
        aria-label="取り込む設定"
        onChange={(e) => setInput(e.target.value)}
      />
      <button type="button" className="button" disabled={input.trim() === ''} onClick={apply}>
        取り込む（いまの設定を置き換えます）
      </button>

      {message && (
        <p className={message.kind === 'error' ? 'transfer__error' : 'page__note'} role="status">
          {message.text}
        </p>
      )}
    </>
  )
}

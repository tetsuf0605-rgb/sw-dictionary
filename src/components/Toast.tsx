// 設定変更で新着が増えたときの案内（docs/03_ui_design.md §3「設定」）。
// 「新着 N 件」を数秒だけ出し、タップで新着画面へ。
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/app'

const DURATION_MS = 6000

export default function Toast() {
  const { whatsNew } = useApp()
  const navigate = useNavigate()
  const previous = useRef<number | null>(null)
  const [count, setCount] = useState(0)

  useEffect(() => {
    const before = previous.current
    previous.current = whatsNew.total
    // 最初の 1 回（起動直後）は出さない。増えたときだけ出す
    if (before === null || whatsNew.total <= before) return
    setCount(whatsNew.total)
    const timer = setTimeout(() => setCount(0), DURATION_MS)
    return () => clearTimeout(timer)
  }, [whatsNew.total])

  if (count === 0) return null

  return (
    <button
      type="button"
      className="toast"
      onClick={() => {
        setCount(0)
        navigate('/whats-new')
      }}
    >
      新着 {count} 件 — 見る
    </button>
  )
}

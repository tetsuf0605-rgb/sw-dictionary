import { ChevronLeft } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { TABS } from './BottomTabs'

const TAB_ROOTS = TABS.map((t) => t.to)

// iOS のホーム画面起動には OS の戻る操作がないため、ヘッダーの戻るボタンが必須（docs/03 §2）。
// タブの行き先そのものには戻るボタンを出さない。
export default function Header() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isTabRoot = TAB_ROOTS.includes(pathname)

  return (
    <header className="header">
      {!isTabRoot && (
        <button
          type="button"
          className="header__back"
          aria-label="戻る"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
        >
          <ChevronLeft size={20} aria-hidden="true" />
          戻る
        </button>
      )}
      <h1 className="header__title">ホロクロン</h1>
    </header>
  )
}

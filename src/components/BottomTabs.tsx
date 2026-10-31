import { BookOpen, Home, Milestone, Settings } from 'lucide-react'
import { NavLink } from 'react-router-dom'

// 下部タブ 4 つ（docs/03 §1）。辞典タブは一覧の既定の種類（人物）へ。
export const TABS = [
  { to: '/', label: 'ホーム', Icon: Home, end: true },
  { to: '/list/character', label: '辞典', Icon: BookOpen, end: false },
  { to: '/timeline', label: '年表', Icon: Milestone, end: false },
  { to: '/settings', label: '設定', Icon: Settings, end: false },
]

export default function BottomTabs() {
  return (
    <nav className="tabbar" aria-label="メインナビゲーション">
      {TABS.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => 'tabbar__item' + (isActive ? ' is-active' : '')}
        >
          <Icon size={22} aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

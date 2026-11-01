import { Outlet } from 'react-router-dom'
import BottomTabs from './components/BottomTabs'
import Header from './components/Header'
import Toast from './components/Toast'
import { useApp } from './store/app'

// アプリの殻。ヘッダー・（警告帯）・本文・下部タブ。
export default function App() {
  const { prefs } = useApp()

  return (
    <div className="app">
      <Header />
      {prefs.showAll && (
        <p className="spoilerBanner" role="status">
          すべて表示中（ネタバレ全開放）
        </p>
      )}
      <main className="main">
        <Outlet />
      </main>
      <Toast />
      <BottomTabs />
    </div>
  )
}

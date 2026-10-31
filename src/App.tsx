import { Outlet } from 'react-router-dom'
import Header from './components/Header'
import BottomTabs from './components/BottomTabs'

// アプリの殻。ヘッダー・本文・下部タブの 3 層だけを持つ。
export default function App() {
  return (
    <div className="app">
      <Header />
      <main className="main">
        <Outlet />
      </main>
      <BottomTabs />
    </div>
  )
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Route, Routes } from 'react-router-dom'
import App from './App'
import ScrollMemory from './components/ScrollMemory'
import Dictionary from './routes/Dictionary'
import Entity from './routes/Entity'
import Home from './routes/Home'
import NotFound from './routes/NotFound'
import Search from './routes/Search'
import Settings from './routes/Settings'
import Timeline from './routes/Timeline'
import { AppProvider } from './store/app'
import './styles/global.css'

// HashRouter を使う理由: GitHub Pages は #/timeline のような深いリンクでも
// index.html を返せる（通常のパスだと 404 になる）。docs/03 §1
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <HashRouter>
        <ScrollMemory />
        <Routes>
          <Route element={<App />}>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/list/:type" element={<Dictionary />} />
            <Route path="/e/:id" element={<Entity />} />
            <Route path="/timeline" element={<Timeline />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </HashRouter>
    </AppProvider>
  </StrictMode>,
)

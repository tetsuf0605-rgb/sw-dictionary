import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Route, Routes } from 'react-router-dom'
import App from './App'
import Home from './routes/Home'
import Dictionary from './routes/Dictionary'
import Timeline from './routes/Timeline'
import Settings from './routes/Settings'
import NotFound from './routes/NotFound'
import './styles/global.css'

// HashRouter を使う理由: GitHub Pages は #/timeline のような深いリンクでも
// index.html を返せる（通常のパスだと 404 になる）。docs/03 §1
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route element={<App />}>
          <Route path="/" element={<Home />} />
          <Route path="/list/:type" element={<Dictionary />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </HashRouter>
  </StrictMode>,
)

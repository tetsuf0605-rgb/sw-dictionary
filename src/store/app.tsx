// アプリ全体で共有する状態。
// - 起動時に public/data/db.json を読む
// - 視聴済み作品と表示設定を localStorage と同期する（docs/02 §14）
//
// 表示可否の判定はここではしない。watched を作って渡すだけで、判定は src/lib/visibility.ts が持つ。
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { DEFAULT_PREFS, loadPrefs, loadWatched, savePrefs, saveWatched } from '../lib/storage'
import { createIndex, resolveWatched, type Index, type Watched } from '../lib/visibility'
import type { Db, Prefs, WorkId } from '../types'

type Status =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; db: Db; index: Index }

interface AppValue {
  status: Status
  /** 設定画面でチェックされている作品（showAll は含めない生の値） */
  watchedIds: WorkId[]
  prefs: Prefs
  /** 判定に渡す watched。showAll が ON なら全作品が入る */
  watched: Watched
  toggleWork: (id: WorkId, on: boolean) => void
  toggleWorks: (ids: readonly WorkId[], on: boolean) => void
  updatePrefs: (patch: Partial<Prefs>) => void
}

const AppContext = createContext<AppValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>({ kind: 'loading' })
  const [watchedIds, setWatchedIds] = useState<WorkId[]>(() => loadWatched())
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs())

  // db.json の読み込み（base が /sw-dictionary/ なので BASE_URL を付ける）
  useEffect(() => {
    let cancelled = false
    fetch(`${import.meta.env.BASE_URL}data/db.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`データを取得できませんでした（HTTP ${res.status}）`)
        return res.json() as Promise<Db>
      })
      .then((db) => {
        if (!cancelled) setStatus({ kind: 'ready', db, index: createIndex(db) })
      })
      .catch((e: unknown) => {
        if (!cancelled) setStatus({ kind: 'error', message: e instanceof Error ? e.message : String(e) })
      })
    return () => {
      cancelled = true
    }
  }, [])

  // 文字サイズは html の属性で切り替える（CSS 側が --font-base を変える）
  useEffect(() => {
    document.documentElement.dataset.fontSize = prefs.fontSize
  }, [prefs.fontSize])

  const toggleWork = useCallback((id: WorkId, on: boolean) => {
    setWatchedIds((prev) => {
      const next = on ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id)
      saveWatched(next) // チェックした瞬間に保存する（docs/03 §3）
      return next
    })
  }, [])

  const toggleWorks = useCallback((ids: readonly WorkId[], on: boolean) => {
    setWatchedIds((prev) => {
      const set = new Set(prev)
      for (const id of ids) {
        if (on) set.add(id)
        else set.delete(id)
      }
      const next = [...set]
      saveWatched(next)
      return next
    })
  }, [])

  const updatePrefs = useCallback((patch: Partial<Prefs>) => {
    setPrefs((prev) => {
      const next = { ...DEFAULT_PREFS, ...prev, ...patch }
      savePrefs(next)
      return next
    })
  }, [])

  const watched = useMemo(
    () => (status.kind === 'ready' ? resolveWatched(status.db, watchedIds, prefs.showAll) : new Set<WorkId>()),
    [status, watchedIds, prefs.showAll],
  )

  const value = useMemo<AppValue>(
    () => ({ status, watchedIds, prefs, watched, toggleWork, toggleWorks, updatePrefs }),
    [status, watchedIds, prefs, watched, toggleWork, toggleWorks, updatePrefs],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppValue {
  const value = useContext(AppContext)
  if (!value) throw new Error('AppProvider の外で useApp が呼ばれました')
  return value
}

/** データが読めているときだけ使うショートカット。読み込み中は null を返す */
export function useDb(): { db: Db; index: Index; watched: Watched } | null {
  const { status, watched } = useApp()
  if (status.kind !== 'ready') return null
  return { db: status.db, index: status.index, watched }
}

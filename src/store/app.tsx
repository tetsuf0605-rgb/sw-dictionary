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
import {
  DEFAULT_PREFS,
  HISTORY_MAX,
  loadFavorites,
  loadHistory,
  loadPrefs,
  loadSnapshot,
  loadWatched,
  saveFavorites,
  saveHistory,
  savePrefs,
  saveSnapshot,
  saveWatched,
  type UnlockSnapshot,
} from '../lib/storage'
import { currentUnlocks, diffUnlocks, markRead, type WhatsNew } from '../lib/unlocks'
import { createIndex, resolveWatched, type Index, type Watched } from '../lib/visibility'
import type { Db, EntityId, Prefs, WorkId } from '../types'

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
  /** 閲覧履歴。新しい順（docs/02 §14 sw.history.v1） */
  history: EntityId[]
  pushHistory: (id: EntityId) => void
  clearHistory: () => void
  /** 前回確認時から新しく読めるようになったもの（docs/01 F-06） */
  whatsNew: WhatsNew
  markAllRead: () => void
  markEntityRead: (id: EntityId) => void
  favorites: EntityId[]
  toggleFavorite: (id: EntityId) => void
  /** 取り込み（F-09）。視聴済みと表示設定をまとめて置き換える */
  replaceSettings: (watched: WorkId[], prefs: Prefs) => void
  toggleWork: (id: WorkId, on: boolean) => void
  toggleWorks: (ids: readonly WorkId[], on: boolean) => void
  updatePrefs: (patch: Partial<Prefs>) => void
}

const AppContext = createContext<AppValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>({ kind: 'loading' })
  const [watchedIds, setWatchedIds] = useState<WorkId[]>(() => loadWatched())
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs())
  const [history, setHistory] = useState<EntityId[]>(() => loadHistory())
  const [snapshot, setSnapshot] = useState<UnlockSnapshot | null>(() => loadSnapshot())
  const [favorites, setFavorites] = useState<EntityId[]>(() => loadFavorites())

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

  const pushHistory = useCallback((id: EntityId) => {
    setHistory((prev) => {
      if (prev[0] === id) return prev
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, HISTORY_MAX)
      saveHistory(next)
      return next
    })
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])
    saveHistory([])
  }, [])

  const watched = useMemo(
    () => (status.kind === 'ready' ? resolveWatched(status.db, watchedIds, prefs.showAll) : new Set<WorkId>()),
    [status, watchedIds, prefs.showAll],
  )

  // 新着。スナップショットが未保存（初回起動）のときは差がないものとして扱う
  const whatsNew = useMemo<WhatsNew>(
    () =>
      status.kind === 'ready'
        ? diffUnlocks(status.index, watched, snapshot)
        : { newEntities: [], updatedEntities: [], total: 0 },
    [status, watched, snapshot],
  )

  // 初回起動時に「いま読めるもの」を基準として記録しておく。
  // これをしないと、最初に作品を選んだ直後に全項目が NEW になってしまう
  useEffect(() => {
    if (status.kind !== 'ready' || snapshot !== null) return
    const initial = currentUnlocks(status.index, watched)
    saveSnapshot(initial)
    setSnapshot(initial)
  }, [status, watched, snapshot])

  const markAllRead = useCallback(() => {
    if (status.kind !== 'ready') return
    const next = currentUnlocks(status.index, watched)
    saveSnapshot(next)
    setSnapshot(next)
  }, [status, watched])

  const markEntityRead = useCallback(
    (id: EntityId) => {
      if (status.kind !== 'ready') return
      setSnapshot((prev) => {
        const next = markRead(status.index, watched, prev, id)
        saveSnapshot(next)
        return next
      })
    },
    [status, watched],
  )

  const toggleFavorite = useCallback((id: EntityId) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]
      saveFavorites(next)
      return next
    })
  }, [])

  const replaceSettings = useCallback((ids: WorkId[], next: Prefs) => {
    saveWatched(ids)
    setWatchedIds(ids)
    savePrefs(next)
    setPrefs(next)
  }, [])

  const value = useMemo<AppValue>(
    () => ({
      status,
      watchedIds,
      prefs,
      watched,
      history,
      pushHistory,
      clearHistory,
      whatsNew,
      markAllRead,
      markEntityRead,
      favorites,
      toggleFavorite,
      replaceSettings,
      toggleWork,
      toggleWorks,
      updatePrefs,
    }),
    [
      status,
      watchedIds,
      prefs,
      watched,
      history,
      pushHistory,
      clearHistory,
      whatsNew,
      markAllRead,
      markEntityRead,
      favorites,
      toggleFavorite,
      replaceSettings,
      toggleWork,
      toggleWorks,
      updatePrefs,
    ],
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

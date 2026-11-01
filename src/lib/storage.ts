// 端末内に保存するもの（docs/02_data_model.md §14）。
// サーバーには一切送らない。スキーマを変えるときはキー末尾の v1 を上げ、移行コードを書く。
import type { EntityId, Prefs, WorkId } from '../types'

export const KEYS = {
  watched: 'sw.watched.v1',
  prefs: 'sw.prefs.v1',
  history: 'sw.history.v1',
  favorites: 'sw.favorites.v1',
  unlockSnapshot: 'sw.unlockSnapshot.v1',
  notes: 'sw.notes.v1',
} as const

export const DEFAULT_PREFS: Prefs = { fontSize: 'm', showAll: false }

/** localStorage が使えない環境（プライベートモード等）でも落ちないように包む */
function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeRaw(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // 保存できなくても画面は動かす（容量超過・プライベートモードなど）
  }
}

function read<T>(key: string, isValid: (v: unknown) => v is T, fallback: T): T {
  const raw = readRaw(key)
  if (raw === null) return fallback
  try {
    const parsed: unknown = JSON.parse(raw)
    return isValid(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string')

const isPrefs = (v: unknown): v is Prefs =>
  typeof v === 'object' &&
  v !== null &&
  ['s', 'm', 'l'].includes((v as Prefs).fontSize) &&
  typeof (v as Prefs).showAll === 'boolean'

/* ---------- 視聴済み作品 ---------- */

export function loadWatched(): WorkId[] {
  return read(KEYS.watched, isStringArray, [])
}

export function saveWatched(ids: readonly WorkId[]): void {
  writeRaw(KEYS.watched, JSON.stringify([...ids]))
}

/* ---------- 表示設定 ---------- */

export function loadPrefs(): Prefs {
  return { ...DEFAULT_PREFS, ...read(KEYS.prefs, isPrefs, DEFAULT_PREFS) }
}

export function savePrefs(prefs: Prefs): void {
  writeRaw(KEYS.prefs, JSON.stringify(prefs))
}

/* ---------- 閲覧履歴（Phase 4 で使う。最大 50 件） ---------- */

export const HISTORY_MAX = 50

export function loadHistory(): EntityId[] {
  return read(KEYS.history, isStringArray, [])
}

export function saveHistory(ids: readonly EntityId[]): void {
  writeRaw(KEYS.history, JSON.stringify(ids.slice(0, HISTORY_MAX)))
}

/* ---------- お気に入り（docs/01 F-10） ---------- */

export function loadFavorites(): EntityId[] {
  return read(KEYS.favorites, isStringArray, [])
}

export function saveFavorites(ids: readonly EntityId[]): void {
  writeRaw(KEYS.favorites, JSON.stringify([...ids]))
}

/* ---------- 新着計算のスナップショット（docs/02 §14） ---------- */

/** 前回確認時に解放されていたもの */
export interface UnlockSnapshot {
  entities: EntityId[]
  facts: string[]
}

const isSnapshot = (v: unknown): v is UnlockSnapshot =>
  typeof v === 'object' &&
  v !== null &&
  isStringArray((v as UnlockSnapshot).entities) &&
  isStringArray((v as UnlockSnapshot).facts)

/** 未保存なら null を返す（＝初回起動。このときは「全部が新着」にはしない） */
export function loadSnapshot(): UnlockSnapshot | null {
  const raw = readRaw(KEYS.unlockSnapshot)
  if (raw === null) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return isSnapshot(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveSnapshot(snapshot: UnlockSnapshot): void {
  writeRaw(KEYS.unlockSnapshot, JSON.stringify(snapshot))
}

/* ---------- 設定の書き出し・取り込み（docs/01 F-09） ---------- */

export interface SettingsExport {
  app: 'sw-dictionary'
  version: 1
  watched: WorkId[]
  prefs: Prefs
}

export function exportSettings(watched: readonly WorkId[], prefs: Prefs): string {
  const payload: SettingsExport = { app: 'sw-dictionary', version: 1, watched: [...watched], prefs }
  return JSON.stringify(payload, null, 2)
}

/** 貼り付けられた JSON を読む。読めなければ理由を日本語で返す */
export function parseSettings(
  text: string,
): { ok: true; value: SettingsExport } | { ok: false; error: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: 'JSON として読めませんでした。全体をコピーできているか確認してください。' }
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: '形式が違います。書き出した文字列をそのまま貼り付けてください。' }
  }
  const v = parsed as Partial<SettingsExport>
  if (v.app !== 'sw-dictionary') return { ok: false, error: 'このアプリの設定ではないようです。' }
  if (!isStringArray(v.watched)) return { ok: false, error: '視聴済み作品の一覧が入っていません。' }
  return {
    ok: true,
    value: {
      app: 'sw-dictionary',
      version: 1,
      watched: v.watched,
      prefs: isPrefs(v.prefs) ? v.prefs : DEFAULT_PREFS,
    },
  }
}

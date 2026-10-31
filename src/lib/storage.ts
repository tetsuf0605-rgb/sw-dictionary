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

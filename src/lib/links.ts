// 本文中のリンク記法 [[id]] / [[id|ラベル]] のパーサー（docs/02_data_model.md §8）。
//
// このファイルは watched（視聴済み作品）を一切知らない。解放されているかどうかの判定は
// visibility.ts が持ち、ここには「解放済みか答える関数」を外から渡す。
// 02 §6 の「判定は 1 か所」を守るための形。
import type { EntityId } from '../types'

/** [[id]] と [[id|ラベル]] だけを解釈する。太字などの他の記法は解釈しない */
const LINK_RE = /\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g

/** 未解放のラベルなしリンクに出す文字列（02 §8） */
export const UNKNOWN_LABEL = '？？？'

export type FactToken =
  | { kind: 'text'; text: string }
  /** 解放済み。リンクとして描画する */
  | { kind: 'link'; id: EntityId; text: string }
  /** 未解放。リンクにせず文字として描画する */
  | { kind: 'locked'; text: string }

/** パース結果（解放判定前）。id とラベルだけを取り出す */
export type RawToken = { kind: 'text'; text: string } | { kind: 'link'; id: EntityId; label: string | null }

/** 本文を文字列とリンクに分解する */
export function parseFactText(text: string): RawToken[] {
  const tokens: RawToken[] = []
  let last = 0
  for (const m of text.matchAll(LINK_RE)) {
    const at = m.index ?? 0
    if (at > last) tokens.push({ kind: 'text', text: text.slice(last, at) })
    tokens.push({ kind: 'link', id: m[1], label: m[2] ?? null })
    last = at + m[0].length
  }
  if (last < text.length) tokens.push({ kind: 'text', text: text.slice(last) })
  return tokens
}

/** 本文に出てくるリンク先 ID を重複なく返す（関連項目・バックリンクの計算に使う） */
export function linkedIds(text: string): EntityId[] {
  const ids = new Set<EntityId>()
  for (const t of parseFactText(text)) if (t.kind === 'link') ids.add(t.id)
  return [...ids]
}

/**
 * 本文を描画用のトークンに変換する。
 * - リンク先が解放済み  → link（表示名は displayName が返すもの、ラベルがあればラベル）
 * - 未解放でラベルあり  → locked（ラベルを文字として表示）
 * - 未解放でラベルなし  → locked（「？？？」。本来はデータの不備で、validate の E08 が防ぐ）
 */
/** 本文をリンクなしの素のテキストにする（年表のカードなど、1 行で見せたいところ用） */
export function plainFactText(
  text: string,
  deps: { isUnlocked: (id: EntityId) => boolean; displayName: (id: EntityId) => string | null },
): string {
  return renderFactText(text, deps)
    .map((t) => t.text)
    .join('')
}

export function renderFactText(
  text: string,
  deps: {
    isUnlocked: (id: EntityId) => boolean
    /** 解放済みの項目の現在の表示名。見つからなければ null */
    displayName: (id: EntityId) => string | null
  },
): FactToken[] {
  return parseFactText(text).map((t): FactToken => {
    if (t.kind === 'text') return t
    if (!deps.isUnlocked(t.id)) return { kind: 'locked', text: t.label ?? UNKNOWN_LABEL }
    const name = t.label ?? deps.displayName(t.id)
    if (name === null) return { kind: 'locked', text: UNKNOWN_LABEL }
    return { kind: 'link', id: t.id, text: name }
  })
}

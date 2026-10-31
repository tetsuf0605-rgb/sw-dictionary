// 五十音インデックス（docs/03_ui_design.md §3「一覧」）。
// 読み（ひらがな）の 1 文字目から「あかさたな…」のどの行かを決める。
// 濁点・半濁点・小書き文字は清音の行にまとめる（「が」→ か行、「っ」→ た行）。

export const KANA_ROWS = ['あ', 'か', 'さ', 'た', 'な', 'は', 'ま', 'や', 'ら', 'わ', '他'] as const

export type KanaRow = (typeof KANA_ROWS)[number]

const ROW_CHARS: Record<Exclude<KanaRow, '他'>, string> = {
  あ: 'あいうえおぁぃぅぇぉゔ',
  か: 'かきくけこがぎぐげごゕゖ',
  さ: 'さしすせそざじずぜぞ',
  た: 'たちつてとだぢづでどっ',
  な: 'なにぬねの',
  は: 'はひふへほばびぶべぼぱぴぷぺぽ',
  ま: 'まみむめも',
  や: 'やゆよゃゅょ',
  ら: 'らりるれろ',
  わ: 'わをんゎ',
}

const LOOKUP = new Map<string, KanaRow>()
for (const [row, chars] of Object.entries(ROW_CHARS)) {
  for (const c of chars) LOOKUP.set(c, row as KanaRow)
}

/** カタカナをひらがなに寄せる（読みが未入力でも表示名から拾えるように） */
function toHiragana(c: string): string {
  return /[ァ-ヶ]/.test(c) ? String.fromCharCode(c.charCodeAt(0) - 0x60) : c
}

export function kanaRow(reading: string): KanaRow {
  const first = toHiragana(reading.normalize('NFKC').trim().charAt(0))
  return LOOKUP.get(first) ?? '他'
}

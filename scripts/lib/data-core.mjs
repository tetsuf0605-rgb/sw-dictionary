// data/ の読み込み・結合・計算を 1 か所にまとめたモジュール。
// validate-data.mjs / build-db.mjs / preview.mjs の 3 本がこれを共有する。
// 規則の出典は docs/02_data_model.md §7（解放判定）・§8（リンク記法）・§9（結合規則）。
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

/* ---------- リンク記法（02 §8） ---------- */

/** [[id]] と [[id|ラベル]] だけを解釈する。他の Markdown 記法は解釈しない */
export const LINK_RE = /\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g

export function parseLinks(text) {
  const out = []
  for (const m of String(text ?? '').matchAll(LINK_RE)) {
    out.push({ id: m[1], label: m[2] ?? null, raw: m[0] })
  }
  return out
}

/* ---------- スキーマ定義（E10 の判定に使う） ---------- */
// zod を使わず手書きにしている。理由は docs/PROGRESS.md のメモを参照。
// 将来スキーマが複雑になったら、この表だけを zod に置き換えれば済むようにしてある。

const str = { t: 'string' }
const num = { t: 'number' }
const bool = { t: 'boolean' }
const en = (...values) => ({ t: 'enum', values })
const arr = (of) => ({ t: 'array', of })
const obj = (keys, required = []) => ({ t: 'object', keys, required })
const orNull = (of) => ({ t: 'nullable', of })

const NAME_SPEC = obj(
  { text: str, reading: str, en: str, revealedBy: arr(str), kind: en('alias', 'title', 'nickname') },
  ['text'],
)

// revealedBy の必須チェックは E05 が担当するので、ここでは required にしない
const FACT_SPEC = obj(
  {
    id: str,
    text: str,
    revealedBy: arr(str),
    kind: en('summary', 'detail', 'trivia'),
    order: num,
    needsCheck: bool,
  },
  ['text'],
)

const SAMEAS_SPEC = obj({ id: str, revealedBy: arr(str), note: str }, ['id', 'revealedBy'])

const EVENT_DATE_SPEC = obj(
  { year: num, yearEnd: num, precision: en('exact', 'approx', 'unknown'), order: num },
  ['year', 'precision'],
)

export const ENTITY_TYPES = [
  'character',
  'place',
  'organization',
  'species',
  'vehicle',
  'item',
  'concept',
  'event',
]

export const ENTITY_SPEC = obj(
  {
    id: str,
    type: en(...ENTITY_TYPES),
    names: arr(NAME_SPEC),
    appearsIn: arr(str),
    facts: arr(FACT_SPEC),
    sameAs: arr(SAMEAS_SPEC),
    date: EVENT_DATE_SPEC,
    tags: arr(str),
  },
  ['id'],
)

export const WORK_SPEC = obj(
  {
    id: str,
    title: str,
    titleEn: str,
    kind: en('film', 'season', 'series', 'special'),
    group: en('film-skywalker', 'film-other', 'live-action', 'animation', 'kids', 'non-canon'),
    series: str,
    seriesTitle: str,
    seasonNo: num,
    releaseDate: str,
    status: en('released', 'upcoming'),
    timeline: orNull(obj({ start: num, end: num, approx: bool }, ['start'])),
    canon: bool,
    animated: bool,
    note: str,
  },
  ['id', 'title', 'kind', 'group', 'releaseDate', 'timeline', 'canon'],
)

export const ERA_SPEC = obj(
  { id: str, name: str, start: num, end: num, approx: bool, revealedBy: arr(str), description: str },
  ['id', 'name', 'start', 'end', 'revealedBy'],
)

/** 値を spec と突き合わせ、違反を日本語で返す（未知のフィールド・型違い・必須欠落） */
export function checkShape(value, spec, path = '') {
  const issues = []
  const at = path || '（直下）'

  if (spec.t === 'nullable') {
    if (value === null) return issues
    return checkShape(value, spec.of, path)
  }
  if (spec.t === 'string' || spec.t === 'number' || spec.t === 'boolean') {
    if (typeof value !== spec.t) issues.push(`${at} は ${jaType(spec.t)} であるべきです（実際は ${jaValue(value)}）`)
    return issues
  }
  if (spec.t === 'enum') {
    if (!spec.values.includes(value)) {
      issues.push(`${at} は ${spec.values.join(' / ')} のいずれかであるべきです（実際は ${jaValue(value)}）`)
    }
    return issues
  }
  if (spec.t === 'array') {
    if (!Array.isArray(value)) {
      issues.push(`${at} は配列であるべきです（実際は ${jaValue(value)}）`)
      return issues
    }
    value.forEach((v, i) => issues.push(...checkShape(v, spec.of, `${path}[${i}]`)))
    return issues
  }
  // object
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    issues.push(`${at} はオブジェクトであるべきです（実際は ${jaValue(value)}）`)
    return issues
  }
  for (const key of spec.required) {
    if (!(key in value)) issues.push(`${path ? path + '.' : ''}${key} が必要です`)
  }
  for (const [key, v] of Object.entries(value)) {
    const keySpec = spec.keys[key]
    const p = path ? `${path}.${key}` : key
    if (!keySpec) {
      issues.push(`${p} は未知のフィールドです（使えるのは ${Object.keys(spec.keys).join(' / ')}）`)
      continue
    }
    if (v === undefined) continue
    issues.push(...checkShape(v, keySpec, p))
  }
  return issues
}

const jaType = (t) => ({ string: '文字列', number: '数値', boolean: '真偽値' })[t] ?? t
const jaValue = (v) =>
  v === null ? 'null' : Array.isArray(v) ? '配列' : typeof v === 'object' ? 'オブジェクト' : JSON.stringify(v)

/* ---------- 読み込み ---------- */

/** data/ 以下を読む。JSON 構文エラーは例外にせず errors に集める（validate が E10 として出す） */
export function loadRaw(root) {
  const dataDir = resolve(root, 'data')
  const errors = []

  const read = (rel, fallback) => {
    const file = join(dataDir, rel)
    if (!existsSync(file)) {
      errors.push({ file: `data/${rel}`, message: 'ファイルがありません' })
      return fallback
    }
    try {
      return JSON.parse(readFileSync(file, 'utf8'))
    } catch (e) {
      errors.push({ file: `data/${rel}`, message: `JSON の構文エラー: ${e.message}` })
      return fallback
    }
  }

  const meta = read('meta.json', {})

  let changelog = ''
  const changelogFile = join(dataDir, 'CHANGELOG.md')
  if (existsSync(changelogFile)) changelog = readFileSync(changelogFile, 'utf8')
  else errors.push({ file: 'data/CHANGELOG.md', message: 'ファイルがありません' })
  const works = read('works.json', [])
  const eras = read('eras.json', [])

  const packs = []
  const packsDir = join(dataDir, 'packs')
  if (existsSync(packsDir)) {
    for (const name of readdirSync(packsDir, { withFileTypes: true })) {
      if (!name.isDirectory()) continue
      const rel = `packs/${name.name}/entities.json`
      if (!existsSync(join(dataDir, rel))) {
        errors.push({ file: `data/packs/${name.name}`, message: 'entities.json がありません' })
        continue
      }
      const entities = read(rel, [])
      packs.push({
        workId: name.name,
        file: `data/${rel}`,
        entities: Array.isArray(entities) ? entities : [],
        isArray: Array.isArray(entities),
      })
    }
  }

  return {
    root,
    meta,
    changelog,
    works: Array.isArray(works) ? works : [],
    eras: Array.isArray(eras) ? eras : [],
    packs,
    errors,
  }
}

/* ---------- 公開順（02 §3「公開順は releaseDate から build が計算する」） ---------- */

/** "YYYY" だけの作品（公開日未定）はその年の最後に置く */
export function normalizeReleaseDate(d) {
  const s = String(d ?? '')
  if (/^\d{4}$/.test(s)) return `${s}-12-31`
  return s || '9999-12-31'
}

/** workId → 公開順の通し番号（1 始まり） */
export function publishOrderMap(works) {
  const sorted = [...works].sort((a, b) => {
    const c = normalizeReleaseDate(a.releaseDate).localeCompare(normalizeReleaseDate(b.releaseDate))
    return c !== 0 ? c : String(a.id).localeCompare(String(b.id))
  })
  return new Map(sorted.map((w, i) => [w.id, i + 1]))
}

const orderOf = (map, workId) => map.get(workId) ?? Number.MAX_SAFE_INTEGER

/* ---------- 結合（02 §9） ---------- */

const uniq = (xs) => [...new Set(xs)]

/**
 * パックを公開順に読み、同じ id を結合する。
 * 返り値の entity には内部用の情報（defPack / facts[]._pack など）が付く。
 * db.json に書くときは buildDb が落とす。
 */
export function mergeEntities(raw) {
  const order = publishOrderMap(raw.works)
  const packs = [...raw.packs].sort(
    (a, b) => orderOf(order, a.workId) - orderOf(order, b.workId) || a.workId.localeCompare(b.workId),
  )

  const map = new Map()
  /** id → 定義パック（type を持つパック）の workId 一覧。E01 の判定に使う */
  const definitions = new Map()

  packs.forEach((pack, packIndex) => {
    let fileIndex = 0
    for (const src of pack.entities) {
      if (!src || typeof src !== 'object' || typeof src.id !== 'string') continue
      const id = src.id
      let e = map.get(id)
      if (!e) {
        e = {
          id,
          type: undefined,
          mainName: undefined,
          aliases: [],
          explicitAppearsIn: [],
          facts: [],
          sameAs: [],
          tags: [],
          date: undefined,
          defPack: undefined,
          packs: [],
        }
        map.set(id, e)
      }
      e.packs.push(pack.workId)

      const isDefinition = 'type' in src
      if (isDefinition) {
        definitions.set(id, [...(definitions.get(id) ?? []), pack.workId])
        if (e.type === undefined) {
          e.type = src.type
          e.defPack = pack.workId
          e.date = src.date
        }
      }

      // names: 定義パックの先頭だけが主名称。それ以外はすべて別名（02 §5）
      if (Array.isArray(src.names)) {
        src.names.forEach((n, i) => {
          if (!n || typeof n !== 'object') return
          if (isDefinition && i === 0) {
            if (!e.mainName) e.mainName = { ...n, _pack: pack.workId }
            return
          }
          e.aliases.push({ ...n, _pack: pack.workId })
        })
      }

      if (Array.isArray(src.appearsIn)) e.explicitAppearsIn.push(...src.appearsIn.filter((w) => typeof w === 'string'))
      if (Array.isArray(src.tags)) e.tags.push(...src.tags.filter((t) => typeof t === 'string'))
      if (!isDefinition && src.date !== undefined) e.appendedDate = { value: src.date, pack: pack.workId }

      if (Array.isArray(src.facts)) {
        for (const f of src.facts) {
          if (!f || typeof f !== 'object') continue
          e.facts.push({
            ...f,
            revealedBy: Array.isArray(f.revealedBy) ? f.revealedBy.filter((w) => typeof w === 'string') : f.revealedBy,
            _pack: pack.workId,
            _packIndex: packIndex,
            _fileIndex: fileIndex++,
          })
        }
      }

      if (Array.isArray(src.sameAs)) {
        for (const s of src.sameAs) {
          if (!s || typeof s !== 'object' || typeof s.id !== 'string') continue
          e.sameAs.push({
            ...s,
            revealedBy: Array.isArray(s.revealedBy) ? s.revealedBy.filter((w) => typeof w === 'string') : [],
            _pack: pack.workId,
          })
        }
      }
    }
  })

  // 同じ記述が複数パックに書かれていたら 1 つにまとめ、revealedBy を和集合にする（02 §9-2）
  for (const e of map.values()) {
    const byKey = new Map()
    const merged = []
    for (const f of e.facts) {
      const key = f.id ? `id:${f.id}` : `text:${f.text}`
      const prev = byKey.get(key)
      if (prev) {
        prev.revealedBy = uniq([...(prev.revealedBy ?? []), ...(f.revealedBy ?? [])])
        continue
      }
      byKey.set(key, f)
      merged.push(f)
    }
    e.facts = merged
  }

  // sameAs を対称化する（02 §9-4）。両側にあれば revealedBy の和集合
  const conflicts = []
  const link = (fromId, to) => {
    const target = map.get(to.id)
    if (!target) return // 相手がいない場合は E04 が報告する
    const existing = target.sameAs.find((s) => s.id === fromId)
    if (!existing) {
      target.sameAs.push({ id: fromId, revealedBy: [...to.revealedBy], note: to.note, _pack: to._pack, _mirrored: true })
      return
    }
    const a = [...existing.revealedBy].sort().join(',')
    const b = [...to.revealedBy].sort().join(',')
    if (a !== b && !existing._mirrored && !to._mirrored) {
      conflicts.push({ a: fromId, b: to.id, aList: existing.revealedBy, bList: to.revealedBy })
    }
    existing.revealedBy = uniq([...existing.revealedBy, ...to.revealedBy])
    existing.note ??= to.note
  }
  for (const e of [...map.values()]) {
    for (const s of [...e.sameAs]) link(e.id, s)
  }
  // 同じ相手への重複をまとめる
  for (const e of map.values()) {
    const byId = new Map()
    for (const s of e.sameAs) {
      const prev = byId.get(s.id)
      if (prev) {
        prev.revealedBy = uniq([...prev.revealedBy, ...s.revealedBy])
        prev.note ??= s.note
      } else byId.set(s.id, s)
    }
    e.sameAs = [...byId.values()]
  }

  // appearsIn を 02 §7 の式で計算する（sameAs の対称化より後に行う）
  for (const e of map.values()) {
    e.appearsIn = uniq([
      ...e.explicitAppearsIn,
      ...(e.mainName?.revealedBy ?? []),
      ...e.aliases.flatMap((n) => n.revealedBy ?? []),
      ...e.facts.flatMap((f) => (Array.isArray(f.revealedBy) ? f.revealedBy : [])),
      ...e.sameAs.flatMap((s) => s.revealedBy ?? []),
    ]).sort((a, b) => orderOf(order, a) - orderOf(order, b) || a.localeCompare(b))

    // 記述の並び: order → パック公開順 → ファイル順（02 §7）
    e.facts.sort(
      (a, b) =>
        (a.order ?? 0) - (b.order ?? 0) || a._packIndex - b._packIndex || a._fileIndex - b._fileIndex,
    )
    e.tags = uniq(e.tags)
  }

  return { map, definitions, order, packs, conflicts }
}

/* ---------- db.json の組み立て（02 §9-5, §9-6） ---------- */

export function buildDb(raw, merged) {
  const { map, order } = merged
  const packed = new Set(raw.packs.map((p) => p.workId))

  const works = [...raw.works]
    .sort((a, b) => orderOf(order, a.id) - orderOf(order, b.id))
    .map((w) => ({ ...w, publishOrder: order.get(w.id), hasPack: packed.has(w.id) }))

  const entities = [...map.values()]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((e) => {
      const names = [e.mainName, ...e.aliases].filter(Boolean).map(stripInternal)
      const out = {
        id: e.id,
        type: e.type,
        names,
        appearsIn: e.appearsIn,
        facts: e.facts.map(stripInternal),
      }
      if (e.sameAs.length) out.sameAs = e.sameAs.map(stripInternal)
      if (e.date !== undefined) out.date = e.date
      if (e.tags.length) out.tags = e.tags
      return out
    })

  return {
    dataVersion: raw.meta?.dataVersion ?? '0.0.0',
    updatedAt: raw.meta?.updatedAt ?? '',
    changelog: raw.changelog ?? '',
    works,
    eras: [...raw.eras].sort((a, b) => (a.start ?? 0) - (b.start ?? 0)),
    entities,
  }
}

function stripInternal(o) {
  const out = {}
  for (const [k, v] of Object.entries(o)) {
    if (k.startsWith('_')) continue
    if (v === undefined) continue
    out[k] = v
  }
  return out
}

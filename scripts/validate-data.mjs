// data/ の検証（docs/02_data_model.md §10）。
// エラーが 1 件でもあれば終了コード 1 で止まる（= data:build が失敗し、dev / build に進めない）。
// 警告は終了コード 0 のまま一覧表示する。
//
// 使い方:
//   npm run data:validate
//   node scripts/validate-data.mjs --root <別のフォルダ>   ← 壊したコピーを試すとき
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ENTITY_SPEC,
  ERA_SPEC,
  WORK_SPEC,
  buildDb,
  checkShape,
  loadRaw,
  mergeEntities,
  parseLinks,
} from './lib/data-core.mjs'

const ID_RE = /^[a-z0-9-]+$/

const DIAGNOSTICS = {
  E01: '定義は 1 か所にする。追記側から type を消すか、どこかのパックで type と names を定義する',
  E02: 'ID は英小文字・数字・ハイフンだけにする',
  E03: 'data/works.json に作品を追加するか、ID のつづりを直す',
  E04: '相手の項目を作るか、リンク・sameAs を外す',
  E05: 'その記述が明かされる作品を revealedBy に 1 つ以上書く',
  E06: 'type が event なら date を書く。event 以外なら date を消す',
  E07: '主名称には revealedBy を書かず、reading を必ず書く。別名には revealedBy を書く',
  E08: 'リンク先にその作品の記述を足すか、appearsIn にその作品を加えるか、[[id|ラベル]] の形にする',
  E09: '同じ本文の記述が 2 つある。片方を消す',
  E10: 'docs/02_data_model.md §3〜§4・§12 の形に直す',
  W01: '将来そのパックを作るときに、リンク先へその作品の記述を足すか、ラベル付きリンクにする',
  W02: '記述を 1 つ以上書く（まだなら下書きのままでよい）',
  W03: 'reading（ひらがな読み）を足すと検索と五十音順で拾える',
  W04: '内容を自分で確認し、正しければ needsCheck を外す',
  W05: '両側の revealedBy をそろえるか、片側だけに書く',
  W06: 'その作品のパックを作るまで、項目は解放されない（情報）',
}

const root = parseRoot(process.argv.slice(2))
const raw = loadRaw(root)
const errors = []
const warnings = []

const err = (code, pack, id, message) => errors.push({ code, pack, id, message })
const warn = (code, pack, id, message) => warnings.push({ code, pack, id, message })

/* ---------- E10: JSON 構文エラー ---------- */

for (const e of raw.errors) err('E10', e.file, '—', e.message)

/* ---------- 作品マスタ（works.json） ---------- */

const workIds = new Set()
raw.works.forEach((w, i) => {
  for (const issue of checkShape(w, WORK_SPEC, '')) err('E10', 'works.json', w?.id ?? `[${i}]`, issue)
  if (typeof w?.id !== 'string') return
  if (!ID_RE.test(w.id)) err('E02', 'works.json', w.id, `作品 ID「${w.id}」に使えない文字が含まれています`)
  if (workIds.has(w.id)) err('E01', 'works.json', w.id, `作品 ID「${w.id}」が重複しています`)
  workIds.add(w.id)
})

/* ---------- 時代区分（eras.json） ---------- */

raw.eras.forEach((era, i) => {
  for (const issue of checkShape(era, ERA_SPEC, '')) err('E10', 'eras.json', era?.id ?? `[${i}]`, issue)
  if (typeof era?.id !== 'string') return
  if (!ID_RE.test(era.id)) err('E02', 'eras.json', era.id, `時代区分 ID「${era.id}」に使えない文字が含まれています`)
  for (const w of era.revealedBy ?? []) {
    if (!workIds.has(w)) err('E03', 'eras.json', era.id, `revealedBy の作品「${w}」が works.json にありません`)
  }
})

/* ---------- パック（data/packs/<work-id>/entities.json） ---------- */

const packedWorks = new Set(raw.packs.map((p) => p.workId))

for (const pack of raw.packs) {
  if (!pack.isArray) {
    err('E10', pack.workId, '—', `${pack.file} の中身は配列であるべきです`)
    continue
  }
  if (!ID_RE.test(pack.workId)) {
    err('E02', pack.workId, '—', `パックのフォルダ名「${pack.workId}」に使えない文字が含まれています`)
  } else if (!workIds.has(pack.workId)) {
    err('E03', pack.workId, '—', `パックのフォルダ名「${pack.workId}」に対応する作品が works.json にありません`)
  }

  const seenText = new Map() // E09: 同一パック内での重複（項目ごと）
  let needsCheckCount = 0

  pack.entities.forEach((src, i) => {
    if (!src || typeof src !== 'object' || Array.isArray(src)) {
      err('E10', pack.workId, `[${i}]`, '項目はオブジェクトであるべきです')
      return
    }
    const id = typeof src.id === 'string' ? src.id : `[${i}]`
    for (const issue of checkShape(src, ENTITY_SPEC, '')) err('E10', pack.workId, id, issue)
    if (typeof src.id !== 'string') return
    if (!ID_RE.test(src.id)) err('E02', pack.workId, src.id, `項目 ID「${src.id}」に使えない文字が含まれています`)

    const isDefinition = 'type' in src

    // E07: 名前の扱い。定義パックの names[0] だけが主名称、それ以外はすべて別名
    if (Array.isArray(src.names)) {
      src.names.forEach((n, ni) => {
        if (!n || typeof n !== 'object') return
        const isMain = isDefinition && ni === 0
        if (isMain) {
          if (n.revealedBy) err('E07', pack.workId, src.id, '主名称 names[0] に revealedBy は書けません（常に表示されるため）')
          if (!n.reading) err('E07', pack.workId, src.id, '主名称 names[0] に reading（ひらがな読み）がありません')
        } else {
          // 02 §5 の「別名は revealedBy のどれかが視聴済みのときだけ表示」に基づく。
          // revealedBy がないと常時表示になり、ネタバレになりうるのでエラーにする
          if (!Array.isArray(n.revealedBy) || n.revealedBy.length === 0) {
            err('E07', pack.workId, src.id, `別名「${n.text}」に revealedBy がありません（常時表示になってしまいます）`)
          }
          if (!n.reading) warn('W03', pack.workId, src.id, `別名「${n.text}」に reading がありません`)
        }
        for (const w of n.revealedBy ?? []) {
          if (!workIds.has(w)) err('E03', pack.workId, src.id, `別名「${n.text}」の revealedBy の作品「${w}」が works.json にありません`)
        }
      })
    }
    if (isDefinition && (!Array.isArray(src.names) || src.names.length === 0)) {
      err('E01', pack.workId, src.id, '定義パック（type を持つ）には names が必要です')
    }

    // E06: event と date の対応
    if (isDefinition) {
      if (src.type === 'event' && src.date === undefined) {
        err('E06', pack.workId, src.id, 'type が event なのに date がありません')
      }
      if (src.type !== 'event' && src.date !== undefined) {
        err('E06', pack.workId, src.id, `type が ${src.type} なのに date があります`)
      }
    } else if (src.date !== undefined) {
      err('E06', pack.workId, src.id, '追記パックに date は書けません（定義パックに書く）')
    }

    // E03: appearsIn
    for (const w of src.appearsIn ?? []) {
      if (!workIds.has(w)) err('E03', pack.workId, src.id, `appearsIn の作品「${w}」が works.json にありません`)
    }

    // E05 / E03 / E09 / W04: 記述
    for (const f of src.facts ?? []) {
      if (!f || typeof f !== 'object') continue
      if (!Array.isArray(f.revealedBy) || f.revealedBy.length === 0) {
        err('E05', pack.workId, src.id, `記述「${excerpt(f.text)}」に revealedBy がありません`)
      }
      for (const w of f.revealedBy ?? []) {
        if (!workIds.has(w)) err('E03', pack.workId, src.id, `記述「${excerpt(f.text)}」の revealedBy の作品「${w}」が works.json にありません`)
      }
      const key = `${src.id} ${f.text}`
      if (seenText.has(key)) {
        err('E09', pack.workId, src.id, `同じ本文の記述が重複しています「${excerpt(f.text)}」`)
      } else seenText.set(key, true)
      if (f.needsCheck) needsCheckCount++
    }

    // E03: sameAs
    for (const s of src.sameAs ?? []) {
      if (!s || typeof s !== 'object') continue
      for (const w of s.revealedBy ?? []) {
        if (!workIds.has(w)) err('E03', pack.workId, src.id, `sameAs（相手: ${s.id}）の revealedBy の作品「${w}」が works.json にありません`)
      }
    }
  })

  if (needsCheckCount > 0) {
    warn('W04', pack.workId, '—', `needsCheck: true の記述が ${needsCheckCount} 件あります`)
  }
}

/* ---------- 結合してからの検証 ---------- */

const merged = mergeEntities(raw)
const entityIds = new Set(merged.map.keys())

// E01: 定義パックがちょうど 1 つか
for (const [id, e] of merged.map) {
  const defs = merged.definitions.get(id) ?? []
  if (defs.length === 0) {
    err('E01', e.packs.join(', '), id, 'どのパックでも定義されていません（type と names を持つパックが必要です）')
  } else if (defs.length > 1) {
    err('E01', defs.join(', '), id, `定義パックが ${defs.length} つあります（type を持つパックは 1 つだけ）`)
  }
  if (e.appendedDate) {
    const same = JSON.stringify(e.appendedDate.value) === JSON.stringify(e.date)
    if (!same) err('E06', e.appendedDate.pack, id, '追記パックの date が定義パックの date と一致しません')
  }
}

// E04: リンク先・sameAs の相手が存在するか
for (const e of merged.map.values()) {
  for (const f of e.facts) {
    for (const link of parseLinks(f.text)) {
      if (!entityIds.has(link.id)) {
        err('E04', f._pack, e.id, `リンク先の項目「${link.id}」が存在しません`)
      }
    }
  }
  for (const s of e.sameAs) {
    if (!entityIds.has(s.id)) err('E04', s._pack ?? e.defPack ?? '—', e.id, `sameAs の相手「${s.id}」が存在しません`)
  }
}
for (const era of raw.eras) {
  for (const link of parseLinks(era.description ?? '')) {
    if (!entityIds.has(link.id)) err('E04', 'eras.json', era.id, `description のリンク先「${link.id}」が存在しません`)
  }
}

// E08 / W01: リンク安全性
// ラベルなしリンク [[X]] を含む記述 F について、F.revealedBy の作品 w が appearsIn(X) に
// 含まれなければ、その作品を見た人には「？？？」と表示されてしまう（02 §8・§10）。
for (const e of merged.map.values()) {
  for (const f of e.facts) {
    for (const link of parseLinks(f.text)) {
      if (link.label !== null) continue
      const target = merged.map.get(link.id)
      if (!target) continue // E04 で報告済み
      for (const w of f.revealedBy ?? []) {
        if (target.appearsIn.includes(w)) continue
        const message = `ラベルなしリンク [[${link.id}]] を含む記述が作品「${w}」で明かされますが、リンク先はその作品で解放されません`
        if (packedWorks.has(w)) err('E08', f._pack, e.id, message)
        else warn('W01', f._pack, e.id, message)
      }
    }
  }
}

// W02: 記述が 0 件の項目
for (const e of merged.map.values()) {
  if (e.facts.length === 0) warn('W02', e.packs.join(', '), e.id, '記述が 1 件もありません')
}

// W05: sameAs の revealedBy 食い違い
for (const c of merged.conflicts) {
  warn(
    'W05',
    '—',
    `${c.a} ⇄ ${c.b}`,
    `両側の sameAs で revealedBy が食い違っています（${c.aList.join(',')} と ${c.bList.join(',')}）。和集合にして出力しました`,
  )
}

// W06: works.json にあるがパックのない作品
const noPack = raw.works.filter((w) => !packedWorks.has(w.id))
if (noPack.length > 0) {
  warn('W06', '—', '—', `パックがまだない作品が ${noPack.length} 件あります（${noPack.length <= 8 ? noPack.map((w) => w.id).join(', ') : noPack.slice(0, 8).map((w) => w.id).join(', ') + ' ほか'}）`)
}

/* ---------- 出力 ---------- */

report()

function report() {
  if (errors.length === 0 && warnings.length === 0) {
    console.log('[data:validate] エラー 0 件 / 警告 0 件。問題ありません。')
    return
  }
  if (errors.length > 0) {
    console.log(`\n===== エラー ${errors.length} 件（直さないとビルドできません） =====`)
    for (const r of sortByCode(errors)) printRow(r)
  }
  if (warnings.length > 0) {
    console.log(`\n===== 警告 ${warnings.length} 件（ビルドは通ります） =====`)
    for (const r of sortByCode(warnings)) printRow(r)
  }
  console.log(`\n[data:validate] エラー ${errors.length} 件 / 警告 ${warnings.length} 件`)
  if (errors.length > 0) process.exitCode = 1
}

function printRow(r) {
  console.log(`\n${r.code} [${r.pack}] ${r.id}`)
  console.log(`  説明  : ${r.message}`)
  console.log(`  直し方: ${DIAGNOSTICS[r.code]}`)
}

function sortByCode(rows) {
  return [...rows].sort(
    (a, b) =>
      a.code.localeCompare(b.code) ||
      String(a.pack).localeCompare(String(b.pack)) ||
      String(a.id).localeCompare(String(b.id)),
  )
}

function excerpt(text, n = 24) {
  const s = String(text ?? '')
  return s.length > n ? `${s.slice(0, n)}…` : s
}

function parseRoot(argv) {
  const i = argv.indexOf('--root')
  if (i >= 0 && argv[i + 1]) return resolve(argv[i + 1])
  return resolve(dirname(fileURLToPath(import.meta.url)), '..')
}

// buildDb は使わないが、結合そのものが例外を投げないことをここで確かめておく
void buildDb

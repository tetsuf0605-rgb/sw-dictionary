// 指定した視聴状況で項目がどう見えるかをテキスト出力する（docs/02_data_model.md §10 末尾）。
// 著者が「この作品だけ見た人には何が見えるか」を目視で確かめるための道具。
//
// 使い方:
//   npm run data:preview -- --watched ep4 --entity darth-vader
//   npm run data:preview -- --watched ep4,ep5          ← 解放される項目の一覧
//   npm run data:preview -- --all                      ← 「すべて表示」と同じ（全作品を視聴済み扱い）
//
// 判定の式は docs/02 §7。Phase 2 で src/lib/visibility.ts を作ったら、
// このファイルはそちらを import する形に置き換える（判定を 2 か所に持たないため）。
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildDb, loadRaw, mergeEntities, parseLinks } from './lib/data-core.mjs'

const TYPE_LABEL = {
  character: '人物',
  place: '場所',
  organization: '組織',
  species: '種族',
  vehicle: '乗り物・兵器',
  item: '道具',
  concept: '用語',
  event: '出来事',
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const argv = process.argv.slice(2)
const opt = (name) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 ? argv[i + 1] : undefined
}

const raw = loadRaw(root)
if (raw.errors.length > 0) {
  for (const e of raw.errors) console.error(`[data:preview] ${e.file}: ${e.message}`)
  process.exit(1)
}
const db = buildDb(raw, mergeEntities(raw))

const showAll = argv.includes('--all')
const watched = new Set(
  showAll ? db.works.map((w) => w.id) : (opt('watched') ?? '').split(',').map((s) => s.trim()).filter(Boolean),
)
const entityId = opt('entity')

const unknown = [...watched].filter((w) => !db.works.some((x) => x.id === w))
if (unknown.length > 0) {
  console.error(`[data:preview] works.json にない作品 ID: ${unknown.join(', ')}`)
  process.exit(1)
}

/* ---------- 解放判定（02 §7） ---------- */

const hit = (list) => (list ?? []).some((w) => watched.has(w))
const isUnlocked = (e) => hit(e.appearsIn)
const visibleFacts = (e) => e.facts.filter((f) => hit(f.revealedBy))
const visibleNames = (e) => [e.names[0], ...e.names.slice(1).filter((n) => hit(n.revealedBy))].filter(Boolean)
const visibleSameAs = (e) =>
  (e.sameAs ?? []).filter((s) => hit(s.revealedBy) && isUnlocked(byId.get(s.id) ?? { appearsIn: [] }))
const shownWorks = (e) => e.appearsIn.filter((w) => watched.has(w))

const byId = new Map(db.entities.map((e) => [e.id, e]))
const workById = new Map(db.works.map((w) => [w.id, w]))
const unlocked = db.entities.filter(isUnlocked)

/* ---------- 出力 ---------- */

const label = (workId) => workById.get(workId)?.title ?? workId
const header = `視聴済み: ${watched.size === 0 ? '（なし）' : [...watched].map(label).join(' / ')}`

if (!entityId) {
  printList()
} else {
  const e = byId.get(entityId)
  if (!e) {
    console.error(`[data:preview] 項目「${entityId}」は存在しません`)
    process.exit(1)
  }
  printEntity(e)
}

function printList() {
  console.log(header)
  console.log(`解放済みの項目: ${unlocked.length} 件 / 全 ${db.entities.length} 件\n`)
  for (const [type, ja] of Object.entries(TYPE_LABEL)) {
    const list = unlocked.filter((e) => e.type === type)
    if (list.length === 0) continue
    const names = list
      .map((e) => visibleNames(e)[0]?.text ?? e.id)
      .sort((a, b) => a.localeCompare(b, 'ja'))
    console.log(`${ja}（${list.length}）: ${names.join('、')}`)
  }
  const eras = db.eras.filter((era) => hit(era.revealedBy))
  console.log(`\n時代区分（${eras.length}）: ${eras.map((e) => e.name).join('、') || '（なし）'}`)
  const events = unlocked.filter((e) => e.type === 'event')
  console.log(`年表に載る出来事（${events.length}）: ${events.map((e) => visibleNames(e)[0].text).join('、') || '（なし）'}`)
}

function printEntity(e) {
  console.log(header)
  console.log('─'.repeat(60))
  if (!isUnlocked(e)) {
    console.log(`${e.id} は未解放です（この視聴状況では表示されません）`)
    console.log('アプリでは「この項目はまだ表示できません」と出て、名前も見せません。')
    return
  }

  const names = visibleNames(e)
  console.log(`[${TYPE_LABEL[e.type] ?? e.type}] ${names[0].text}`)
  console.log(`  読み: ${names[0].reading ?? '—'}  英語: ${names[0].en ?? '—'}`)
  if (names.length > 1) console.log(`  別名: ${names.slice(1).map((n) => n.text).join('、')}`)

  for (const s of visibleSameAs(e)) {
    const other = byId.get(s.id)
    console.log(`  ＝ ${visibleNames(other)[0].text}${s.note ? `（${s.note}）` : ''}`)
  }

  if (e.date) console.log(`  年代: ${formatYear(e.date)}`)

  const facts = visibleFacts(e)
  console.log(`\n  記述（${facts.length} / ${e.facts.length} 件）`)
  if (facts.length === 0) console.log('    （この視聴状況で読める記述はありません）')
  for (const f of facts) {
    const sources = f.revealedBy.filter((w) => watched.has(w)).map(shortLabel).join(' ')
    console.log(`    ${f.kind === 'summary' ? '■ ' : '・'}${renderText(f.text)}  [${sources}]`)
  }

  console.log(`\n  登場作品: ${shownWorks(e).map(label).join('、') || '（なし）'}`)
  console.log(`  関連項目: ${related(e).join('、') || '（なし）'}`)
  console.log(`  ここへのリンク元: ${backlinks(e).join('、') || '（なし）'}`)

  const hidden = e.facts.length - facts.length
  if (hidden > 0) console.log(`\n  （未視聴作品でしか明かされない記述が ${hidden} 件、伏せられています）`)
}

/** 本文のリンクを、解放状況に応じて表示名またはラベル文字列に置き換える（02 §8） */
function renderText(text) {
  return String(text).replace(/\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g, (_m, id, lab) => {
    const target = byId.get(id)
    if (target && isUnlocked(target)) return `《${lab ?? visibleNames(target)[0].text}》`
    return lab ?? '？？？'
  })
}

function related(e) {
  const ids = new Set()
  for (const f of visibleFacts(e)) {
    for (const l of parseLinks(f.text)) {
      const t = byId.get(l.id)
      if (t && t.id !== e.id && isUnlocked(t)) ids.add(t.id)
    }
  }
  return [...ids].map((id) => visibleNames(byId.get(id))[0].text).sort((a, b) => a.localeCompare(b, 'ja'))
}

function backlinks(e) {
  const out = []
  for (const other of unlocked) {
    if (other.id === e.id) continue
    const found = visibleFacts(other).some((f) => parseLinks(f.text).some((l) => l.id === e.id))
    if (found) out.push(visibleNames(other)[0].text)
  }
  return out.sort((a, b) => a.localeCompare(b, 'ja'))
}

/** 02 §12 の表記 */
function formatYear(date) {
  const one = (y) => (y < 0 ? `${-y} BBY` : y > 0 ? `${y} ABY` : '0 BBY/ABY（ヤヴィンの戦いの年）')
  if (date.precision === 'unknown') return '（年代不明）'
  const head = date.precision === 'approx' ? '約' : ''
  return head + (date.yearEnd !== undefined ? `${one(date.year)}〜${one(date.yearEnd)}` : one(date.year))
}

/** 出典ラベル（05 §5。暫定で ep4 → EP4、それ以外は作品タイトル） */
function shortLabel(workId) {
  const m = /^ep(\d)$/.exec(workId)
  if (m) return `EP${m[1]}`
  return workById.get(workId)?.title ?? workId
}

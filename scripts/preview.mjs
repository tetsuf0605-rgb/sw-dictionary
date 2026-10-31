// 指定した視聴状況で項目がどう見えるかをテキスト出力する（docs/02_data_model.md §10 末尾）。
// 著者が「この作品だけ見た人には何が見えるか」を目視で確かめるための道具。
//
// 使い方:
//   npm run data:preview -- --watched ep4 --entity darth-vader
//   npm run data:preview -- --watched ep4,ep5          ← 解放される項目の一覧
//   npm run data:preview -- --all                      ← 「すべて表示」と同じ（全作品を視聴済み扱い）
//
// 解放判定はアプリ本体と同じ src/lib/visibility.ts を使う（02 §6「判定は 1 か所」）。
// Node 24 は .ts の型注釈をそのまま読み飛ばせるので、ビルドなしで import できる。
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderFactText } from '../src/lib/links.ts'
import {
  buildTimeline,
  createIndex,
  displayName,
  displayNameResolver,
  isUnlocked,
  relatedEntities,
  backlinks,
  resolveWatched,
  shownWorks,
  sortByReading,
  unlockedChecker,
  unlockedEntities,
  visibleEras,
  visibleFacts,
  visibleNames,
  visibleSameAs,
  visibleSources,
} from '../src/lib/visibility.ts'
import { buildDb, loadRaw, mergeEntities } from './lib/data-core.mjs'

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
const index = createIndex(db)

const showAll = argv.includes('--all')
const requested = (opt('watched') ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
const unknown = requested.filter((w) => !index.works.has(w))
if (unknown.length > 0) {
  console.error(`[data:preview] works.json にない作品 ID: ${unknown.join(', ')}`)
  process.exit(1)
}

const watched = resolveWatched(db, requested, showAll)
const entityId = opt('entity')
const label = (workId) => index.works.get(workId)?.title ?? workId
const header = `視聴済み: ${watched.size === 0 ? '（なし）' : [...watched].map(label).join(' / ')}`

if (!entityId) printList()
else {
  const e = index.entities.get(entityId)
  if (!e) {
    console.error(`[data:preview] 項目「${entityId}」は存在しません`)
    process.exit(1)
  }
  printEntity(e)
}

function printList() {
  const unlocked = unlockedEntities(index, watched)
  console.log(header)
  console.log(`解放済みの項目: ${unlocked.length} 件 / 全 ${db.entities.length} 件\n`)
  for (const [type, ja] of Object.entries(TYPE_LABEL)) {
    const list = sortByReading(unlocked.filter((e) => e.type === type), watched)
    if (list.length === 0) continue
    console.log(`${ja}（${list.length}）: ${list.map((e) => displayName(e, watched)).join('、')}`)
  }
  const eras = visibleEras(db, watched)
  console.log(`\n時代区分（${eras.length}）: ${eras.map((e) => e.name).join('、') || '（なし）'}`)
  const events = buildTimeline(index, watched)
  console.log(
    `年表に載る出来事（${events.length}）: ${events.map((e) => displayName(e, watched)).join('、') || '（なし）'}`,
  )
}

function printEntity(e) {
  console.log(header)
  console.log('─'.repeat(60))
  if (!isUnlocked(e, watched)) {
    console.log(`${e.id} は未解放です（この視聴状況では表示されません）`)
    console.log('アプリでは「この項目はまだ表示できません」と出て、名前も見せません。')
    return
  }

  const names = visibleNames(e, watched)
  console.log(`[${TYPE_LABEL[e.type] ?? e.type}] ${names[0].text}`)
  console.log(`  読み: ${names[0].reading ?? '—'}  英語: ${names[0].en ?? '—'}`)
  if (names.length > 1) console.log(`  別名: ${names.slice(1).map((n) => n.text).join('、')}`)

  for (const s of visibleSameAs(e, watched, index)) {
    const other = index.entities.get(s.id)
    console.log(`  ＝ ${displayName(other, watched)}${s.note ? `（${s.note}）` : ''}`)
  }

  if (e.date) console.log(`  年代: ${formatYear(e.date)}`)

  const facts = visibleFacts(e, watched)
  console.log(`\n  記述（${facts.length} / ${e.facts.length} 件）`)
  if (facts.length === 0) console.log('    （この視聴状況で読める記述はありません）')
  for (const f of facts) {
    const sources = visibleSources(f, watched).map(shortLabel).join(' ')
    console.log(`    ${f.kind === 'summary' ? '■ ' : '・'}${renderText(f.text)}  [${sources}]`)
  }

  const names2 = (list) => list.map((x) => displayName(x, watched)).join('、') || '（なし）'
  console.log(`\n  登場作品: ${shownWorks(e, watched).map(label).join('、') || '（なし）'}`)
  console.log(`  関連項目: ${names2(relatedEntities(e, watched, index))}`)
  console.log(`  ここへのリンク元: ${names2(backlinks(e, watched, index))}`)

  const hidden = e.facts.length - facts.length
  if (hidden > 0) console.log(`\n  （未視聴作品でしか明かされない記述が ${hidden} 件、伏せられています）`)
}

/** 本文のリンクを、アプリと同じ規則で文字に落とす（解放済みは《》で囲んで示す） */
function renderText(text) {
  return renderFactText(text, {
    isUnlocked: unlockedChecker(index, watched),
    displayName: displayNameResolver(index, watched),
  })
    .map((t) => (t.kind === 'link' ? `《${t.text}》` : t.text))
    .join('')
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
  return index.works.get(workId)?.title ?? workId
}

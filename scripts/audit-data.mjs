// 既存データの棚卸し。public/data/db.json を読んで、弱いところを並べる
import fs from 'node:fs'

const db = JSON.parse(fs.readFileSync('public/data/db.json', 'utf8'))
const works = db.works
const byId = new Map(db.entities.map((e) => [e.id, e]))
const title = (id) => works.find((w) => w.id === id)?.title ?? id
const packWorks = works.filter((w) => db.entities.some((e) => (e.appearsIn ?? []).includes(w.id)))

const out = []
const say = (s) => out.push(s)

// 1. 作品ごとの、見える項目数と「要約が出ない項目」
say('## 1. 作品ごと：見える項目数と、要約が出ない項目の数')
const rows = []
for (const w of packWorks) {
  const vis = db.entities.filter((e) => (e.appearsIn ?? []).includes(w.id))
  const noSummary = vis.filter(
    (e) => !e.facts.some((f) => f.kind === 'summary' && f.revealedBy.includes(w.id)),
  )
  rows.push({ id: w.id, title: w.title, vis: vis.length, no: noSummary.length, names: noSummary.map((e) => e.names[0].text) })
}
rows.sort((a, b) => b.no - a.no)
for (const r of rows.filter((r) => r.no > 0)) {
  say(`- ${r.title}（${r.id}）: ${r.vis} 項目中 ${r.no} 件に要約なし → ${r.names.slice(0, 12).join('、')}${r.names.length > 12 ? ' ほか' : ''}`)
}
say(`- 要約がすべてそろっている作品: ${rows.filter((r) => r.no === 0).length} / ${rows.length} 件`)

// 2. 記述が 1 件だけの項目（薄すぎる）
say('')
say('## 2. 記述が1件しかない項目')
const thin = db.entities.filter((e) => e.facts.length === 1)
say(thin.length ? thin.map((e) => `${e.names[0].text}(${e.id})`).join('、') : '（なし）')

// 3. どこからもリンクされず、どこへもリンクしない項目
say('')
say('## 3. 本文リンクが行きも帰りもない項目')
const linked = new Set()
for (const e of db.entities) {
  for (const f of e.facts) {
    for (const m of f.text.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)) {
      linked.add(m[1])
      linked.add(e.id) // リンクを持つ側も「繋がっている」扱い
    }
  }
}
const orphan = db.entities.filter((e) => !linked.has(e.id))
say(`${orphan.length} 件`)
say(orphan.length ? orphan.map((e) => `${e.names[0].text}(${e.id})`).join('、') : '（なし）')

// 4. 表示名が重複している項目（引くとき混乱する）
say('')
say('## 4. 表示名がぶつかっている項目')
const byName = new Map()
for (const e of db.entities) {
  for (const n of e.names) {
    const k = n.text
    byName.set(k, [...(byName.get(k) ?? []), e.id])
  }
}
const clash = [...byName.entries()].filter(([, v]) => v.length > 1)
say(clash.length ? clash.map(([k, v]) => `${k} → ${v.join(' / ')}`).join('\n') : '（なし）')

// 5. 作品ごとの記述数（薄い作品を見つける）
say('')
say('## 5. 作品ごとの記述数（少ない順）')
const cnt = packWorks
  .map((w) => ({ t: w.title, n: db.entities.reduce((a, e) => a + e.facts.filter((f) => f.revealedBy.includes(w.id)).length, 0) }))
  .sort((a, b) => a.n - b.n)
for (const c of cnt.slice(0, 12)) say(`- ${c.t}: ${c.n} 件`)

// 6. 読みの抜け・怪しい読み
say('')
say('## 6. 読みの点検')
const badReading = []
for (const e of db.entities) {
  for (const n of e.names) {
    if (!n.reading) badReading.push(`${n.text}(${e.id}): 読みなし`)
    else if (/[^ぁ-ゖー・]/.test(n.reading)) badReading.push(`${n.text}(${e.id}): ${n.reading}`)
  }
}
say(badReading.length ? badReading.join('\n') : '（なし）')

// 7. type の分布
say('')
say('## 7. 項目の種類の分布')
const types = {}
for (const e of db.entities) types[e.type] = (types[e.type] ?? 0) + 1
say(Object.entries(types).map(([k, v]) => `${k}:${v}`).join(' / '))

console.log(out.join('\n'))
